# Website content source of truth

| Project | Repository | Version source | License | Claim boundary |
| --- | --- | --- | --- | --- |
| Desktop | `SakuraMathcraft/LaTeXSnipper` | Desktop release manifest | GPL-3.0 | Main user application; Windows is the primary release platform. |
| Core | `strangelion/latexsnipper-core` | `core.lock.json` / generated `core-build.json` | AGPL-3.0 | Document AST, semantic conversion and OCR foundation. Browser OCR runtime compatibility is not an accuracy guarantee. |
| Office | `strangelion/LaTeXSnipper-Office` | Repository release metadata | AGPL-3.0 | Independent formula editor and integration ecosystem; host support has per-host maturity. |
| Mobile | `strangelion/LaTeXSnipper_mobile` | Repository release metadata | AGPL-3.0 | Android-first local OCR companion. iOS code/build support is not an iOS release claim. |

The Desktop download center reads `public/release-manifest.json`. Only assets in
that manifest may be rendered as a direct download. Do not use this website's
MIT license as a license claim for the ecosystem.
