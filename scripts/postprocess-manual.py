#!/usr/bin/env python3
"""Apply durable website-only fixes to the generated manual HTML."""
from __future__ import annotations

import json
import re
from pathlib import Path

HTML = Path("user_manual.html")
TYP = Path("user_manual.typ")
MANIFEST = Path("public/release-manifest.json")


def detect_version() -> tuple[str, str]:
    if MANIFEST.exists():
        try:
            manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
            version = str(manifest.get("version") or "").strip()
            channel = str(manifest.get("channel") or "").strip().upper()
            if re.fullmatch(r"\d+\.\d+\.\d+", version):
                return version, channel
        except (json.JSONDecodeError, OSError):
            pass

    text = TYP.read_text(encoding="utf-8") if TYP.exists() else ""
    match = re.search(r"版本:\s*v?(\d+\.\d+\.\d+)(?:[- ]?(LTS|stable))?", text, re.I)
    if match:
        version = match.group(1)
        channel = (match.group(2) or "").upper()
        return version, channel
    return "", ""


def main() -> None:
    html = HTML.read_text(encoding="utf-8")
    version, channel = detect_version()

    viewport = (
        '<meta name="viewport" '
        'content="width=device-width, initial-scale=1, maximum-scale=1, '
        'user-scalable=no, viewport-fit=cover">'
    )
    html, count = re.subn(
        r'<meta\s+name="viewport"\s+content="[^"]*">',
        viewport,
        html,
        count=1,
        flags=re.I,
    )
    if count == 0:
        html = html.replace("<meta charset=\"UTF-8\">", '<meta charset="UTF-8">\n' + viewport, 1)

    mobile_css = '<link rel="stylesheet" href="styles/manual-mobile-fixes.css">'
    if "styles/manual-mobile-fixes.css" not in html:
        html = html.replace(
            '<link rel="stylesheet" href="styles/manual.css">',
            '<link rel="stylesheet" href="styles/manual.css">\n' + mobile_css,
            1,
        )

    if version:
        suffix = f" {channel}" if channel else ""
        title = f"<title>LaTeXSnipper 用户手册 v{version}{suffix}</title>"
        html = re.sub(r"<title>LaTeXSnipper 用户手册[^<]*</title>", title, html, count=1)

        cover_suffix = f"-{channel}" if channel else ""
        html = re.sub(
            r"(适用于\s+v)\d+\.\d+\.\d+(?:[- ](?:LTS|stable))?",
            rf"\g<1>{version}{cover_suffix}",
            html,
            count=1,
            flags=re.I,
        )

    HTML.write_text(html, encoding="utf-8")
    print(
        f"Postprocessed {HTML}: viewport locked, mobile fixes linked, "
        f"release version={version or 'unknown'}"
    )


if __name__ == "__main__":
    main()
