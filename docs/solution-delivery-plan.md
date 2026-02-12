# Visapien Delivery Plan (Solutions Delivery Pack)

## Mission
Design and deploy a one-pager landing site for Visapien.com with:
- AI-first tone without generic AI visual clichés.
- Tailwind + Astro + Bun stack.
- GitHub, Vercel CLI, and Cloudflare DNS flow.
- Logo + favicon + OG + meta + structured tags.
- Runware/Seedance 2 media generation workflow.

## Executive Agents

### Agent 1 – Creative Director / UI Design
- Deliver visual system, spacing system, typography, and visual hierarchy.
- Own brand assets and motion strategy.
- Delivery: `public/logo.svg`, `public/favicon.svg`, `src/styles/global.css`, copy tone in `src/pages/index.astro`.

### Agent 2 – Copy & Positioning Lead
- Own UVP, ICP, and section-level messaging.
- Run deep-research synthesis from public SME AI sources.
- Delivery: `docs/uvp-icp-research.md`, copy blocks in `src/pages/index.astro`.

### Agent 3 – Build & Delivery Engineer
- Own Astro setup, CI/deploy scripts, and packaging.
- Delivery: `package.json`, `astro.config.mjs`, `tailwind.config.js`, `README.md`.

### Agent 4 – Media Production Lead
- Own runware + Seedance workflow and media output storage.
- Delivery: `scripts/generate-runware-media.mjs`, `scripts/check-runware-env.mjs`, `public/media/hero-poster.svg`.

### Agent 5 – Infrastructure & DNS Lead
- Own Vercel project creation, deploy, and Cloudflare/Godaddy domain handoff.
- Delivery: `README.md` deployment steps, `vercel.json`.

## Execution Checklist

### Phase 1 — Setup (Owner: Build Agent)
- [ ] initialize project locally (`bun install`, verify scripts in `package.json`)
- [ ] run `bun run dev` to confirm page renders
- [ ] create Github repo from CLI and push initial commit

### Phase 2 — Copy + Brand (Owner: Copy + Design Agents)
- [ ] finalize UVP and ICP from research doc
- [ ] freeze section hierarchy and CTA labels
- [ ] validate logo/favicons match tone guidelines
- [ ] finalize OG meta image and social preview copy

### Phase 3 — Media + Brand Assets (Owner: Media Lead)
- [ ] set `.env` from `.env.example`
- [ ] run `bun run check:env`
- [ ] run `bun run media:images` and confirm files in `public/media`
- [ ] run `bun run media:video` with Seedance/ByteDance model availability checks
- [ ] replace poster video placeholder references in final content if needed

### Phase 4 — Deploy (Owner: Infrastructure Lead)
- [ ] create Vercel project via CLI
- [ ] deploy preview and production
- [ ] add domains and test HTTPS
- [ ] update Cloudflare DNS for `talaxy.ai` and optional root/www
- [ ] handoff to GoDaddy pointing to Cloudflare nameservers if zone moved

### Phase 5 — Handoff
- [ ] provide final domain + repo + deployment URL
- [ ] capture environment variable inventory
- [ ] document known risks and model fallback policy
