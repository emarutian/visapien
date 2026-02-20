#!/usr/bin/env bun
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_ROOT = path.join(__dirname, 'factory-template');
const TEMPLATE_SUFFIX = '.template';

function parseArgs(argv) {
  const parsed = { _: [] };
  const booleanFlags = new Set([
    'help',
    'force',
    'skip-media',
    'run-media',
    'write-env',
    'include-cloudflare',
  ]);
  const valueFlags = new Set([
    'description',
    'company',
    'slug',
    'domain',
    'output',
    'email',
    'contact-email',
    'web3forms-key',
    'runware-key',
    'cloudflare-token',
    'cloudflare-zone-id',
    'cloudflare-ttl',
    'vercel-ipv4',
    'phone',
    'sms-description',
  ]);

  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === '-h') {
      parsed.help = true;
      continue;
    }
    if (!item.startsWith('--')) {
      parsed._.push(item);
      continue;
    }

    const [rawKey, rawValue] = item.split('=');
    const key = rawKey.replace(/^--/, '');

    if (booleanFlags.has(key)) {
      parsed[key] = true;
      continue;
    }

    if (valueFlags.has(key)) {
      if (rawValue !== undefined) {
        parsed[key] = rawValue;
        continue;
      }

      if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        parsed[key] = argv[i + 1];
        i += 1;
      } else {
        throw new Error(`Missing value for --${key}`);
      }
      continue;
    }

    throw new Error(`Unknown option: ${item}`);
  }

  return parsed;
}

function usage() {
  return `
Usage:
  bun run scripts/website-factory.mjs --description "..." [options]

Description is required (positional or --description).

Options:
  --company NAME               Company name
  --slug NAME                  Project slug (default derived)
  --domain DOMAIN              Primary domain used in metadata
  --output PATH                Output directory (default: ./<slug>)
  --email, --contact-email TXT  Contact email for legal pages
  --web3forms-key KEY          Web3Forms access key
  --runware-key KEY            Runware API key (for hero media generation)
  --skip-media                 Skip image generation step
  --run-media                  Force image generation step
  --write-env                  Write .env with discovered keys in output project
  --include-cloudflare          Run cloudflare record sync after generation
  --cloudflare-token TOKEN      Cloudflare API token
  --cloudflare-zone-id ZONEID   Cloudflare zone id
  --cloudflare-ttl TTL          Cloudflare DNS TTL (default 300)
  --vercel-ipv4 IPV4            IPv4 A record for Vercel (default 76.76.21.21)
  --phone NUMBER               Business phone for SMS opt-out instructions
  --sms-description TEXT       Brief SMS business description for legal pages
  --force                      Overwrite an existing target directory
  --help, -h                  Show this help

Examples:
  bun run scripts/website-factory.mjs "technology consulting firm for SMB automations"
  bun run scripts/website-factory.mjs --company "Visapien" --domain visapien.com --description "Technology consulting ..."
`;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

function inferCompany(description, explicitCompany) {
  if (explicitCompany) return explicitCompany;
  const maybe = description.match(/for\s+([A-Z][a-zA-Z0-9&\s]{2,})/);
  if (maybe?.[1]) return maybe[1].trim();
  const firstWords = description.replace(/[,.:].*/, '').split(' ').filter(Boolean).slice(0, 3).join(' ');
  return firstWords || 'Your Company';
}

function safeSentence(text, fallback) {
  const output = String(text || fallback).replace(/\s+/g, ' ').trim();
  return output.length > 140 ? `${output.slice(0, 137)}...` : output;
}

function generateCopy(description, company) {
  const desc = description.toLowerCase();
  const core = description.trim() ? description : `${company} delivers strategy and technical execution for modern businesses.`;
  const headline = safeSentence(core.split('.').find(Boolean) || core, `${company} builds practical AI systems for real teams.`);
  const subtitle =
    'We align technology strategy, workflow automation, and custom software so your team can ship faster without adding operational drag.';

  const services = [
    {
      title: 'AI strategy and operations planning',
      body: `${company} maps tools, teams, and data to define a practical AI-first roadmap with measurable outcomes.`,
    },
    {
      title: 'Workflow automation delivery',
      body: 'We design automations for intake, CRM, billing, reporting, and customer touchpoints to remove repetitive work.',
    },
    {
      title: 'Custom solution engineering',
      body: 'We build and integrate secure web apps, dashboards, and API workflows that match your exact operating model.',
    },
    {
      title: 'Governance and enablement',
      body: 'We define ownership, handover, documentation, and support patterns to keep execution stable after launch.',
    },
  ];

  if (desc.includes('consult')) {
    services[0].body = `${company} combines technical capability with business fluency to design AI-first strategy your team can follow.`;
  }
  if (desc.includes('automate')) {
    services[1].body = `${company} builds automations with rollback-safe deployment patterns and monitoring from day one.`;
  }
  if (desc.includes('product') || desc.includes('software')) {
    services[2].body = `${company} engineers tailored software around your workflows, data sources, and integrations.`;
  }

  const process = [
    'Discover: systems audit, team interviews, pain-point map.',
    'Design: architecture, automation roadmap, implementation priorities.',
    'Build: short sprints, live demos, secure integrations.',
    'Deploy: launch, training, observability, and continuous improvement.',
  ];

  const icp = [
    'Small and medium businesses using multiple disconnected systems.',
    'Teams with repetitive manual operations and growing support pressure.',
    'Founders scaling operations from startup stage to stable growth.',
  ];

  return {
    headline,
    subtitle,
    uvpHeadline: `${company} brings strategy, build, and launch into one practical workflow.`,
    uvpBody:
      'We avoid generic AI platform pitches and ship measurable systems. Every initiative is tied to an owner, a sequence, and a KPI.',
    services,
    process,
    icp,
  };
}

function applyTemplate(content, values) {
  return content.replace(/\{\{([A-Z0-9_\-]+)\}\}/g, (_, token) => {
    if (token in values) return values[token];
    return '';
  });
}

async function renderTemplates(targetDir, replacements) {
  const walk = async (dir) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const source = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(source);
        continue;
      }
      if (!entry.name.endsWith(TEMPLATE_SUFFIX)) continue;
      const content = await fs.readFile(source, 'utf8');
      const rendered = applyTemplate(content, replacements);
      const destination = source.replace(new RegExp(`${TEMPLATE_SUFFIX.replace('.', '\\.')}$`), '');
      await fs.writeFile(destination, rendered);
      await fs.unlink(source);
    }
  };

  await walk(targetDir);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      env: options.env || process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    proc.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    proc.on('close', (code) => {
      if (code === 0) return resolve({ stdout, stderr });
      const error = new Error(`Command failed: ${command} ${args.join(' ')} (code: ${code})`);
      error.stdout = stdout;
      error.stderr = stderr;
      return reject(error);
    });
  });
}

async function executeSkills(output, options) {
  const skills = [];
  const runMedia = options.runMedia || (options.runwareKey && !options.skipMedia);

  if (runMedia) {
    if (!options.runwareKey) {
      skills.push({
        id: 'runware-media',
        status: 'skipped',
        note: 'runware key missing; pass --runware-key or set in environment',
      });
    } else {
      try {
        await runCommand('bun', ['run', 'scripts/generate-runware-media.mjs', 'images'], {
          cwd: output,
          env: {
            ...process.env,
            RUNWARE_API_KEY: options.runwareKey,
          },
        });
        skills.push({ id: 'runware-media', status: 'completed' });
      } catch (error) {
        skills.push({ id: 'runware-media', status: 'failed', note: error.message });
      }
    }
  } else {
    skills.push({ id: 'runware-media', status: 'skipped', note: 'disabled by --skip-media' });
  }

  if (options.includeCloudflare) {
    if (!options.cloudflareToken || !options.cloudflareZoneId) {
      skills.push({
        id: 'cloudflare-dns',
        status: 'skipped',
        note: 'missing --cloudflare-token or --cloudflare-zone-id',
      });
    } else {
      try {
        await runCommand('bun', ['run', 'scripts/setup-cloudflare-domain.mjs'], {
          cwd: output,
          env: {
            ...process.env,
            ROOT_DOMAIN: options.domain,
            CLOUDFLARE_API_TOKEN: options.cloudflareToken,
            CLOUDFLARE_ZONE_ID: options.cloudflareZoneId,
            VERCEL_IPV4: options.vercelIpv4 || '76.76.21.21',
            CLOUDFLARE_TTL: options.cloudflareTtl || '300',
          },
        });
        skills.push({ id: 'cloudflare-dns', status: 'completed' });
      } catch (error) {
        skills.push({ id: 'cloudflare-dns', status: 'failed', note: error.message });
      }
    }
  } else {
    skills.push({
      id: 'cloudflare-dns',
      status: 'skipped',
      note: 'set --include-cloudflare to sync records',
    });
  }

  return skills;
}

async function writeManifest(output, payload) {
  const manifestPath = path.join(output, '.factory', 'blueprint.json');
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, `${JSON.stringify(payload, null, 2)}\n`);
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.help || parsed.h) {
    console.log(usage());
    return;
  }

  const description = parsed.description || parsed._[0] || '';
  if (!description.trim()) {
    console.log(usage());
    process.exit(1);
  }

  const company = inferCompany(description, parsed.company);
  const slug = parsed.slug || slugify(company);
  const domain = parsed.domain || `${slug}.com`;
  const output = path.resolve(process.cwd(), parsed.output || `./${slug}`);
  const email = parsed.email || parsed['contact-email'] || `hello@${domain}`;
  const phone = parsed.phone || '';
  const smsDescription = parsed['sms-description'] || 'business services';
  const copy = generateCopy(description, company);
  const web3formsKey = parsed['web3forms-key'] || process.env.PUBLIC_WEB3FORMS_ACCESS_KEY || process.env.WEB3FORMS_KEY || '';
  const runwareKey = parsed['runware-key'] || process.env.RUNWARE_API_KEY || '';

  const replacements = {
    COMPANY_NAME: company,
    COMPANY_SLUG: slug,
    DOMAIN: domain,
    YEAR: String(new Date().getFullYear()),
    TAGLINE: safeSentence(copy.uvpHeadline, `${company} for practical AI and systems growth.`),
    HERO_HEADLINE: safeSentence(copy.headline, `${company} modernizes operations with practical AI.`),
    HERO_SUBTITLE: copy.subtitle,
    UVP_HEADLINE: copy.uvpHeadline,
    UVP_BODY: copy.uvpBody,
    SERVICES_JSON: JSON.stringify(copy.services, null, 2),
    PROCESS_JSON: JSON.stringify(copy.process, null, 2),
    ICP_JSON: JSON.stringify(copy.icp, null, 2),
    CONTACT_EMAIL: email,
    PHONE_NUMBER: phone,
    SMS_DESCRIPTION: smsDescription,
    WEB3FORMS_KEY: web3formsKey,
  };

  if (await exists(output)) {
    if (!parsed.force) {
      console.error(`Output exists: ${output}`);
      console.error('Use --force to overwrite or point --output to a new folder.');
      process.exit(1);
    }
  } else {
    await fs.mkdir(output, { recursive: true });
  }

  await fs.rm(output, { recursive: true, force: true });
  await fs.mkdir(output, { recursive: true });
  await fs.cp(TEMPLATE_ROOT, output, { recursive: true });
  await renderTemplates(output, replacements);

  if (parsed['write-env']) {
    const envLines = [
      web3formsKey ? `PUBLIC_WEB3FORMS_ACCESS_KEY=${web3formsKey}` : 'PUBLIC_WEB3FORMS_ACCESS_KEY=',
      `RUNWARE_API_KEY=${runwareKey || ''}`,
      'RUNWARE_API_URL=https://api.runware.ai/v1',
      `PUBLIC_SITE_URL=https://${domain}`,
      `CONTACT_EMAIL=${email}`,
      '',
    ];
    await fs.writeFile(path.join(output, '.env'), envLines.join('\n'));
  }

  const runtimeSkills = await executeSkills(output, {
    domain,
    runMedia: parsed['run-media'],
    skipMedia: parsed['skip-media'],
    runwareKey,
    includeCloudflare: parsed['include-cloudflare'],
    cloudflareToken: parsed['cloudflare-token'],
    cloudflareZoneId: parsed['cloudflare-zone-id'],
    cloudflareTtl: parsed['cloudflare-ttl'],
    vercelIpv4: parsed['vercel-ipv4'],
  });
  const skillStatuses = [
    {
      id: 'content-scaffold',
      status: 'completed',
      note: 'copied templates and rendered placeholders',
    },
    {
      id: 'vercel-setup',
      status: 'pending-manual',
      note: 'deploy workflow and README included; connect GitHub repo in Vercel',
    },
    ...runtimeSkills,
  ];

  const manifest = {
    createdAt: new Date().toISOString(),
    sourceDescription: description,
    domain,
    company,
    slug,
    output,
    generatedFrom: 'scripts/website-factory.mjs',
    skills: skillStatuses,
  };
  await writeManifest(output, manifest);

  console.log('Factory complete.');
  console.log(`Project scaffold created at: ${output}`);
  console.log('Next steps:');
  console.log(`  1) cd ${output}`);
  console.log('  2) bun install');
  console.log('  3) Add / edit PUBLIC_WEB3FORMS_ACCESS_KEY in .env.local');
  console.log('  4) Connect this repo to Vercel for auto deploy from GitHub');
  console.log('  5) Add custom domain DNS + run Cloudflare skill if enabled.');
}

async function exists(target) {
  try {
    await fs.stat(target);
    return true;
  } catch {
    return false;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
