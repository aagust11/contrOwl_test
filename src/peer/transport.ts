import Peer, {type DataConnection, type PeerOptions} from 'peerjs';
export type Packet = {type: string; [key: string]: any};
export type Join = {id: string; code: string; student: string; name: string; token: string};
export function validJoin(v: any): v is Join {
  return v && /^[A-Z0-9]{6}$/.test(v.code) && ['id', 'student', 'token'].every(k => typeof v[k] === 'string' && /^[a-f0-9-]{36}$/.test(v[k])) && typeof v.name === 'string' && v.name.trim().length > 0 && v.name.length <= 100;
}
// Same discovery service as web_block. Images and application messages use the direct channel.
// No TURN relay: a network that blocks direct WebRTC cannot be bypassed here.
const options = (): PeerOptions => ({
  host: '0.peerjs.com', port: 443, path: '/', secure: true, debug: 0,
  config: {iceServers: [{urls: 'stun:stun.l.google.com:19302'}]},
});
const address = (code: string) => 'controwl-session-v3-' + code;
export class SessionHost {
  private peer?: Peer;
  private timer?: ReturnType<typeof setTimeout>;
  private stopped = false;
  constructor(private code: string, private receive: (peer: DirectPeer) => void, private status: (message: string) => void) {this.open();}
  private open() {
    if (this.stopped) return;
    this.status('Connectant el codi…');
    const peer = new Peer(address(this.code), options()); this.peer = peer;
    peer.on('open', () => this.status('Codi actiu · esperant alumnes'));
    peer.on('connection', connection => {
      const direct = new DirectPeer(connection);
      this.receive(direct);
    });
    peer.on('disconnected', () => {
      this.status('Recuperant el servei de connexió…');
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {if (!this.stopped && !peer.destroyed && peer.disconnected) peer.reconnect();}, 3000);
    });
    peer.on('error', error => {
      this.status(error.type === 'unavailable-id' ? 'Codi ocupat o encara alliberant-se. Reintentant…' : 'Servei de connexió no disponible. Reintentant…');
      if (peer.destroyed || error.type === 'unavailable-id') {
        clearTimeout(this.timer); this.timer = setTimeout(() => {peer.destroy(); this.open();}, 5000);
      }
    });
  }
  close() {this.stopped = true; clearTimeout(this.timer); this.peer?.destroy();}
}
export function joinSession(code: string): Promise<DirectPeer> {
  return new Promise((resolve, reject) => {
    const peer = new Peer(options()); let direct: DirectPeer | undefined;
    const timeout = setTimeout(() => {peer.destroy(); reject(Error('El servei de connexió no respon.'));}, 15000);
    peer.on('error', () => {
      clearTimeout(timeout);
      if (direct) direct.close(); else {peer.destroy(); reject(Error('No s’ha pogut trobar el docent. Comprova el codi i que tingui el panell obert.'));}
    });
    peer.on('open', () => {
      clearTimeout(timeout);
      direct = new DirectPeer(peer.connect(address(code), {reliable: true, serialization: 'json'}), peer);
      resolve(direct);
    });
  });
}
export class DirectPeer {
  get channel() { return this.connection.dataChannel; }
  onmessage: (p: Packet) => void = () => {};
  onopen: () => void = () => {};
  onclose: () => void = () => {};
  private parts = new Map<string, { pieces: string[]; size: number; at: number }>();
  private queue: Promise<void> = Promise.resolve();
  private pending = 0;
  private closed = false;
  constructor(private connection: DataConnection, private owner?: Peer) {
    connection.on('open', () => this.onopen());
    connection.on('close', () => this.close());
    connection.on('error', () => this.close());
    connection.on('data', data => {
      try {
        if (typeof data !== 'string' || data.length > 20000) return;
        const c = JSON.parse(data);
        if (typeof c.id !== 'string' || typeof c.body !== 'string' || !Number.isInteger(c.i) || !Number.isInteger(c.n) || c.n < 1 || c.n > 200 || c.i < 0 || c.i >= c.n) return;
        for (const [id, v] of this.parts) if (Date.now() - v.at > 30000) this.parts.delete(id);
        let p = this.parts.get(c.id);
        if (!p) {
          if (this.parts.size >= 4) return;
          p = {pieces: Array(c.n).fill(''), size: 0, at: Date.now()}; this.parts.set(c.id, p);
        }
        if (p.pieces.length !== c.n || p.pieces[c.i]) return;
        p.pieces[c.i] = c.body; p.size += c.body.length;
        if (p.size > 2400000) {this.parts.delete(c.id); return;}
        if (p.pieces.every(Boolean)) {
          this.parts.delete(c.id);
          const packet = JSON.parse(p.pieces.join(''));
          if (packet && typeof packet.type === 'string') this.onmessage(packet);
        }
      } catch { /* Ignore invalid remote input. */ }
    });
  }
  get connected() { return !this.closed && this.connection.open && this.channel?.readyState === 'open'; }
  async send(packet: Packet) {
    const text = JSON.stringify(packet);
    if (!this.connected || text.length > 2400000 || this.pending + text.length > 4800000) return false;
    this.pending += text.length;
    const run = async () => {
      const id = crypto.randomUUID(), n = Math.ceil(text.length / 12000);
      for (let i = 0; i < n; i++) {
        const until = Date.now() + 10000;
        while (this.connected && this.channel!.bufferedAmount > 128000 && Date.now() < until) await new Promise(r => setTimeout(r, 25));
        if (!this.connected || Date.now() >= until) throw Error('Connexió interrompuda.');
        this.connection.send(JSON.stringify({id, i, n, body: text.slice(i * 12000, (i + 1) * 12000)}));
      }
    };
    const job = this.queue.then(run);
    this.queue = job.catch(() => {});
    try {await job; return true;} catch {return false;} finally {this.pending -= text.length;}
  }
  close() {
    if (this.closed) return;
    this.closed = true; this.parts.clear(); this.connection.close(); this.owner?.destroy(); this.onclose();
  }
}
export async function fingerprint(key: JsonWebKey) {
  const bytes = new TextEncoder().encode(JSON.stringify({crv: key.crv, kty: key.kty, x: key.x, y: key.y}));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), x => x.toString(16).padStart(2, '0')).join('');
}
export async function sign(privateKey: JsonWebKey, packet: Packet) {
  const key = await crypto.subtle.importKey('jwk', privateKey, {name: 'ECDSA', namedCurve: 'P-256'}, false, ['sign']);
  const body = JSON.stringify(packet);
  const bytes = new Uint8Array(await crypto.subtle.sign({name: 'ECDSA', hash: 'SHA-256'}, key, new TextEncoder().encode(body)));
  return {type: 'signed', body, signature: Array.from(bytes)};
}
export async function verify(publicKey: JsonWebKey, envelope: Packet): Promise<Packet> {
  if (envelope.type !== 'signed' || typeof envelope.body !== 'string' || envelope.body.length > 10000 || !Array.isArray(envelope.signature) || envelope.signature.length !== 64) throw Error('Ordre no vàlida.');
  const key = await crypto.subtle.importKey('jwk', publicKey, {name: 'ECDSA', namedCurve: 'P-256'}, false, ['verify']);
  if (!await crypto.subtle.verify({name: 'ECDSA', hash: 'SHA-256'}, key, new Uint8Array(envelope.signature), new TextEncoder().encode(envelope.body))) throw Error('Signatura no vàlida.');
  return JSON.parse(envelope.body);
}
