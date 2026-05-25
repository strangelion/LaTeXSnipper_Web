# LaTeXSnipper Office Add-in

LaTeX and Typst formula editor for Microsoft Word. Type math in LaTeX,
preview with Typst WASM rendering, and insert as native Office equations.

## Quick Start

```bash
cd office-addin
npm install
npm run dev          # Start webpack dev server on https://localhost:3000
npm start            # Sideload into Word (requires office-addin-debugging)
```

## Architecture

```
taskpane.html ─── taskpane.js ─── typst-utils.js
     │                 │
     ├─ MathLive CDN   ├─ typst.ts WASM (Typst preview)
     ├─ typst.ts CDN   ├─ Office.js (Word integration)
     └─ Office.js      └─ LaTeX->OMML conversion
```

### Modes

| Mode | Input | Preview | Insert |
|------|-------|---------|--------|
| LaTeX | LaTeX in MathLive | MathLive built-in renderer | OMML via MathML bridge |
| Typst | LaTeX in MathLive (auto-converted to Typst) | typst.ts WASM -> SVG | Same OMML path |

### LaTeX->OMML Pipeline

```
LaTeX -> MathLive MathML -> OMML (via MML2OMML.XSL) -> Word
```

For full OMML fidelity, place Microsoft's MML2OMML.XSL in `assets/`.

### Typst Pre/Post Processing

The JS module `typst-utils.js` contains the same pre/post processing
pipeline as the Python `src/backend/typst_utils.py`:

- `preprocessLatexForTypst()` - fix unsupported LaTeX before conversion
- `cleanPandocTypstArtifacts()` - fix pandoc artifacts in Typst output
- `ensureTypstMathGrouping()` - add {} around big-operator bodies

## CJK Font Setup

typst.ts requires OTF/TTF fonts for CJK rendering (WOFF not supported).
Place a CJK OTF font in `src/fonts/` (e.g., `NotoSerifCJKsc-Regular.otf`).

Recommended fonts:
- Noto Serif CJK SC (~1.3MB) - https://github.com/notofonts/noto-cjk
- Noto Sans CJK SC (~7.5MB) - same repo

## Files

```
office-addin/
  manifest.xml          Office Add-in manifest
  package.json          npm config + webpack
  webpack.config.js     Webpack build config
  src/
    taskpane.html       Main UI (MathLive editor, preview, actions)
    taskpane.js         Core logic (MathLive, typst.ts, Office.js)
    taskpane.css        Styles (dark/light theme)
    typst-utils.js      LaTeX->Typst pre/post processing (JS port)
    commands.html       Office commands stub
    commands.js         Office commands handler
    fonts/              Local CJK OTF fonts for typst.ts
  assets/               Icons and XSL files
```

## Known Limitations

- `\color`, `\textcolor` LaTeX commands lose color information (MathML bridge limitation)
- Full OMML fidelity requires MML2OMML.XSL from Microsoft Office installation
- typst.ts first load downloads ~13MB (WASM + fonts), cached after
- Office Add-in requires HTTPS (webpack-dev-server provides self-signed cert)
