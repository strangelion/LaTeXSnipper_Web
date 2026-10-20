#!/usr/bin/env python3
"""Resolve the newest complete stable LaTeXSnipper release for website/R2 sync.

Upstream ships a machine-readable ``desktop-release.json`` (schema 2) inside every
release since 3.2: it lists one distribution per platform/edition with the
installer URL, size and SHA256. Reading it keeps this script working when the
installer file names change (3.2 renamed every desktop package to
``LaTeXSnipper_<version>_<platform>_<arch>_<edition>``). Releases that predate
the manifest fall back to the historic file names.
"""
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
DESKTOP_MANIFEST_NAME = "desktop-release.json"
DESKTOP_MANIFEST_SCHEMA = 2

PLATFORM_META: dict[str, dict[str, Any]] = {
    "windows": {
        "slug": "windows-x86_64",
        "label": "Windows",
        "architecture": "x86_64",
        "requirements": "Windows 10 / 11",
        "legacy_names": lambda v: (f"LaTeXSnipper_{v}_amd64.exe", f"LaTeXSnipperSetup-{v}.exe"),
    },
    "linux": {
        "slug": "linux-amd64",
        "label": "Linux",
        "architecture": "x86_64",
        "requirements": "Linux x86_64 便携包（tar.xz）；可选依赖环境需要 Python >=3.10,<3.13",
        "legacy_names": lambda v: (f"LaTeXSnipper_{v}_amd64.deb",),
    },
    "macos": {
        "slug": "macos-arm64",
        "label": "macOS",
        "architecture": "Apple Silicon",
        "requirements": "macOS 11 或更高版本；截图需屏幕录制权限；可选依赖环境需要 Python >=3.10,<3.13",
        "legacy_names": lambda v: (f"LaTeXSnipper_{v}_arm64.dmg",),
    },
}

OFFICE_META: dict[str, Any] = {
    "id": "office-plugin-windows",
    "platform": "windows",
    "label": "Desktop 内置 Office 插件",
    "architecture": "x86_64",
    "requirements": "Windows Word / PowerPoint；与 Desktop 同属 SakuraMathcraft/LaTeXSnipper",
    # The Office plugin is not part of desktop-release.json; it keeps its own names.
    "names": lambda v: (f"LaTeXSnipperOffice_{v}_amd64.exe", f"OfficePluginSetup-{v}.exe"),
}

SHA256_RE = re.compile(r"^[a-f0-9]{64}$")


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
    if not match:
        return None
    major, minor, patch = match.groups()
    return int(major), int(minor), int(patch)


def read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise RuntimeError(f"cannot read {path}: {exc}") from exc


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


def download_json(url: str) -> Any:
    if not url.startswith("https://"):
        raise ValueError(f"refusing to download from a non-HTTPS url: {url!r}")
    req = urllib.request.Request(url, headers={"User-Agent": "LaTeXSnipper-Web-release-sync"})
    try:
        # The URL comes from the GitHub release API and is rejected unless it is HTTPS.
        with urllib.request.urlopen(req, timeout=60) as resp:  # nosemgrep: dynamic-urllib-use-detected
            return json.load(resp)
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"download {url} failed: {exc.code}") from exc


def edition_of(distribution: dict[str, Any]) -> str:
    edition = str(distribution.get("edition") or "").strip().lower()
    if edition in ("cpu", "gpu"):
        return edition
    return "cpu"


def assets_from_desktop_manifest(
    payload: Any, version: str, by_name: dict[str, dict[str, Any]]
) -> list[dict[str, Any]]:
    """Map desktop-release.json distributions onto the site's edition-aware asset ids."""
    if not isinstance(payload, dict):
        raise ValueError("desktop release manifest is not an object")
    if payload.get("schema") != DESKTOP_MANIFEST_SCHEMA:
        raise ValueError(f"unsupported desktop release manifest schema: {payload.get('schema')!r}")
    manifest_version = str(payload.get("version") or "").strip()
    if manifest_version != version:
        raise ValueError(f"desktop release manifest is for {manifest_version!r}, expected {version!r}")

    assets: list[dict[str, Any]] = []
    seen: set[str] = set()
    for distribution in payload.get("distributions") or []:
        if not isinstance(distribution, dict):
            continue
        platform = str(distribution.get("platform") or "").strip().lower()
        meta = PLATFORM_META.get(platform)
        installer = distribution.get("installer") or {}
        url = str(installer.get("url") or "").strip()
        if meta is None or not url:
            continue
        edition = edition_of(distribution)
        asset_id = f"{meta['slug']}-{edition}"
        if asset_id in seen:
            continue
        seen.add(asset_id)
        name = url.rsplit("/", 1)[-1]
        sha256 = str(installer.get("sha256") or "").strip().lower()
        assets.append(
            {
                "id": asset_id,
                "name": name,
                "url": url,
                "updated_at": str((by_name.get(name) or {}).get("updated_at") or ""),
                "size": int(installer.get("size") or 0),
                "sha256": sha256 if SHA256_RE.match(sha256) else "",
                "platform": platform,
                "label": meta["label"],
                "architecture": meta["architecture"],
                "requirements": meta["requirements"],
                "edition": edition,
            }
        )
    return assets


def assets_from_legacy_names(
    by_name: dict[str, dict[str, Any]], version: str
) -> list[dict[str, Any]]:
    """Older releases named one installer per platform and shipped no desktop manifest."""
    assets: list[dict[str, Any]] = []
    for platform, meta in PLATFORM_META.items():
        asset = next((by_name[n] for n in meta["legacy_names"](version) if n in by_name), None)
        if asset is None:
            continue
        assets.append(
            {
                "id": f"{meta['slug']}-cpu",
                "name": asset["name"],
                "url": asset.get("browser_download_url"),
                "updated_at": asset.get("updated_at") or "",
                "size": int(asset.get("size") or 0),
                "sha256": "",
                "platform": platform,
                "label": meta["label"],
                "architecture": meta["architecture"],
                "requirements": meta["requirements"],
                "edition": "cpu",
            }
        )
    return assets


def office_asset(by_name: dict[str, dict[str, Any]], version: str) -> dict[str, Any] | None:
    asset = next((by_name[n] for n in OFFICE_META["names"](version) if n in by_name), None)
    if asset is None:
        return None
    return {
        "id": OFFICE_META["id"],
        "name": asset["name"],
        "url": asset.get("browser_download_url"),
        "updated_at": asset.get("updated_at") or "",
        "size": int(asset.get("size") or 0),
        "sha256": "",
        "platform": OFFICE_META["platform"],
        "label": OFFICE_META["label"],
        "architecture": OFFICE_META["architecture"],
        "requirements": OFFICE_META["requirements"],
        "edition": "",
    }


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
        desktop = by_name.get(DESKTOP_MANIFEST_NAME)
        if desktop is not None and desktop.get("browser_download_url"):
            try:
                selected = assets_from_desktop_manifest(
                    download_json(desktop["browser_download_url"]), version, by_name
                )
            except (ValueError, RuntimeError, urllib.error.URLError) as exc:
                print(f"desktop manifest unusable for {tag}: {exc}")
                selected = []
        if not selected:
            selected = assets_from_legacy_names(by_name, version)

        missing = [p for p in PLATFORM_META if not any(a["platform"] == p for a in selected)]
        if missing:
            print(f"skip incomplete {tag}: {', '.join(missing)}")
            continue
        office = office_asset(by_name, version)
        if office is None:
            print(f"skip incomplete {tag}: {OFFICE_META['id']}")
            continue

        selected.append(office)
        selected.sort(key=lambda a: (a["edition"] != "cpu", a["platform"], a["id"]))
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
        try:
            with open(path, "a", encoding="utf-8") as fh:
                fh.write(f"{name}={value}\n")
        except OSError as exc:
            raise RuntimeError(f"cannot write {name} to GITHUB_OUTPUT: {exc}") from exc
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
    for asset in resolved["assets"]:
        checksum = "sha256" if asset["sha256"] else "no checksum yet"
        print(f"  {asset['id']}: {asset['name']} ({checksum})")
    print(f"Changed assets: {changed}")

    output("should_sync", "true" if changed else "false")
    output("changed_assets", json.dumps(changed, separators=(",", ":")))
    output("asset_timestamps", json.dumps(timestamps, separators=(",", ":")))
    output("resolved_release", json.dumps(resolved, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    main()
