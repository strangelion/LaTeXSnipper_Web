# Web redesign audit

Audited on 2026-07-19 before the redesign implementation.

## Build and deployment path

`npm run build` runs `prepare:web`, Vite, `build:manual`, and `assemble`.
Vite writes the React application to `dist/`; the copy script adds static pages and
manual resources; assembly copies `dist/` and `public/` into `deploy/`. Wrangler
serves `deploy/` through the `ASSETS` binding. `deploy/`, not `dist/`, is the
production static-asset directory.

## Verified retained surfaces

- Browser OCR remains a standalone page with Core WASM, a dedicated Worker,
  ONNX Runtime Web fallback, PDF.js, MathJax, paste, camera, handwriting, and
  locally cached model packages.
- The ORT compatibility path uses the standard SIMD threaded WASM provider. The
  JSEP/WebGPU binary is not bundled because it exceeds the Workers Static Assets
  per-file limit; this does not remove the WASM fallback.
- Core WASM is a release-locked, SHA-256-verified artifact. The build does not
  resolve a moving `latest` tag.
- The retired website-hosted Office.js taskpane, manifests, and static assets are
  no longer shipped. Desktop VSTO documentation and the independent Office
  ecosystem boundary remain documented.
- `/models/*` and `/dl/*` remain proxied public delivery paths with quota logic.

## Findings addressed by this work

1. The maintenance document and README described the retired GitHub-Raw/static
   page path and an unavailable `deploy:prod` command.
2. The Worker used the product version `2.3.8` as its service version.
3. The download page duplicated asset names and checksums while the release
   workflow modified HTML with regular expressions.
4. The landing page mixed a focused product narrative with detailed platform
   tables, making the first path through the site too dense.
5. `worker.js` has valuable compatibility behavior but is still a large module;
   it is intentionally kept intact for this change to avoid an unverified
   Wrangler-module split.

## Deferred operations

No admin console is published in this repository, so an authenticated session
surface is not added speculatively. Before exposing one, implement server-side
session storage and a narrow route allowlist.
The isolate-local rate limiter remains a supplementary guard; Cloudflare WAF or
Rate Limiting rules are required for distributed enforcement.
