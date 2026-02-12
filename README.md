# Visapien — Delivery Repository

One-pager landing site for **Visapien.com**, built with Astro + Tailwind using Bun and deployable through Vercel.

## 1) Quick local bootstrap

```bash
cd /Users/erikmarutian/Git/visapien
bun i
bun run dev
```

Open `http://localhost:4321`.

## 2) Project commands

```bash
bun run dev                 # astro dev
bun run build               # production build
bun run preview             # preview production build
bun run check:env           # verify runware env
bun run media:images        # generate 2 landing images
bun run media:video         # generate 1 landing hero video using Seedance 2 target
bun run media:all           # generate images + video
```

## 3) Contact form (Web3Forms)

- Add this to `.env`:
  - `PUBLIC_WEB3FORMS_ACCESS_KEY=your_web3forms_access_key`
- Restart the dev/build process after adding the key.
- In Web3Forms dashboard, set the destination email to **emarutian@gmail.com**.
- The form sends fields: name, email, company, message plus bot-check.

## 4) GitHub CLI flow

```bash
gh auth login
gh repo create visapien --public --source . --remote origin --push
git checkout -b chore/initial-launch
git add .
git commit -m "feat: create visapien landing page and delivery runbook"
git push -u origin chore/initial-launch
```

## 5) Vercel CLI deploy flow (Bun + Vercel CLI)

```bash
bun install -g vercel
vercel login
vercel link
vercel --prod
```

Add custom domain to Vercel:

```bash
vercel domains add talaxy.ai
```

## 6) Cloudflare + GoDaddy domain connection for `talaxy.ai`

### If DNS is managed in Cloudflare
Add DNS records (Zone `talaxy.ai`):
- `A` record: `@` -> `76.76.21.21`
- `AAAA` record (optional): `@` -> `2606:4700:90:0:0:0:0:0` (if Vercel/Cloudflare recommendations require IPv6)
- `CNAME` record: `www` -> `cname.vercel-dns.com`

Use DNS TTL = auto.

### If you prefer CLI-driven DNS provisioning

```bash
wrangler dns records create <ZONE_ID> --name talaxy.ai --type CNAME --content cname.vercel-dns.com --ttl 120 --proxied false
wrangler dns records create <ZONE_ID> --name www --type CNAME --content cname.vercel-dns.com --ttl 120 --proxied false
```

### If domain currently points at GoDaddy nameservers
In GoDaddy, replace nameservers to Cloudflare nameservers first, then apply the DNS records above.

After DNS propagation, open `https://www.talaxy.ai` and `https://visapien.com` to confirm TLS and redirects.

## 7) Meta + assets checklist

- ✅ favicon: `public/favicon.svg`
- ✅ logo: `public/logo.svg`
- ✅ OG card: `public/og-image.svg`
- ✅ landing page: `src/pages/index.astro`
- ✅ responsive styles: `src/styles/global.css`
- ✅ runware scripts: `scripts/generate-runware-media.mjs`
- ✅ delivery plan: `docs/solution-delivery-plan.md`
- ✅ research brief: `docs/uvp-icp-research.md`
- ✅ design system: `DESIGN.md`

## 8) Seedance 2 note

The media generator defaults to `bytedance:seedance@2` and falls back to `bytedance:1@1`.
If your Runware account does not expose a Seedance 2 model yet, keep
`RUNWARE_VIDEO_MODEL=bytedance:1@1` temporarily until availability is confirmed.
