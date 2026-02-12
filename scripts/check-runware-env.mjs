import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config();

const required = ['RUNWARE_API_KEY'];
const missing = required.filter((name) => !process.env[name]);

if (missing.length) {
  console.error('\nMissing required variables:\n');
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  console.error('\nCopy .env.example and fill the values before generating media.\n');
  process.exit(1);
}

console.log('Runware environment check: OK');
console.log(`API key detected: ${String(process.env.RUNWARE_API_KEY).slice(0, 8)}••••`);
console.log(`Image model: ${process.env.RUNWARE_IMAGE_MODEL || 'bytedance:seedream@4.5'}`);
console.log(`Video model: ${process.env.RUNWARE_VIDEO_MODEL || 'bytedance:seedance@2'}`);
console.log('For Seedance 2, confirm provider model availability in your account before production use.');
