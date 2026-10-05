#!/usr/bin/env node
/**
 * FILE: scripts/fetch-content.js
 *
 * PURPOSE:
 * Pulls indicator data, metadata and the copy deck from the GitHub data repo
 * into this repo's normal folders BEFORE the build, so the app code keeps
 * reading local files exactly as it does today (no loader changes).
 *
 * OFF BY DEFAULT. With no env vars set (local dev, `npm run dev`, a local
 * `npm run build`) this script does nothing and the local files are used.
 *
 * TURN ON (prod build environment only — e.g. Netlify env vars):
 *   CONTENT_SOURCE=github
 *   CONTENT_REPO=owner/repo-name        the data repo
 *   CONTENT_REF=main                    optional; branch, tag or commit SHA
 *   CONTENT_REPO_PREFIX=some/subfolder  optional; if the folders below sit
 *                                       inside a subfolder of the data repo
 *   GITHUB_TOKEN=...                    optional; only if the repo goes private
 *
 * WHAT IS PULLED (path in data repo -> same path here; edit SOURCES to remap):
 *   data/indicators   replace  — local folder is emptied first, so a file
 *   data/metadata     replace    deleted upstream disappears here too
 *   content/copy      overlay  — CSVs are copied over; the generated JSON is
 *                                rebuilt by build-copy.js right after
 *   content/site      overlay, optional
 *   content/print     overlay, optional
 *
 * A failed download or a missing required folder exits 1 and fails the
 * build, so prod never silently ships stale or half-synced content.
 *
 * ORDER: package.json runs this, then build-copy.js, then `next build`.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

const SOURCES = [
  { from: 'data/indicators', to: 'data/indicators', mode: 'replace', required: true },
  { from: 'data/metadata',   to: 'data/metadata',   mode: 'replace', required: true },
  { from: 'content/copy',    to: 'content/copy',    mode: 'overlay', required: true },
  { from: 'content/site',    to: 'content/site',    mode: 'overlay', required: false },
  { from: 'content/print',   to: 'content/print',   mode: 'overlay', required: false },
];

function countFiles(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    n += e.isDirectory() ? countFiles(path.join(dir, e.name)) : 1;
  }
  return n;
}

/** Copy each SOURCES folder from an extracted checkout into this repo. */
function syncFrom(srcRoot, destRoot = ROOT) {
  // Check everything first so a bad repo layout changes nothing locally.
  const missing = SOURCES.filter(s => s.required && !fs.existsSync(path.join(srcRoot, s.from)));
  if (missing.length) {
    throw new Error(`data repo is missing required folder(s): ${missing.map(s => s.from).join(', ')}`);
  }
  for (const s of SOURCES) {
    const src = path.join(srcRoot, s.from);
    const dest = path.join(destRoot, s.to);
    if (!fs.existsSync(src)) {
      console.log(`[fetch-content] skip ${s.from} (not in data repo, keeping local)`);
      continue;
    }
    if (s.mode === 'replace') fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(dest, { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
    console.log(`[fetch-content] ${s.mode} ${s.to} (${countFiles(src)} files)`);
  }
}

async function download(repo, ref, token, outFile) {
  const url = token
    ? `https://api.github.com/repos/${repo}/tarball/${encodeURIComponent(ref)}`
    : `https://codeload.github.com/${repo}/tar.gz/${encodeURIComponent(ref)}`;
  const headers = { 'User-Agent': 'chp-fetch-content' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub returned ${res.status} for ${repo}@${ref}`);
  fs.writeFileSync(outFile, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  if (process.env.CONTENT_SOURCE !== 'github') {
    console.log('[fetch-content] CONTENT_SOURCE is not "github" — using local files.');
    return;
  }
  const repo = process.env.CONTENT_REPO;
  const ref = process.env.CONTENT_REF || 'main';
  const prefix = process.env.CONTENT_REPO_PREFIX || '';
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo || '')) {
    throw new Error('CONTENT_REPO must be set to "owner/repo"');
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chp-content-'));
  try {
    const tarball = path.join(tmp, 'repo.tar.gz');
    const extracted = path.join(tmp, 'repo');
    fs.mkdirSync(extracted);
    console.log(`[fetch-content] downloading ${repo}@${ref}`);
    await download(repo, ref, process.env.GITHUB_TOKEN, tarball);
    execFileSync('tar', ['-xzf', tarball, '-C', extracted, '--strip-components=1']);
    syncFrom(path.join(extracted, prefix));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(`[fetch-content] FAILED: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { syncFrom, SOURCES };
