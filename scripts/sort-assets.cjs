#!/usr/bin/env node
// Keeps assets/used/ holding exactly the files the game loads, and assets/unused/ holding everything else.
//
//   node scripts/sort-assets.cjs          move misplaced files into the right folder
//   node scripts/sort-assets.cjs --check  report misplaced files and broken references, exit 1 if any
//
// "Used" means referenced from the shipped game (index.html, the root *.js files, style.css) as
// assets/used/<path>. A reference may be a filename prefix, so templated paths such as
// `assets/used/lighting/hard-states-v7/living-c${...}.png` mark every matching state as used.
// Non-image sidecars (.json, .md) inside a folder follow the images beside them. Art notes and
// background-masters.json at the assets root are documentation and are left in place.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const BUCKETS = ['used', 'unused'];
const ROOT_DOCS = /\.md$|^background-masters\.json$/;
const SIDECAR = /\.(json|md|txt)$/i;

function gameFiles() {
  const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.js') || f === 'index.html' || f === 'style.css');
  return files.map(f => path.join(ROOT, f));
}

function references() {
  const refs = new Map();
  const pattern = /assets\/((?:un)?used\/)?([A-Za-z0-9_.\/-]+)/g;
  for (const file of gameFiles()) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(pattern)) {
      const ref = { bucket: match[1] || '', rel: match[2], file: path.basename(file) };
      refs.set(JSON.stringify(ref), ref);
    }
  }
  return [...refs.values()];
}

function walk(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}

// Every asset as { rel, bucket } where bucket is 'used', 'unused' or '' (loose in assets/).
function inventory() {
  const items = [];
  for (const bucket of BUCKETS) for (const rel of walk(path.join(ASSETS, bucket))) items.push({ rel, bucket });
  for (const rel of walk(ASSETS)) {
    if (BUCKETS.includes(rel.split('/')[0]) || (!rel.includes('/') && ROOT_DOCS.test(rel))) continue;
    items.push({ rel, bucket: '' });
  }
  return items;
}

function plan() {
  const refs = references();
  const items = inventory();
  const isUsed = rel => refs.some(ref => rel.startsWith(ref.rel));
  const want = new Map(items.filter(i => !SIDECAR.test(i.rel)).map(i => [i.rel, isUsed(i.rel) ? 'used' : 'unused']));
  for (const item of items.filter(i => SIDECAR.test(i.rel))) {
    const dir = path.posix.dirname(item.rel);
    const siblingUsed = [...want].some(([rel, bucket]) => bucket === 'used' && path.posix.dirname(rel) === dir);
    want.set(item.rel, siblingUsed ? 'used' : 'unused');
  }
  const moves = items.filter(i => i.bucket !== want.get(i.rel)).map(i => ({ ...i, to: want.get(i.rel) }));
  const problems = [];
  for (const ref of refs) {
    if (ref.bucket !== 'used/') problems.push(`${ref.file}: "assets/${ref.bucket}${ref.rel}" must point into assets/used/`);
    if (!items.some(i => i.rel.startsWith(ref.rel))) problems.push(`${ref.file}: "assets/${ref.bucket}${ref.rel}" matches no asset file`);
  }
  return { moves, problems };
}

function tracked(file) {
  try { execFileSync('git', ['ls-files', '--error-unmatch', file], { cwd: ROOT, stdio: 'ignore' }); return true; } catch { return false; }
}

function move({ rel, bucket, to }) {
  const from = path.join(ASSETS, bucket, rel);
  const dest = path.join(ASSETS, to, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (tracked(from)) execFileSync('git', ['mv', from, dest], { cwd: ROOT });
  else fs.renameSync(from, dest);
}

function removeEmptyDirs(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) if (entry.isDirectory()) removeEmptyDirs(path.join(dir, entry.name));
  if (dir !== ASSETS && !BUCKETS.map(b => path.join(ASSETS, b)).includes(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
}

module.exports = { plan };

if (require.main === module) {
  const { moves, problems } = plan();
  const label = m => `${m.bucket || '(loose)'} -> ${m.to}: ${m.rel}`;
  if (process.argv.includes('--check')) {
    for (const m of moves) console.log(`misplaced ${label(m)}`);
    for (const p of problems) console.log(`problem   ${p}`);
    if (!moves.length && !problems.length) console.log('assets/used and assets/unused are correctly sorted.');
    process.exit(moves.length || problems.length ? 1 : 0);
  }
  for (const m of moves) { move(m); console.log(`moved ${label(m)}`); }
  removeEmptyDirs(ASSETS);
  console.log(`${moves.length} file(s) moved.`);
  for (const p of problems) console.log(`problem   ${p}`);
  process.exit(problems.length ? 1 : 0);
}
