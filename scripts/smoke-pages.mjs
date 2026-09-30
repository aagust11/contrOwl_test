import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const require = createRequire('/tmp/controwl-browser/package.json');
const { chromium } = require('playwright');
const base = process.env.PAGES_BASE_PATH || '/contrOwl_test/';
const origin = 'http://127.0.0.1:4173';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort', '--base', base], { stdio: 'inherit' });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(origin + base)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert(ready, 'Preview did not start');
  browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.url().startsWith(origin) && response.status() >= 400) errors.push(response.url()); });
  page.on('websocket', socket => errors.push('Unexpected WebSocket: ' + socket.url()));
  await page.goto(origin + base, { waitUntil: 'networkidle' });
  assert(await page.getByRole('heading', { name: 'Connecta amb l’ordinador del docent' }).isVisible());
  await page.goto(origin + base + '?demo=1', { waitUntil: 'networkidle' });
  assert(await page.getByRole('note').getByText('Demostració local.', { exact: true }).isVisible());
  assert(await page.locator('header img').first().evaluate(img => img.complete && img.naturalWidth > 0), 'Logo failed');
  await page.getByRole('button', { name: /Vista Dividida/ }).click();
  await page.getByPlaceholder('_ _ _ _ _ _').fill('7k4tp9');
  await page.getByRole('button', { name: 'ENTRAR', exact: true }).click();
  await page.getByPlaceholder('Ex. Laia Martínez Vives').fill('Alumne de Prova');
  await page.getByRole('button', { name: 'CONTINUAR I INICIAR EXAMEN' }).click();
  await page.getByRole('button', { name: 'Simula Alt+Tab', exact: true }).click();
  assert(await page.getByRole('heading', { name: 'Sessió temporalment bloquejada', exact: true }).isVisible(), 'Incident overlay missing');
  await page.reload({ waitUntil: 'networkidle' });
  assert(await page.getByRole('note').isVisible(), 'Reload at project path failed');
  assert.deepEqual(errors, [], 'Browser errors or missing assets');
  console.log('Pages smoke passed: base path, logo, split view, code, identity, incident, reload.');
} finally {
  await browser?.close();
  server.kill();
}
