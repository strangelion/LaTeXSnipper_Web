# Website content source of truth

| Project | Repository | Version source | License | Claim boundary |
| --- | --- | --- | --- | --- |
| Desktop | `SakuraMathcraft/LaTeXSnipper` | Desktop release manifest | GPL-3.0 | Main user application; Windows is the primary release platform. |
| Core | `strangelion/latexsnipper-core` | GitHub stable release / semver tag for ecosystem UI; `core.lock.json` / generated `core-build.json` for the locked browser runtime | AGPL-3.0 | Document AST, semantic conversion and OCR foundation. Browser OCR runtime compatibility is not an accuracy guarantee. |
| Office | `strangelion/LaTeXSnipper-Office` | GitHub stable release / semver tag | AGPL-3.0 | Independent formula editor and integration ecosystem; host support has per-host maturity. |
| Mobile | `strangelion/LaTeXSnipper_mobile` | GitHub stable release / semver tag | AGPL-3.0 | Android-first local OCR companion. iOS code/build support is not an iOS release claim. |

The Desktop download center reads `public/release-manifest.json`. Only assets in
that manifest may be rendered as a direct download. Do not use this website's
MIT license as a license claim for the ecosystem.

The deployed Worker exposes `/api/ecosystem` as the shared metadata endpoint for
the homepage ecosystem cards and the project boundary block on the download
page. Desktop version/channel data comes from `release-manifest.json`; Mobile,
Office and Core versions come from the latest stable GitHub Release, with the
highest stable semantic-version tag as a fallback. Repository owner, license,
URL and archive state come from GitHub repository metadata. Product maturity
labels such as `稳定发布`, `独立仓库` and `Core 3 稳定契约` remain explicit website
claims and are not inferred from GitHub.

The endpoint is cached at the Worker edge for one hour and has safe static
fallbacks so a temporary GitHub API failure does not blank the page. A
`GITHUB_TOKEN` Worker secret is optional but recommended to raise GitHub API
rate limits; it must never be exposed to browser JavaScript.
