#!/usr/bin/env python3
"""
find_unused_assets.py

Two-pass scan of the repository:

  Pass 1 — Unreferenced static assets
      Finds images, fonts, CSVs, etc. that are not referenced anywhere in code.

  Pass 2 — Unimported JS/TS/CSS modules
      Finds source files (components, utilities, hooks, etc.) that are never
      imported by any other file and are not Next.js entry-points or config.

Outputs a single JSON report consumed by the GitHub Action.

Usage:
    python find_unused_assets.py [--repo-root PATH] [--output PATH] [--dry-run]
"""

import os
import re
import json
import argparse
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Shared configuration
# ---------------------------------------------------------------------------

SKIP_DIRS = {
    "node_modules", ".git", ".next", ".vercel", "dist", "build",
    "coverage", ".nyc_output", "__pycache__", ".pytest_cache",
    ".turbo", "out", ".cache", ".husky",
}

# ---------------------------------------------------------------------------
# Pass 1: Unreferenced static assets
# ---------------------------------------------------------------------------

ASSET_DIRS = [
    "public",
    "data",
    "assets",
    "src/assets",
    "app/assets",
]

ASSET_EXTENSIONS = {
    # Images
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico",
    ".avif", ".tiff", ".bmp",
    # Fonts
    ".ttf", ".woff", ".woff2", ".eot", ".otf",
    # Data / documents
    ".csv", ".json", ".geojson", ".xml", ".xlsx", ".pdf",
    # Video / audio
    ".mp4", ".webm", ".ogg", ".mp3", ".wav",
}

CODE_EXTENSIONS_FOR_ASSET_SEARCH = {
    ".js", ".jsx", ".ts", ".tsx",
    ".css", ".scss", ".sass", ".less",
    ".html", ".htm",
    ".md", ".mdx",
    ".json",
    ".yaml", ".yml",
    ".mjs", ".cjs",
}

ALWAYS_KEEP_ASSETS = {
    "favicon.ico", "robots.txt", "sitemap.xml",
    "manifest.json", "manifest.webmanifest",
    "apple-touch-icon.png", ".gitkeep", ".gitignore",
    "og-image.png", "og-image.jpg",
}


def collect_assets(repo_root: Path) -> list[Path]:
    assets = []
    for rel_dir in ASSET_DIRS:
        asset_dir = repo_root / rel_dir
        if not asset_dir.exists():
            continue
        for path in asset_dir.rglob("*"):
            if not path.is_file():
                continue
            if any(part in SKIP_DIRS for part in path.parts):
                continue
            if path.suffix.lower() in ASSET_EXTENSIONS:
                assets.append(path)
    return assets


def build_asset_reference_index(repo_root: Path) -> set[str]:
    refs: set[str] = set()
    for path in repo_root.rglob("*"):
        if not path.is_file():
            continue
        if any(part in SKIP_DIRS for part in path.relative_to(repo_root).parts):
            continue
        if path.suffix.lower() not in CODE_EXTENSIONS_FOR_ASSET_SEARCH:
            continue
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
        except (OSError, PermissionError):
            continue
        ext_pattern = '|'.join(re.escape(e.lstrip('.')) for e in ASSET_EXTENSIONS)
        for match in re.finditer(
            rf'[\w./@\-][\w./@\-]*\.(?:{ext_pattern})\b',
            content, re.IGNORECASE,
        ):
            token = match.group(0).lstrip('./').lstrip('/')
            refs.add(token)
            refs.add(Path(token).name)
    return refs


def is_asset_referenced(asset: Path, refs: set[str], repo_root: Path) -> bool:
    name = asset.name
    if name in ALWAYS_KEEP_ASSETS:
        return True
    if name in refs:
        return True
    rel = asset.relative_to(repo_root).as_posix()
    for candidate in (rel, f"/{rel}", f"./{rel}", name):
        if candidate in refs:
            return True
    return False


# ---------------------------------------------------------------------------
# Pass 2: Unimported JS/TS/CSS modules
# ---------------------------------------------------------------------------

MODULE_SOURCE_DIRS = [
    "components", "lib", "utils", "hooks", "context",
    "store", "services", "helpers", "types", "styles",
    "src/components", "src/lib", "src/utils", "src/hooks",
    "src/context", "src/store", "src/services", "src/helpers",
    "src/types", "src/styles",
    "config",
]

MODULE_EXTENSIONS = {".js", ".jsx", ".ts", ".tsx", ".css", ".scss", ".sass"}

ALWAYS_KEEP_MODULES_BASENAME = {
    "layout.tsx", "layout.jsx", "layout.js",
    "page.tsx", "page.jsx", "page.js",
    "loading.tsx", "loading.jsx", "loading.js",
    "error.tsx", "error.jsx", "error.js",
    "not-found.tsx", "not-found.jsx", "not-found.js",
    "global-error.tsx",
    "route.ts", "route.js",
    "middleware.ts", "middleware.js",
    "instrumentation.ts", "instrumentation.js",
    "next.config.js", "next.config.ts", "next.config.mjs",
    "tailwind.config.js", "tailwind.config.ts",
    "postcss.config.js", "postcss.config.mjs",
    "jest.config.js", "jest.config.ts",
    "vitest.config.ts", "vitest.config.js",
    "playwright.config.ts", "playwright.config.js",
    "eslint.config.js", ".eslintrc.js",
    "prettier.config.js",
    "tsconfig.json",
    "index.ts", "index.tsx", "index.js", "index.jsx",
    "globals.css", "global.css",
    "find_unused_assets.py",
}


def collect_module_files(repo_root: Path) -> list[Path]:
    modules = []
    for rel_dir in MODULE_SOURCE_DIRS:
        src_dir = repo_root / rel_dir
        if not src_dir.exists():
            continue
        for path in src_dir.rglob("*"):
            if not path.is_file():
                continue
            if any(part in SKIP_DIRS for part in path.parts):
                continue
            if path.suffix.lower() not in MODULE_EXTENSIONS:
                continue
            if re.search(r'\.(test|spec)\.[jt]sx?$', path.name, re.IGNORECASE):
                continue
            if path.name in ALWAYS_KEEP_MODULES_BASENAME:
                continue
            if "__tests__" in path.parts or "__mocks__" in path.parts:
                continue
            modules.append(path)
    return modules


def build_import_index(repo_root: Path) -> set[str]:
    import_refs: set[str] = set()
    patterns = [
        re.compile(r"""from\s+['"]([^'"]+)['"]"""),
        re.compile(r"""require\s*\(\s*['"]([^'"]+)['"]\s*\)"""),
        re.compile(r"""import\s*\(\s*['"]([^'"]+)['"]\s*\)"""),
        re.compile(r"""@import\s+['"]([^'"]+)['"]"""),
    ]
    for path in repo_root.rglob("*"):
        if not path.is_file():
            continue
        if any(part in SKIP_DIRS for part in path.relative_to(repo_root).parts):
            continue
        if path.suffix.lower() not in MODULE_EXTENSIONS:
            continue
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
        except (OSError, PermissionError):
            continue
        for pat in patterns:
            for match in pat.finditer(content):
                specifier = match.group(1)
                import_refs.add(specifier)
                import_refs.add(Path(specifier).name)
                stem = Path(specifier).stem
                import_refs.add(stem)
                import_refs.add(Path(specifier.split("/")[-1]).stem)
    return import_refs


def is_module_imported(module: Path, import_refs: set[str], repo_root: Path) -> bool:
    name = module.name
    stem = module.stem
    rel = module.relative_to(repo_root).as_posix()
    rel_no_ext = rel[: -len(module.suffix)] if module.suffix else rel
    candidates = {
        name, stem, rel, rel_no_ext,
        f"./{rel}", f"./{rel_no_ext}",
        f"/{rel}", f"/{rel_no_ext}",
        f"@/{rel}", f"@/{rel_no_ext}",
    }
    parts = module.relative_to(repo_root).parts
    for i in range(len(parts)):
        partial = "/".join(parts[i:])
        partial_no_ext = partial[: -len(module.suffix)] if module.suffix else partial
        candidates.add(partial)
        candidates.add(partial_no_ext)
        candidates.add(f"@/{partial_no_ext}")
    return bool(candidates & import_refs)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Find unreferenced static assets and unimported JS/TS modules."
    )
    parser.add_argument("--repo-root", default=".", help="Path to the repository root")
    parser.add_argument("--output", default="unused_assets.json", help="JSON report output path")
    parser.add_argument("--dry-run", action="store_true", help="Print but don't write output")
    parser.add_argument("--skip-modules", action="store_true", help="Skip the module scan")
    parser.add_argument("--skip-assets", action="store_true", help="Skip the asset scan")
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    print(f"🔍  Scanning repository: {repo_root}\n", flush=True)

    unused_assets: list[str] = []
    if not args.skip_assets:
        print("── Pass 1: Unreferenced static assets ──────────────────────────────", flush=True)
        assets = collect_assets(repo_root)
        print(f"   Found {len(assets)} asset file(s).", flush=True)
        asset_refs = build_asset_reference_index(repo_root)
        print(f"   Reference index: {len(asset_refs)} token(s).", flush=True)
        unused_assets = [
            str(a.relative_to(repo_root).as_posix())
            for a in assets
            if not is_asset_referenced(a, asset_refs, repo_root)
        ]
        if unused_assets:
            print(f"   ⚠️  {len(unused_assets)} unreferenced asset(s):", flush=True)
            for f in unused_assets:
                print(f"      - {f}", flush=True)
        else:
            print("   ✅  All assets are referenced.", flush=True)

    unused_modules: list[str] = []
    if not args.skip_modules:
        print("\n── Pass 2: Unimported JS/TS/CSS modules ────────────────────────────", flush=True)
        modules = collect_module_files(repo_root)
        print(f"   Found {len(modules)} module file(s) to check.", flush=True)
        import_refs = build_import_index(repo_root)
        print(f"   Import index: {len(import_refs)} specifier(s).", flush=True)
        unused_modules = [
            str(m.relative_to(repo_root).as_posix())
            for m in modules
            if not is_module_imported(m, import_refs, repo_root)
        ]
        if unused_modules:
            print(f"   ⚠️  {len(unused_modules)} unimported module(s):", flush=True)
            for f in unused_modules:
                print(f"      - {f}", flush=True)
        else:
            print("   ✅  All modules are imported.", flush=True)

    all_unused = unused_assets + unused_modules
    report = {
        "total_unreferenced_assets": len(unused_assets),
        "total_unimported_modules": len(unused_modules),
        "unreferenced_count": len(all_unused),
        "unreferenced_assets": unused_assets,
        "unimported_modules": unused_modules,
        "all_unused_files": all_unused,
    }

    print(f"\n📋  Total unused files: {len(all_unused)}", flush=True)

    if not args.dry_run:
        output_path = Path(args.output)
        output_path.write_text(json.dumps(report, indent=2))
        print(f"💾  Report written to: {output_path}", flush=True)
    else:
        print("[dry-run] Skipping output file write.", flush=True)

    sys.exit(1 if all_unused else 0)


if __name__ == "__main__":
    main()