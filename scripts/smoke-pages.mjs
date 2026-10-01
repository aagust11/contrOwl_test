import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE || '/tmp/controwl-browser/package.json');
const {chromium} = require('playwright');
const base = process.env.PAGES_BASE_PATH || '/contrOwl_test/';
const origin = 'http://127.0.0.1:4173';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort', '--base', base], {stdio: 'inherit'});
let browser;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {try {if ((await fetch(origin + base)).ok) {ready = true; break;}} catch {} await new Promise(r => setTimeout(r, 250));}
  assert(ready);
  browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox']}); const page = await browser.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => {if (r.url().startsWith(origin) && r.status() >= 400) errors.push(r.url());});
  page.on('websocket', ws => errors.push(ws.url()));
  await page.goto(origin + base, {waitUntil: 'networkidle'});
  assert(await page.getByRole('heading', {name: 'Entrar a la sessió'}).isVisible());
  assert(await page.getByRole('button', {name: 'Crear invitació'}).isEnabled());
  assert(await page.locator('header img').evaluate(img => img.complete && img.naturalWidth > 0));
  await page.goto(origin + base + 'administration/', {waitUntil: 'networkidle'});
  assert(await page.getByRole('heading', {name: 'Panell de control'}).isVisible());
  assert(await page.getByRole('button', {name: 'Crear sessió'}).isEnabled());
  await page.reload({waitUntil: 'networkidle'});
  assert(await page.getByRole('button', {name: 'Crear sessió'}).isEnabled());
  assert.deepEqual(errors, []);
  console.log('PASS: Pages student entry, usable teacher route, logo, reload, no WebSocket backend.');
} finally {await browser?.close(); server.kill();}
