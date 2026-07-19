# Cloudflare deployment

1. Install locked packages: `npm ci`.
2. Validate and build: `npm test`, then `npm run build`.
3. Confirm required files in `deploy/`; `scripts/assemble-deploy.mjs` does this.
4. Validate with `npx wrangler deploy --env production --dry-run`.
5. Deploy with `npm run deploy` (production) or `npm run deploy:preview`.

Wrangler uses `worker.js` and `[assets].directory = "deploy"`. `run_worker_first`
is required because Office, proxy, security-header, and quota routes must pass
through the Worker before static asset serving.

Secrets belong in Cloudflare (`wrangler secret put`), never in tracked files.
