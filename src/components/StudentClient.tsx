import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Lock,
  Globe,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  Terminal,
  ExternalLink,
  Laptop,
  Monitor,
  Copy,
  AlertTriangle,
  RotateCcw,
  Zap,
  Info
} from 'lucide-react';
import {
  ExamSession,
  StudentSession,
  ScreenBufferFrame,
  IncidentRecord,
  IncidentType,
  normalizeSessionCode,
  validateSessionCode
} from '../types';
import { generateExamScreenSvg, generateCircularBufferFrames, generateIncidentScreenSvg } from '../utils/screenRenderer';
import { ExamTimer } from './ExamTimer';

interface StudentClientProps {
  session: ExamSession;
  onJoinSession: (studentData: { fullName: string; deviceId: string }) => void;
  onTriggerIncident: (incident: IncidentRecord) => void;
  onUpdateScreen: (svgPreview: string, title: string) => void;
  isUnlockedByTeacher?: boolean;
  connectedStudent?: StudentSession | null;
}

export const StudentClient: React.FC<StudentClientProps> = ({
  session,
  onJoinSession,
  onTriggerIncident,
  onUpdateScreen,
  isUnlockedByTeacher = false,
  connectedStudent
}) => {
  // Steps: 1 = Codi de sessió, 2 = Nom i cognoms, 3 = Mode segur / Examen
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [fullName, setFullName] = useState('');
  const [deviceId, setDeviceId] = useState('PC-23'); // Example from prompt
  const [nameError, setNameError] = useState('');

  // Exam state inside Safe Mode
  const [activeQuestion, setActiveQuestion] = useState(1);
  const [answers, setAnswers] = useState<Record<number, string>>({
    1: 'Els tirants suporten esforços de tracció mentre que els tornapuntes treballen a compressió.',
    2: 'σ = F / S = 14500 N / (25 mm · 10 mm) = 14500 / 250 = 58 N/mm² = 58 MPa (Inferior al límit elàstic admissible de l’acer S275).',
    3: 'La triangulació impedeix la deformació angular sense necessitat de moments encastats a les unions.',
    4: '',
    5: ''
  });
  const [internalClipboard, setInternalClipboard] = useState('');
  const [securityNotification, setSecurityNotification] = useState<string | null>(null);

  // Lock & Incident states
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string>('');
  const [unlockedToast, setUnlockedToast] = useState(false);

  // Circular visual buffer (Section 17-19: 15-second circular buffer local)
  const circularBufferRef = useRef<ScreenBufferFrame[]>([]);
  const isBlockedRef = useRef(false);
  isBlockedRef.current = isBlocked;

  // React to remote unlock from teacher
  useEffect(() => {
    if (isBlocked && (isUnlockedByTeacher || connectedStudent?.status === 'active')) {
      setIsBlocked(false);
      setBlockedReason('');
      setUnlockedToast(true);
      setTimeout(() => setUnlockedToast(false), 5000);
    }
  }, [isUnlockedByTeacher, connectedStudent?.status]);

  // Sync blocked state with connectedStudent if set from outside
  useEffect(() => {
    if (connectedStudent?.status === 'blocked' && !isBlocked) {
      setIsBlocked(true);
      setBlockedReason(connectedStudent.activeIncident?.detectedAction || 'Sessió bloquejada pel docent');
    }
  }, [connectedStudent?.status]);

  // Circular buffer ticker (records 1 frame per second, maintains last 15 seconds)
  useEffect(() => {
    if (step !== 3) return;

    const interval = setInterval(() => {
      if (isBlockedRef.current) return;

      const now = new Date();
      const timeFormatted = now.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const currentSvg = generateExamScreenSvg({
        studentName: fullName || 'Alumne',
        examTitle: session.name,
        activeUrl: session.url,
        currentQuestion: activeQuestion,
        questionText: getQuestionText(activeQuestion),
        answerContent: answers[activeQuestion] || '',
        timestamp: timeFormatted
      });

      // Maintain circular buffer of 15 seconds
      const newFrame: ScreenBufferFrame = {
        id: `buf-${Date.now()}`,
        relativeSeconds: 0,
        timestamp: timeFormatted,
        actionLabel: `Activitat normal a l'examen (Pregunta ${activeQuestion})`,
        screenTitle: session.name,
        activeUrl: session.url,
        svgPreview: currentSvg
      };

      const prevBuffer = circularBufferRef.current;
      const updated = [...prevBuffer, newFrame].slice(-15);
      // Re-index relative seconds from -14 to 0
      const reindexed = updated.map((f, idx, arr) => ({
        ...f,
        relativeSeconds: idx - (arr.length - 1)
      }));
      circularBufferRef.current = reindexed;

      // Send live screen to teacher
      onUpdateScreen(currentSvg, session.name);
    }, 1000);

    return () => clearInterval(interval);
  }, [step, activeQuestion, answers, fullName, session]);

  // Real Window Event Listeners for Safe Mode (Focus loss, Alt key, Tab blur)
  useEffect(() => {
    if (step !== 3) return;

    const handleWindowBlur = () => {
      if (!isBlockedRef.current) {
        triggerSecurityIncident(
          'focus_lost',
          'ContrOwl ha perdut el focus (canvi de finestra o aplicació externa)',
          'Pèrdua de focus principal de la finestra de la prova'
        );
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Intercept Alt+Tab (Note: modern browsers restrict full key interception, so we detect Alt key combinations, Tab or Win)
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        triggerSecurityIncident('alt_tab', 'ALT + TAB detectat', 'Intent de canvi ràpid d’aplicació');
      } else if (e.key === 'Meta' || e.key === 'OS' || e.key === 'Windows') {
        e.preventDefault();
        triggerSecurityIncident('windows_key', 'Tecla Windows detectada', 'Intent d’obertura del menú Inici del sistema');
      } else if (e.key === 'PrintScreen') {
        e.preventDefault();
        triggerSecurityIncident('print_screen', 'Print Screen detectat', 'Intent de captura de pantalla no autoritzada');
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [step]);

  function getQuestionText(qNum: number): string {
    switch (qNum) {
      case 1:
        return '1. Explica la diferència funcional entre un tirant i un tornapunta en una estructura triangulada.';
      case 2:
        return '2. Calcula la tensió normal (σ) a la barra diagonal B3 sotmesa a una força axial de 14.5 kN i una secció de 250 mm². És admissible per a acer S275?';
      case 3:
        return '3. Per quina raó la geometria triangular és la base indeformable de les estructures rígides reticulades?';
      case 4:
        return '4. Quina és la finalitat d’incloure una junta de dilatació tèrmica en un pont de formigó armat de gran longitud?';
      case 5:
        return '5. Quines condicions han de complir els recolzaments (fix i mòbil) per permetre les deformacions per flexió sense generar hiperestatisme indesitjat?';
      default:
        return 'Pregunta d’examen';
    }
  }

  // Trigger an incident (Used by real listeners or Sandbox test triggers)
  const triggerSecurityIncident = (type: IncidentType, detectedAction: string, description: string) => {
    if (isBlockedRef.current) return;

    const timeFormatted = new Date().toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Freeze circular buffer
    const frozenBuffer = [...circularBufferRef.current];
    // If buffer has fewer than 5 frames, pad it with simulated frames for accurate review
    const finalBuffer = frozenBuffer.length >= 10
      ? frozenBuffer
      : generateCircularBufferFrames(type, detectedAction, fullName || 'Alumne', timeFormatted, 15);

    const incident: IncidentRecord = {
      id: `inc-${Date.now()}`,
      studentId: connectedStudent?.id || `stud-${Date.now()}`,
      studentName: fullName || 'Alumne',
      deviceId: deviceId || 'PC-Alumne',
      sessionId: session.id,
      type,
      title: detectedAction,
      description,
      detectedAction,
      timestamp: timeFormatted,
      severity: 'critical_block',
      status: 'open',
      bufferHistory: finalBuffer
    };

    setIsBlocked(true);
    setBlockedReason(detectedAction);
    onTriggerIncident(incident);

    // Send blocked screen state to teacher
    const blockedSvg = generateIncidentScreenSvg(type, detectedAction, fullName || 'Alumne', timeFormatted, 0);
    onUpdateScreen(blockedSvg, 'Sessió temporalment bloquejada');
  };

  // STEP 1: Codi de sessió
  const handleValidateCode = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeSessionCode(code);
    const validation = validateSessionCode(normalized);

    if (!validation.valid) {
      setCodeError(validation.error || 'Codi invàlid');
      return;
    }

    if (normalized !== normalizeSessionCode(session.code)) {
      setCodeError(`Codi no coincident. Codi de la sessió activa: ${session.code}`);
      return;
    }

    setCodeError('');
    setStep(2);
  };

  // STEP 2: Identificació obligatòria de l'alumne
  const handleIdentifyStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 3) {
      setNameError('Has d’escriure el teu nom i cognoms complets.');
      return;
    }

    setNameError('');
    onJoinSession({ fullName: fullName.trim(), deviceId });
    setStep(3);

    // Initial clipboard wipe (Section 34)
    if (session.security.wipeClipboardOnStart && navigator.clipboard) {
      try {
        navigator.clipboard.writeText('');
      } catch (_) {}
    }
  };

  // Safe mode clipboard operations (Section 33)
  const handleCopyAnswer = () => {
    const textToCopy = answers[activeQuestion] || '';
    setInternalClipboard(textToCopy);
    setSecurityNotification('Text copiat al porta-retalls intern de ContrOwl.');
    setTimeout(() => setSecurityNotification(null), 3000);
  };

  const handlePasteAnswer = () => {
    if (session.security.clipboardPolicy === 'blocked') {
      setSecurityNotification('🚫 Política de seguretat: Porta-retalls completament blocat pel docent.');
      setTimeout(() => setSecurityNotification(null), 3000);
      return;
    }

    if (session.security.clipboardPolicy === 'internal') {
      if (internalClipboard) {
        setAnswers({
          ...answers,
          [activeQuestion]: (answers[activeQuestion] || '') + ' ' + internalClipboard
        });
        setSecurityNotification('Text enganxat des del porta-retalls intern.');
      } else {
        setSecurityNotification('⚠️ El porta-retalls intern està buit. No es permet enganxar contingut extern a ContrOwl.');
      }
      setTimeout(() => setSecurityNotification(null), 3500);
      return;
    }

    // Allowed
    setSecurityNotification('Enganxat permès');
    setTimeout(() => setSecurityNotification(null), 2000);
  };

  return (
    <div className="min-h-[700px] flex flex-col bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl relative">
      
      {/* ======================================================== */}
      {/* SECTION 23: BLOCKED SCREEN STATE (Sessió temporalment bloquejada) */}
      {/* ======================================================== */}
      {isBlocked && (
        <div className="absolute inset-0 z-50 bg-[#090d16] flex flex-col items-center justify-center p-6 text-center select-none animate-fadeIn">
          <div className="w-full max-w-xl bg-slate-900/90 border-2 border-rose-600/80 rounded-3xl p-8 sm:p-12 shadow-2xl shadow-rose-950/60 backdrop-blur-xl relative overflow-hidden">
            
            {/* Top red glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-32 bg-rose-600/20 blur-3xl pointer-events-none"></div>

            <div className="w-20 h-20 rounded-2xl bg-rose-950/80 border-2 border-rose-500/60 p-2 flex items-center justify-center mx-auto mb-6 shadow-xl animate-pulse">
              <img src="/contrOwl.png" alt="ContrOwl Logo" className="w-full h-full object-contain" />
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-widest text-white mb-2">
              CONTROWL
            </h1>

            <h2 className="text-xl sm:text-2xl font-bold text-rose-300 mb-4">
              Sessió temporalment bloquejada
            </h2>

            <p className="text-sm sm:text-base text-slate-300 max-w-md mx-auto leading-relaxed mb-6">
              Espera que el professor desbloquegi el dispositiu.
            </p>

            {/* Motivo exacto (Section 22) */}
            {blockedReason && (
              <div className="bg-slate-950 border border-rose-900/50 rounded-xl p-3.5 mb-6 text-xs text-rose-300 font-mono flex items-center justify-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>Acció detectada: <strong>{blockedReason}</strong></span>
              </div>
            )}

            <div className="p-4 bg-indigo-950/40 border border-indigo-500/20 rounded-xl text-xs text-indigo-300/80 space-y-1 text-left mb-6">
              <div className="flex items-center gap-2 text-indigo-300 font-semibold">
                <Info className="w-4 h-4" />
                <span>Seguretat activa ContrOwl:</span>
              </div>
              <p>• El docent ha rebut l'avís i l'historial visual circular dels segons previs.</p>
              <p>• El desbloqueig es realitza remotament des del panell del docent (sense contrasenya local a aquest ordinador).</p>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              <span>Esperant ordre de desbloqueig remot del docent...</span>
            </div>

            {/* Dev helper to test remote unlock without switching tabs */}
            <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>Alumne: {fullName} • {deviceId}</span>
              <button
                onClick={() => {
                  setIsBlocked(false);
                  setBlockedReason('');
                  setUnlockedToast(true);
                  setTimeout(() => setUnlockedToast(false), 5000);
                }}
                className="text-indigo-400 hover:text-indigo-300 underline font-medium"
                title="Simulació per a testatge ràpid"
              >
                [Simula desbloqueig remot docent]
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Unlocked Toast Banner */}
      {unlockedToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span>Dispositiu desbloquejat pel professor. Pots continuar l'examen.</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 1: INTRODUEIX EL CODI DE SESSIÓ (Section 7) */}
      {/* ======================================================== */}
      {step === 1 && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto w-full my-auto">
          
          <div className="w-20 h-20 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 p-2.5 flex items-center justify-center mb-6 shadow-xl shadow-indigo-600/20">
            <img src="/contrOwl.png" alt="ContrOwl Logo" className="w-full h-full object-contain" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white mb-2">
            ContrOwl Client
          </h1>
          <p className="text-xs text-slate-400 mb-8">
            Entorn segur per a la realització d'exàmens digitals
          </p>

          <form onSubmit={handleValidateCode} className="w-full space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-300 mb-3">
                Introdueix el codi de sessió
              </label>

              {/* 6 character input field (Section 7) */}
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    setCode(normalizeSessionCode(e.target.value));
                    setCodeError('');
                  }}
                  placeholder="_ _ _ _ _ _"
                  className="w-full bg-slate-900 border-2 border-slate-700 focus:border-indigo-500 rounded-2xl py-4 text-center font-mono text-3xl font-extrabold tracking-[0.4em] text-white uppercase placeholder-slate-600 transition shadow-inner focus:outline-none"
                  autoFocus
                />
              </div>

              {codeError && (
                <p className="text-xs text-rose-400 font-semibold mt-2 animate-fadeIn">{codeError}</p>
              )}

              <p className="text-[11px] text-slate-500 mt-2">
                No distingeix majúscules de minúscules. Codi de 6 caràcters proporcionat pel professor.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black tracking-wider uppercase rounded-2xl text-sm shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2 group"
            >
              <span>ENTRAR</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </button>
          </form>

          {/* Quick Demo Helper */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 w-full text-xs text-slate-500">
            <span>Codi de la sessió de prova: </span>
            <button
              type="button"
              onClick={() => {
                setCode(session.code);
                setCodeError('');
              }}
              className="font-mono font-bold text-indigo-400 hover:underline"
            >
              {session.code} (Examen Estructures)
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 2: IDENTIFICACIÓ OBLIGATÒRIA DE L'ALUMNE (Section 8 & 9) */}
      {/* ======================================================== */}
      {step === 2 && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto w-full my-auto">
          
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 p-2 flex items-center justify-center mb-4 shadow-md">
            <img src="/contrOwl.png" alt="ContrOwl Logo" className="w-full h-full object-contain" />
          </div>

          <div className="inline-block px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-indigo-300 mb-3">
            Sessió: <strong>{session.name}</strong> ({session.code})
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white mb-2">
            Identificació de l'Alumne
          </h1>
          <p className="text-xs text-slate-400 mb-6">
            La URL de l'examen no es carregarà fins que t'hagis identificat correctament.
          </p>

          <form onSubmit={handleIdentifyStudent} className="w-full space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Escriu el teu nom i cognoms *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setNameError('');
                }}
                placeholder="Ex. Laia Martínez Vives"
                className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none"
                autoFocus
              />
              {nameError && (
                <p className="text-xs text-rose-400 mt-1">{nameError}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Identificador de dispositiu (Aula / Equip)
              </label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {['PC-23', 'PC-08', 'PORTATIL-12'].map((dev) => (
                  <button
                    key={dev}
                    type="button"
                    onClick={() => setDeviceId(dev)}
                    className={`py-2 px-3 rounded-lg border text-xs font-mono text-center transition ${
                      deviceId === dev
                        ? 'border-indigo-500 bg-indigo-950/60 text-white font-bold'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {dev}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="PC-XX"
                className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-white text-xs font-mono"
              />
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
              <span className="text-slate-300 font-semibold block">En prémer Continuar:</span>
              <p>• ContrOwl associarà el teu nom a aquest ordinador.</p>
              <p>• S'activaran les restriccions del mode segur (bloqueig de canvi d'app).</p>
              <p>• Es carregarà automàticament la URL definida pel docent.</p>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
            >
              <span>CONTINUAR I INICIAR EXAMEN</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 3: ENTRADA A L'EXAMEN & MODE SEGUR (Section 10, 30-36) */}
      {/* ======================================================== */}
      {step === 3 && (
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Top Security Bar (Section 30) */}
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-extrabold tracking-wide text-white flex items-center gap-1.5">
                  <img src="/contrOwl.png" alt="ContrOwl" className="w-4 h-4 rounded object-contain inline-block" />
                  ContrOwl SafeMode Actiu
                </span>
              </div>
              <span className="text-slate-600">|</span>
              <span className="font-semibold text-slate-300">{fullName}</span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                {deviceId}
              </span>
            </div>

            {/* Address Bar showing domain lock (Section 31) */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1 text-slate-300 font-mono text-[11px] max-w-md truncate">
              <Lock className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              <span className="truncate">{session.url}</span>
              <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1 rounded border border-emerald-800/40">
                Llista Blanca
              </span>
            </div>

            {/* Configured Exam Countdown Timer (Top Bar) */}
            <div className="flex items-center gap-3">
              <ExamTimer
                createdAt={session.createdAt}
                durationMinutes={session.durationMinutes}
                compact={true}
                onTimeExpired={() => {
                  setSecurityNotification('⚠️ Atenció: El temps establert pel docent per a la prova ha finalitzat.');
                }}
              />
              <div className="hidden lg:flex items-center gap-3 text-slate-400 text-[11px]">
                <span className="hidden sm:inline">Porta-retalls: <strong className="text-indigo-300">Intern</strong></span>
                <span className="font-mono text-slate-500">Buffer: 15s</span>
              </div>
            </div>
          </div>

          {/* Interactive Security Sandbox / Testing triggers banner */}
          <div className="bg-indigo-950/70 border-b border-indigo-900/50 p-2.5 text-xs text-indigo-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Simulador de seguretat (prova com respon ContrOwl davant infraccions):</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => triggerSecurityIncident('alt_tab', 'ALT + TAB detectat', 'Intent de canvi ràpid d’aplicació')}
                className="px-2.5 py-1 bg-slate-900 hover:bg-rose-900/60 hover:text-white text-rose-300 border border-rose-800/40 rounded text-[11px] font-semibold transition"
                title="Prem per simular intent d'Alt+Tab"
              >
                Simula Alt+Tab
              </button>

              <button
                type="button"
                onClick={() => triggerSecurityIncident('windows_key', 'Tecla Windows detectada', 'Intent d’obertura del menú Inici del sistema')}
                className="px-2.5 py-1 bg-slate-900 hover:bg-rose-900/60 hover:text-white text-rose-300 border border-rose-800/40 rounded text-[11px] font-semibold transition"
              >
                Simula Tecla Win
              </button>

              <button
                type="button"
                onClick={() => triggerSecurityIncident('focus_lost', 'ContrOwl ha perdut el focus (2.1s)', 'Pèrdua de primer pla')}
                className="px-2.5 py-1 bg-slate-900 hover:bg-rose-900/60 hover:text-white text-rose-300 border border-rose-800/40 rounded text-[11px] font-semibold transition"
              >
                Simula Pèrdua Focus
              </button>

              <button
                type="button"
                onClick={() => triggerSecurityIncident('unauthorized_app', 'Intent d’obrir discord.exe', 'Execució d’aplicació externa prohibida')}
                className="px-2.5 py-1 bg-slate-900 hover:bg-rose-900/60 hover:text-white text-rose-300 border border-rose-800/40 rounded text-[11px] font-semibold transition"
              >
                Simula App Prohibida
              </button>

              <button
                type="button"
                onClick={() => triggerSecurityIncident('unauthorized_url', 'Intent d’accés a google.com', 'Domini no inclòs a la llista blanca')}
                className="px-2.5 py-1 bg-slate-900 hover:bg-rose-900/60 hover:text-white text-rose-300 border border-rose-800/40 rounded text-[11px] font-semibold transition"
              >
                Simula URL No Autoritzada
              </button>
            </div>
          </div>

          {/* Security Notification Banner (e.g. Clipboard info) */}
          {securityNotification && (
            <div className="bg-indigo-900/80 border-b border-indigo-500/40 px-6 py-2 text-xs text-indigo-100 flex items-center justify-between animate-fadeIn">
              <span>{securityNotification}</span>
              <button onClick={() => setSecurityNotification(null)} className="text-indigo-300 hover:text-white">
                &times;
              </button>
            </div>
          )}

          {/* Main Exam Environment Content */}
          <div className="flex-1 p-6 overflow-y-auto bg-slate-950">
            <div className="max-w-4xl mx-auto space-y-6">
              
              {/* Exam Header & Timer Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-1">
                      Institut Mollet • Departament de Tecnologia
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white">
                      {session.name} — {session.group || '3r ESO'}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Puntuació total: 10 punts (2 punts per qüestió). Llegeix atentament i respon amb justificació tècnica.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-800">
                    <span className="text-xs font-semibold text-slate-400">Preguntes:</span>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          onClick={() => setActiveQuestion(num)}
                          className={`w-9 h-9 rounded-xl font-bold text-xs transition ${
                            activeQuestion === num
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                              : answers[num]
                              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-1">
                  <ExamTimer
                    createdAt={session.createdAt}
                    durationMinutes={session.durationMinutes}
                    compact={false}
                    onTimeExpired={() => {
                      setSecurityNotification('⚠️ Atenció: El temps establert pel docent ha finalitzat!');
                    }}
                  />
                </div>
              </div>

              {/* Active Question Box */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    Qüestió {activeQuestion} de 5
                  </span>
                  <span className="text-xs text-slate-400">Valor: 2.0 punts</span>
                </div>

                <div className="text-sm sm:text-base font-semibold text-slate-100 leading-relaxed">
                  {getQuestionText(activeQuestion)}
                </div>

                {activeQuestion === 2 && (
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-300 font-mono">
                    <div className="text-indigo-400 font-bold">Dades del problema:</div>
                    <div>• Força de tracció axial F = 14.5 kN = 14500 N</div>
                    <div>• Secció transversal de la barra S = b · h = 25 mm · 10 mm = 250 mm² = 0.00025 m²</div>
                    <div>• Acer estructural S275 (Límit elàstic fy = 275 MPa, coeficient de seguretat γm = 1.05)</div>
                  </div>
                )}

                {/* Answer editor */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      La teva resposta i càlculs:
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyAnswer}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1 transition"
                        title="Copiar al porta-retalls intern de ContrOwl"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copiar intern</span>
                      </button>
                      <button
                        type="button"
                        onClick={handlePasteAnswer}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1 transition"
                        title="Enganxar text intern"
                      >
                        <span>Enganxar</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={5}
                    value={answers[activeQuestion] || ''}
                    onChange={(e) => {
                      setAnswers({
                        ...answers,
                        [activeQuestion]: e.target.value
                      });
                    }}
                    placeholder="Escriu aquí la teva resposta detallada..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
                  />
                </div>

                {/* Navigation between questions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    disabled={activeQuestion === 1}
                    onClick={() => setActiveQuestion(Math.max(1, activeQuestion - 1))}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold disabled:opacity-40 hover:bg-slate-700 transition"
                  >
                    ← Pregunta anterior
                  </button>

                  <button
                    type="button"
                    disabled={activeQuestion === 5}
                    onClick={() => setActiveQuestion(Math.min(5, activeQuestion + 1))}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold disabled:opacity-40 hover:bg-indigo-500 transition"
                  >
                    Pregunta següent →
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
