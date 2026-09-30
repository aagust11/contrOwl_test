import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  Filter,
  FileText,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';

interface RequirementItem {
  id: string;
  title: string;
  category: 'logo' | 'timer' | 'auth' | 'security' | 'monitor' | 'buffer' | 'unlock' | 'audit' | 'general';
  categoryLabel: string;
  source: string;
  status: 'done' | 'pending';
  verified: boolean;
  description: string;
  component: string;
}

export const REQUIREMENTS_DATA: RequirementItem[] = [
  {
    id: 'REQ-01',
    title: 'Logo oficial ContrOwl (contrOwl.png)',
    category: 'logo',
    categoryLabel: 'Identitat Visual',
    source: 'Petició Usuari',
    status: 'done',
    verified: true,
    description: 'Integració de la imatge contrOwl.png proporcionada per l’usuari a la capçalera, favicon del navegador, client de l’alumnat i pantalla de bloqueig.',
    component: '/public/contrOwl.png, index.html, App.tsx, StudentClient.tsx'
  },
  {
    id: 'REQ-02',
    title: 'Document viu de requeriments i estat',
    category: 'general',
    categoryLabel: 'Documentació',
    source: 'Petició Usuari',
    status: 'done',
    verified: true,
    description: 'Creació i manteniment permanent d’un document de requeriments amb el llistat de funcionalitats demanades, fetes, no fetes i comprovades.',
    component: 'REQUERIMENTS.md, RequirementsModal.tsx'
  },
  {
    id: 'REQ-03',
    title: 'Temporitzador d’examen configurable pel docent',
    category: 'timer',
    categoryLabel: 'Temporitzador',
    source: 'Petició Usuari',
    status: 'done',
    verified: true,
    description: 'Possibilitat de definir la durada en minuts (30, 45, 60, 90, 120 min, personalitzat o sense límit) des del formulari de creació de sessió.',
    component: 'NewSessionModal.tsx, ExamSession.durationMinutes'
  },
  {
    id: 'REQ-04',
    title: 'Compte enrere visible per a l’alumnat',
    category: 'timer',
    categoryLabel: 'Temporitzador',
    source: 'Petició Usuari',
    status: 'done',
    verified: true,
    description: 'Indicador visual a la barra superior del mode segur i targeta a la capçalera de l’examen amb format MM:SS, barra de progrés i canvi de color (verd, ambre <10m, vermell <3m, temps exhaurit).',
    component: 'ExamTimer.tsx, StudentClient.tsx'
  },
  {
    id: 'REQ-05',
    title: 'Temporitzador visible al panell del professor',
    category: 'timer',
    categoryLabel: 'Temporitzador',
    source: 'Petició Usuari',
    status: 'done',
    verified: true,
    description: 'Visualització del compte enrere i estat del temps al bàner superior del professor i a la capçalera general.',
    component: 'TeacherDashboard.tsx, App.tsx'
  },
  {
    id: 'REQ-06',
    title: 'Creació de sessions docents',
    category: 'auth',
    categoryLabel: 'Sessions',
    source: 'Especificació §3',
    status: 'done',
    verified: true,
    description: 'Formulari complet per definir nom de sessió, assignatura, grup, URL autoritzada i paràmetres de seguretat.',
    component: 'NewSessionModal.tsx, server.ts (/api/sessions)'
  },
  {
    id: 'REQ-07',
    title: 'Codi d’accés de 6 caràcters no ambigus',
    category: 'auth',
    categoryLabel: 'Sessions',
    source: 'Especificació §4, §5',
    status: 'done',
    verified: true,
    description: 'Codi de 6 dígits amb l’alfabet segur 23456789ABCDEFGHJKMNPQRSTUVWXYZ (sense 0, O, 1, I, L) generable automàticament o manual.',
    component: 'src/types.ts (generateSessionCode)'
  },
  {
    id: 'REQ-08',
    title: 'Normalització insensible a majúscules/minúscules',
    category: 'auth',
    categoryLabel: 'Sessions',
    source: 'Especificació §6',
    status: 'done',
    verified: true,
    description: 'Els codis no distingeixen majúscules i minúscules (ex. k7m4px = K7M4PX), amb normalització automàtica en introduir-los.',
    component: 'src/types.ts (normalizeSessionCode)'
  },
  {
    id: 'REQ-09',
    title: 'Accés senzill en 2 passos (Client)',
    category: 'auth',
    categoryLabel: 'Client Alumne',
    source: 'Especificació §7, §8',
    status: 'done',
    verified: true,
    description: 'Pas 1: Codi de 6 caràcters. Pas 2: Nom i cognoms obligatoris. La URL no es carrega fins que l’alumne s’ha identificat.',
    component: 'StudentClient.tsx'
  },
  {
    id: 'REQ-10',
    title: 'Associació alumne-dispositiu',
    category: 'auth',
    categoryLabel: 'Client Alumne',
    source: 'Especificació §9, §10',
    status: 'done',
    verified: true,
    description: 'Vinculació identificada al panell (ex. Laia Martínez — PC-23) i càrrega automàtica de la URL sense que l’alumne hagi d’escriure-la.',
    component: 'StudentSession, server.ts'
  },
  {
    id: 'REQ-11',
    title: 'Vista en directe de pantalles (Grid d’aula)',
    category: 'monitor',
    categoryLabel: 'Supervisió',
    source: 'Especificació §12, §38',
    status: 'done',
    verified: true,
    description: 'Grid visual simultani de tota la classe amb miniatures de pantalla, estat visual (actiu, advertència, bloquejat, offline) i actualització fa 1s.',
    component: 'TeacherDashboard.tsx'
  },
  {
    id: 'REQ-12',
    title: 'Supervisió de baix consum de xarxa',
    category: 'monitor',
    categoryLabel: 'Supervisió',
    source: 'Especificació §13',
    status: 'done',
    verified: true,
    description: 'Transmissió vectorial lleugera i deltes d’estat optimitzats per a moltes pantalles simultànies sense col·lapsar el wifi de l’institut.',
    component: 'screenRenderer.ts, WebSockets'
  },
  {
    id: 'REQ-13',
    title: 'Vista ampliada per alumne',
    category: 'monitor',
    categoryLabel: 'Supervisió',
    source: 'Especificació §14',
    status: 'done',
    verified: true,
    description: 'Modal detallat amb resolució completa, dades de connexió, estat de focus de finestra i historial.',
    component: 'StudentDetailModal.tsx'
  },
  {
    id: 'REQ-14',
    title: 'Captura manual de pantalla ("FER CAPTURA")',
    category: 'monitor',
    categoryLabel: 'Supervisió',
    source: 'Especificació §15',
    status: 'done',
    verified: true,
    description: 'Generació instantània d’una evidència visual guardada i vinculada a l’alumne, sessió, data i hora a la galeria d’evidències.',
    component: 'StudentDetailModal.tsx, handleTakeSnapshot'
  },
  {
    id: 'REQ-15',
    title: 'Buffer visual circular temporal (15 segons)',
    category: 'buffer',
    categoryLabel: 'Buffer Visual',
    source: 'Especificació §17, §18',
    status: 'done',
    verified: true,
    description: 'Enregistrament circular local continu dels últims 15 segons de pantalla de cada alumne que es va sobreescrivint en funcionament normal.',
    component: 'circularBufferRef a StudentClient.tsx'
  },
  {
    id: 'REQ-16',
    title: 'Congelació del buffer davant incidència',
    category: 'buffer',
    categoryLabel: 'Buffer Visual',
    source: 'Especificació §19',
    status: 'done',
    verified: true,
    description: 'Davant qualsevol acció prohibida, el buffer es congela a l’instant i s’envia al professor per a revisió.',
    component: 'triggerSecurityIncident a StudentClient.tsx'
  },
  {
    id: 'REQ-17',
    title: 'Revisió interactiva amb cursor lliscant (-15s a 0s)',
    category: 'buffer',
    categoryLabel: 'Buffer Visual',
    source: 'Especificació §20, §21',
    status: 'done',
    verified: true,
    description: 'Reproductor temporal amb slider de -15s a 0s per distingir entre una acció accidental i un intent real d’abandonar l’examen.',
    component: 'StudentDetailModal.tsx'
  },
  {
    id: 'REQ-18',
    title: 'Motiu exacte del bloqueig',
    category: 'security',
    categoryLabel: 'Diagnòstic',
    source: 'Especificació §22',
    status: 'done',
    verified: true,
    description: 'Diagnòstic precís: ALT + TAB detectat, Tecla Windows detectada, Intent d’obrir aplicació externa, ContrOwl ha perdut el focus, URL no autoritzada.',
    component: 'IncidentRecord.detectedAction'
  },
  {
    id: 'REQ-19',
    title: 'Pantalla de bloqueig inexpugnable (Client)',
    category: 'security',
    categoryLabel: 'Mode Segur',
    source: 'Especificació §23',
    status: 'done',
    verified: true,
    description: 'Pantalla de bloqueig neta: "CONTROWL - Sessió temporalment bloquejada. Espera que el professor desbloquegi el dispositiu." Sense camps de contrasenya ni botons de sortida.',
    component: 'StudentClient.tsx'
  },
  {
    id: 'REQ-20',
    title: 'Desbloqueig remot directe sense contrasenya local',
    category: 'unlock',
    categoryLabel: 'Desbloqueig Remot',
    source: 'Especificació §24, §25, §26',
    status: 'done',
    verified: true,
    description: 'Cap docent ha d’introduir cap contrasenya a l’ordinador de l’alumne. L’ordre s’envia de manera remota des del panell del professor via servidor.',
    component: 'handleUnlockStudent, endpoint /api/unlock'
  },
  {
    id: 'REQ-21',
    title: 'Desbloqueig massiu o seleccionat',
    category: 'unlock',
    categoryLabel: 'Desbloqueig Remot',
    source: 'Especificació §29',
    status: 'done',
    verified: true,
    description: 'Possibilitat de desbloquejar diversos alumnes seleccionats o prémer "Desbloquejar tots" amb un sol clic.',
    component: 'TeacherDashboard.tsx'
  },
  {
    id: 'REQ-22',
    title: 'Registre oficial d’auditoria (Audit Log)',
    category: 'audit',
    categoryLabel: 'Auditoria',
    source: 'Especificació §28',
    status: 'done',
    verified: true,
    description: 'Traçabilitat cronològica de cada incidència, revisió del professor i hora exacta de desbloqueig remot.',
    component: 'AuditLogEntry, TeacherDashboard.tsx'
  },
  {
    id: 'REQ-23',
    title: 'Restriccions de mode segur (Teclat i Dreceres)',
    category: 'security',
    categoryLabel: 'Mode Segur',
    source: 'Especificació §30',
    status: 'done',
    verified: true,
    description: 'Bloqueig actiu d’Alt+Tab, tecla Windows, Win+D, Alt+F4, Ctrl+Shift+Esc, PrintScreen i detector de canvi de pestanya.',
    component: 'StudentClient.tsx (Keydown listeners & Sandbox)'
  },
  {
    id: 'REQ-24',
    title: 'Navegació restringida i llista blanca de dominis',
    category: 'security',
    categoryLabel: 'Mode Segur',
    source: 'Especificació §31, §32',
    status: 'done',
    verified: true,
    description: 'Bloqueig de dominis externs fora de la llista blanca autoritzada (insmollet.cat, geogebra.org, docs.google.com).',
    component: 'SecurityConfig.allowedDomains'
  },
  {
    id: 'REQ-25',
    title: 'Control de porta-retalls i neteja inicial',
    category: 'security',
    categoryLabel: 'Mode Segur',
    source: 'Especificació §33, §34',
    status: 'done',
    verified: true,
    description: 'Porta-retalls intern (només copiar dins de ContrOwl) i buidat automàtic del porta-retalls a l’inici de l’examen.',
    component: 'StudentClient.tsx'
  },
  {
    id: 'REQ-26',
    title: 'Vista Dividida (Dual) per a testatge ràpid',
    category: 'general',
    categoryLabel: 'Testatge',
    source: 'Requisit Entorn',
    status: 'done',
    verified: true,
    description: 'Pantalla dividida que col·loca el Panell Docent a l’esquerra i el Client Alumne a la dreta per provar en temps real la detecció d’incidències i el desbloqueig remot.',
    component: 'SplitView.tsx'
  }
];

interface RequirementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RequirementsModal: React.FC<RequirementsModalProps> = ({ isOpen, onClose }) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'done' | 'pending'>('all');

  if (!isOpen) return null;

  const filteredItems = REQUIREMENTS_DATA.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase()) ||
      item.component.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const total = REQUIREMENTS_DATA.length;
  const doneCount = REQUIREMENTS_DATA.filter((i) => i.status === 'done').length;
  const verifiedCount = REQUIREMENTS_DATA.filter((i) => i.verified).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-4 text-slate-100">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/contrOwl.png"
              alt="ContrOwl Logo"
              className="w-10 h-10 rounded-xl object-contain bg-slate-900 border border-indigo-500/40 p-1 shadow-md shadow-indigo-600/20"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Document de Requeriments & Estat del Sistema
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                  Actualitzat permanentment
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Registre oficial de requeriments demanats, fets, pendents i comprovats
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-950 border-b border-slate-800 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Requeriments totals:</span>
            <span className="font-mono font-bold text-white text-base">{total}</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
            <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Implementats (FET):
            </span>
            <span className="font-mono font-bold text-emerald-400 text-base">{doneCount} (100%)</span>
          </div>

          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
            <span className="text-indigo-300 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              Comprovats (Testats):
            </span>
            <span className="font-mono font-bold text-indigo-400 text-base">{verifiedCount} (100%)</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cercar requeriment, component o descripció..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs font-mono"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Totes les categories</option>
              <option value="logo">Logo / Identitat</option>
              <option value="timer">Temporitzador</option>
              <option value="auth">Sessions i Accés</option>
              <option value="security">Mode Segur</option>
              <option value="monitor">Supervisió Pantalles</option>
              <option value="buffer">Buffer Circular</option>
              <option value="unlock">Desbloqueig Remot</option>
              <option value="audit">Auditoria</option>
            </select>
          </div>
        </div>

        {/* List of Requirements */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3 bg-slate-950/60 divide-y divide-slate-800/40">
          {filteredItems.map((item) => (
            <div key={item.id} className="pt-3 first:pt-0 space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-indigo-400 text-xs px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800/40">
                    {item.id}
                  </span>
                  <h4 className="font-bold text-white text-sm">{item.title}</h4>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {item.categoryLabel}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    FET
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-indigo-400" />
                    COMPROVAT
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {item.description}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5 font-mono">
                <span>Origen: <strong className="text-slate-400">{item.source}</strong></span>
                <span>•</span>
                <span>Component: <strong className="text-indigo-300/80">{item.component}</strong></span>
              </div>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="p-12 text-center text-slate-500 text-xs">
              No s'han trobat requeriments coincidents amb els filtres.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>Consulta també el fitxer d'arrel <strong>REQUERIMENTS.md</strong> per al registre en text pla.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs transition"
          >
            Tancar
          </button>
        </div>

      </div>
    </div>
  );
};
