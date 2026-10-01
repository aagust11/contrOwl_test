import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const { chromium } = createRequire('/tmp/controwl-browser/package.json')('playwright');
const dir = mkdtempSync(join(tmpdir(), 'controwl-browser-'));
const origin = 'http://127.0.0.1:3992';
const server = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], { env: { ...process.env, PORT: '3992', CONTROWL_DATA_DIR: dir, CONTROWL_ADMIN_PASSWORD: 'browser-test-password', CONTROWL_TLS_CERT: '', CONTROWL_TLS_KEY: '' }, stdio: ['ignore', 'pipe', 'inherit'] });
let browser;
const pause = ms => new Promise(r => setTimeout(r, ms));
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(origin + '/api/health')).ok) break; } catch {} await pause(100); }
  browser = await chromium.launch();
  let teacherContext = await browser.newContext();
  let teacher = await teacherContext.newPage(); const student = await browser.newPage();
  const errors = []; for (const p of [teacher, student]) p.on('pageerror', e => errors.push(e.message));
  // Deterministic capture source for transport testing; not a test of OS permissions.
  await student.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', { value: async () => {
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#123456'; ctx.fillRect(0, 0, 640, 360);
      const stream = canvas.captureStream(2);
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings.bind(track);
      track.getSettings = () => ({ ...settings(), displaySurface: 'monitor' });
      setInterval(() => { ctx.fillText(String(Date.now()), 10, 20); }, 500);
      return stream;
    } });
  });
  await teacher.goto(origin + '/administration');
  await teacher.getByLabel('Contrasenya docent').fill('browser-test-password');
  await teacher.getByRole('button', { name: 'Iniciar sessió' }).click();
  await teacher.getByLabel('Nom de la sessió').fill('Prova navegador');
  await teacher.getByLabel('URL de l’examen').fill('https://example.org');
  await teacher.getByLabel('Codi (buit = aleatori)').fill('TEST23');
  await teacher.getByRole('button', { name: 'Crear sessió', exact: true }).click();
  await teacher.getByText('TEST23', { exact: true }).waitFor();
  await teacher.reload();
  await teacher.getByText('TEST23', { exact: true }).waitFor();
  assert.equal(await teacher.getByLabel('Contrasenya docent').count(), 0, 'teacher login was lost on refresh');
  await student.goto(origin);
  assert.equal(await student.getByRole('button', { name: 'Soc docent' }).count(), 0, 'student landing exposes old role switch');
  await student.getByLabel('Codi de sessió').fill('test23');
  await student.getByLabel('Nom i cognoms').fill('Alumne Navegador');
  await student.getByLabel('Dispositiu', { exact: true }).fill('PC-N');
  await student.getByRole('button', { name: 'Entrar', exact: true }).click();
  await student.getByRole('button', { name: 'Compartir pantalla sencera' }).click();
  await teacher.getByRole('img', { name: 'Pantalla de Alumne Navegador' }).waitFor({ timeout: 15000 });
  await student.locator('iframe[title="Examen"]').waitFor();
  const savedLogin = await teacherContext.storageState();
  assert(savedLogin.cookies.some(c => c.name === 'controwl_admin' && c.httpOnly && c.expires > Date.now() / 1000));
  await teacherContext.close();
  assert(await student.locator('iframe[title="Examen"]').isVisible(), 'closing teacher interrupted student');
  // Signal a visibility change through the real event handler, without depending on headless focus.
  await student.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await student.getByRole('heading', { name: 'Sessió temporalment bloquejada' }).waitFor();
  // The incident happened with no teacher browser open. Reopen with the persistent cookie.
  teacherContext = await browser.newContext({ storageState: savedLogin });
  teacher = await teacherContext.newPage();
  teacher.on('pageerror', e => errors.push(e.message));
  await teacher.goto(origin + '/administration');
  await teacher.getByText('TEST23', { exact: true }).waitFor();
  await teacher.locator('article').getByText('Bloquejat', { exact: true }).waitFor();
  await teacher.locator('article').getByRole('button', { name: 'Incidències', exact: true }).click();
  await teacher.getByRole('dialog').getByText(/La pestanya de ContrOwl/).waitFor();
  await teacher.getByRole('button', { name: 'Tancar', exact: true }).click();
  await teacher.locator('article').getByRole('button', { name: 'Desbloquejar', exact: true }).click();
  await student.getByRole('heading', { name: 'Sessió temporalment bloquejada' }).waitFor({ state: 'hidden' });
  await teacher.locator('article').getByText('Actiu', { exact: true }).waitFor();
  await teacher.locator('article').getByRole('button', { name: 'Fer captura' }).click();
  await teacher.getByText(/Captura rebuda de Alumne Navegador/).waitFor();
  teacher.once('dialog', d => d.accept());
  await teacher.getByRole('button', { name: 'Finalitzar sessió', exact: true }).click();
  await student.getByRole('heading', { name: 'Sessió finalitzada', exact: true }).waitFor();
  await teacher.getByRole('button', { name: 'Tancar sessió docent' }).click();
  await teacher.getByRole('heading', { name: 'Accés del docent' }).waitFor();
  await teacher.reload();
  await teacher.getByRole('heading', { name: 'Accés del docent' }).waitFor();
  assert.deepEqual(errors, []);
  console.log('Live browser passed: teacher login/create, student join/capture, remote frames, incident, ECDSA unlock, snapshot, end.');
} finally {
  await browser?.close();
  const stopped = new Promise(r => server.once('exit', r)); server.kill('SIGTERM'); await stopped;
  rmSync(dir, { recursive: true, force: true });
}
