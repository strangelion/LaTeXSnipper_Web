# Web security notes

- Public static routes are served from the Worker `ASSETS` binding. Model and
  download proxy paths remain explicitly allowlisted.
- CSP is route-aware: OCR needs WASM/Worker/COOP/COEP allowances; ordinary
  marketing pages use the narrower profile. The retired website Office.js
  taskpane is not a deployed route.
- `/remote.html` keeps `script-src` same-origin. It carries a per-response nonce
  only because Cloudflare appends that nonce to the JavaScript Detections
  bootstrap it injects into HTML (the injected text embeds a per-request ray id,
  so a fixed hash cannot match), and it names
  `https://static.cloudflareinsights.com` so Cloudflare's Web Analytics beacon
  can load. Neither entry widens what our own markup may execute.
- CORS is only emitted for public binary delivery and is not a default for HTML.
- TOTP is a verifier only; do not expose a future admin API until it has a
  server-validated, HttpOnly, expiring session and strict origin policy.
- The in-memory request limiter is not distributed. Configure Cloudflare WAF or
  Rate Limiting for `/models/*`, `/dl/*`, and especially `/api/unlock`.
