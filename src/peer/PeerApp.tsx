import React, {useEffect, useRef, useState} from 'react';
import {DirectPeer, Invitation, Packet, fingerprint, parseInvitation, sign, verify} from './transport';
import {download, read, write} from './storage';
import './peer.css';

type Frame = {at: number; image: string};
type Incident = {id: string; at: number; reason: string; frames: Frame[]};
type Pupil = {id: string; name: string; token: string; blocked: boolean; lastIncident?: string; incidents: Incident[]; shots: Frame[]};
type Session = {id: string; code: string; title: string; url: string; ended: boolean; pupils: Pupil[]};
type Teacher = {version: 1; publicKey: JsonWebKey; privateKey: JsonWebKey; sessions: Session[]};
type Student = {id: string; token: string; name: string; code: string; pinned?: string; pending: Incident[]; blocked: boolean; lastIncident?: string; inExam?: boolean};
const freshStudent = (): Student => ({id: crypto.randomUUID(), token: crypto.randomUUID(), name: '', code: '', pending: [], blocked: false});
const validFrame = (f: any): f is Frame => f && Number.isFinite(f.at) && typeof f.image === 'string' && f.image.length < 140000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(f.image);
const clock = (at: number) => new Date(at).toLocaleTimeString('ca');
function Exchange({label, value, onChange}: {label: string; value: string; onChange?: (s: string) => void}) {
  const [notice, setNotice] = useState('');
  return <div className="exchange"><label>{label}<textarea aria-label={label} rows={3} value={value} readOnly={!onChange} onChange={e => onChange?.(e.target.value)} placeholder={onChange ? 'Enganxa el text o obre el fitxer…' : 'El text de connexió apareixerà aquí.'}/></label><div className="row">
    {onChange ? <label className="file">Obrir fitxer<input type="file" accept=".json,application/json" onChange={async e => {const f = e.target.files?.[0]; if (f && f.size <= 100000) onChange(await f.text()); else setNotice('El fitxer és massa gran.'); e.target.value = '';}}/></label> : <><button disabled={!value} onClick={async () => {try {await navigator.clipboard.writeText(value); setNotice('Copiat.');} catch {setNotice('Selecciona el text i copia’l manualment.');}}}>Copiar</button><button disabled={!value} onClick={() => download('contrOwl-connexio.json', value)}>Descarregar fitxer</button></>}{notice && <small role="status">{notice}</small>}
  </div></div>;
}
function Evidence({items}: {items: Frame[]}) {
  const [index, setIndex] = useState(0);
  const current = items[Math.min(index, items.length - 1)];
  return current ? <div><img className="evidence" src={current.image} alt={'Captura de les ' + clock(current.at)}/><div className="row"><small>{clock(current.at)} · {Math.min(index + 1, items.length)} / {items.length}</small>{items.length > 1 && <input aria-label="Fotograma de la incidència" type="range" min={0} max={items.length - 1} value={Math.min(index, items.length - 1)} onChange={e => setIndex(Number(e.target.value))}/>}</div></div> : <p>No hi havia cap captura disponible.</p>;
}
function TeacherPanel() {
  const [model, setModel] = useState<Teacher>(); const state = useRef<Teacher | undefined>(undefined);
  const [selected, setSelected] = useState(''); const [error, setError] = useState(''); const [saveStatus, setSaveStatus] = useState('');
  const [title, setTitle] = useState(''); const [url, setUrl] = useState('');
  const [input, setInput] = useState(''); const [output, setOutput] = useState(''); const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState<Record<string, boolean>>({}); const [frames, setFrames] = useState<Record<string, Frame>>({});
  const peers = useRef(new Map<string, DirectPeer>()); const owner = useRef(false); const mounted = useRef(true);
  const session = model?.sessions.find(s => s.id === selected);
  const peerKey = (sid: string, pid: string) => sid + ':' + pid;
  const save = async (next: Teacher) => {
    state.current = next; setModel(next); setSaveStatus('Desant…');
    try {await write('teacher', next); setSaveStatus('Desat en aquest navegador'); return true;}
    catch {setError('No s’han pogut desar les dades. Exporta una còpia abans de tancar (pot faltar espai).'); setSaveStatus('Canvis sense desar'); return false;}
  };
  useEffect(() => {
    mounted.current = true;
    let release: () => void = () => {};
    const start = async () => {
      try {
        if (!navigator.locks) throw Error('Aquest navegador no admet el bloqueig de sessió. Utilitza Chrome o Edge actualitzat.');
        await navigator.locks.request('contrOwl-teacher', {ifAvailable: true}, async lock => {
          if (!lock) {setError('Ja hi ha un panell docent obert en aquest navegador. Tanca’l abans d’obrir-ne un altre.'); return;}
          owner.current = true;
          let data = await read<Teacher>('teacher');
          if (!data) {
            const keys = await crypto.subtle.generateKey({name: 'ECDSA', namedCurve: 'P-256'}, true, ['sign', 'verify']);
            data = {version: 1, publicKey: await crypto.subtle.exportKey('jwk', keys.publicKey), privateKey: await crypto.subtle.exportKey('jwk', keys.privateKey), sessions: []};
            await write('teacher', data);
          }
          if (!mounted.current) return;
          state.current = data; setModel(data); setSelected(data.sessions[0]?.id || ''); setSaveStatus('Desat en aquest navegador');
          await new Promise<void>(resolve => {release = resolve;});
          owner.current = false;
        });
      } catch (e) {setError(String(e));}
    }; void start();
    return () => {mounted.current = false; release(); peers.current.forEach(p => p.close());};
  }, []);
  const updatePupil = async (sid: string, pid: string, fn: (p: Pupil) => Pupil) => {
    if (!state.current || !owner.current) return false;
    return save({...state.current, sessions: state.current.sessions.map(s => s.id === sid ? {...s, pupils: s.pupils.map(p => p.id === pid ? fn(p) : p)} : s)});
  };
  const command = async (peer: DirectPeer, invite: Invitation, sid: string, payload: Packet) => {
    const data = state.current;
    if (data) await peer.send(await sign(data.privateKey, {...payload, pair: invite.id, session: sid, student: invite.student, expires: Date.now() + 30000, nonce: crypto.randomUUID()}));
  };
  const controls = useRef(new Map<string, (p: Packet) => Promise<void>>());
  const accept = async () => {
    setError(''); setBusy(true); setOutput('');
    let peer: DirectPeer | undefined;
    try {
      const invite = parseInvitation(input, 'offer');
      const s = state.current?.sessions.find(s => s.code === invite.code);
      if (!s) throw Error('Aquest codi no correspon a cap sessió d’aquest docent.');
      const previous = s.pupils.find(p => p.id === invite.student);
      if (previous && previous.token !== invite.token) throw Error('La identitat de reconnexió no coincideix.');
      const key = peerKey(s.id, invite.student);
      if (peers.current.get(key)?.connected) throw Error('Aquest alumne ja està connectat.');
      if (!previous) {
        const next = {...state.current!, sessions: state.current!.sessions.map(v => v.id === s.id ? {...v, pupils: [...v.pupils, {id: invite.student, name: invite.name, token: invite.token, blocked: false, incidents: [], shots: []}]} : v)};
        if (!await save(next)) throw Error('Cal poder desar la sessió abans de connectar.');
      }
      peers.current.get(key)?.close(); peer = new DirectPeer(); const connection = peer;
      peers.current.set(key, connection); setSelected(s.id);
      const send = (p: Packet) => command(connection, invite, s.id, p);
      controls.current.set(key, send);
      connection.onopen = () => {
        setOnline(v => ({...v, [key]: true}));
        const current = state.current!.sessions.find(v => v.id === s.id)!;
        const pupil = current.pupils.find(v => v.id === invite.student)!;
        void send({type: 'config', title: current.title, url: current.url, ended: current.ended, blocked: pupil.blocked});
      };
      connection.onclose = () => {
        if (peers.current.get(key) !== connection || !mounted.current) return;
        setOnline(v => ({...v, [key]: false})); setFrames(v => {const next = {...v}; delete next[key]; return next;});
      };
      let processing = Promise.resolve();
      connection.onmessage = packet => {
        if (peers.current.get(key) !== connection) return;
        if (packet.type === 'frame' && validFrame(packet.frame)) {setFrames(v => ({...v, [key]: packet.frame})); return;}
        processing = processing.then(async () => {
          if (packet.type === 'incident') {
            const i = packet.incident;
            if (!i || typeof i.id !== 'string' || i.id.length > 100 || typeof i.reason !== 'string' || i.reason.length > 200 || !Number.isFinite(i.at) || !Array.isArray(i.frames) || i.frames.length > 15 || !i.frames.every(validFrame)) return;
            const exists = state.current!.sessions.find(v => v.id === s.id)!.pupils.find(p => p.id === invite.student)!.incidents.some(v => v.id === i.id);
            const saved = await updatePupil(s.id, invite.student, p => exists ? p : {...p, blocked: true, lastIncident: i.id, incidents: [...p.incidents, i]});
            if (saved) await send({type: 'ack', id: i.id});
          } else if (packet.type === 'snapshot' && validFrame(packet.frame)) {
            await updatePupil(s.id, invite.student, p => ({...p, shots: [...p.shots, packet.frame]}));
          }
        }).catch(e => setError(String(e)));
      };
      const sdp = await connection.answer(invite.sdp);
      setOutput(JSON.stringify({...invite, kind: 'answer', sdp, publicKey: state.current!.publicKey, created: Date.now()}));
    } catch (e) {peer?.close(); setError(e instanceof Error ? e.message : String(e));} finally {setBusy(false);}
  };
  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      const parsed = new URL(url); if (parsed.protocol !== 'https:') throw Error('L’examen ha de tenir una URL HTTPS.');
      if (!title.trim()) throw Error('Escriu el nom de la sessió.');
      const code = Array.from(crypto.getRandomValues(new Uint8Array(6)), n => '23456789ABCDEFGHJKMNPQRSTUVWXYZ'[n % 31]).join('');
      if (state.current!.sessions.some(s => s.code === code)) throw Error('Torna a crear la sessió.');
      const s: Session = {id: crypto.randomUUID(), code, title: title.trim(), url: parsed.href, ended: false, pupils: []};
      if (await save({...state.current!, sessions: [s, ...state.current!.sessions]})) {setSelected(s.id); setTitle(''); setUrl('');}
    } catch (e) {setError(e instanceof Error ? e.message : String(e));}
  };
  const end = async () => {
    if (!session || !window.confirm('Finalitzar aquesta sessió per a tots els alumnes?')) return;
    if (await save({...state.current!, sessions: state.current!.sessions.map(s => s.id === session.id ? {...s, ended: true} : s)})) {
      for (const p of session.pupils) await controls.current.get(peerKey(session.id, p.id))?.({type: 'end'});
    }
  };
  return <main><div className="heading"><div><p className="eyebrow">ORDINADOR DEL DOCENT</p><h1>Panell de control</h1><p>Connexió directa · Dades desades aquí · Cap servidor de dades</p></div><span className="badge">{saveStatus}</span></div>
    {error && <p role="alert" className="alert">{error}</p>}
    {model && <><section><h2>Nova sessió</h2><form onSubmit={create} className="row"><label>Nom de la sessió<input required value={title} onChange={e => setTitle(e.target.value)} maxLength={100}/></label><label className="grow">URL de l’examen<input required type="url" placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)}/></label><button className="primary" type="submit">Crear sessió</button></form><small>La web de l’examen ha de permetre mostrar-se en un iframe. L’alumne haurà de compartir la pantalla completa.</small></section>
    {model.sessions.length > 0 && <><div className="row"><label className="grow">Sessions desades<select value={selected} onChange={e => setSelected(e.target.value)}>{model.sessions.map(s => <option key={s.id} value={s.id}>{s.title} · {s.code}{s.ended ? ' · Finalitzada' : ''}</option>)}</select></label><button onClick={() => download('contrOwl-informe.json', JSON.stringify({version: 1, exported: new Date().toISOString(), sessions: model.sessions.map(s => ({...s, pupils: s.pupils.map(({token, ...p}) => p)}))}, null, 2))}>Exportar informe</button></div>
    {session && <><section><div className="row"><h2 className="grow">{session.title}</h2><strong className="code" data-testid="session-code">{session.code}</strong><span>{session.ended ? 'Finalitzada' : 'En curs'}</span>{!session.ended && <button onClick={end}>Finalitzar sessió</button>}</div><p>1. Dona el codi als alumnes. 2. Rep la invitació de cada alumne i enganxa-la aquí. 3. Retorna-li la resposta. Els textos caduquen al cap de 15 minuts; es poden passar com a fitxers per una memòria USB.</p><div className="pair-grid"><div><Exchange label="Invitació de l’alumne" value={input} onChange={setInput}/><button className="primary" disabled={busy || !input} onClick={accept}>{busy ? 'Preparant…' : 'Acceptar invitació'}</button></div><Exchange label="Resposta per a l’alumne" value={output}/></div><small>Comparteix aquests textos només amb l’altre participant. La resposta estableix la identitat del docent.</small></section>
    <div className="row"><h2 className="grow">Alumnes ({session.pupils.length})</h2><span>{session.pupils.filter(p => online[peerKey(session.id, p.id)]).length} connectats</span></div><div className="pupils">{session.pupils.map(p => {const key = peerKey(session.id, p.id), frame = frames[key]; return <section key={p.id} className="pupil"><div className="row"><h3 className="grow">{p.name}</h3><span className={'badge ' + (online[key] ? 'ok' : '')}>{online[key] ? 'Connectat' : 'Desconnectat'}</span></div><p>{p.blocked ? 'Bloquejat · requereix revisió' : 'Sense bloqueig'}</p>{frame ? <img className="evidence" src={frame.image} alt={'Pantalla de ' + p.name}/> : <div className="empty">Esperant la pantalla compartida</div>}<div className="row"><button disabled={!online[key] || session.ended} onClick={() => void controls.current.get(key)?.({type: 'capture'})}>Desar captura</button><button disabled={!online[key] || !p.blocked || session.ended} onClick={async () => {const id = state.current!.sessions.find(s => s.id === session.id)!.pupils.find(v => v.id === p.id)!.lastIncident; if (await updatePupil(session.id, p.id, v => ({...v, blocked: false}))) await controls.current.get(key)?.({type: 'unlock', incident: id});}}>Desbloquejar</button></div><details><summary>Incidències ({p.incidents.length}) i captures ({p.shots.length})</summary>{p.incidents.map(i => <article key={i.id}><h4>{clock(i.at)} · {i.reason}</h4><Evidence items={i.frames}/></article>)}{p.shots.map((f, i) => <article key={i}><h4>Captura manual</h4><Evidence items={[f]}/></article>)}</details></section>;})}</div></>}
    </>}
    <aside>En tancar aquest panell es talla la connexió. En tornar, recuperaràs les sessions i proves desades i hauràs de tornar a aparellar els alumnes. Utilitza el mateix navegador i perfil; esborrar les dades del lloc també esborra les sessions. L’informe exportat és una còpia de lectura, no una restauració del perfil.</aside></>}
  </main>;
}

function StudentPanel() {
  const [data, setData] = useState<Student>(); const state = useRef<Student | undefined>(undefined);
  const [name, setName] = useState(''); const [code, setCode] = useState(''); const [input, setInput] = useState(''); const [output, setOutput] = useState('');
  const [error, setError] = useState(''); const [status, setStatus] = useState('Sense connexió'); const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false); const [sharing, setSharing] = useState(false); const [started, setStarted] = useState(false);
  const [config, setConfig] = useState<{title: string; url: string; ended: boolean}>();
  const configRef = useRef(config); const peer = useRef<DirectPeer | undefined>(undefined); const invitation = useRef<Invitation | undefined>(undefined);
  const publicKey = useRef<JsonWebKey | undefined>(undefined); const stream = useRef<MediaStream | undefined>(undefined); const video = useRef<HTMLVideoElement | undefined>(undefined); const frames = useRef<Frame[]>([]);
  const active = useRef(false); const share = useRef(false); const saving = useRef(Promise.resolve()); const finish = useRef(false); const lastCause = useRef({reason: '', at: 0});
  const seen = useRef(new Set<string>()); const captureBusy = useRef(false); const initialised = useRef(false);
  const save = async (next: Student) => {
    state.current = next; setData(next);
    const job = saving.current.then(() => write('student', next));
    saving.current = job.catch(() => {setError('No es poden desar les dades locals. No tanquis aquesta pestanya; avisa el docent.');});
    await job;
  };
  const incident = async (reason: string) => {
    if (!state.current || finish.current) return;
    if (lastCause.current.reason === reason && Date.now() - lastCause.current.at < 2000) return;
    lastCause.current = {reason, at: Date.now()};
    const i: Incident = {id: crypto.randomUUID(), at: Date.now(), reason, frames: frames.current.slice(-15)};
    const next = {...state.current, blocked: true, lastIncident: i.id, pending: [...state.current.pending, i]};
    // Preserve every pending incident. Bound evidence, rather than silently dropping incidents.
    if (next.pending.length > 3) next.pending = next.pending.map((v, n) => n < next.pending.length - 3 ? {...v, frames: []} : v);
    try {await save(next); await peer.current?.send({type: 'incident', incident: i});} catch { /* Keep the in-memory copy visible and blocked. */ }
  };
  useEffect(() => {
    let disposed = false; let release: () => void = () => {};
    void navigator.locks.request('contrOwl-student', {ifAvailable: true}, async lock => {
      if (!lock) {setError('Ja hi ha una pestanya d’alumne oberta en aquest navegador.'); return;}
      try {
        const stored = await read<Student>('student');
        const value = stored || freshStudent(); if (!stored) await write('student', value);
        if (disposed) return;
        state.current = value; setData(value); setName(value.name); setCode(value.code); initialised.current = true;
        if (value.inExam) await incident('S’ha reobert la pàgina de l’alumne');
        await new Promise<void>(resolve => {release = resolve;});
      } catch {setError('No es pot obrir l’emmagatzematge local. Utilitza Chrome o Edge amb dades del lloc habilitades.');}
    }).catch(() => setError('Utilitza Chrome o Edge actualitzat.'));
    const hidden = () => {if (document.hidden && active.current) void incident('La pàgina ha passat a segon pla');};
    const unload = (e: BeforeUnloadEvent) => {if (active.current && !finish.current) {e.preventDefault(); e.returnValue = '';}};
    document.addEventListener('visibilitychange', hidden); window.addEventListener('beforeunload', unload);
    return () => {disposed = true; finish.current = true; release(); peer.current?.close(); stream.current?.getTracks().forEach(t => t.stop()); document.removeEventListener('visibilitychange', hidden); window.removeEventListener('beforeunload', unload);};
  }, []);
  useEffect(() => {
    const timer = setInterval(async () => {
      if (!share.current || !video.current || video.current.readyState < 2 || captureBusy.current) return;
      captureBusy.current = true;
      try {
        const v = video.current, canvas = document.createElement('canvas');
        canvas.width = Math.min(960, v.videoWidth); canvas.height = Math.round(v.videoHeight * canvas.width / v.videoWidth);
        if (!canvas.width || !canvas.height) return;
        canvas.getContext('2d')!.drawImage(v, 0, 0, canvas.width, canvas.height);
        const image = canvas.toDataURL('image/jpeg', .45); if (image.length >= 140000) return;
        const frame = {at: Date.now(), image}; frames.current = [...frames.current, frame].filter(f => Date.now() - f.at <= 15000).slice(-15);
        if (peer.current?.connected) await peer.current.send({type: 'frame', frame});
      } finally {captureBusy.current = false;}
    }, 1000);
    const resend = setInterval(() => {if (peer.current?.connected) for (const i of state.current?.pending || []) void peer.current.send({type: 'incident', incident: i});}, 5000);
    return () => {clearInterval(timer); clearInterval(resend);};
  }, []);
  const makeOffer = async () => {
    if (!state.current || !initialised.current) return;
    setError(''); setOutput(''); setBusy(true);
    try {
      if (!name.trim() || !/^[A-Z0-9]{6}$/.test(code)) throw Error('Escriu el nom i el codi de sis caràcters del docent.');
      if (state.current.code !== code && active.current && !finish.current) throw Error('Cal finalitzar la sessió actual abans de canviar de codi.');
      peer.current?.close();
      let value = {...state.current, name: name.trim(), code};
      if (state.current.code && state.current.code !== code) {
        if (state.current.pending.length) throw Error('Hi ha incidències pendents. Reconnecta amb el docent abans de canviar de sessió.');
        value = {...freshStudent(), name: name.trim(), code}; setConfig(undefined); configRef.current = undefined; setStarted(false); active.current = false; finish.current = false;
      }
      await save(value);
      const connection = new DirectPeer(); peer.current = connection; publicKey.current = undefined; seen.current.clear();
      connection.onopen = () => {if (peer.current !== connection) return; setConnected(true); setStatus('Connectat directament amb el docent');};
      connection.onclose = () => {if (peer.current !== connection) return; setConnected(false); setStatus('Desconnectat: crea una invitació nova per reconnectar'); if (active.current && !finish.current) void incident('S’ha perdut la connexió amb el docent');};
      let processing = Promise.resolve();
      connection.onmessage = envelope => {
        processing = processing.then(async () => {
          if (!publicKey.current || peer.current !== connection) return;
          const p = await verify(publicKey.current, envelope);
          if (p.pair !== invitation.current?.id || p.student !== state.current!.id || !Number.isFinite(p.expires) || p.expires < Date.now() || seen.current.has(p.nonce)) return;
          seen.current.add(p.nonce);
          if (p.type === 'config') {
            if (typeof p.url !== 'string' || new URL(p.url).protocol !== 'https:' || typeof p.title !== 'string') return;
            const c = {title: p.title, url: p.url, ended: !!p.ended}; setConfig(c); configRef.current = c;
            if (p.blocked) await save({...state.current!, blocked: true});
            if (p.ended) {await save({...state.current!, inExam: false}); finish.current = true; active.current = false; share.current = false; setSharing(false); stream.current?.getTracks().forEach(t => t.stop());}
            for (const i of state.current!.pending) await connection.send({type: 'incident', incident: i});
          } else if (p.type === 'ack') {
            await save({...state.current!, pending: state.current!.pending.filter(i => i.id !== p.id)});
          } else if (p.type === 'unlock' && p.incident === state.current!.lastIncident) {
            await save({...state.current!, blocked: false});
          } else if (p.type === 'capture') {
            const frame = frames.current.at(-1); if (frame && Date.now() - frame.at < 3000) await connection.send({type: 'snapshot', frame});
          } else if (p.type === 'end') {
            await save({...state.current!, inExam: false}); finish.current = true; active.current = false; share.current = false; setSharing(false); stream.current?.getTracks().forEach(t => t.stop());
            if (configRef.current) {configRef.current = {...configRef.current, ended: true}; setConfig(configRef.current);}
          }
        }).catch(() => setError('S’ha rebut una ordre no vàlida o no s’ha pogut desar.'));
      };
      const sdp = await connection.offer();
      const invite: Invitation = {version: 1, kind: 'offer', id: crypto.randomUUID(), student: value.id, token: value.token, name: value.name, code, sdp, created: Date.now()};
      invitation.current = invite; setOutput(JSON.stringify(invite)); setStatus('Passa la invitació al docent i espera la seva resposta');
    } catch (e) {setError(e instanceof Error ? e.message : String(e));} finally {setBusy(false);}
  };
  const connect = async () => {
    setError('');
    try {
      const response = parseInvitation(input, 'answer'), offer = invitation.current;
      if (!offer || !peer.current || response.id !== offer.id || response.student !== offer.student || response.code !== offer.code || response.token !== offer.token || !response.publicKey) throw Error('Aquesta resposta no correspon a la invitació actual.');
      const pin = await fingerprint(response.publicKey);
      if (state.current!.pinned && state.current!.pinned !== pin) throw Error('La identitat del docent ha canviat. No es pot reconnectar a un altre docent.');
      await save({...state.current!, pinned: pin}); publicKey.current = response.publicKey;
      await peer.current.accept(response.sdp); setStatus('Connectant… Si no connecta, comprova que sou a la mateixa xarxa i que permet connexions entre equips.');
    } catch (e) {setError(e instanceof Error ? e.message : String(e));}
  };
  const start = async () => {
    setError('');
    try {
      if (!peer.current?.connected || !configRef.current || configRef.current.ended) throw Error('Connecta primer amb el docent.');
      const media = await navigator.mediaDevices.getDisplayMedia({video: {frameRate: 1}, audio: false});
      const track = media.getVideoTracks()[0];
      if (track.getSettings().displaySurface !== 'monitor') {media.getTracks().forEach(t => t.stop()); throw Error('Selecciona «Pantalla completa», no una pestanya ni una finestra.');}
      stream.current?.getTracks().forEach(t => t.stop()); stream.current = media;
      const v = document.createElement('video'); v.muted = true; v.srcObject = media; await v.play(); video.current = v;
      share.current = true; setSharing(true); setStarted(true); active.current = true; finish.current = false; await save({...state.current!, inExam: true});
      track.onended = () => {share.current = false; setSharing(false); void incident('S’ha aturat la compartició de pantalla');};
    } catch (e) {setError(e instanceof Error ? e.message : String(e));}
  };
  const blocked = data?.blocked || !connected || !sharing;
  return <main><div className="heading"><div><p className="eyebrow">ACCÉS DE L’ALUMNE</p><h1>Entrar a la sessió</h1><p>La pantalla i les incidències s’envien directament a l’ordinador del docent.</p></div><span className={'badge ' + (connected ? 'ok' : '')}>{connected ? 'Connectat' : 'Sense connexió'}</span></div>
    {error && <p role="alert" className="alert">{error}</p>}
    <section><div className="row"><label className="grow">Nom i cognoms<input value={name} disabled={!data || connected || (started && !config?.ended)} maxLength={100} onChange={e => setName(e.target.value)}/></label><label>Codi de sessió<input value={code} disabled={!data || connected || (started && !config?.ended)} maxLength={6} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}/></label><button className="primary" disabled={!data || busy || connected} onClick={makeOffer}>{busy ? 'Preparant…' : 'Crear invitació'}</button></div><p>1. Escriu el codi del docent. 2. Fes-li arribar la invitació. 3. Enganxa la resposta que et retorni i connecta.</p><div className="pair-grid"><Exchange label="La teva invitació" value={output}/><div><Exchange label="Resposta del docent" value={input} onChange={setInput}/><button disabled={!output || !input || connected} onClick={connect}>Connectar amb el docent</button></div></div><p role="status">{status}</p><small>Sense servidors intermediaris. Cal una xarxa que permeti connectar els dos equips (normalment la mateixa xarxa local). Els textos de connexió es poden transferir com a fitxers.</small></section>
    {data && data.pending.length > 0 && <p className="alert">{data.pending.length} incidències pendents d’entrega. Es reenviaran en reconnectar. Es conserven les imatges de les tres més recents.</p>}
    {config && <section><div className="row"><h2 className="grow">{config.title}</h2><span>{config.ended ? 'Sessió finalitzada' : 'Sessió en curs'}</span></div>{!config.ended && <><p>Comparteix la pantalla completa amb el docent per començar. Sortir d’aquesta pàgina, aturar la compartició o perdre la connexió bloqueja l’examen.</p><button className="primary" disabled={!connected || sharing} onClick={start}>{sharing ? 'Pantalla compartida' : 'Compartir pantalla i continuar'}</button><small className="block">La captura necessita el teu permís. No es pot supervisar un ordinador des d’una web tancada.</small></>}
    {started && <div className="exam"><iframe title="Examen" src={config.url} sandbox="allow-scripts allow-forms allow-same-origin" style={{visibility: blocked || config.ended ? 'hidden' : 'visible'}}/>{(blocked || config.ended) && <div className="overlay"><img className="block-logo" src={import.meta.env.BASE_URL + 'contrOwl.png'} alt="ContrOwl"/><h2>{config.ended ? 'Sessió finalitzada' : 'Sessió temporalment bloquejada'}</h2><p>{config.ended ? 'El docent ha finalitzat la sessió.' : !connected ? 'Reconnecta amb el docent intercanviant una invitació nova.' : !sharing ? 'Torna a compartir la pantalla completa.' : 'Espera que el docent revisi la incidència i et desbloquegi.'}</p></div>}</div>}
    <small>Si l’examen no apareix, la seva web pot impedir mostrar-se dins d’una altra pàgina. Avisa el docent; no obris l’examen en una altra pestanya.</small></section>}
    <aside>Les dades d’identitat i les incidències pendents es desen en aquest navegador. Les dades rebudes es desen només al navegador del docent. No s’utilitza cap servei de Google AI Studio ni cap API de pagament.</aside>
  </main>;
}
export default function PeerApp() {
  const teacher = /\/administration\/?$/.test(location.pathname);
  return <><header><a href={import.meta.env.BASE_URL}><img src={import.meta.env.BASE_URL + 'contrOwl.png'} alt="ContrOwl"/><strong>contrOwl</strong></a><span>Supervisió directa</span><a href={teacher ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + 'administration/'}>{teacher ? 'Accés alumne' : 'Panell docent'}</a></header>{teacher ? <TeacherPanel/> : <StudentPanel/>}<footer>100% web · Sense quotes · WebRTC directe · Desat local</footer></>;
}
