import React, { useState, useEffect } from 'react';
import {
  X,
  Camera,
  Unlock,
  AlertTriangle,
  Clock,
  Laptop,
  Monitor,
  Smartphone,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  ShieldAlert,
  ArrowLeft,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { StudentSession, ScreenBufferFrame, SnapshotRecord } from '../types';

interface StudentDetailModalProps {
  student: StudentSession | null;
  isOpen: boolean;
  onClose: () => void;
  onUnlockStudent: (studentId: string) => void;
  onTakeSnapshot: (studentId: string) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  isOpen,
  onClose,
  onUnlockStudent,
  onTakeSnapshot
}) => {
  const [activeTab, setActiveTab] = useState<'live' | 'incident' | 'snapshots'>('live');
  
  // Circular buffer scrubbing states
  const [currentBufferIndex, setCurrentBufferIndex] = useState<number>(0);
  const [isPlayingReplay, setIsPlayingReplay] = useState<boolean>(false);
  const [snapshotFeedback, setSnapshotFeedback] = useState<string | null>(null);

  const activeIncident = student?.activeIncident;
  const bufferHistory: ScreenBufferFrame[] = activeIncident?.bufferHistory || [];

  // When modal opens or student changes, default to incident view if student is blocked
  useEffect(() => {
    if (student?.status === 'blocked' && activeIncident) {
      setActiveTab('incident');
      setCurrentBufferIndex(bufferHistory.length - 1);
    } else {
      setActiveTab('live');
    }
  }, [student?.id, student?.status]);

  // Buffer replay loop
  useEffect(() => {
    let interval: any;
    if (isPlayingReplay && bufferHistory.length > 0) {
      interval = setInterval(() => {
        setCurrentBufferIndex((prev) => {
          if (prev >= bufferHistory.length - 1) {
            setIsPlayingReplay(false);
            return prev;
          }
          return prev + 1;
        });
      }, 800); // 800ms per frame
    }
    return () => clearInterval(interval);
  }, [isPlayingReplay, bufferHistory.length]);

  if (!isOpen || !student) return null;

  const currentFrame = bufferHistory[currentBufferIndex] || null;

  const handleCaptureClick = () => {
    onTakeSnapshot(student.id);
    setSnapshotFeedback('Captura d’evidència desada correctament');
    setTimeout(() => setSnapshotFeedback(null), 3000);
  };

  const handleUnlockClick = () => {
    onUnlockStudent(student.id);
  };

  const getStatusBadge = () => {
    switch (student.status) {
      case 'active':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">🟢 Actiu</span>;
      case 'warning':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-500/30">🟡 Incidència Menor</span>;
      case 'blocked':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-500/30 animate-pulse">🔴 Bloquejat pel Sistema</span>;
      case 'offline':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">⚫ Offline</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-4 text-slate-100">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center space-x-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg">
              {student.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold tracking-tight text-white">{student.fullName}</h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-semibold">
                  {student.deviceId}
                </span>
                {getStatusBadge()}
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-4 mt-0.5">
                <span>IP: {student.ip}</span>
                <span>•</span>
                <span>Entrada: {new Date(student.joinedAt).toLocaleTimeString('ca-ES')}</span>
                <span>•</span>
                <span>Incidències acumulades: <strong className="text-white">{student.incidentCount}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCaptureClick}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
              title="Prendre captura immediata de pantalla"
            >
              <Camera className="w-4 h-4 text-indigo-400" />
              <span>FER CAPTURA</span>
            </button>

            {student.status === 'blocked' && (
              <button
                onClick={handleUnlockClick}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold tracking-wide flex items-center gap-2 shadow-lg shadow-rose-600/30 transition animate-pulse"
                title="Desbloqueig remot directe sense contrasenya local"
              >
                <Unlock className="w-4 h-4" />
                <span>DESBLOQUEJAR DISPOSITIU</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback message banner if capture taken */}
        {snapshotFeedback && (
          <div className="bg-emerald-950/80 border-b border-emerald-500/30 px-6 py-2 text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {snapshotFeedback}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-950/40 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('live')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'live'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Pantalla Actual en Directe</span>
          </button>

          {activeIncident && (
            <button
              onClick={() => setActiveTab('incident')}
              className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
                activeTab === 'incident'
                  ? 'border-rose-500 text-rose-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Buffer Circular d'Incidència ({bufferHistory.length}s previs)</span>
              {student.status === 'blocked' && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab('snapshots')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'snapshots'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Galeria d'Evidències i Captures ({student.snapshots?.length || 0})</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-900/60">
          
          {/* TAB 1: PANTALLA EN DIRECTE */}
          {activeTab === 'live' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Monitorització en temps real activa</span>
                  <span>•</span>
                  <span>Última actualització fa 1 segon</span>
                </div>
                <div className="font-mono text-slate-400">
                  URL autoritzada: <span className="text-indigo-300">{student.currentScreen.activeUrl}</span>
                </div>
              </div>

              {/* Live Screen Preview */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner aspect-[16/10] relative flex items-center justify-center">
                {student.currentScreen.svgPreview ? (
                  <div
                    className="w-full h-full"
                    dangerouslySetInnerHTML={{ __html: student.currentScreen.svgPreview }}
                  />
                ) : (
                  <div className="text-center text-slate-500 p-8">
                    <Monitor className="w-12 h-12 mx-auto mb-2 text-slate-600" />
                    <p>Previsualització no disponible</p>
                  </div>
                )}

                {student.status === 'blocked' && (
                  <div className="absolute top-4 right-4 bg-rose-600/90 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-rose-400/40 shadow-xl flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    DISPOSITIU BLOQUEJAT
                  </div>
                )}
              </div>

              {/* Quick Status Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">Estat del Client ContrOwl:</span>
                  <span className="font-semibold text-slate-200">
                    {student.status === 'blocked' ? 'Mode segur blocat' : 'Mode segur actiu'}
                  </span>
                </div>
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">Focus de la Finestra:</span>
                  <span className={`font-semibold ${student.currentScreen.focusActive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {student.currentScreen.focusActive ? 'En primer pla (actiu)' : 'Focus perdut o en segon pla'}
                  </span>
                </div>
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">Control del Porta-retalls:</span>
                  <span className="font-semibold text-indigo-400">Intern (restringit a la prova)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INCIDÈNCIA & BUFFER VISUAL CIRCULAR (Seccions 17-22) */}
          {activeTab === 'incident' && activeIncident && (
            <div className="space-y-6">
              
              {/* Incident Header Diagnosis Card (Motiu exacte del bloqueig) */}
              <div className="p-5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-rose-500 text-white font-mono text-xs font-bold uppercase tracking-wider">
                      Motiu exacte del bloqueig
                    </span>
                    <span className="text-xs text-rose-300 font-mono">Hora: {activeIncident.timestamp}</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span>{activeIncident.detectedAction}</span>
                  </h3>
                  <p className="text-xs text-rose-200/80 leading-relaxed max-w-2xl">
                    {activeIncident.description}
                  </p>
                </div>

                <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                  {student.status === 'blocked' ? (
                    <button
                      onClick={handleUnlockClick}
                      className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-rose-600/40 transition"
                    >
                      <Unlock className="w-4 h-4" />
                      DESBLOQUEJAR ALUMNE REMOTAMENT
                    </button>
                  ) : (
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Dispositiu desbloquejat pel docent
                    </div>
                  )}
                  <span className="text-[11px] text-slate-400">Sense contrasenya local al dispositiu</span>
                </div>
              </div>

              {/* Circular Buffer Visual Player (Seccions 17-21) */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Historial visual de la incidència (Buffer Circular)</span>
                      <span className="text-[11px] font-normal text-indigo-400 px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800/40">
                        Últims {bufferHistory.length} segons previs a la incidència
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Revisa la seqüència exacta per distingir entre una acció accidental i un intent d'abandonar ContrOwl.
                    </p>
                  </div>

                  {/* Playback Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentBufferIndex(0)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                      title="Reiniciar a -15s"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCurrentBufferIndex(Math.max(0, currentBufferIndex - 1))}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                      title="Fotograma anterior (-1s)"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsPlayingReplay(!isPlayingReplay)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                    >
                      {isPlayingReplay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isPlayingReplay ? 'Pausar' : 'Reproduir'}</span>
                    </button>
                    <button
                      onClick={() => setCurrentBufferIndex(Math.min(bufferHistory.length - 1, currentBufferIndex + 1))}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                      title="Fotograma següent (+1s)"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Frame Screen Canvas Display */}
                <div className="bg-black/90 border border-slate-800 rounded-xl overflow-hidden aspect-[16/10] relative flex items-center justify-center">
                  {currentFrame ? (
                    <div
                      className="w-full h-full"
                      dangerouslySetInnerHTML={{ __html: currentFrame.svgPreview }}
                    />
                  ) : (
                    <div className="text-slate-500 text-xs">Cap fotograma al buffer</div>
                  )}

                  {/* Timestamp & Frame indicator overlay */}
                  {currentFrame && (
                    <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs backdrop-blur-sm flex items-center gap-3">
                      <span className="font-mono font-bold text-indigo-400">
                        {currentFrame.relativeSeconds === 0 ? '0s (Moment Incidència)' : `${currentFrame.relativeSeconds}s`}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-200">{currentFrame.actionLabel}</span>
                    </div>
                  )}
                </div>

                {/* Scrubber Timeline Slider (Section 21) */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                    <span>-{bufferHistory.length - 1} segons</span>
                    <span className="text-indigo-400 font-bold">
                      Fotograma seleccionat: {currentFrame?.relativeSeconds || 0}s ({currentFrame?.timestamp})
                    </span>
                    <span className="text-rose-400 font-bold">0s (Bloqueig)</span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, bufferHistory.length - 1)}
                    value={currentBufferIndex}
                    onChange={(e) => {
                      setIsPlayingReplay(false);
                      setCurrentBufferIndex(Number(e.target.value));
                    }}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />

                  {/* Frame Thumbnails Strip */}
                  <div className="flex gap-1.5 overflow-x-auto py-2 scrollbar-thin">
                    {bufferHistory.map((frame, idx) => (
                      <button
                        key={frame.id || idx}
                        onClick={() => {
                          setIsPlayingReplay(false);
                          setCurrentBufferIndex(idx);
                        }}
                        className={`flex-shrink-0 w-16 p-1 rounded border text-center transition ${
                          currentBufferIndex === idx
                            ? 'border-indigo-500 bg-indigo-950/60 ring-2 ring-indigo-500/40'
                            : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-[10px] font-mono text-slate-400">
                          {frame.relativeSeconds}s
                        </div>
                        <div className={`h-1.5 rounded-full mt-1 ${frame.relativeSeconds >= -2 ? 'bg-rose-500' : 'bg-indigo-500/60'}`} />
                      </button>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: GALERIA DE CAPTURES (Section 15, 16 & 40) */}
          {activeTab === 'snapshots' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Captures guardades de l'alumne</h4>
                  <p className="text-xs text-slate-400">Evidències emmagatzemades per a la sessió (manuals i automàtiques)</p>
                </div>
                <button
                  onClick={handleCaptureClick}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Nova captura ara</span>
                </button>
              </div>

              {(!student.snapshots || student.snapshots.length === 0) ? (
                <div className="p-12 text-center bg-slate-950 border border-slate-800 rounded-xl text-slate-500">
                  <Camera className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                  <p className="text-sm">Encara no s'ha realitzat cap captura d'aquest alumne.</p>
                  <p className="text-xs text-slate-600 mt-1">Prem "FER CAPTURA" per guardar una evidència visual concreta.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {student.snapshots.map((snap) => (
                    <div key={snap.id} className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300">{snap.title}</span>
                        <span className="text-slate-500 font-mono">{snap.timestamp}</span>
                      </div>
                      <div className="aspect-[16/10] bg-black/60 rounded-lg overflow-hidden border border-slate-800">
                        <div dangerouslySetInnerHTML={{ __html: snap.svgPreview }} className="w-full h-full" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
