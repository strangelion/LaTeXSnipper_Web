# Cloudflare deployment

1. Install locked packages: `npm ci`.
2. Validate and build: `npm test`, then `npm run build`.
3. Confirm required files in `deploy/`; `scripts/assemble-deploy.mjs` does this.
4. Validate the top-level production service with `npx wrangler deploy --dry-run --env=""`.
5. Deploy with `npm run deploy` (production) or `npm run deploy:preview`.

Wrangler uses `ecosystem-worker.js` as its entrypoint. That wrapper imports
`worker.js`, adds ecosystem metadata, and serves `[assets].directory = "deploy"`.
`run_worker_first` is required because proxy, metadata, security-header, and
quota routes must pass through the Worker before static asset serving.

The production service is the top-level Wrangler environment, so `--env=""` is
intentional. The only named environment is `preview`.

Secrets belong in Cloudflare (`wrangler secret put`), never in tracked files.
