#!/usr/bin/env python3
"""Resolve the newest complete stable LaTeXSnipper release for website/R2 sync."""
from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

UPSTREAM = "SakuraMathcraft/LaTeXSnipper"
API = f"https://api.github.com/repos/{UPSTREAM}"
MANIFEST = Path("public/release-manifest.json")
STATE = Path(".release_state.json")
SEMVER_RE = re.compile(r"(?<!\d)(\d+)\.(\d+)\.(\d+)(?!\d)")

ASSET_META = {
    "windows-x86_64": {
        "name": lambda v: f"LaTeXSnipperSetup-{v}.exe",
        "platform": "windows",
        "label": "Windows",
        "architecture": "x86_64",
        "requirements": "Windows 10 / 11",
    },
    "linux-amd64": {
        "name": lambda v: f"LaTeXSnipper_{v}_amd64.deb",
        "platform": "linux",
        "label": "Linux",
        "architecture": "x86_64",
        "requirements": "Debian / Ubuntu 及兼容发行版；可选依赖环境需要 Python >=3.10,<3.13",
    },
    "macos-arm64": {
        "name": lambda v: f"LaTeXSnipper_{v}_arm64.dmg",
        "platform": "macos",
        "label": "macOS",
        "architecture": "Apple Silicon",
        "requirements": "macOS 11 或更高版本；截图需屏幕录制权限；可选依赖环境需要 Python >=3.10,<3.13",
    },
    "office-plugin-windows": {
        "name": lambda v: f"OfficePluginSetup-{v}.exe",
        "platform": "windows",
        "label": "Desktop 内置 Office 插件",
        "architecture": "x86_64",
        "requirements": "Windows Word / PowerPoint；与 Desktop 同属 SakuraMathcraft/LaTeXSnipper",
    },
}


def api_json(url: str) -> Any:
    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "LaTeXSnipper-Web-release-sync",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")[:800]
        raise RuntimeError(f"GitHub API {exc.code}: {body}") from exc


def version_tuple(value: str) -> tuple[int, int, int] | None:
    match = SEMVER_RE.search(value or "")
    return tuple(map(int, match.groups())) if match else None


def read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def releases() -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for page in range(1, 6):
        payload = api_json(f"{API}/releases?per_page=100&page={page}")
        if not isinstance(payload, list):
            raise RuntimeError(f"Unexpected releases payload: {payload!r}")
        result.extend(payload)
        if len(payload) < 100:
            break
    return result


def resolve() -> dict[str, Any]:
    candidates: list[tuple[tuple[int, int, int], dict[str, Any], str, list[dict[str, Any]]]] = []

    for release in releases():
        if release.get("draft") or release.get("prerelease"):
            continue
        tag = str(release.get("tag_name") or "")
        vt = version_tuple(tag)
        if vt is None:
            continue
        version = ".".join(map(str, vt))
        by_name = {a.get("name"): a for a in release.get("assets", []) if a.get("name")}
        selected: list[dict[str, Any]] = []
        missing: list[str] = []
        for asset_id, meta in ASSET_META.items():
            name = meta["name"](version)
            asset = by_name.get(name)
            if not asset:
                missing.append(name)
                continue
            selected.append({
                "id": asset_id,
                "name": name,
                "url": asset.get("browser_download_url"),
                "updated_at": asset.get("updated_at") or "",
                "size": asset.get("size") or 0,
                "platform": meta["platform"],
                "label": meta["label"],
                "architecture": meta["architecture"],
                "requirements": meta["requirements"],
            })
        if missing:
            print(f"skip incomplete {tag}: {', '.join(missing)}")
            continue
        candidates.append((vt, release, version, selected))

    if not candidates:
        raise RuntimeError("No stable release has the complete Windows/Linux/macOS/Office asset set")

    candidates.sort(key=lambda x: x[0], reverse=True)
    _, release, version, selected = candidates[0]
    tag = str(release.get("tag_name") or "")
    html_url = str(release.get("html_url") or f"https://github.com/{UPSTREAM}/releases/tag/{tag}")
    channel = "LTS" if "lts" in f"{tag} {release.get('name', '')}".lower() else "stable"
    return {
        "version": version,
        "tag": tag,
        "channel": channel,
        "publishedAt": release.get("published_at") or release.get("created_at") or "",
        "releaseNotesUrl": html_url,
        "assets": selected,
    }


def output(name: str, value: str) -> None:
    path = os.environ.get("GITHUB_OUTPUT")
    if path:
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(f"{name}={value}\n")
    print(f"{name}={value}")


def main() -> None:
    resolved = resolve()
    manifest = read_json(MANIFEST, {})
    state = read_json(STATE, {})
    timestamps = {a["name"]: a["updated_at"] for a in resolved["assets"]}
    old_timestamps = state.get("assets", {}) if isinstance(state, dict) else {}

    expected_hrefs = {a["id"]: f"/dl/{a['name']}" for a in resolved["assets"]}
    current_hrefs = {a.get("id"): a.get("href") for a in manifest.get("assets", [])}
    manifest_changed = (
        manifest.get("version") != resolved["version"]
        or manifest.get("channel") != resolved["channel"]
        or manifest.get("releaseNotesUrl") != resolved["releaseNotesUrl"]
        or any(current_hrefs.get(k) != v for k, v in expected_hrefs.items())
    )

    manual = os.environ.get("GITHUB_EVENT_NAME") == "workflow_dispatch"
    changed = [
        a["name"] for a in resolved["assets"]
        if manual or manifest_changed or old_timestamps.get(a["name"]) != a["updated_at"]
    ]

    print(f"Resolved upstream release: {resolved['tag']} ({resolved['version']})")
    print(f"Manifest version: {manifest.get('version', '(none)')}")
    print(f"Changed assets: {changed}")

    output("should_sync", "true" if changed else "false")
    output("changed_assets", json.dumps(changed, separators=(",", ":")))
    output("asset_timestamps", json.dumps(timestamps, separators=(",", ":")))
    output("resolved_release", json.dumps(resolved, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    main()
