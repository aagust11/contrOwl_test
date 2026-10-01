import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPublicKey, verify } from 'node:crypto';
import WebSocket from 'ws';

const dir = mkdtempSync(join(tmpdir(), 'controwl-test-'));
const port = 3991, origin = 'http://127.0.0.1:' + port;
const password = 'test-password-long-enough';
let server; const sockets = [];
const delay = ms => new Promise(r => setTimeout(r, ms));
async function wait(fn, label) { for (let i = 0; i < 100; i++) { const result = await fn(); if (result) return result; await delay(50); } throw new Error('Timed out: ' + label); }
async function start() {
  server = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], { env: { ...process.env, PORT: String(port), CONTROWL_DATA_DIR: dir, CONTROWL_ADMIN_PASSWORD: password, CONTROWL_TLS_CERT: '', CONTROWL_TLS_KEY: '' }, stdio: ['ignore', 'pipe', 'inherit'] });
  await wait(async () => { try { return (await fetch(origin + '/api/health')).ok; } catch { return false; } }, 'server start');
}
async function stop() { const done = new Promise(r => server.once('exit', r)); server.kill('SIGTERM'); await done; }
async function request(path, token = '', body, method = body === undefined ? 'GET' : 'POST') {
  const res = await fetch(origin + '/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await res.json(); return { status: res.status, data };
}
async function connect(auth) {
  const ws = new WebSocket('ws://127.0.0.1:' + port + '/ws'); const inbox = [];
  sockets.push(ws); ws.on('message', m => inbox.push(JSON.parse(m.toString())));
  await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  ws.send(JSON.stringify({ type: 'AUTH', ...auth }));
  return { ws, inbox, send: m => ws.send(JSON.stringify(m)) };
}
function signed(msg, credentials) {
  return verify('sha256', Buffer.from(msg.payload), { key: createPublicKey({ key: credentials.publicKey, format: 'jwk' }), dsaEncoding: 'ieee-p1363' }, Buffer.from(msg.signature, 'base64'));
}
try {
  await start();
  assert.equal((await fetch(origin + '/api/health', { headers: { Origin: 'invalid-origin' } })).status, 403);
  assert.equal((await request('/state')).status, 401);
  assert.equal((await request('/sessions', '', { name: 'unauthorised', url: 'https://example.org' })).status, 401);
  const token = (await request('/login', '', { password })).data.token; assert(token);
  const teacher = await connect({ role: 'teacher', token });
  await wait(() => teacher.inbox.find(m => m.type === 'STATE'), 'teacher authenticated');
  const result = await request('/sessions', token, { name: 'Prova real', url: 'https://example.org', code: 'ABC234' });
  assert.equal(result.status, 201); const session = result.data;
  assert.equal((await request('/sessions', token, { name: 'Duplicate', url: 'https://example.org', code: 'abc234' })).status, 409);
  assert.equal((await request('/sessions', token, { name: 'Unsafe URL', url: 'javascript:alert(1)' })).status, 400);
  const a = (await request('/join', '', { code: 'abc234', name: 'Alumne A', device: 'PC-A' })).data;
  const b = (await request('/join', '', { code: 'ABC234', name: 'Alumne B', device: 'PC-B' })).data;
  assert(a.token && b.token && a.studentId !== b.studentId);
  const sa = await connect({ role: 'student', token: a.token, studentId: a.studentId });
  const sb = await connect({ role: 'student', token: b.token, studentId: b.studentId });
  await wait(() => sa.inbox.find(m => m.type === 'READY'), 'A ready');
  await wait(() => sb.inbox.find(m => m.type === 'READY'), 'B ready');
  const frame = { at: Date.now(), image: 'data:image/jpeg;base64,/9j/2Q==' };
  sa.send({ type: 'FRAME', studentId: b.studentId, frame });
  await wait(() => teacher.inbox.some(m => m.type === 'FRAME' && m.studentId === a.studentId), 'frame delivered to teacher under authenticated identity');
  assert(!sb.inbox.some(m => m.type === 'FRAME' || m.type === 'STATE'), 'student received another student data');
  sa.send({ type: 'INCIDENT', id: 'incident-1', reason: 'Test interruption', frames: [frame], studentId: b.studentId });
  await wait(() => sa.inbox.find(m => m.type === 'INCIDENT_SAVED'), 'evidence saved');
  let detail = (await request('/students/' + a.studentId, token)).data;
  assert.equal(detail.blocked, true); assert.equal(detail.incidents[0].frames.length, 1);
  assert.equal((await request('/students/' + a.studentId + '/unlock', b.token, {})).status, 401);
  assert.equal((await request('/students/' + a.studentId + '/unlock', token, {})).status, 202);
  const unlock = await wait(() => sa.inbox.find(m => m.type === 'COMMAND' && JSON.parse(m.payload).kind === 'UNLOCK'), 'signed unlock');
  assert(signed(unlock, a)); assert(!signed({ ...unlock, payload: unlock.payload + ' ' }, a));
  assert.equal((await request('/students/' + a.studentId, token)).data.blocked, true, 'unlock must wait for client ACK');
  sa.send({ type: 'ACK', commandId: JSON.parse(unlock.payload).commandId });
  await wait(async () => !(await request('/students/' + a.studentId, token)).data.blocked, 'ACK applied');
  sa.send({ type: 'INCIDENT', id: 'incident-2', reason: 'Second incident', frames: [] });
  await wait(async () => (await request('/students/' + a.studentId, token)).data.blocked, 'blocked again');
  sa.send({ type: 'ACK', commandId: JSON.parse(unlock.payload).commandId });
  await delay(100);
  assert.equal((await request('/students/' + a.studentId, token)).data.blocked, true, 'replayed ACK changed state');
  await request('/students/' + a.studentId + '/snapshot', token, {});
  const shot = await wait(() => sa.inbox.find(m => m.type === 'COMMAND' && JSON.parse(m.payload).kind === 'SNAPSHOT'), 'snapshot request');
  assert(signed(shot, a)); sa.send({ type: 'SNAPSHOT', commandId: JSON.parse(shot.payload).commandId, frame });
  await wait(async () => (await request('/students/' + a.studentId, token)).data.snapshots.length === 1, 'snapshot persisted');
  const exportData = (await request('/export', token)).data;
  assert(!JSON.stringify(exportData).includes('tokenHash'), 'export leaked credentials');
  for (const socket of sockets) socket.close();
  await stop(); await start();
  assert.equal((await request('/auth', token)).status, 200, 'teacher credential not recovered after server restart');
  const token2 = token;
  detail = (await request('/students/' + a.studentId, token2)).data;
  assert(detail.blocked && !detail.connected && detail.incidents.length === 2 && detail.snapshots.length === 1, 'restart lost evidence or lock');
  const resumed = await connect({ role: 'student', token: a.token, studentId: a.studentId });
  const ready = await wait(() => resumed.inbox.find(m => m.type === 'READY'), 'resume'); assert(ready.blocked);
  await request('/sessions/' + session.id + '/end', token2, {});
  const end = await wait(() => resumed.inbox.find(m => m.type === 'COMMAND' && JSON.parse(m.payload).kind === 'END'), 'end command'); assert(signed(end, a));
  assert.equal((await request('/join', '', { code: 'ABC234', name: 'Late student', device: 'PC-L' })).status, 400);
  await request('/sessions/' + session.id, token2, undefined, 'DELETE');
  assert.equal((await request('/state', token2)).data.students.length, 0);
  await request('/logout', token2, {});
  assert.equal((await request('/auth', token2)).status, 401, 'logout did not revoke credential');
  console.log('Live integration passed: auth, isolation, frame transport, evidence, signed commands, ACK, replay, restart, end, deletion.');
} finally {
  for (const ws of sockets) ws.terminate();
  if (server && server.exitCode === null) await stop();
  rmSync(dir, { recursive: true, force: true });
}
