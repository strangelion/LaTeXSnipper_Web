# Admin console

No admin console is currently exposed. `/api/unlock` validates a TOTP code but
does not establish a session and must not be treated as authorization for an
administrative data route.

If an admin console is introduced, require an HttpOnly, Secure, SameSite session
cookie; server-side expiration and revocation; strict same-origin CORS; `noindex`;
and route-specific CSP. The available metrics are PV, route counts, R2 operation
estimates, release health, and runtime health—not unique visitors.
