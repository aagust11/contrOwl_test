// Host candidates only: no signaling, STUN or TURN service.
export type Packet = { type: string; [key: string]: any };
export type Invitation = { version: 1; kind: 'offer' | 'answer'; id: string; code: string; student: string; name: string; token: string; sdp: string; created: number; publicKey?: JsonWebKey };
export function parseInvitation(text: string, kind: Invitation['kind']): Invitation {
  if (text.length > 100000) throw Error('Invitació massa gran.');
  const v = JSON.parse(text);
  if (v.version !== 1 || v.kind !== kind || typeof v.sdp !== 'string' || !v.sdp.startsWith('v=0') || !/^[A-Z0-9]{6}$/.test(v.code) || typeof v.id !== 'string' || typeof v.student !== 'string' || typeof v.token !== 'string' || v.token.length < 24 || typeof v.name !== 'string' || v.name.length > 100 || !Number.isFinite(v.created) || Math.abs(Date.now() - v.created) > 15 * 60 * 1000) throw Error('Invitació no vàlida o caducada (15 minuts).');
  return v;
}
export class DirectPeer {
  pc = new RTCPeerConnection({ iceServers: [] });
  channel?: RTCDataChannel;
  onmessage: (p: Packet) => void = () => {};
  onopen: () => void = () => {};
  onclose: () => void = () => {};
  private parts = new Map<string, { pieces: string[]; size: number; at: number }>();
  private queue: Promise<void> = Promise.resolve();
  private pending = 0;
  private closed = false;
  constructor() {
    this.pc.ondatachannel = e => this.bind(e.channel);
    this.pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(this.pc.connectionState)) this.close();
    };
  }
  private bind(channel: RTCDataChannel) {
    this.channel = channel;
    channel.onopen = () => this.onopen();
    channel.onclose = () => this.close();
    channel.onerror = () => this.close();
    channel.onmessage = e => {
      try {
        if (typeof e.data !== 'string' || e.data.length > 20000) return;
        const c = JSON.parse(e.data);
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
    };
  }
  get connected() { return this.channel?.readyState === 'open'; }
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
        this.channel!.send(JSON.stringify({id, i, n, body: text.slice(i * 12000, (i + 1) * 12000)}));
      }
    };
    const job = this.queue.then(run);
    this.queue = job.catch(() => {});
    try {await job; return true;} catch {return false;} finally {this.pending -= text.length;}
  }
  private async local(description: RTCSessionDescriptionInit) {
    await this.pc.setLocalDescription(description);
    if (this.pc.iceGatheringState !== 'complete') await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {this.pc.removeEventListener('icegatheringstatechange', changed); reject(Error('No s’ha pogut preparar la connexió. Torna-ho a provar.'));}, 15000);
      const changed = () => {if (this.pc.iceGatheringState === 'complete') {clearTimeout(timeout); this.pc.removeEventListener('icegatheringstatechange', changed); resolve();}};
      this.pc.addEventListener('icegatheringstatechange', changed); changed();
    });
    return this.pc.localDescription!.sdp;
  }
  async offer() {this.bind(this.pc.createDataChannel('contrOwl', {ordered: true})); return this.local(await this.pc.createOffer());}
  async answer(sdp: string) {await this.pc.setRemoteDescription({type: 'offer', sdp}); return this.local(await this.pc.createAnswer());}
  async accept(sdp: string) {await this.pc.setRemoteDescription({type: 'answer', sdp});}
  close() {
    if (this.closed) return;
    this.closed = true; this.parts.clear(); this.channel?.close(); this.pc.close(); this.onclose();
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
