import React, {useEffect, useRef, useState} from 'react';
import {DirectPeer, Join, Packet, SessionHost, joinSession, validJoin, fingerprint, sign, verify} from './transport';
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
function Evidence({items}: {items: Frame[]}) {
  const [index, setIndex] = useState(0);
  const current = items[Math.min(index, items.length - 1)];
  return current ? <div><img className="evidence" src={current.image} alt={'Captura de les ' + clock(current.at)}/><div className="row"><small>{clock(current.at)} · {Math.min(index + 1, items.length)} / {items.length}</small>{items.length > 1 && <input aria-label="Fotograma de la incidència" type="range" min={0} max={items.length - 1} value={Math.min(index, items.length - 1)} onChange={e => setIndex(Number(e.target.value))}/>}</div></div> : <p>No hi havia cap captura disponible.</p>;
}
function TeacherPanel() {
  const [model, setModel] = useState<Teacher>(); const state = useRef<Teacher | undefined>(undefined);
  const [selected, setSelected] = useState(''); const [error, setError] = useState(''); const [saveStatus, setSaveStatus] = useState('');
  const [title, setTitle] = useState(''); const [url, setUrl] = useState('');
  const [discovery, setDiscovery] = useState<Record<string, string>>({});
  const hosts = useRef(new Map<string, SessionHost>());
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
    return () => {mounted.current = false; release(); hosts.current.forEach(h => h.close()); peers.current.forEach(p => p.close());};
  }, []);
  const updatePupil = async (sid: string, pid: string, fn: (p: Pupil) => Pupil) => {
    if (!state.current || !owner.current) return false;
    return save({...state.current, sessions: state.current.sessions.map(s => s.id === sid ? {...s, pupils: s.pupils.map(p => p.id === pid ? fn(p) : p)} : s)});
  };
  const command = async (peer: DirectPeer, invite: Join, sid: string, payload: Packet) => {
    const data = state.current;
    if (data) await peer.send(await sign(data.privateKey, {...payload, pair: invite.id, session: sid, student: invite.student, expires: Date.now() + 30000, nonce: crypto.randomUUID()}));
  };
  const controls = useRef(new Map<string, (p: Packet) => Promise<void>>());
  const accept = async (connection: DirectPeer, invite: Join) => {
    try {
      if (!validJoin(invite)) throw Error('Identitat de connexió no vàlida.');
      const s = state.current?.sessions.find(s => s.code === invite.code);
      if (!s) throw Error('Aquest codi no correspon a cap sessió d’aquest docent.');
      const previous = s.pupils.find(p => p.id === invite.student);
      if (previous && previous.token !== invite.token) throw Error('La identitat de reconnexió no coincideix.');
      const key = peerKey(s.id, invite.student);
      // The stored resume token identifies the same browser after a network interruption.
      if (!previous) {
        const next = {...state.current!, sessions: state.current!.sessions.map(v => v.id === s.id ? {...v, pupils: [...v.pupils, {id: invite.student, name: invite.name, token: invite.token, blocked: false, incidents: [], shots: []}]} : v)};
        if (!await save(next)) throw Error('Cal poder desar la sessió abans de connectar.');
      }
      peers.current.get(key)?.close();
      peers.current.set(key, connection); setSelected(s.id);
      const send = (p: Packet) => command(connection, invite, s.id, p);
      controls.current.set(key, send);
      const welcome = async () => {
        setOnline(v => ({...v, [key]: true}));
        const current = state.current!.sessions.find(v => v.id === s.id)!;
        const pupil = current.pupils.find(v => v.id === invite.student)!;
        await connection.send({type: 'welcome', pair: invite.id, publicKey: state.current!.publicKey});
        await send({type: 'config', title: current.title, url: current.url, ended: current.ended, blocked: pupil.blocked});
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
      if (connection.connected) await welcome(); else connection.onopen = () => void welcome();
    } catch (e) {connection.close(); setError(e instanceof Error ? e.message : String(e));}
  };
  useEffect(() => {
    if (!model || !owner.current) return;
    for (const s of model.sessions) {
      if (hosts.current.has(s.id)) continue;
      const host = new SessionHost(s.code, connection => {
        const timeout = setTimeout(() => connection.close(), 15000);
        connection.onmessage = packet => {
          clearTimeout(timeout);
          if (packet.type !== 'join' || !validJoin(packet.join) || packet.join.code !== s.code) {connection.close(); return;}
          connection.onmessage = () => {};
          void accept(connection, packet.join);
        };
        connection.onclose = () => clearTimeout(timeout);
      }, message => {if (mounted.current) setDiscovery(v => ({...v, [s.id]: message}));});
      hosts.current.set(s.id, host);
    }
  }, [model]);
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
  return <main><div className="heading"><div><p className="eyebrow">ORDINADOR DEL DOCENT</p><h1>Panell de control</h1><p>Connexió directa · Dades desades aquí · Connexió automàtica per codi</p></div><span className="badge">{saveStatus}</span></div>
    {error && <p role="alert" className="alert">{error}</p>}
    {model && <><section><h2>Nova sessió</h2><form onSubmit={create} className="row"><label>Nom de la sessió<input required value={title} onChange={e => setTitle(e.target.value)} maxLength={100}/></label><label className="grow">URL de l’examen<input required type="url" placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)}/></label><button className="primary" type="submit">Crear sessió</button></form><small>La web de l’examen ha de permetre mostrar-se en un iframe. L’alumne haurà de compartir la pantalla completa.</small></section>
    {model.sessions.length > 0 && <><div className="row"><label className="grow">Sessions desades<select value={selected} onChange={e => setSelected(e.target.value)}>{model.sessions.map(s => <option key={s.id} value={s.id}>{s.title} · {s.code}{s.ended ? ' · Finalitzada' : ''}</option>)}</select></label><button onClick={() => download('contrOwl-informe.json', JSON.stringify({version: 1, exported: new Date().toISOString(), sessions: model.sessions.map(s => ({...s, pupils: s.pupils.map(({token, ...p}) => p)}))}, null, 2))}>Exportar informe</button></div>
    {session && <><section><div className="row"><h2 className="grow">{session.title}</h2><strong className="code" data-testid="session-code">{session.code}</strong><span>{session.ended ? 'Finalitzada' : 'En curs'}</span>{!session.ended && <button onClick={end}>Finalitzar sessió</button>}</div><p>Dona aquest codi als alumnes. Entraran amb el seu nom, autoritzaran compartir la pantalla completa i apareixeran aquí automàticament.</p><p role="status" data-testid="discovery-status">{discovery[session.id] || 'Preparant el codi…'}</p><small>Mantén el panell obert per rebre les pantalles. No cal instal·lar ni configurar res.</small></section>
    <div className="row"><h2 className="grow">Alumnes ({session.pupils.length})</h2><span>{session.pupils.filter(p => online[peerKey(session.id, p.id)]).length} connectats</span></div><div className="pupils">{session.pupils.map(p => {const key = peerKey(session.id, p.id), frame = frames[key]; return <section key={p.id} className="pupil"><div className="row"><h3 className="grow">{p.name}</h3><span className={'badge ' + (online[key] ? 'ok' : '')}>{online[key] ? 'Connectat' : 'Desconnectat'}</span></div><p>{p.blocked ? 'Bloquejat · requereix revisió' : 'Sense bloqueig'}</p>{frame ? <img className="evidence" src={frame.image} alt={'Pantalla de ' + p.name}/> : <div className="empty">Esperant la pantalla compartida</div>}<div className="row"><button disabled={!online[key] || session.ended} onClick={() => void controls.current.get(key)?.({type: 'capture'})}>Desar captura</button><button disabled={!online[key] || p.blocked || session.ended} onClick={() => void controls.current.get(key)?.({type: 'lock'})}>Bloquejar</button><button disabled={!online[key] || !p.blocked || session.ended} onClick={async () => {const id = state.current!.sessions.find(s => s.id === session.id)!.pupils.find(v => v.id === p.id)!.lastIncident; if (await updatePupil(session.id, p.id, v => ({...v, blocked: false}))) await controls.current.get(key)?.({type: 'unlock', incident: id});}}>Desbloquejar</button></div><details><summary>Incidències ({p.incidents.length}) i captures ({p.shots.length})</summary>{p.incidents.map(i => <article key={i.id}><h4>{clock(i.at)} · {i.reason}</h4><Evidence items={i.frames}/></article>)}{p.shots.map((f, i) => <article key={i}><h4>Captura manual</h4><Evidence items={[f]}/></article>)}</details></section>;})}</div></>}
    </>}
    <aside>En tancar aquest panell es talla la connexió. En tornar, recuperaràs les sessions i proves desades i els alumnes que mantinguin la web oberta es reconnectaran automàticament. Utilitza el mateix navegador i perfil; esborrar les dades del lloc també esborra les sessions. L’informe exportat és una còpia de lectura, no una restauració del perfil.</aside></>}
  </main>;
}

function StudentPanel() {
  const [data, setData] = useState<Student>(); const state = useRef<Student | undefined>(undefined);
  const [name, setName] = useState(''); const [code, setCode] = useState('');
  const [error, setError] = useState(''); const [status, setStatus] = useState('Sense connexió'); const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false); const [sharing, setSharing] = useState(false); const [started, setStarted] = useState(false);
  const [config, setConfig] = useState<{title: string; url: string; ended: boolean}>();
  const configRef = useRef(config); const peer = useRef<DirectPeer | undefined>(undefined); const invitation = useRef<Join | undefined>(undefined);
  const publicKey = useRef<JsonWebKey | undefined>(undefined); const stream = useRef<MediaStream | undefined>(undefined); const video = useRef<HTMLVideoElement | undefined>(undefined); const frames = useRef<Frame[]>([]);
  const active = useRef(false); const share = useRef(false); const saving = useRef(Promise.resolve()); const finish = useRef(false); const lastCause = useRef({reason: '', at: 0});
  const wanted = useRef(false); const attempting = useRef(false); const generation = useRef(0);
  const retry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const connectRef = useRef<() => Promise<void>>(async () => {});
  const alive = useRef(true); const authenticated = useRef(false);
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
    try {await save(next); if (authenticated.current) await peer.current?.send({type: 'incident', incident: i});} catch { /* Keep the in-memory copy visible and blocked. */ }
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
    return () => {disposed = true; alive.current = false; wanted.current = false; generation.current++; clearTimeout(retry.current); finish.current = true; release(); peer.current?.close(); stream.current?.getTracks().forEach(t => t.stop()); document.removeEventListener('visibilitychange', hidden); window.removeEventListener('beforeunload', unload);};
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
        if (authenticated.current && peer.current?.connected) await peer.current.send({type: 'frame', frame});
      } finally {captureBusy.current = false;}
    }, 1000);
    const resend = setInterval(() => {if (authenticated.current && peer.current?.connected) for (const i of state.current?.pending || []) void peer.current.send({type: 'incident', incident: i});}, 5000);
    return () => {clearInterval(timer); clearInterval(resend);};
  }, []);
  const schedule = () => {
    clearTimeout(retry.current);
    if (wanted.current && alive.current && !finish.current) retry.current = setTimeout(() => void connectRef.current(), 3500);
  };
  const establish = async () => {
    if (!state.current || !wanted.current || attempting.current || !alive.current) return;
    attempting.current = true; const attempt = ++generation.current;
    setBusy(true); setStatus('Connectant amb el docent…');
    try {
      const value = state.current;
      const connection = await joinSession(value.code);
      if (!alive.current || attempt !== generation.current || !wanted.current) {connection.close(); return;}
      peer.current = connection; authenticated.current = false; publicKey.current = undefined; seen.current.clear();
      const invite: Join = {id: crypto.randomUUID(), student: value.id, token: value.token, name: value.name, code: value.code};
      invitation.current = invite;
      const timeout = setTimeout(() => connection.close(), 20000);
      connection.onopen = () => {void connection.send({type: 'join', join: invite});};
      connection.onclose = () => {
        clearTimeout(timeout);
        if (peer.current !== connection || !alive.current) return;
        const wasReady = authenticated.current; authenticated.current = false;
        setConnected(false); setBusy(false); setStatus('Esperant el docent. Reconnexió automàtica…');
        if (wasReady && active.current && !finish.current) void incident('S’ha perdut la connexió amb el docent');
        schedule();
      };
      let processing = Promise.resolve();
      connection.onmessage = envelope => {
        processing = processing.then(async () => {
          if (peer.current !== connection) return;
          if (envelope.type === 'welcome' && !publicKey.current) {
            if (envelope.pair !== invite.id || !envelope.publicKey) return;
            const pin = await fingerprint(envelope.publicKey);
            if (state.current!.pinned && state.current!.pinned !== pin) {
              wanted.current = false; connection.close(); setError('La identitat del docent ha canviat. Per seguretat no s’ha reprès la sessió.'); return;
            }
            publicKey.current = envelope.publicKey;
            // Pin only after the first signed configuration proves possession of the private key.
            return;
          }
          if (!publicKey.current) return;
          const p = await verify(publicKey.current, envelope);
          if (p.pair !== invitation.current?.id || p.student !== state.current!.id || !Number.isFinite(p.expires) || p.expires < Date.now() || seen.current.has(p.nonce)) return;
          seen.current.add(p.nonce);
          if (p.type === 'config') {
            if (typeof p.url !== 'string' || new URL(p.url).protocol !== 'https:' || typeof p.title !== 'string') return;
            await save({...state.current!, pinned: await fingerprint(publicKey.current)});
            clearTimeout(timeout); authenticated.current = true; setConnected(true); setBusy(false); setError(''); setStatus('Connectat directament amb el docent');
            const c = {title: p.title, url: p.url, ended: !!p.ended}; setConfig(c); configRef.current = c;
            if (!p.ended && share.current) {setStarted(true); active.current = true; await save({...state.current!, inExam: true});}
            if (p.blocked) await save({...state.current!, blocked: true});
            if (p.ended) {wanted.current = false; clearTimeout(retry.current); await save({...state.current!, inExam: false}); finish.current = true; active.current = false; share.current = false; setSharing(false); stream.current?.getTracks().forEach(t => t.stop());}
            for (const i of state.current!.pending) await connection.send({type: 'incident', incident: i});
          } else if (p.type === 'ack') {
            await save({...state.current!, pending: state.current!.pending.filter(i => i.id !== p.id)});
          } else if (p.type === 'unlock' && p.incident === state.current!.lastIncident) {
            await save({...state.current!, blocked: false});
          } else if (p.type === 'lock') {
            await incident('Bloqueig sol·licitat pel docent');
          } else if (p.type === 'capture') {
            const frame = frames.current.at(-1); if (frame && Date.now() - frame.at < 3000) await connection.send({type: 'snapshot', frame});
          } else if (p.type === 'end') {
            wanted.current = false; clearTimeout(retry.current); await save({...state.current!, inExam: false}); finish.current = true; active.current = false; share.current = false; setSharing(false); stream.current?.getTracks().forEach(t => t.stop());
            if (configRef.current) {configRef.current = {...configRef.current, ended: true}; setConfig(configRef.current);}
          }
        }).catch(() => setError('S’ha rebut una ordre no vàlida o no s’ha pogut desar.'));
      };
      if (connection.connected) connection.onopen();
    } catch (e) {
      setBusy(false); setStatus('No s’ha pogut connectar. Comprova el codi i que el docent tingui el panell obert. Reintentant…'); schedule();
    } finally {attempting.current = false;}
  };
  connectRef.current = establish;
  const enter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.current || !initialised.current) return;
    setError('');
    try {
      if (!name.trim() || !/^[A-Z0-9]{6}$/.test(code)) throw Error('Escriu el nom i el codi de sis caràcters del docent.');
      if (state.current.code !== code && active.current && !finish.current) throw Error('Cal finalitzar la sessió actual abans de canviar de codi.');
      if (state.current.code !== code && state.current.pending.length) throw Error('Hi ha incidències pendents de la sessió anterior. Reconnecta amb aquell docent.');
      const capture = share.current ? Promise.resolve() : captureScreen();
      wanted.current = false; clearTimeout(retry.current); peer.current?.close();
      const value = state.current.code !== code ? {...freshStudent(), name: name.trim(), code} : {...state.current, name: name.trim(), code};
      if (state.current.code !== code) {setConfig(undefined); configRef.current = undefined; setStarted(false); active.current = false;}
      finish.current = false; await capture; await save(value); wanted.current = true; await establish();
    } catch (e) {setError(e instanceof Error ? e.message : String(e));}
  };
  const captureScreen = async () => {
    const media = await navigator.mediaDevices.getDisplayMedia({video: {frameRate: 1}, audio: false});
    const track = media.getVideoTracks()[0];
    if (track.getSettings().displaySurface !== 'monitor') {media.getTracks().forEach(t => t.stop()); throw Error('Selecciona «Pantalla completa», no una pestanya ni una finestra.');}
    stream.current?.getTracks().forEach(t => t.stop()); stream.current = media;
    const v = document.createElement('video'); v.muted = true; v.srcObject = media;
    try {await v.play();} catch (e) {media.getTracks().forEach(t => t.stop()); throw e;}
    video.current = v; share.current = true; setSharing(true);
    track.onended = () => {share.current = false; setSharing(false); if (active.current) void incident('S’ha aturat la compartició de pantalla');};
  };
  const start = async () => {
    setError('');
    try {
      if (!authenticated.current || !configRef.current || configRef.current.ended) throw Error('Connecta primer amb el docent.');
      await captureScreen(); setStarted(true); active.current = true; finish.current = false; await save({...state.current!, inExam: true});
    } catch (e) {setError(e instanceof Error ? e.message : String(e));}
  };
  const blocked = data?.blocked || !connected || !sharing;
  return <main><div className="heading"><div><p className="eyebrow">ACCÉS DE L’ALUMNE</p><h1>Entrar a la sessió</h1><p>La pantalla i les incidències s’envien directament a l’ordinador del docent.</p></div><span className={'badge ' + (connected ? 'ok' : '')}>{connected ? 'Connectat' : 'Sense connexió'}</span></div>
    {error && <p role="alert" className="alert">{error}</p>}
    {!started && <section><form className="row" onSubmit={enter}><label className="grow">Nom i cognoms<input required value={name} disabled={!data || connected || busy} maxLength={100} onChange={e => setName(e.target.value)}/></label><label>Codi de sessió<input required value={code} disabled={!data || connected || busy} maxLength={6} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}/></label><button className="primary" type="submit" disabled={!data || busy || connected}>{busy ? 'Connectant…' : 'Entrar'}</button></form><p>Introdueix el nom i el codi del docent. En prémer Entrar, autoritza la pantalla completa. L’examen s’obrirà quan es connecti amb el docent.</p></section>}
    <p role="status">{status}</p>
    {data && data.pending.length > 0 && <p className="alert" data-testid="pending-incidents">{data.pending.length} incidències pendents d’entrega. Es reenviaran en reconnectar. Es conserven les imatges de les tres més recents.</p>}
    {config && <section><div className="row"><h2 className="grow">{config.title}</h2><span>{config.ended ? 'Sessió finalitzada' : 'Sessió en curs'}</span></div>{!config.ended && <><p>Comparteix la pantalla completa amb el docent per començar. Sortir d’aquesta pàgina, aturar la compartició o perdre la connexió bloqueja l’examen.</p><button className="primary" disabled={!connected || sharing} onClick={start}>{sharing ? 'Pantalla compartida' : 'Compartir pantalla i continuar'}</button><small className="block">La captura necessita el teu permís. No es pot supervisar un ordinador des d’una web tancada.</small></>}
    {started && <div className="exam"><iframe title="Examen" src={config.url} sandbox="allow-scripts allow-forms allow-same-origin" style={{visibility: blocked || config.ended ? 'hidden' : 'visible'}}/>{(blocked || config.ended) && <div className="overlay"><img className="block-logo" src={import.meta.env.BASE_URL + 'contrOwl.png'} alt="ContrOwl"/><h2>{config.ended ? 'Sessió finalitzada' : 'Sessió temporalment bloquejada'}</h2><p>{config.ended ? 'El docent ha finalitzat la sessió.' : !connected ? 'Esperant que el docent torni. La reconnexió és automàtica; no tanquis aquesta pàgina.' : !sharing ? 'Torna a compartir la pantalla completa.' : 'Espera que el docent revisi la incidència i et desbloquegi.'}</p></div>}</div>}
    <small>Si l’examen no apareix, la seva web pot impedir mostrar-se dins d’una altra pàgina. Avisa el docent; no obris l’examen en una altra pestanya.</small></section>}
    <aside>Les dades d’identitat i les incidències pendents es desen en aquest navegador. Les dades rebudes es desen només al navegador del docent. No s’utilitza cap servei de Google AI Studio ni cap API de pagament.</aside>
  </main>;
}
export default function PeerApp() {
  const teacher = /\/administration\/?$/.test(location.pathname);
  return <><header><a href={import.meta.env.BASE_URL}><img src={import.meta.env.BASE_URL + 'contrOwl.png'} alt="ContrOwl"/><strong>contrOwl</strong></a><span>Supervisió directa</span><a href={teacher ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + 'administration/'}>{teacher ? 'Accés alumne' : 'Panell docent'}</a></header>{teacher ? <TeacherPanel/> : <StudentPanel/>}<footer>100% web · Sense quotes · Connexió amb PeerJS · Dades desades localment</footer></>;
}
