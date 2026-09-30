import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Credentials, Frame, LiveSession, LiveStudent, TeacherState } from './protocol';

const button = 'px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 font-semibold';
const field = 'w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white';
const panel = 'rounded-2xl border border-slate-700 bg-slate-900 p-5';
const when = (at: number) => new Date(at).toLocaleTimeString('ca-ES');

async function api(route: string, token = '', body?: unknown, method = body === undefined ? 'GET' : 'POST') {
  const res = await fetch('/api' + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error del servidor');
  return data;
}
function useSocket(auth: Record<string, string> | null, receive: (msg: any) => void, lost?: () => void) {
  const socket = useRef<WebSocket | null>(null);
  const handlers = useRef({ receive, lost }); handlers.current = { receive, lost };
  const [connected, setConnected] = useState(false);
  const serialized = JSON.stringify(auth);
  useEffect(() => {
    if (!auth) return;
    let disposed = false; let timer: ReturnType<typeof setTimeout>; let ws: WebSocket;
    const connect = () => {
      ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
      socket.current = ws;
      ws.onopen = () => ws.send(JSON.stringify({ type: 'AUTH', ...JSON.parse(serialized) }));
      ws.onmessage = e => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'STATE' || msg.type === 'READY') setConnected(true);
        handlers.current.receive(msg);
      };
      ws.onclose = e => {
        if (disposed) return;
        setConnected(false); handlers.current.lost?.();
        if (e.code !== 1008) timer = setTimeout(connect, 2000);
        else handlers.current.receive({ type: 'ERROR', error: 'Credencial no vàlida. Torneu a entrar.' });
      };
      ws.onerror = () => {};
    };
    connect();
    return () => { disposed = true; clearTimeout(timer); ws.close(); socket.current = null; };
  }, [serialized]);
  const send = useCallback((msg: unknown) => {
    const ws = socket.current;
    if (ws?.readyState !== WebSocket.OPEN || ws.bufferedAmount > 4 * 1024 * 1024) return false;
    ws.send(JSON.stringify(msg)); return true;
  }, []);
  return { connected, send };
}
function Launcher() {
  const [address, setAddress] = useState(''); const [error, setError] = useState('');
  return <section className={panel + ' max-w-xl mx-auto space-y-4'}>
    <h2 className="text-xl font-bold">Connecta amb l’ordinador del docent</h2>
    <p>El docent ha d’arrencar ContrOwl al seu ordinador. Les pantalles i les incidències s’envien directament a aquell equip.</p>
    <form onSubmit={e => { e.preventDefault(); try {
      const url = new URL(address);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Introdueix una adreça HTTPS, sense usuari ni contrasenya.');
      url.pathname = '/'; url.search = ''; url.hash = ''; location.assign(url.href);
    } catch (e) { setError(e instanceof Error ? e.message : 'Adreça incorrecta'); } }} className="space-y-3">
      <label className="block">Adreça del docent<input className={field} placeholder="https://192.168.1.50:3000" value={address} onChange={e => setAddress(e.target.value)} required /></label>
      <button className={button}>Connectar amb el docent</button>
    </form>
    {error && <p role="alert" className="text-rose-300">{error}</p>}
    <p className="text-sm text-slate-400">La web pública és el punt d’entrada. El servidor s’executa al PC del docent, dins la xarxa de l’aula.</p>
    <a className="text-indigo-300 underline block" href="https://github.com/aagust11/contrOwl_test/blob/main/README.md">Preparar l’ordinador del docent</a>
    <a className="text-slate-400 underline block text-sm" href="?demo=1">Obrir la demostració amb dades fictícies</a>
  </section>;
}
function Teacher({ token }: { token: string }) {
  const [state, setState] = useState<TeacherState>({ sessions: [], students: [], logs: [] });
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [name, setName] = useState(''); const [url, setUrl] = useState(''); const [code, setCode] = useState('');
  const [selected, setSelected] = useState<LiveStudent | null>(null);
  const [index, setIndex] = useState(0);
  const { connected } = useSocket({ role: 'teacher', token }, msg => {
    if (msg.type === 'STATE') setState({ sessions: msg.sessions, students: msg.students, logs: msg.logs });
    if (msg.type === 'FRAME') setState(prev => ({ ...prev, students: prev.students.map(s => s.id === msg.studentId ? { ...s, image: msg.frame.image, lastFrameAt: msg.frame.at } : s) }));
    if (msg.type === 'ERROR') setError(msg.error);
  });
  async function action(route: string, data?: unknown, method?: string) {
    setError(''); setNotice('');
    try { return await api(route, token, data, method); } catch (e) { setError((e as Error).message); return null; }
  }
  async function detail(id: string) { const s = await action('/students/' + id); if (s) { setSelected(s); setIndex(0); } }
  async function exportData() {
    const result = await action('/export'); if (!result) return;
    const link = document.createElement('a'); const href = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }));
    link.href = href; link.download = 'controwl-evidencies.json'; link.click(); setTimeout(() => URL.revokeObjectURL(href), 1000);
  }
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  return <div className="space-y-5">
    <div className="flex flex-wrap justify-between gap-3"><h2 className="text-2xl font-bold">Panell del docent</h2><span role="status">{connected ? 'Connectat al servidor del docent' : 'Sense connexió · reconnectant'}</span></div>
    <p>Adreça per a l’alumnat: <strong>{location.origin}</strong>. Si aquí diu localhost, utilitza l’adreça de xarxa que mostra la consola del servidor.</p>
    {error && <p role="alert" className="bg-rose-950 p-3 rounded-xl">{error}</p>}
    {notice && <p role="status" className="bg-indigo-950 p-3">{notice}</p>}
    <form className={panel + ' grid md:grid-cols-4 gap-3 items-end'} onSubmit={async e => { e.preventDefault();
      const result = await action('/sessions', { name, url, code });
      if (result) { setName(''); setUrl(''); setCode(''); }
    }}>
      <label>Nom de la sessió<input className={field} required value={name} onChange={e => setName(e.target.value)} /></label>
      <label>URL de l’examen<input className={field} type="url" placeholder="https://…" required value={url} onChange={e => setUrl(e.target.value)} /></label>
      <label>Codi (buit = aleatori)<input className={field} maxLength={6} value={code} onChange={e => setCode(e.target.value.toUpperCase())} /></label>
      <button className={button} disabled={!connected}>Crear sessió</button>
    </form>
    <div className="flex gap-3 flex-wrap"><button className={button} onClick={exportData}>Exportar evidències</button>
      <span className="text-sm text-slate-400">Es desen al PC del docent. Retenció limitada: 3 incidències i 3 captures per alumne; exporta abans d’esborrar.</span></div>
    {state.sessions.map(session => <section key={session.id} className={panel + ' space-y-4'}>
      <div className="flex justify-between gap-3 flex-wrap"><div><h3 className="font-bold text-xl">{session.name}</h3>
        <p>Codi: <strong className="font-mono text-2xl text-indigo-300">{session.code}</strong> · {session.endedAt ? 'Finalitzada' : 'Activa'}</p>
        <p className="text-sm break-all">{session.url}</p></div>
        <div className="flex gap-2 items-start">{!session.endedAt ? <>
          <button className={button} onClick={async () => {
            for (const s of state.students.filter(s => s.sessionId === session.id && s.blocked && s.connected)) await action('/students/' + s.id + '/unlock', {});
            setNotice('Ordres enviades. Els desbloquejos requereixen confirmació dels clients.');
          }}>Desbloquejar connectats</button>
          <button className={button} onClick={() => { if (confirm('Finalitzar la sessió i aturar la captura de tots els alumnes?')) void action('/sessions/' + session.id + '/end', {}); }}>Finalitzar sessió</button>
        </> : <button className={button} onClick={() => { if (confirm('Esborrar definitivament alumnes, captures i incidències d’aquesta sessió? També es netejarà el registre general.')) void action('/sessions/' + session.id, undefined, 'DELETE'); }}>Esborrar dades</button>}</div>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {state.students.filter(s => s.sessionId === session.id).map(s => <article key={s.id} data-student-id={s.id} className={'p-3 rounded-xl border ' + (s.blocked ? 'border-rose-500 bg-rose-950/30' : 'border-slate-600 bg-slate-950')}>
          <div className="flex justify-between"><strong>{s.name}</strong><span>{!s.connected ? 'Desconnectat' : s.blocked ? 'Bloquejat' : 'Actiu'}</span></div>
          <p className="text-xs text-slate-400">{s.device} · {s.lastFrameAt ? 'Pantalla rebuda fa ' + Math.floor((now - s.lastFrameAt) / 1000) + ' s' : 'Esperant pantalla'}</p>
          {s.lastFrameAt && now - s.lastFrameAt > 8000 && s.connected && !session.endedAt && <p className="text-amber-300 text-sm">Pantalla desactualitzada</p>}
          <button className="block w-full my-3" onClick={() => detail(s.id)} aria-label={'Ampliar ' + s.name}>
            {s.image ? <img className="w-full aspect-video object-contain bg-black" src={s.image} alt={'Pantalla de ' + s.name} /> : <div className="aspect-video bg-slate-800 grid place-items-center">Sense imatge rebuda</div>}
          </button>
          <p className="text-sm">{s.incidents.length} incidències conservades {s.pendingCommand && '· Desbloqueig pendent de confirmació'}</p>
          <div className="flex gap-2 flex-wrap mt-2">
            <button className={button} disabled={!s.connected || !!session.endedAt} onClick={() => action('/students/' + s.id + '/unlock', {})}>Desbloquejar</button>
            <button className={button} disabled={!s.connected || !!session.endedAt} onClick={() => action('/students/' + s.id + '/snapshot', {})}>Fer captura</button>
            <button className="underline" onClick={() => detail(s.id)}>Incidències</button>
          </div>
        </article>)}
      </div>
      {!state.students.some(s => s.sessionId === session.id) && <p className="text-slate-400">Esperant alumnes. Comparteix l’adreça del servidor i aquest codi.</p>}
    </section>)}
    <section className={panel}><h3 className="font-bold mb-3">Registre</h3><div className="max-h-64 overflow-auto">{[...state.logs].reverse().map((log, i) => <p key={i} className="text-sm py-1">{when(log.at)} · {log.message}</p>)}</div></section>
    {selected && <div className="fixed inset-0 z-50 bg-black/90 p-4 overflow-auto" role="dialog" aria-modal="true" aria-label="Detall de l’alumne">
      <div className="max-w-5xl mx-auto space-y-4"><div className="flex justify-between"><h2 className="text-xl font-bold">{selected.name} · {selected.device}</h2><button className={button} onClick={() => setSelected(null)}>Tancar</button></div>
      {selected.image && <img className="max-h-[65vh] mx-auto" src={selected.image} alt="Darrera pantalla rebuda" />}
      <button className={button} onClick={() => detail(selected.id)}>Actualitzar evidències</button>
      {selected.incidents.map(incident => <section className={panel} key={incident.id}>
        <h3>{when(incident.at)} · {incident.reason}</h3>
        <p>{incident.frames.length} frames disponibles del buffer previ. Els intervals sense dades no es reconstrueixen.</p>
        {incident.frames.length > 0 && <><input aria-label="Instant del buffer" className="w-full" type="range" min={0} max={incident.frames.length - 1} value={Math.min(index, incident.frames.length - 1)} onChange={e => setIndex(Number(e.target.value))} />
          <p>{when(incident.frames[Math.min(index, incident.frames.length - 1)].at)} · hora declarada pel client</p>
          <img src={incident.frames[Math.min(index, incident.frames.length - 1)].image} alt="Frame anterior a la incidència" /></>}
      </section>)}
      {selected.snapshots.map((f, i) => <figure key={i}><figcaption>Captura rebuda a les {when(f.at)}</figcaption><img src={f.image} alt="Captura sol·licitada pel docent" /></figure>)}
      </div>
    </div>}
  </div>;
}
function Student() {
  const [credentials, setCredentials] = useState<Credentials | null>(() => {
    try { return JSON.parse(sessionStorage.getItem('controwl-student') || 'null'); } catch { return null; }
  });
  const [code, setCode] = useState(''); const [name, setName] = useState(''); const [device, setDevice] = useState('');
  const [error, setError] = useState(''); const [blocked, setBlocked] = useState(!!credentials);
  const [sharing, setSharing] = useState(false); const [examStarted, setExamStarted] = useState(false); const [ended, setEnded] = useState(false); const [reason, setReason] = useState('');
  const stream = useRef<MediaStream | null>(null); const video = useRef<HTMLVideoElement | null>(null);
  const buffer = useRef<Frame[]>([]); const queue = useRef<any[]>([]);
  const endedRef = useRef(false); const blockedRef = useRef(!!credentials); const readyRef = useRef(false);
  const credentialsRef = useRef(credentials); credentialsRef.current = credentials;
  const seen = useRef(new Set<string>()); const verifier = useRef<CryptoKey | null>(null);
  function stopCapture() { stream.current?.getTracks().forEach(t => { t.onended = null; t.stop(); }); stream.current = null; video.current = null; buffer.current = []; setSharing(false); }
  function finish() { endedRef.current = true; setEnded(true); stopCapture(); sessionStorage.removeItem('controwl-student'); queue.current = []; }
  const snapshot = () => {
    const v = video.current; if (!v || !v.videoWidth || !stream.current?.active) return null;
    const canvas = document.createElement('canvas'); canvas.width = Math.min(960, v.videoWidth); canvas.height = Math.round(v.videoHeight * canvas.width / v.videoWidth);
    canvas.getContext('2d')!.drawImage(v, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL('image/jpeg', 0.45);
    if (image.length > 180000) return null;
    return { at: Date.now(), image };
  };
  const { connected, send } = useSocket(credentials ? { role: 'student', token: credentials.token, studentId: credentials.studentId } : null, msg => {
    if (msg.type === 'READY') {
      readyRef.current = true;
      // A locally detected incident can never be cleared by a state sync.
      const lock = !!msg.blocked || queue.current.length > 0;
      blockedRef.current = lock; setBlocked(lock);
      for (const incident of queue.current) send(incident);
    }
    if (msg.type === 'INCIDENT_SAVED') queue.current = queue.current.filter(i => i.id !== msg.id);
    if (msg.type === 'ENDED') finish();
    if (msg.type === 'ERROR') setError(msg.error);
    if (msg.type === 'COMMAND') void applyCommand(msg);
  }, () => {
    readyRef.current = false;
    if (!endedRef.current) { blockedRef.current = true; setBlocked(true); setReason('S’ha perdut la connexió amb el docent.'); }
  });
  function incident(reason: string) {
    if (!credentialsRef.current || endedRef.current) return;
    blockedRef.current = true; setBlocked(true); setReason(reason);
    const msg = { type: 'INCIDENT', id: crypto.randomUUID(), reason, frames: [...buffer.current] };
    // Keep only one unsent buffer to bound memory during long disconnections.
    queue.current = [...queue.current.slice(-1), msg];
    if (readyRef.current) send(msg);
  }
  async function applyCommand(msg: { payload: string; signature: string }) {
    try {
      const creds = credentialsRef.current; if (!creds) return;
      if (!verifier.current) verifier.current = await crypto.subtle.importKey('jwk', creds.publicKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      const signature = Uint8Array.from(atob(msg.signature), c => c.charCodeAt(0));
      if (!await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, verifier.current, signature, new TextEncoder().encode(msg.payload))) return;
      const cmd = JSON.parse(msg.payload);
      if (cmd.studentId !== creds.studentId || cmd.sessionId !== creds.session.id || cmd.expires < Date.now() || seen.current.has(cmd.commandId)) return;
      seen.current.add(cmd.commandId);
      if (cmd.kind === 'END') { send({ type: 'ACK', commandId: cmd.commandId }); finish(); }
      if (cmd.kind === 'UNLOCK') {
        if (!stream.current?.active || !readyRef.current || queue.current.length) { setError('Cal compartir la pantalla i enviar les incidències abans de desbloquejar.'); return; }
        if (send({ type: 'ACK', commandId: cmd.commandId })) { blockedRef.current = false; setBlocked(false); setReason(''); setError(''); buffer.current = []; }
      }
      if (cmd.kind === 'SNAPSHOT') { const frame = snapshot(); if (frame) send({ type: 'SNAPSHOT', commandId: cmd.commandId, frame }); }
    } catch { setError('No s’ha pogut verificar una ordre del docent.'); }
  }
  async function share() {
    setError('');
    let capture: MediaStream | undefined;
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getDisplayMedia) throw new Error('Cal HTTPS amb un certificat de confiança i un navegador compatible amb compartir pantalla.');
      capture = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'monitor' }, audio: false });
      const track = capture.getVideoTracks()[0];
      if (track.getSettings().displaySurface !== 'monitor') { capture.getTracks().forEach(t => t.stop()); throw new Error('Selecciona la pantalla sencera, no una finestra ni una pestanya.'); }
      const v = document.createElement('video'); v.srcObject = capture; v.muted = true; await v.play();
      stream.current = capture; video.current = v; setSharing(true);
      track.onended = () => { setSharing(false); incident('L’alumne ha aturat la compartició de pantalla.'); };
    } catch (e) { capture?.getTracks().forEach(t => t.stop()); setError((e as Error).message); }
  }
  useEffect(() => {
    const timer = setInterval(() => {
      if (endedRef.current) return;
      const frame = snapshot(); if (!frame) return;
      if (!blockedRef.current) buffer.current = [...buffer.current.filter(f => f.at >= Date.now() - 15000), frame].slice(-15);
      if (readyRef.current) send({ type: 'FRAME', frame });
    }, 1000);
    return () => { clearInterval(timer); stream.current?.getTracks().forEach(t => { t.onended = null; t.stop(); }); };
  }, [send]);
  useEffect(() => {
    if (!sharing || ended) return;
    const visibility = () => { if (document.hidden && !blockedRef.current) incident('La pestanya de ContrOwl ha deixat de ser visible. No se’n pot determinar la causa.'); };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [sharing, ended]);
  useEffect(() => { if (sharing && connected && !blocked) setExamStarted(true); }, [sharing, connected, blocked]);
  if (ended) return <div className={panel}><h2 className="text-xl font-bold">Sessió finalitzada</h2><p>La captura s’ha aturat. Ja pots tancar aquesta pàgina.</p><button className={button + ' mt-4'} onClick={() => location.reload()}>Tornar a l’inici</button></div>;
  return <div className="space-y-4">
    {error && <p role="alert" className="bg-rose-950 rounded-xl p-4">{error}</p>}
    {!credentials ? <form className={panel + ' max-w-lg mx-auto space-y-4'} onSubmit={async e => { e.preventDefault(); setError('');
      try { const creds = await api('/join', '', { code, name, device }); sessionStorage.setItem('controwl-student', JSON.stringify(creds)); setCredentials(creds); } catch (e) { setError((e as Error).message); }
    }}>
      <h2 className="font-bold text-xl">Entrar a la sessió</h2>
      <label className="block">Codi de sessió<input className={field} value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={6} required /></label>
      <label className="block">Nom i cognoms<input className={field} value={name} onChange={e => setName(e.target.value)} required minLength={3} /></label>
      <label className="block">Dispositiu<input className={field} placeholder="PC-12" value={device} onChange={e => setDevice(e.target.value)} required /></label>
      <p className="text-sm text-slate-300">Durant la sessió s’enviarà una imatge per segon de la pantalla seleccionada al PC del docent. Es conservaran els darrers 15 segons en memòria i es desaran al docent quan hi hagi una incidència. No es captura àudio.</p>
      <button className={button}>Entrar</button>
    </form> : <>
      <section className={panel + ' flex flex-wrap justify-between gap-4 items-center'}>
        <div><h2 className="font-bold text-xl">{credentials.session.name}</h2><p>{connected ? 'Connectat al docent' : 'Reconnectant amb el docent…'} · {sharing ? 'Compartint pantalla amb el docent' : 'No s’està compartint pantalla'}</p></div>
        {!sharing && <button className={button} disabled={!connected} onClick={share}>Compartir pantalla sencera</button>}
      </section>
      {blocked && <section role="alert" className="bg-rose-950 border border-rose-500 p-5 rounded-xl"><h2 className="text-xl font-bold">Sessió temporalment bloquejada</h2><p>{reason || 'Espera l’autorització del docent per continuar.'}</p><p>Pots tornar a compartir la pantalla si s’ha aturat. El desbloqueig només arriba des del docent.</p></section>}
      {!sharing && <p>Autoritza la pantalla sencera per obrir la prova. El navegador sempre et permet aturar la compartició; s’informarà el docent.</p>}
      {examStarted && <section className="space-y-2 relative">
        <p className="text-sm text-slate-400">Si la web de l’examen no permet mostrar-se dins ContrOwl, el docent haurà d’utilitzar una URL compatible. La web no pot restringir les aplicacions del sistema.</p>
        {(!sharing || !connected || blocked) && <div className="absolute inset-0 z-10 bg-slate-950/95 flex items-center justify-center p-8" role="status">Prova pausada. Les respostes de la pàgina es mantenen mentre no recarreguis.</div>}
        <iframe title="Examen" style={{ visibility: !sharing || !connected || blocked ? 'hidden' : 'visible' }} className="w-full h-[70vh] bg-white rounded-xl" src={credentials.session.url} sandbox="allow-scripts allow-forms allow-same-origin" referrerPolicy="no-referrer" />
      </section>}
    </>}
  </div>;
}
export default function LiveApp() {
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [token, setToken] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('');
  const isPages = import.meta.env.BASE_URL !== '/';
  return <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
    <header className="max-w-7xl mx-auto mb-8 flex justify-between gap-3 items-center">
      <div className="flex items-center gap-3"><img src={import.meta.env.BASE_URL + 'contrOwl.png'} alt="ContrOwl" className="w-12 h-12 object-contain" /><div><h1 className="text-2xl font-black">ContrOwl</h1><p className="text-sm text-slate-400">Supervisió connectada a l’ordinador del docent</p></div></div>
      {!isPages && <button className="text-sm underline" onClick={() => setRole(role === 'teacher' ? 'student' : 'teacher')}>{role === 'student' ? 'Soc docent' : 'Accés alumnat'}</button>}
    </header>
    <div className="max-w-7xl mx-auto">
      {isPages ? <Launcher /> : role === 'student' ? <Student /> : token ? <Teacher token={token} /> :
        <form className={panel + ' max-w-lg mx-auto space-y-4'} onSubmit={async e => { e.preventDefault(); try { const result = await api('/login', '', { password }); setToken(result.token); setPassword(''); } catch (e) { setError((e as Error).message); } }}>
          <h2 className="text-xl font-bold">Accés del docent</h2><p>La contrasenya es mostra a la consola del servidor al teu ordinador.</p>
          <label className="block">Contrasenya docent<input className={field} type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
          {error && <p role="alert">{error}</p>}<button className={button}>Iniciar sessió</button>
        </form>}
    </div>
  </main>;
}
