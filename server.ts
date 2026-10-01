import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import fs from 'node:fs';
import { networkInterfaces } from 'node:os';
import { randomBytes, randomUUID, createHash, timingSafeEqual, generateKeyPairSync, createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import type { LiveSession, LiveStudent, LiveLog, Frame } from './src/live/protocol';

const dataDir = path.resolve(process.env.CONTROWL_DATA_DIR || '.controwl');
fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const statePath = path.join(dataDir, 'state.json');
const keyPath = path.join(dataDir, 'signing-key.pem');
if (!fs.existsSync(keyPath)) {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  fs.writeFileSync(keyPath, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
}
const signingKey = createPrivateKey(fs.readFileSync(keyPath));
const publicKey = createPublicKey(signingKey).export({ format: 'jwk' });
type StoredStudent = LiveStudent & { tokenHash: string; hasConnected?: boolean };
let sessions: LiveSession[] = [];
let students: StoredStudent[] = [];
let logs: LiveLog[] = [];
if (fs.existsSync(statePath)) {
  // Fail loudly on corruption, never silently discard classroom evidence.
  const data = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  sessions = data.sessions; students = data.students; logs = data.logs;
  if (!Array.isArray(sessions) || !Array.isArray(students) || !Array.isArray(logs)) throw new Error('Invalid state.json');
  students.forEach(s => { s.connected = false; s.blocked = true; delete s.pendingCommand; delete s.image; });
}
let persistTimer: ReturnType<typeof setTimeout> | undefined;
function persist() {
  clearTimeout(persistTimer);
  const serialize = () => JSON.stringify({ sessions, students: students.map(({ image, ...s }) => ({ ...s, connected: false })), logs });
  let json = serialize();
  let pruned = false;
  while (Buffer.byteLength(json) > 64 * 1024 * 1024) {
    const candidates = students.flatMap(s => s.incidents.filter(i => i.frames.length).map(i => ({ at: i.at, clear: () => { i.frames = []; } })))
      .concat(students.flatMap(s => s.snapshots.map(f => ({ at: f.at, clear: () => { s.snapshots = s.snapshots.filter(item => item !== f); } }))));
    candidates.sort((a, b) => a.at - b.at);
    if (!candidates.length) throw new Error('Local storage limit exceeded');
    candidates[0].clear(); pruned = true; json = serialize();
  }
  if (pruned) { logs.push({ at: Date.now(), message: 'Límit de 64 MiB: eliminades les imatges més antigues; es conserven els registres d’incidència.' }); json = serialize(); }
  fs.writeFileSync(statePath + '.tmp', json, { mode: 0o600 });
  fs.renameSync(statePath + '.tmp', statePath);
}
function schedulePersist() { clearTimeout(persistTimer); persistTimer = setTimeout(persist, 500); }
function audit(message: string) { logs.push({ at: Date.now(), message }); logs = logs.slice(-1000); schedulePersist(); }
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
if (process.env.NODE_ENV === 'production' && !process.env.CONTROWL_ADMIN_PASSWORD) throw new Error('Configura CONTROWL_ADMIN_PASSWORD al servei allotjat');
const secret = process.env.CONTROWL_ADMIN_PASSWORD || randomBytes(18).toString('base64url');
if (secret.length < 12) throw new Error('CONTROWL_ADMIN_PASSWORD must have at least 12 characters');
const passwordHash = hash(secret);
const authPath = path.join(dataDir, 'admin-sessions.json');
let adminTokens = new Map<string, number>();
if (fs.existsSync(authPath)) {
  const saved = JSON.parse(fs.readFileSync(authPath, 'utf8'));
  if (saved.passwordHash === passwordHash && Array.isArray(saved.tokens))
    adminTokens = new Map(saved.tokens.filter((entry: [string, number]) => entry[1] > Date.now()));
}
function saveAdminSessions() {
  fs.writeFileSync(authPath + '.tmp', JSON.stringify({ passwordHash, tokens: [...adminTokens] }), { mode: 0o600 });
  fs.renameSync(authPath + '.tmp', authPath);
}
function cookieToken(header?: string) {
  return (header || '').split(';').map(x => x.trim()).find(x => x.startsWith('controwl_admin='))?.slice(15) || '';
}
function adminExpiry(token: string) { return adminTokens.get(hash(token)) || 0; }
function requestToken(req: http.IncomingMessage) {
  return req.headers.authorization?.replace(/^Bearer /, '') || cookieToken(req.headers.cookie);
}
const secureCookies = process.env.NODE_ENV === 'production' || process.env.CONTROWL_PUBLIC_URL?.startsWith('https:') || !!process.env.CONTROWL_TLS_CERT;
function setAdminCookie(res: express.Response, token: string, clear = false) {
  res.setHeader('Set-Cookie', 'controwl_admin=' + token + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' + (clear ? '0' : '28800') + (secureCookies ? '; Secure' : ''));
}
const attempts = new Map<string, { count: number; since: number }>();
function limited(key: string, max: number) {
  const now = Date.now(); let entry = attempts.get(key);
  if (!entry || now - entry.since > 60000) { entry = { count: 0, since: now }; attempts.set(key, entry); }
  return ++entry.count > max;
}
function sameOrigin(origin: string | undefined, host: string | undefined) {
  if (!origin) return true;
  try { return new URL(origin).host === host; } catch { return false; }
}
const app = express();
app.disable('x-powered-by');
if (process.env.CONTROWL_TRUST_PROXY === '1') app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
  const origin = req.headers.origin;
  if (!sameOrigin(origin, req.headers.host)) { res.status(403).json({ error: 'Origen no autoritzat' }); return; }
  next();
});
function admin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = requestToken(req);
  if (adminExpiry(token) < Date.now()) { res.status(401).json({ error: 'Cal iniciar sessió com a docent' }); return; }
  next();
}
const clean = (v: unknown, max = 100) => typeof v === 'string' ? v.trim().slice(0, max) : '';
function code() {
  const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  return [...randomBytes(6)].map(n => chars[n % chars.length]).join('');
}
function safeStudent(s: StoredStudent, detail = false) {
  const { tokenHash, hasConnected, ...publicStudent } = s;
  return detail ? publicStudent : { ...publicStudent,
    incidents: s.incidents.map(i => ({ ...i, frames: [] })), snapshots: [] };
}
function teacherState() { return { sessions, students: students.map(s => safeStudent(s)), logs }; }
interface Client { adminHash?: string; ws: WebSocket; role?: 'teacher' | 'student'; student?: StoredStudent; alive: boolean; messages: number; }
const clients = new Set<Client>();
function send(client: Client, msg: unknown) {
  if (client.ws.readyState !== WebSocket.OPEN) return;
  if (client.ws.bufferedAmount > 8 * 1024 * 1024) { client.ws.terminate(); return; }
  client.ws.send(JSON.stringify(msg));
}
function teachers(msg: unknown) { for (const c of clients) if (c.role === 'teacher') send(c, msg); }
function update() { teachers({ type: 'STATE', ...teacherState() }); }
const studentClient = (id: string) => [...clients].find(c => c.role === 'student' && c.student?.id === id);
const active = (id: string) => sessions.find(s => s.id === id && !s.endedAt);
const pending = new Map<string, { studentId: string; expires: number; kind: string }>();
function command(s: StoredStudent, kind: 'UNLOCK' | 'END' | 'SNAPSHOT') {
  const c = studentClient(s.id);
  if (!c) return false;
  const commandId = randomUUID();
  const expires = Date.now() + 30000;
  const payload = JSON.stringify({ commandId, studentId: s.id, sessionId: s.sessionId, kind, expires });
  const signature = sign('sha256', Buffer.from(payload), { key: signingKey, dsaEncoding: 'ieee-p1363' }).toString('base64');
  pending.set(commandId, { studentId: s.id, expires, kind });
  if (kind === 'UNLOCK') s.pendingCommand = commandId;
  send(c, { type: 'COMMAND', payload, signature });
  return true;
}
app.get('/api/health', (_req, res) => res.json({ service: 'ContrOwl', version: 2 }));
app.post('/api/login', (req, res) => {
  if (limited('login:' + req.ip, 6)) { res.status(429).json({ error: 'Massa intents. Espereu un minut.' }); return; }
  const candidate = hash(clean(req.body.password, 300));
  if (!timingSafeEqual(Buffer.from(candidate), Buffer.from(passwordHash))) { res.status(401).json({ error: 'Contrasenya incorrecta' }); return; }
  const token = randomBytes(32).toString('base64url');
  adminTokens.set(hash(token), Date.now() + 8 * 3600000);
  saveAdminSessions(); setAdminCookie(res, token);
  res.json({ token });
});
app.get('/api/auth', admin, (_req, res) => res.json({ authenticated: true }));
app.post('/api/logout', (req, res) => {
  const key = hash(requestToken(req)); adminTokens.delete(key); saveAdminSessions(); setAdminCookie(res, '', true);
  for (const c of clients) if (c.adminHash === key) c.ws.close(1008, 'Sessió docent tancada');
  res.json({ ok: true });
});
app.get('/api/state', admin, (_req, res) => res.json(teacherState()));
app.post('/api/sessions', admin, (req, res) => {
  const name = clean(req.body.name);
  let url: URL;
  try { url = new URL(req.body.url); } catch { res.status(400).json({ error: 'URL invàlida' }); return; }
  if (!name || url.protocol !== 'https:' || url.username || url.password) { res.status(400).json({ error: 'Cal un nom i una URL HTTPS sense credencials' }); return; }
  if (sessions.filter(s => !s.endedAt).length >= 5) { res.status(400).json({ error: 'Màxim de 5 sessions actives' }); return; }
  let value = clean(req.body.code, 20).toUpperCase();
  if (!value) do { value = code(); } while (sessions.some(s => s.code === value && !s.endedAt));
  if (!/^[A-Z2-9]{6}$/.test(value)) { res.status(400).json({ error: 'Codi: 6 lletres o dígits del 2 al 9' }); return; }
  if (sessions.some(s => s.code === value && !s.endedAt)) { res.status(409).json({ error: 'Aquest codi ja està en ús' }); return; }
  const session = { id: randomUUID(), code: value, name, url: url.href, createdAt: Date.now() };
  sessions.push(session); audit('Sessió creada: ' + name); persist(); update(); res.status(201).json(session);
});
app.post('/api/join', (req, res) => {
  if (limited('join:' + req.ip, 30)) { res.status(429).json({ error: 'Massa intents. Espereu un minut.' }); return; }
  const session = sessions.find(s => s.code === clean(req.body.code, 10).toUpperCase() && !s.endedAt);
  const name = clean(req.body.name); const device = clean(req.body.device);
  if (!session || name.length < 3 || !device) { res.status(400).json({ error: 'Reviseu el codi, el nom i el dispositiu' }); return; }
  if (students.filter(s => s.sessionId === session.id).length >= 40) { res.status(400).json({ error: 'Sessió plena (40 dispositius)' }); return; }
  const token = randomBytes(32).toString('base64url');
  const student: StoredStudent = { id: randomUUID(), tokenHash: hash(token), sessionId: session.id, name, device,
    connected: false, blocked: false, joinedAt: Date.now(), lastSeen: Date.now(), incidents: [], snapshots: [] };
  students.push(student); audit(name + ' identificat a ' + device); persist(); update();
  res.status(201).json({ token, studentId: student.id, session, publicKey });
});
app.get('/api/students/:id', admin, (req, res) => {
  const s = students.find(s => s.id === req.params.id);
  if (!s) { res.sendStatus(404); return; } res.json(safeStudent(s, true));
});
app.post('/api/students/:id/:action', admin, (req, res) => {
  const s = students.find(s => s.id === req.params.id);
  if (!s || !active(s.sessionId)) { res.status(404).json({ error: 'Sessió o alumne no actiu' }); return; }
  const kind = req.params.action === 'unlock' ? 'UNLOCK' : req.params.action === 'snapshot' ? 'SNAPSHOT' : null;
  if (!kind) { res.sendStatus(404); return; }
  if (!command(s, kind)) { res.status(409).json({ error: 'Dispositiu desconnectat; no s’ha aplicat cap ordre' }); return; }
  audit(kind + ' enviat a ' + s.name + '; pendent de confirmació'); update(); res.status(202).json({ pending: true });
});
app.post('/api/sessions/:id/end', admin, (req, res) => {
  const session = active(req.params.id);
  if (!session) { res.status(404).json({ error: 'Sessió no activa' }); return; }
  session.endedAt = Date.now();
  students.filter(s => s.sessionId === session.id).forEach(s => command(s, 'END'));
  audit('Sessió finalitzada: ' + session.name); persist(); update(); res.json({ ok: true });
});
app.get('/api/export', admin, (_req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="controwl-evidencies.json"');
  res.json({ sessions, students: students.map(s => safeStudent(s, true)), logs });
});
app.delete('/api/sessions/:id', admin, (req, res) => {
  const session = sessions.find(s => s.id === req.params.id);
  if (!session?.endedAt) { res.status(409).json({ error: 'Finalitzeu la sessió abans d’esborrar-la' }); return; }
  students.filter(s => s.sessionId === session.id).forEach(s => studentClient(s.id)?.ws.close(1000));
  students = students.filter(s => s.sessionId !== session.id);
  sessions = sessions.filter(s => s.id !== session.id);
  // Logs contain names; clear them along with the evidence on explicit deletion.
  logs = []; persist(); update(); res.json({ ok: true });
});
app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no trobada' }));
app.get('/administration', (_req, res) => res.sendFile(path.resolve('dist/index.html')));
app.use(express.static(path.resolve('dist')));
app.get('*', (_req, res) => res.sendFile(path.resolve('dist/index.html')));

const cert = process.env.CONTROWL_TLS_CERT;
const key = process.env.CONTROWL_TLS_KEY;
if (!!cert !== !!key) throw new Error('Cal configurar tant CONTROWL_TLS_CERT com CONTROWL_TLS_KEY');
const server = cert && key ? https.createServer({ cert: fs.readFileSync(cert), key: fs.readFileSync(key) }, app) : http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4 * 1024 * 1024 });
function validFrame(f: any): f is Frame {
  return f && Number.isFinite(f.at) && typeof f.image === 'string' &&
    f.image.length <= 180000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(f.image);
}
wss.on('connection', (ws, req) => {
  if (!sameOrigin(req.headers.origin, req.headers.host)) { ws.close(1008); return; }
  const c: Client = { ws, alive: true, messages: 0 }; clients.add(c);
  const authTimeout = setTimeout(() => { if (!c.role) ws.close(1008, 'Authentication required'); }, 5000);
  ws.on('pong', () => { c.alive = true; });
  ws.on('message', raw => {
    if (++c.messages > 150) { ws.close(1008, 'Rate limit'); return; }
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'AUTH') {
        if (c.role) throw new Error('Already authenticated');
        const teacherToken = typeof msg.token === 'string' && msg.token ? msg.token : cookieToken(req.headers.cookie);
        if (msg.role === 'teacher' && adminExpiry(teacherToken) > Date.now()) {
          c.adminHash = hash(teacherToken); c.role = 'teacher'; send(c, { type: 'STATE', ...teacherState() });
        } else if (msg.role === 'student') {
          const s = students.find(s => s.id === msg.studentId && s.tokenHash === hash(clean(msg.token, 100)));
          if (!s) { ws.close(1008, 'Invalid credential'); return; }
          const old = studentClient(s.id); if (old) old.ws.close(1000, 'Replaced');
          c.role = 'student'; c.student = s;
          if (!active(s.sessionId)) { send(c, { type: 'ENDED' }); ws.close(1000); return; }
          if (s.hasConnected) s.blocked = true;
          s.hasConnected = true; s.connected = true; s.lastSeen = Date.now();
          send(c, { type: 'READY', blocked: s.blocked, session: active(s.sessionId) });
          audit(s.name + ' connectat'); update();
        } else { ws.close(1008, 'Invalid credential'); return; }
        clearTimeout(authTimeout); return;
      }
      if (c.role !== 'student' || !c.student) return;
      const s = c.student;
      if (msg.type === 'ACK') {
        const cmd = pending.get(msg.commandId);
        if (!cmd || cmd.studentId !== s.id || cmd.expires < Date.now()) return;
        if (cmd.kind === 'UNLOCK') { s.blocked = false; delete s.pendingCommand; }
        pending.delete(msg.commandId); audit(cmd.kind + ' confirmat per ' + s.name); persist(); update(); return;
      }
      if (!active(s.sessionId)) { send(c, { type: 'ENDED' }); return; }
      s.lastSeen = Date.now();
      if (msg.type === 'FRAME' && validFrame(msg.frame)) {
        s.image = msg.frame.image; s.lastFrameAt = Date.now();
        teachers({ type: 'FRAME', studentId: s.id, frame: { ...msg.frame, at: s.lastFrameAt } });
      } else if (msg.type === 'INCIDENT') {
        const reason = clean(msg.reason, 200);
        if (!reason) return;
        const frames = Array.isArray(msg.frames) ? msg.frames.filter(validFrame).slice(-15) : [];
        const id = clean(msg.id, 80);
        if (!id || s.incidents.some(i => i.id === id)) return;
        s.blocked = true; delete s.pendingCommand;
        // Any incident invalidates a previous pending unlock.
        for (const [id, cmd] of pending) if (cmd.studentId === s.id && cmd.kind === 'UNLOCK') pending.delete(id);
        s.incidents.push({ id, at: Date.now(), reason, frames }); s.incidents = s.incidents.slice(-3);
        audit(s.name + ': ' + reason); persist(); update();
        send(c, { type: 'INCIDENT_SAVED', id });
      } else if (msg.type === 'SNAPSHOT' && validFrame(msg.frame)) {
        const cmd = pending.get(msg.commandId);
        if (!cmd || cmd.kind !== 'SNAPSHOT' || cmd.studentId !== s.id || cmd.expires < Date.now()) return;
        pending.delete(msg.commandId);
        s.snapshots.push({ ...msg.frame, at: Date.now() }); s.snapshots = s.snapshots.slice(-3);
        audit('Captura rebuda de ' + s.name); persist(); update();
      }
    } catch { send(c, { type: 'ERROR', error: 'Missatge no vàlid' }); }
  });
  ws.on('close', () => {
    clearTimeout(authTimeout); clients.delete(c);
    const s = c.student;
    if (s && !studentClient(s.id)) {
      s.connected = false;
      if (active(s.sessionId)) s.blocked = true;
      delete s.pendingCommand; audit(s.name + ' desconnectat'); persist(); update();
    }
  });
  ws.on('error', () => {});
});
const heartbeat = setInterval(() => {
  for (const c of clients) {
    c.messages = 0;
    if (c.role === 'teacher' && (adminTokens.get(c.adminHash || '') || 0) <= Date.now()) { c.ws.close(1008, 'Sessió docent caducada'); continue; }
    if (!c.alive) { c.ws.terminate(); continue; }
    c.alive = false; c.ws.ping();
  }
  for (const [id, cmd] of pending) if (cmd.expires < Date.now()) {
    pending.delete(id); const s = students.find(s => s.id === cmd.studentId);
    if (s?.pendingCommand === id) { delete s.pendingCommand; audit('Ordre caducada sense confirmació: ' + s.name); update(); }
  }
  for (const [key, value] of attempts) if (Date.now() - value.since > 60000) attempts.delete(key);
  for (const [token, expires] of adminTokens) if (expires < Date.now()) adminTokens.delete(token);
}, 15000);
const port = Number(process.env.PORT || 3000);
const host = process.env.CONTROWL_HOST || (cert ? '0.0.0.0' : '127.0.0.1');
server.listen(port, host, () => {
  console.log('ContrOwl — servei web persistent');
  if (!process.env.CONTROWL_ADMIN_PASSWORD) console.log('Contrasenya docent de desenvolupament: ' + secret);
  const origin = process.env.CONTROWL_PUBLIC_URL || (cert ? 'https' : 'http') + '://localhost:' + port;
  console.log('Alumnat: ' + origin + '/');
  console.log('Administració: ' + origin + '/administration');
  if (cert) for (const nets of Object.values(networkInterfaces())) for (const n of nets || []) {
    if (n.family === 'IPv4' && !n.internal) console.log('Alumnat: https://' + n.address + ':' + port);
  }
  if (!cert && !process.env.CONTROWL_PUBLIC_URL) console.log('Mode local. Per a l’aula cal certificat HTTPS de confiança i CONTROWL_TLS_CERT/KEY.');
});
function shutdown() {
  clearInterval(heartbeat); persist(); saveAdminSessions();
  for (const c of clients) c.ws.terminate();
  server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
