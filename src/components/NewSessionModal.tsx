import React, { useState } from 'react';
import { X, RefreshCw, Shield, Globe, Lock, Check, Clock, Hourglass } from 'lucide-react';
import { ExamSession, generateSessionCode, validateSessionCode, normalizeSessionCode, ClipboardPolicy } from '../types';

interface NewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSession: (session: Partial<ExamSession>) => void;
}

export const NewSessionModal: React.FC<NewSessionModalProps> = ({ isOpen, onClose, onCreateSession }) => {
  const [name, setName] = useState('Examen de Tecnologia');
  const [subject, setSubject] = useState('Tecnologia i Enginyeria');
  const [group, setGroup] = useState('4t ESO A');
  const [url, setUrl] = useState('https://examens.insmollet.cat/prova-final');
  
  // Exam timer duration
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [isUnlimitedTime, setIsUnlimitedTime] = useState<boolean>(false);

  // Code generation
  const [isManualCode, setIsManualCode] = useState(false);
  const [code, setCode] = useState(generateSessionCode());
  const [codeError, setCodeError] = useState('');

  // Security policies
  const [clipboardPolicy, setClipboardPolicy] = useState<ClipboardPolicy>('internal');
  const [wipeClipboard, setWipeClipboard] = useState(true);
  const [blockShortcuts, setBlockShortcuts] = useState(true);
  const [autoCapture, setAutoCapture] = useState(true);
  const [bufferSeconds, setBufferSeconds] = useState(15);
  
  // Whitelist
  const [whitelistInput, setWhitelistInput] = useState('');
  const [allowedDomains, setAllowedDomains] = useState<string[]>([
    'examens.insmollet.cat',
    'geogebra.org',
    'docs.google.com'
  ]);

  if (!isOpen) return null;

  const handleRegenerateCode = () => {
    setCode(generateSessionCode());
    setCodeError('');
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = normalizeSessionCode(e.target.value).slice(0, 6);
    setCode(val);
    if (val.length === 6) {
      const validation = validateSessionCode(val);
      setCodeError(validation.error || '');
    } else {
      setCodeError('El codi ha de tenir 6 caràcters');
    }
  };

  const handleAddDomain = () => {
    const trimmed = whitelistInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (trimmed && !allowedDomains.includes(trimmed)) {
      setAllowedDomains([...allowedDomains, trimmed]);
      setWhitelistInput('');
    }
  };

  const handleRemoveDomain = (domain: string) => {
    setAllowedDomains(allowedDomains.filter(d => d !== domain));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateSessionCode(code);
    if (!validation.valid) {
      setCodeError(validation.error || 'Codi invàlid');
      return;
    }

    onCreateSession({
      name,
      subject,
      group,
      url,
      code,
      durationMinutes: isUnlimitedTime ? 0 : Number(durationMinutes) || 60,
      security: {
        clipboardPolicy,
        wipeClipboardOnStart: wipeClipboard,
        blockDevTools: true,
        blockExternalApps: true,
        blockShortcuts,
        autoCaptureOnIncident: autoCapture,
        bufferDurationSeconds: bufferSeconds,
        allowedDomains
      }
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl text-slate-100 flex flex-col my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/60 sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <img
              src="/contrOwl.png"
              alt="ContrOwl"
              className="w-10 h-10 rounded-xl object-contain bg-slate-950 border border-indigo-500/40 p-1 shadow-md"
            />
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">Crear Nova Sessió ContrOwl</h2>
              <p className="text-xs text-slate-400">Configura l'entorn segur, la URL autoritzada i el codi d'accés</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Informació Bàsica */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
              <span>1. Dades de la Prova</span>
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Nom de la sessió *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Examen Estructures"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Assignatura (opcional)</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex. Tecnologia i Enginyeria"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Grup / Classe (opcional)</label>
                <input
                  type="text"
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  placeholder="Ex. 3r ESO B"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">URL autoritzada de l'examen *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Globe className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://examens.insmollet.cat/estructures"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-3.5 py-2.5 text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">L'alumnat només podrà accedir exclusivament a aquesta URL i als dominis de la llista blanca.</p>
            </div>
          </div>

          {/* Durada de l'examen i temporitzador */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>2. Durada de l'Examen (Temporitzador Alumnat)</span>
              </h3>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isUnlimitedTime}
                  onChange={(e) => setIsUnlimitedTime(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Sense límit de temps</span>
              </label>
            </div>

            {!isUnlimitedTime ? (
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-2">
                  {[30, 45, 60, 90, 120].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDurationMinutes(preset)}
                      className={`py-2 px-2 rounded-xl border text-xs font-bold transition text-center ${
                        durationMinutes === preset
                          ? 'border-indigo-500 bg-indigo-950/70 text-white shadow-md shadow-indigo-950/40'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {preset} min
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 whitespace-nowrap">O minuts personalitzats:</span>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={5}
                      max={360}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">minuts</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  L'alumnat veurà aquest compte enrere a la barra superior del mode segur amb avisos visuals quan quedin menys de 10 i 3 minuts.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center gap-2">
                <Hourglass className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>La prova no tindrà compte enrere fix. El docent podrà finalitzar la sessió manualment quan vulgui.</span>
              </div>
            )}
          </div>

          {/* Codi de Sessió (6 caràcters) */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                3. Codi d'accés (6 caràcters no ambigus)
              </h3>
              <div className="flex items-center space-x-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsManualCode(false)}
                  className={`px-2.5 py-1 rounded-md transition ${!isManualCode ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
                >
                  Automàtic
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualCode(true)}
                  className={`px-2.5 py-1 rounded-md transition ${isManualCode ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
                >
                  Manual
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  readOnly={!isManualCode}
                  onChange={handleCodeChange}
                  className={`w-full bg-slate-950 border text-center font-mono text-2xl font-bold tracking-[0.3em] rounded-xl py-3 px-4 ${
                    codeError ? 'border-red-500 text-red-400' : 'border-indigo-500/50 text-indigo-300'
                  }`}
                />
              </div>

              {!isManualCode && (
                <button
                  type="button"
                  onClick={handleRegenerateCode}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center gap-2 font-medium text-sm transition"
                  title="Generar un altre codi"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerar
                </button>
              )}
            </div>
            {codeError ? (
              <p className="text-xs text-red-400">{codeError}</p>
            ) : (
              <p className="text-xs text-slate-400">
                Els codis no distingeixen entre majúscules i minúscules (ex. <span className="font-mono text-indigo-300">k7m4px</span> = <span className="font-mono text-indigo-300">K7M4PX</span>) i eviten caràcters fàcilment confusibles (0, O, 1, I, L).
              </p>
            )}
          </div>

          {/* Configuració de Seguretat */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              4. Paràmetres de Seguretat i Restriccions
            </h3>

            {/* Porta-retalls */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Control del Porta-retalls</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'internal', label: 'Intern (Recomanat)', desc: 'Només copiar dins de ContrOwl' },
                  { id: 'blocked', label: 'Bloquejat', desc: 'Ni copiar ni enganxar' },
                  { id: 'allowed', label: 'Permès', desc: 'Sense restriccions' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setClipboardPolicy(item.id as ClipboardPolicy)}
                    className={`p-3 rounded-xl border text-left transition ${
                      clipboardPolicy === item.id
                        ? 'border-indigo-500 bg-indigo-950/40 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center justify-between">
                      {item.label}
                      {clipboardPolicy === item.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Checkboxes seguretat */}
            <div className="space-y-2.5 pt-1">
              <label className="flex items-center gap-3 p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={wipeClipboard}
                  onChange={(e) => setWipeClipboard(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Neteja inicial del porta-retalls</div>
                  <div className="text-[11px] text-slate-400">Buida el porta-retalls global en iniciar l'examen per evitar enganxar apunts previs.</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={blockShortcuts}
                  onChange={(e) => setBlockShortcuts(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Restringir dreceres de teclat i canvi d'app</div>
                  <div className="text-[11px] text-slate-400">Bloqueja Alt+Tab, tecla Windows, Win+D, Alt+F4, Ctrl+Shift+Esc i PrintScreen.</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={autoCapture}
                  onChange={(e) => setAutoCapture(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Captura automàtica i congelació de buffer davant incidències</div>
                  <div className="text-[11px] text-slate-400">Conserva els últims 15 segons de pantalla quan es detecti una acció prohibida.</div>
                </div>
              </label>
            </div>

            {/* Llista blanca de dominis */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Llista blanca de dominis autoritzats</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={whitelistInput}
                  onChange={(e) => setWhitelistInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDomain();
                    }
                  }}
                  placeholder="Ex. geogebra.org"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddDomain}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-lg text-slate-200"
                >
                  Afegir
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {allowedDomains.map((dom) => (
                  <span
                    key={dom}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 border border-slate-700 text-xs font-mono text-indigo-300 rounded-md"
                  >
                    <Lock className="w-3 h-3 text-indigo-400" />
                    {dom}
                    <button
                      type="button"
                      onClick={() => handleRemoveDomain(dom)}
                      className="text-slate-400 hover:text-red-400 ml-1"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition"
            >
              Cancel·lar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Crear Sessió i Iniciar
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
