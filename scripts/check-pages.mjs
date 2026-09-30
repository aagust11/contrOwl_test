import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const html = readFileSync('dist/index.html', 'utf8');
const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]);
assert(assets.some(path => path.endsWith('/contrOwl.png')), 'Favicon missing');
assert(assets.some(path => path.includes('/assets/')), 'Compiled assets missing');
for (const asset of assets) {
  if (/^https?:/.test(asset)) continue;
  assert(!asset.startsWith('/src/'), 'Source entrypoint was not compiled');
  const relative = asset.includes('/assets/') ? asset.slice(asset.indexOf('/assets/') + 1) : asset.split('/').pop();
  assert(existsSync('dist/' + relative), 'Missing build asset: ' + asset);
}
const app = readFileSync('src/App.tsx', 'utf8');
assert(!/new WebSocket|fetch\s*\(/.test(app), 'Static demo must not call nonexistent API/WS endpoints');
console.log('Pages assets and static entrypoint checked.');
