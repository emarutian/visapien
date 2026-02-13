import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

const mode = (process.argv[2] || 'all').toLowerCase();
if (!['images', 'video', 'all'].includes(mode)) {
  console.error('Usage: bun run scripts/generate-runware-media.mjs [images|video|all]');
  process.exit(1);
}

const API_KEY = process.env.RUNWARE_API_KEY;
if (!API_KEY) {
  console.error('RUNWARE_API_KEY is required. Add it to .env and re-run.');
  process.exit(1);
}

const RUNWARE_API_URL = process.env.RUNWARE_API_URL || 'https://api.runware.ai/v1';
const IMAGE_MODEL = process.env.RUNWARE_IMAGE_MODEL || 'bytedance:seedream@4.5';
const VIDEO_MODELS = [
  process.env.RUNWARE_VIDEO_MODEL || 'bytedance:seedance@2',
  'bytedance:1@1',
];

const outputDir = path.join(process.cwd(), 'public/media');
await fs.mkdir(outputDir, { recursive: true });

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function taskHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_KEY}`,
  };
}

async function postRunware(tasks) {
  const response = await fetch(RUNWARE_API_URL, {
    method: 'POST',
    headers: taskHeaders(),
    body: JSON.stringify(tasks),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Runware HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }

  if (payload.errors?.length) {
    throw new Error(`Runware task errors: ${JSON.stringify(payload.errors, null, 2)}`);
  }

  if (!payload.data?.length) {
    throw new Error(`Runware returned no data: ${JSON.stringify(payload)}`);
  }

  return payload.data;
}

async function pollForResult(taskUUID, maxAttempts = 30, intervalMs = 1500) {
  let delay = intervalMs;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const data = await postRunware([
      {
        taskType: 'getResponse',
        taskUUID,
      },
    ]);

    const candidate = data.find((item) => item.taskUUID === taskUUID);
    if (!candidate) {
      throw new Error(`No response for taskUUID ${taskUUID}`);
    }

    if (candidate.status === 'success') {
      return candidate;
    }

    if (candidate.status === 'error') {
      throw new Error(`Task ${taskUUID} failed.`);
    }

    await sleep(delay);
    delay = Math.min(delay * 1.5, 8000);
  }
  throw new Error(`Timeout waiting for task ${taskUUID}`);
}

async function saveMedia(url, filename) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Media fetch failed: ${res.status} ${res.statusText}`);
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  const dest = path.join(outputDir, filename);
  await fs.writeFile(dest, bytes);
  return `/media/${filename}`;
}

async function generateImages() {
  const prompts = [
    'A modern co-working environment with people designing intelligent workflows, premium office textures, cinematic natural light, editorial still.',
    'A founder and operations director planning AI workflows on a whiteboard, high attention to process detail, premium editorial look.',
  ];

  for (let index = 0; index < prompts.length; index += 1) {
    const prompt = prompts[index];
    const task = {
      taskType: 'imageInference',
      taskUUID: randomUUID(),
      positivePrompt: prompt,
      model: IMAGE_MODEL,
      width: 2048,
      height: 2048,
      outputType: 'URL',
      outputFormat: 'WEBP',
      numberResults: 1,
      deliveryMethod: 'sync',
      includeCost: false,
    };

    const [result] = await postRunware([task]);
    const mediaUrl = result.imageURL;
    const filename = `hero-bg-${index + 1}.webp`;
    const publicPath = await saveMedia(mediaUrl, filename);
    console.log(`Image generated -> ${publicPath}`);
  }
}

async function generateVideo() {
  const seed = Number(process.env.VIDEO_SEED || '42');
  const prompt =
    'Editorial cinematic sequence for a premium technology consulting agency, calm office scenes, collaborative strategizing, subtle movement, warm natural light, premium brand tone';
  const negativePrompt =
    'no logos, no text overlays, no futuristic robot themes, no exaggerated glow, no gradients, no vaporwave, no abstract glitch art';

  let lastError;

  for (const model of VIDEO_MODELS) {
    try {
      const taskUUID = randomUUID();
      const data = await postRunware([
        {
          taskType: 'videoInference',
          taskUUID,
          positivePrompt: prompt,
          negativePrompt,
          model,
          duration: 6,
          width: 864,
          height: 486,
          outputType: 'URL',
          outputFormat: 'MP4',
          deliveryMethod: 'async',
          seed,
          numberResults: 1,
          providerSettings: {
            bytedance: { cameraFixed: false },
          },
        },
      ]);

      const submitted = data.find((item) => item.taskUUID === taskUUID);
      if (!submitted) {
        throw new Error(`No acknowledgment for ${taskUUID}`);
      }

      const final = await pollForResult(taskUUID);
      if (!final.videoURL) {
        throw new Error(`No videoURL returned for model ${model}`);
      }

      const filename = 'hero-video.mp4';
      const publicPath = await saveMedia(final.videoURL, filename);
      console.log(`Video generated with model ${model} -> ${publicPath}`);
      return;
    } catch (error) {
      lastError = error;
      console.warn(`Model ${model} failed, trying fallback...`);
      continue;
    }
  }

  throw lastError;
}

if (mode === 'images') {
  await generateImages();
}
if (mode === 'video') {
  await generateVideo();
}
if (mode === 'all') {
  await generateImages();
  await generateVideo();
}
