import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE || '/tmp/controwl-browser/package.json');
const {chromium} = require('playwright');
const base = process.env.PAGES_BASE_PATH || '/contrOwl_test/';
const origin = 'http://127.0.0.1:4173';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort', '--base', base], {stdio: 'inherit'});
const profile = await mkdtemp(join(tmpdir(), 'controwl-peer-'));
let teacherContext, studentBrowser;
const errors = [], external = [];
function watch(page) {
  page.on('pageerror', e => errors.push(e.message));
  page.on('websocket', ws => errors.push('Unexpected WebSocket: ' + ws.url()));
  page.on('request', r => {if (!r.url().startsWith(origin) && !r.url().startsWith('data:') && !r.url().startsWith('https://exam.example/')) external.push(r.url());});
  page.on('dialog', d => d.accept());
}
async function teacher() {
  teacherContext = await chromium.launchPersistentContext(profile, {headless: true, executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox']});
  const page = await teacherContext.newPage(); watch(page);
  await page.goto(origin + base + 'administration/');
  await page.getByRole('button', {name: 'Crear sessió', exact: true}).waitFor();
  return page;
}
async function until(check, message) {
  for (let n = 0; n < 220; n++) {if (await check()) return; await new Promise(r => setTimeout(r, 100));}
  throw Error(message);
}
async function pair(student, teacher) {
  await student.getByRole('button', {name: 'Crear invitació', exact: true}).click();
  const offerField = student.getByLabel('La teva invitació', {exact: true});
  try {await until(async () => (await offerField.inputValue()).length > 100, 'Offer not generated');} catch(e) {console.log(await student.locator('main').innerText(), errors); throw e;}
  const offer = await offerField.inputValue();
  assert(!/stun:|turn:/.test(offer));
  await teacher.getByLabel('Invitació de l’alumne', {exact: true}).fill(offer);
  await teacher.getByRole('button', {name: 'Acceptar invitació', exact: true}).click();
  const answerField = teacher.getByLabel('Resposta per a l’alumne', {exact: true});
  await until(async () => (await answerField.inputValue()).length > 100, 'Answer not generated');
  await student.getByLabel('Resposta del docent', {exact: true}).fill(await answerField.inputValue());
  await student.getByRole('button', {name: 'Connectar amb el docent', exact: true}).click();
  await until(async () => (await student.getByRole('status').allTextContents()).some(s => s.includes('Connectat directament')), 'Real WebRTC connection failed');
  await student.getByRole('button', {name: /Compartir pantalla i continuar|Pantalla compartida/}).waitFor();
}
try {
  await until(async () => {try {return (await fetch(origin + base)).ok;} catch {return false;}}, 'Preview failed');
  let t = await teacher();
  await t.getByLabel('Nom de la sessió', {exact: true}).fill('Prova P2P');
  await t.getByLabel('URL de l’examen', {exact: true}).fill('https://exam.example/');
  await t.getByRole('button', {name: 'Crear sessió', exact: true}).click();
  await t.getByTestId('session-code').waitFor();
  const code = await t.getByTestId('session-code').innerText(); assert.match(code, /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
  // Distinct browser processes: the transport is real WebRTC, with no fake peer/channel.
  studentBrowser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox']});
  const s = await studentBrowser.newPage(); watch(s);
  await s.route('https://exam.example/**', route => route.fulfill({contentType: 'text/html', body: '<label>Resposta<input id="answer"></label>'}));
  await s.addInitScript(() => {
    window.__iceConfigs = [];
    const NativePeer = window.RTCPeerConnection;
    window.RTCPeerConnection = class extends NativePeer {constructor(config) {super(config); window.__iceConfigs.push(config);}};
    // Synthetic image source only. Native getDisplayMedia permission UI is a manual classroom test.
    navigator.mediaDevices.getDisplayMedia = async () => {
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#136e63'; ctx.fillRect(0, 0, 640, 360);
      const stream = canvas.captureStream(1);
      const track = stream.getVideoTracks()[0]; track.getSettings = () => ({displaySurface: 'monitor'});
      setInterval(() => {ctx.fillStyle = '#136e63'; ctx.fillRect(0, 0, 640, 360); ctx.fillStyle = 'white'; ctx.fillText(String(Date.now()), 10, 30);}, 900);
      return stream;
    };
  });
  await s.goto(origin + base);
  await s.getByLabel('Nom i cognoms', {exact: true}).fill('Alumne de prova');
  await s.getByLabel('Codi de sessió', {exact: true}).fill(code.toLowerCase());
  await pair(s, t);
  assert.deepEqual(await s.evaluate(() => window.__iceConfigs), [{iceServers: []}]);
  await s.getByRole('button', {name: 'Compartir pantalla i continuar', exact: true}).click();
  await t.getByAltText('Pantalla de Alumne de prova', {exact: true}).waitFor();
  await s.frameLocator('iframe[title="Examen"]').getByLabel('Resposta').fill('Resposta conservada');
  await t.getByRole('button', {name: 'Desar captura', exact: true}).click();
  await until(async () => (await t.locator('summary').innerText()).includes('captures (1)'), 'Snapshot not delivered');
  await s.evaluate(() => {Object.defineProperty(document, 'hidden', {configurable: true, value: true}); document.dispatchEvent(new Event('visibilitychange')); Object.defineProperty(document, 'hidden', {configurable: true, value: false});});
  await s.getByRole('heading', {name: 'Sessió temporalment bloquejada', exact: true}).waitFor();
  await until(async () => (await t.locator('summary').innerText()).includes('Incidències (1)'), 'Incident not delivered');
  await t.getByRole('button', {name: 'Desbloquejar', exact: true}).click();
  await until(async () => !await s.getByRole('heading', {name: 'Sessió temporalment bloquejada', exact: true}).isVisible(), 'Signed unlock failed');
  assert.equal(await s.frameLocator('iframe[title="Examen"]').getByLabel('Resposta').inputValue(), 'Resposta conservada');
  // Full teacher browser restart preserves IndexedDB, including the signing identity.
  await teacherContext.close(); teacherContext = undefined;
  await s.getByRole('heading', {name: 'Sessió temporalment bloquejada', exact: true}).waitFor();
  await until(async () => await s.getByTestId('pending-incidents').isVisible(), 'Offline incident not queued');
  t = await teacher();
  assert.equal(await t.getByTestId('session-code').innerText(), code);
  assert((await t.locator('summary').innerText()).includes('Incidències (1) i captures (1)'));
  await pair(s, t);
  await until(async () => (await t.locator('summary').innerText()).includes('Incidències (2)'), 'Buffered incident not delivered after restart');
  await until(async () => !await s.getByTestId('pending-incidents').isVisible(), 'Persisted receipt not acknowledged');
  await t.getByRole('button', {name: 'Desbloquejar', exact: true}).click();
  await until(async () => !await s.getByRole('heading', {name: 'Sessió temporalment bloquejada', exact: true}).isVisible(), 'Reconnect unlock failed');
  assert.equal(await s.frameLocator('iframe[title="Examen"]').getByLabel('Resposta').inputValue(), 'Resposta conservada');
  await t.getByRole('button', {name: 'Finalitzar sessió', exact: true}).click();
  await s.getByRole('heading', {name: 'Sessió finalitzada', exact: true}).waitFor();
  assert.deepEqual(external, [], 'Unexpected external service request'); assert.deepEqual(errors, [], 'Browser errors');
  console.log('PASS: two native browsers, host-only WebRTC, screen frames, snapshot, incident, signed unlock, iframe answers, full teacher restart, local recovery, queued redelivery, finalization, no external services.');
} finally {
  await teacherContext?.close(); await studentBrowser?.close(); server.kill(); await rm(profile, {recursive: true, force: true});
}
