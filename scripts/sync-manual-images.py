#!/usr/bin/env python3
"""Sync every image referenced by the user manual into assets/images/.

The manual typ may reference files outside its own directory, for example
"../docs/latexsnipper.png". build_manual.py rewrites such references to
assets/images/<path-with-leading-dots-removed>, so this script writes the
matching file for every reference in the typ instead of copying a fixed list
of names. An upstream rename therefore updates the deployed asset instead of
leaving a silent 404 behind.

References are resolved relative to the typ, both locally and upstream: the
typ lives at the repository root here but at user_manual/ upstream, so a bare
"mathcraft_x.png" is read from <repo>/user_manual/mathcraft_x.png.
"""
from __future__ import annotations

import argparse
import json
import posixpath
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path, PurePosixPath

IMAGE_REF = re.compile(r'(?<![A-Za-z0-9_])image\(\s*"([^"]+)"')
EXTERNAL_PREFIXES = ("http://", "https://", "data:")
# References already pointing at the deployment folder are left untouched by
# build_manual.py, so they are not synced here either.
DEPLOYED_PREFIXES = ("assets/", "/assets/")


def iter_references(typ_text: str) -> list[str]:
    """Return referenced image paths in source order, without duplicates."""
    seen: dict[str, None] = {}
    for match in IMAGE_REF.finditer(typ_text):
        ref = match.group(1).strip()
        if not ref or ref.startswith(EXTERNAL_PREFIXES + DEPLOYED_PREFIXES):
            continue
        seen.setdefault(ref, None)
    return list(seen)


def deployed_name(ref: str) -> str:
    """Mirror build_manual.py: strip leading ../ and ./ from the reference."""
    name = ref.replace("\\", "/")
    while name.startswith("../"):
        name = name[3:]
    while name.startswith("./"):
        name = name[2:]
    return name.lstrip("/")


def upstream_reference(ref: str, typ_dir: str) -> str:
    """Normalized path of the reference inside the upstream repository."""
    return posixpath.normpath(posixpath.join(typ_dir, ref.replace("\\", "/")))


def download(url: str, retries: int = 3) -> bytes:
    # Only plain HTTPS fetches are allowed here, so a reference in the manual
    # cannot make urlopen read a local file:// path.
    if not url.startswith("https://"):
        raise RuntimeError(f"refusing non-HTTPS manual image URL: {url}")
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(url, timeout=60) as response:  # noqa: S310
                return response.read()
        except (urllib.error.URLError, OSError) as exc:  # pragma: no cover - network
            last_error = exc
            if attempt < retries:
                print(f"    retry {attempt}/{retries - 1}: {exc}")
    raise RuntimeError(f"failed to download {url}: {last_error}")


def read_manifest(path: Path) -> list[str]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    images = data.get("images") if isinstance(data, dict) else None
    return [str(item) for item in images] if isinstance(images, list) else []


def write_file(dest: Path, data: bytes) -> bool:
    """Write data when it changed; return True when the file was written."""
    if dest.is_file() and dest.read_bytes() == data:
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return True


def prune_removed_images(manifest_path: Path, previous: list[str], current: list[str], out: Path) -> None:
    """Delete previously synced images that the manual no longer references."""
    for stale in previous:
        if stale in current:
            continue
        try:
            target = out.joinpath(*PurePosixPath(stale).parts)
        except (TypeError, ValueError):
            continue
        if target.is_file():
            target.unlink()
            print(f"  - removed {target.as_posix()} (no longer referenced)")
            # Drop directories the removed image leaves empty.
            parent = target.parent
            while parent != out and parent.is_dir() and not any(parent.iterdir()):
                parent.rmdir()
                parent = parent.parent


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--typ", default="user_manual.typ", help="manual source file")
    parser.add_argument("--upstream-repo", default="SakuraMathcraft/LaTeXSnipper")
    parser.add_argument("--upstream-ref", default="main")
    parser.add_argument("--upstream-typ-dir", default="user_manual", help="directory holding the typ upstream")
    parser.add_argument("--out", default="assets/images", help="deployment directory for manual images")
    parser.add_argument(
        "--manifest",
        default="assets/images/.manual-images.json",
        help="records which files this script wrote so renamed images can be pruned",
    )
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    typ = Path(args.typ)
    if not typ.is_file():
        print(f"error: manual source not found: {typ}", file=sys.stderr)
        return 1

    out = Path(args.out)
    manifest_path = Path(args.manifest)
    references = iter_references(typ.read_text(encoding="utf-8"))
    print(f"Syncing {len(references)} manual image reference(s) into {out.as_posix()}:")

    synced: list[str] = []
    failures = 0
    for ref in references:
        name = deployed_name(ref)
        parts = PurePosixPath(name).parts
        if not name or name.startswith("/") or ".." in parts:
            print(f"  x {ref}: cannot be served from {out.as_posix()}/", file=sys.stderr)
            failures += 1
            continue

        dest = out.joinpath(*parts)
        source_url = (
            f"https://raw.githubusercontent.com/{args.upstream_repo}/"
            f"{args.upstream_ref}/{urllib.parse.quote(upstream_reference(ref, args.upstream_typ_dir))}"
        )
        try:
            data = download(source_url)
        except RuntimeError as exc:
            # Keep a local checkout usable for offline or dry runs.
            local_source = typ.parent / Path(ref.replace("\\", "/"))
            if local_source.is_file():
                print(f"  ! {ref}: download failed, using local file ({exc})")
                data = local_source.read_bytes()
            else:
                print(f"  x {ref}: {exc}", file=sys.stderr)
                failures += 1
                continue

        written = write_file(dest, data)
        synced.append(name)
        print(f"  {'+' if written else '='} {dest.as_posix()}")

    previous = read_manifest(manifest_path)
    if failures:
        # Never prune after a failed sync: a transient network error must not
        # delete images that are still referenced by the deployed manual.
        print("error: skipping orphan cleanup because some images failed to sync", file=sys.stderr)
        images = sorted(set(previous) | set(synced))
    else:
        prune_removed_images(manifest_path, previous, synced, out)
        images = sorted(set(synced))

    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        json.dumps({"version": 1, "images": images}, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    if failures:
        print(f"error: {failures} manual image(s) could not be synced", file=sys.stderr)
        return 1
    print(f"Synced {len(synced)} image(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
