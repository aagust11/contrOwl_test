import React, { useState } from 'react';
import {
  Users,
  Monitor,
  AlertTriangle,
  Lock,
  Unlock,
  Shield,
  Plus,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  Globe,
  Camera,
  FileText,
  Clock,
  Settings,
  ChevronRight,
  ShieldCheck,
  Radio,
  ExternalLink,
  SlidersHorizontal
} from 'lucide-react';
import { ExamSession, StudentSession, AuditLogEntry } from '../types';
import { StudentDetailModal } from './StudentDetailModal';
import { NewSessionModal } from './NewSessionModal';
import { ExamTimer } from './ExamTimer';

interface TeacherDashboardProps {
  session: ExamSession;
  students: StudentSession[];
  auditLogs: AuditLogEntry[];
  onUnlockStudent: (studentId: string) => void;
  onUnlockMultipleStudents: (studentIds: string[]) => void;
  onTakeSnapshot: (studentId: string) => void;
  onCreateSession: (newSession: Partial<ExamSession>) => void;
  onEndSession: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  session,
  students,
  auditLogs,
  onUnlockStudent,
  onUnlockMultipleStudents,
  onTakeSnapshot,
  onCreateSession,
  onEndSession
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'incidents' | 'logs' | 'config'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'warning' | 'blocked' | 'offline'>('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<StudentSession | null>(null);
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  // Statistics
  const totalStudents = students.length;
  const activeCount = students.filter(s => s.status === 'active').length;
  const warningCount = students.filter(s => s.status === 'warning').length;
  const blockedCount = students.filter(s => s.status === 'blocked').length;
  const offlineCount = students.filter(s => s.status === 'offline').length;

  // Filtered students
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          student.deviceId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const showNotice = (msg: string) => {
    setActionSuccessNotice(msg);
    setTimeout(() => setActionSuccessNotice(null), 3500);
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map(s => s.id));
    }
  };

  const handleToggleSelectStudent = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter(sId => sId !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const handleUnlockSelected = () => {
    const blockedSelected = selectedStudentIds.filter(id => {
      const s = students.find(st => st.id === id);
      return s && s.status === 'blocked';
    });

    if (blockedSelected.length === 0) {
      showNotice('Cap dels alumnes seleccionats està actualment bloquejat.');
      return;
    }

    onUnlockMultipleStudents(blockedSelected);
    setSelectedStudentIds([]);
    showNotice(`Ordre de desbloqueig remot enviada a ${blockedSelected.length} alumne(s).`);
  };

  const handleUnlockAllBlocked = () => {
    const allBlocked = students.filter(s => s.status === 'blocked').map(s => s.id);
    if (allBlocked.length === 0) {
      showNotice('No hi ha cap alumne bloquejat a la sessió.');
      return;
    }
    onUnlockMultipleStudents(allBlocked);
    showNotice(`Desbloqueig massiu autoritzat: ${allBlocked.length} alumne(s) desbloquejat(s).`);
  };

  return (
    <div className="space-y-6">
      
      {/* Session Header Banner (Section 3: Apartat d'administració) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-950/80 text-indigo-400 border border-indigo-500/30">
                PANEL DOCENT CONTROWL
              </span>
              {session.subject && (
                <span className="px-2.5 py-0.5 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700">
                  {session.subject}
                </span>
              )}
              {session.group && (
                <span className="px-2.5 py-0.5 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700">
                  {session.group}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded text-xs bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Sessió en curs
              </span>
              <ExamTimer
                createdAt={session.createdAt}
                durationMinutes={session.durationMinutes}
                compact={true}
              />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {session.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1 font-mono">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                URL autoritzada: <span className="text-indigo-300 font-semibold">{session.url}</span>
              </span>
              <span>•</span>
              <span>Docent: <strong className="text-slate-200">{session.teacherName}</strong></span>
            </div>
          </div>

          {/* Session Code Card (Section 4, 5, 6) */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto">
            <div className="bg-slate-950 border-2 border-indigo-500/40 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[200px] shadow-lg shadow-indigo-950/40">
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-0.5">
                Codi d'accés (6 caràcters)
              </span>
              <div className="text-3xl font-black font-mono tracking-[0.3em] text-white">
                {session.code}
              </div>
              <span className="text-[10px] text-slate-400 mt-1">Comparteix amb l'alumnat</span>
            </div>

            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <button
                onClick={() => setIsNewSessionModalOpen(true)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Sessió</span>
              </button>

              {blockedCount > 0 && (
                <button
                  onClick={handleUnlockAllBlocked}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition animate-pulse"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Desbloquejar tots ({blockedCount})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Global Action feedback toast */}
        {actionSuccessNotice && (
          <div className="mt-4 p-3 bg-indigo-950/90 border border-indigo-500/50 rounded-xl text-xs text-indigo-200 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{actionSuccessNotice}</span>
            </div>
            <button
              onClick={() => setActionSuccessNotice(null)}
              className="text-indigo-400 hover:text-white"
            >
              &times;
            </button>
          </div>
        )}
      </div>

      {/* Classroom Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-indigo-950/50 border-indigo-500 text-white shadow-lg shadow-indigo-950/50'
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Connectats</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalStudents}</div>
          <div className="text-[11px] text-slate-400 mt-1">Dispositius sincronitzats</div>
        </div>

        <div
          onClick={() => setStatusFilter('active')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            statusFilter === 'active'
              ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-lg'
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>🟢 Actius</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <div className="text-2xl font-black text-emerald-400">{activeCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Sense incidències</div>
        </div>

        <div
          onClick={() => setStatusFilter('warning')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            statusFilter === 'warning'
              ? 'bg-amber-950/50 border-amber-500 text-white shadow-lg'
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>🟡 Incidència menor</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{warningCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Pèrdua de focus o drecera</div>
        </div>

        <div
          onClick={() => setStatusFilter('blocked')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            statusFilter === 'blocked'
              ? 'bg-rose-950/50 border-rose-500 text-white shadow-lg shadow-rose-950/50'
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>🔴 Bloquejats</span>
            <Lock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 flex items-center gap-2">
            <span>{blockedCount}</span>
            {blockedCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                Acció requerida
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Buffer circular congelat</div>
        </div>

      </div>

      {/* Main Controls & View Tabs (Section 11, 12, 38) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        
        {/* Navigation & Search Bar */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/50">
          
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1 w-full sm:w-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>Pantalles en Directe ({totalStudents})</span>
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Llista d'Alumnes</span>
            </button>

            <button
              onClick={() => setViewMode('incidents')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                viewMode === 'incidents'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Incidències ({warningCount + blockedCount})</span>
              {blockedCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
              )}
            </button>

            <button
              onClick={() => setViewMode('logs')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                viewMode === 'logs'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Registre d'Auditoria</span>
            </button>

            <button
              onClick={() => setViewMode('config')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                viewMode === 'config'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Regles & Llista Blanca</span>
            </button>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Cercar per nom o PC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {selectedStudentIds.length > 0 && (
              <button
                onClick={handleUnlockSelected}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition whitespace-nowrap"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Desbloquejar ({selectedStudentIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* VIEW 1: CLASSROOM LIVE GRID (Section 12, 13, 38) */}
        {viewMode === 'grid' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Transmissió de pantalles en directa optimitzada per a l'aula</span>
                <span>•</span>
                <span>Clica qualsevol pantalla per ampliar, fer captura o revisar el buffer</span>
              </div>
              <div className="text-slate-500">
                Mostrant {filteredStudents.length} de {totalStudents} alumnes
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredStudents.map((student) => {
                const isSelected = selectedStudentIds.includes(student.id);
                const isBlocked = student.status === 'blocked';
                const isWarning = student.status === 'warning';

                return (
                  <div
                    key={student.id}
                    className={`bg-slate-950 border rounded-2xl overflow-hidden transition group hover:shadow-2xl relative flex flex-col ${
                      isBlocked
                        ? 'border-rose-500/80 shadow-rose-950/40 shadow-lg ring-1 ring-rose-500/30'
                        : isWarning
                        ? 'border-amber-500/60 shadow-amber-950/20'
                        : isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-500/40'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="p-3 border-b border-slate-900 bg-slate-900/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSelectStudent(student.id);
                          }}
                          className="text-slate-500 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                          ) : (
                            <Square className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span className="font-bold text-white truncate">{student.fullName}</span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {student.deviceId}
                        </span>
                        {student.status === 'active' && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                        {student.status === 'warning' && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
                        {student.status === 'blocked' && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>}
                        {student.status === 'offline' && <span className="w-2 h-2 rounded-full bg-slate-600"></span>}
                      </div>
                    </div>

                    {/* Thumbnail Screen Preview (Section 12) */}
                    <div
                      onClick={() => setSelectedStudentForModal(student)}
                      className="aspect-[16/10] bg-black/80 relative cursor-pointer group-hover:brightness-105 transition overflow-hidden"
                    >
                      <div
                        dangerouslySetInnerHTML={{ __html: student.currentScreen.svgPreview }}
                        className="w-full h-full pointer-events-none"
                      />

                      {/* Hover action overlay */}
                      <div className="absolute inset-0 bg-indigo-950/60 opacity-0 group-hover:opacity-100 backdrop-blur-[2px] transition flex items-center justify-center gap-2">
                        <span className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow">
                          <Monitor className="w-3.5 h-3.5" />
                          <span>Obrir Vista Ampliada</span>
                        </span>
                      </div>

                      {/* Blocked banner overlay */}
                      {isBlocked && (
                        <div className="absolute top-2 left-2 right-2 bg-rose-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-md backdrop-blur-sm flex items-center justify-between">
                          <span>🔴 BLOQUEJAT</span>
                          <span className="font-mono">{student.activeIncident?.detectedAction?.slice(0, 16)}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Footer Info */}
                    <div className="p-3 bg-slate-950/90 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-900 mt-auto">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock className="w-3 h-3" />
                        fa 1 s
                      </span>

                      <div className="flex items-center gap-2">
                        {student.incidentCount > 0 && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isBlocked ? 'bg-rose-950 text-rose-400 border border-rose-800/40' : 'bg-amber-950 text-amber-400 border border-amber-800/40'}`}>
                            {student.incidentCount} {student.incidentCount === 1 ? 'incidència' : 'incidències'}
                          </span>
                        )}

                        {isBlocked ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUnlockStudent(student.id);
                              showNotice(`${student.fullName} ha estat desbloquejat remotament.`);
                            }}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] rounded flex items-center gap-1 transition shadow"
                          >
                            <Unlock className="w-3 h-3" />
                            <span>Desbloquejar</span>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTakeSnapshot(student.id);
                              showNotice(`Captura desada per a ${student.fullName}.`);
                            }}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                            title="Prendre captura"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: TABLE VIEW (Section 11) */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-4 w-10">
                    <button onClick={handleSelectAll} className="hover:text-white">
                      {selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-4">Alumne</th>
                  <th className="p-4">Dispositiu</th>
                  <th className="p-4">Estat</th>
                  <th className="p-4">Incidències</th>
                  <th className="p-4">Focus</th>
                  <th className="p-4">Hora Entrada</th>
                  <th className="p-4 text-right">Accions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredStudents.map((student) => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  const isBlocked = student.status === 'blocked';

                  return (
                    <tr
                      key={student.id}
                      onClick={() => setSelectedStudentForModal(student)}
                      className={`hover:bg-slate-850/50 cursor-pointer transition ${
                        isBlocked ? 'bg-rose-950/20' : isSelected ? 'bg-indigo-950/30' : ''
                      }`}
                    >
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleSelectStudent(student.id)}
                          className="hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-500" />
                          )}
                        </button>
                      </td>
                      <td className="p-4 font-bold text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-xs text-indigo-400">
                          {student.fullName.charAt(0)}
                        </div>
                        <span>{student.fullName}</span>
                      </td>
                      <td className="p-4 font-mono text-slate-300">
                        {student.deviceId} <span className="text-[10px] text-slate-500">({student.ip})</span>
                      </td>
                      <td className="p-4">
                        {student.status === 'active' && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                            🟢 Actiu
                          </span>
                        )}
                        {student.status === 'warning' && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950 text-amber-400 border border-amber-500/30">
                            🟡 Groc
                          </span>
                        )}
                        {student.status === 'blocked' && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-950 text-rose-400 border border-rose-500/40 animate-pulse">
                            🔴 Blocat
                          </span>
                        )}
                        {student.status === 'offline' && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400">
                            ⚫ Offline
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {student.incidentCount > 0 ? (
                          <span className="font-bold text-rose-400 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {student.incidentCount}
                          </span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={student.currentScreen.focusActive ? 'text-emerald-400' : 'text-rose-400'}>
                          {student.currentScreen.focusActive ? 'Primer pla' : 'Perdut'}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-slate-400">
                        {new Date(student.joinedAt).toLocaleTimeString('ca-ES')}
                      </td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onTakeSnapshot(student.id)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                            title="Prendre captura"
                          >
                            <Camera className="w-4 h-4" />
                          </button>

                          {isBlocked && (
                            <button
                              onClick={() => onUnlockStudent(student.id)}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Desbloquejar</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedStudentForModal(student)}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition"
                            title="Detalls de l'alumne"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 3: INCIDÈNCIES DETALLADES (Section 16-22) */}
        {viewMode === 'incidents' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <div>
                <h3 className="text-sm font-bold text-white">Incidències Detectades a la Sessió</h3>
                <p className="text-xs text-slate-400">Amb evidència del buffer circular dels últims 15 segons previs</p>
              </div>
              <div className="flex items-center gap-2">
                {blockedCount > 0 && (
                  <button
                    onClick={handleUnlockAllBlocked}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-2"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Desbloquejar tots els blocats ({blockedCount})</span>
                  </button>
                )}
              </div>
            </div>

            {students.filter(s => s.activeIncident || s.incidentCount > 0).length === 0 ? (
              <div className="p-12 text-center bg-slate-950 border border-slate-800 rounded-2xl text-slate-500">
                <ShieldCheck className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
                <p className="text-sm font-semibold text-slate-300">Cap incidència registrada</p>
                <p className="text-xs text-slate-500 mt-1">Tots els alumnes estan desenvolupant la prova dins dels paràmetres autoritzats.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {students
                  .filter(s => s.activeIncident || s.incidentCount > 0)
                  .map((student) => {
                    const inc = student.activeIncident;
                    const isBlocked = student.status === 'blocked';

                    return (
                      <div
                        key={student.id}
                        className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition ${
                          isBlocked
                            ? 'bg-rose-950/30 border-rose-500/50 shadow-md'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-white text-sm">{student.fullName}</span>
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {student.deviceId}
                            </span>
                            {isBlocked ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                                🔴 BLOQUEJAT
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                🟡 ADVERTÈNCIA
                              </span>
                            )}
                          </div>
                          
                          <div className="text-xs text-rose-300 font-semibold flex items-center gap-2">
                            <span>Motiu:</span>
                            <span className="font-mono bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/40 text-white">
                              {inc ? inc.detectedAction : 'Múltiples pèrdues de focus'}
                            </span>
                            {inc?.timestamp && <span className="text-slate-400">• Hora: {inc.timestamp}</span>}
                          </div>

                          <p className="text-xs text-slate-400 max-w-2xl">
                            {inc?.description || 'Violació dels límits de seguretat del client.'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                          <button
                            onClick={() => setSelectedStudentForModal(student)}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                          >
                            <Monitor className="w-3.5 h-3.5" />
                            <span>Revisar Buffer ({inc?.bufferHistory?.length || 15}s)</span>
                          </button>

                          {isBlocked && (
                            <button
                              onClick={() => {
                                onUnlockStudent(student.id);
                                showNotice(`${student.fullName} desbloquejat remotament.`);
                              }}
                              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Desbloquejar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: AUDIT LOG (Section 28) */}
        {viewMode === 'logs' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <div>
                <h3 className="text-sm font-bold text-white">Registre Oficial d'Auditoria (Audit Log)</h3>
                <p className="text-xs text-slate-400">Traçabilitat completa d'incidències, captures i desbloquejos remots docents</p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80 font-mono text-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 hover:bg-slate-900/40">
                  <div className="flex items-center gap-3">
                    <span className="text-indigo-400 font-bold">{log.timestamp}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                      log.type === 'incident' ? 'bg-rose-950 text-rose-400 border border-rose-800/40' :
                      log.type === 'unlock' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {log.type}
                    </span>
                    <span className="text-white font-semibold">{log.event}</span>
                  </div>

                  <div className="text-slate-400 text-[11px] sm:text-right">
                    <span className="text-slate-500 mr-2">[{log.actor}]</span>
                    <span>{log.details}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 5: CONFIGURACIÓ DE SEGURETAT & LLISTA BLANCA (Section 30, 31, 32, 33) */}
        {viewMode === 'config' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white">Paràmetres de Seguretat Actius a la Sessió</h3>
              <p className="text-xs text-slate-400">Configuració distribuïda a tots els clients connectats</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <span>Control de Porta-retalls & Sistema</span>
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">Política de Porta-retalls:</span>
                    <span className="font-semibold text-indigo-300 uppercase">{session.security.clipboardPolicy} (Intern)</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">Neteja inicial del porta-retalls:</span>
                    <span className="font-semibold text-emerald-400">Activa (buidat a l'inici)</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">Bloqueig de tecles especials:</span>
                    <span className="font-semibold text-emerald-400">Alt+Tab, Win, Win+D, Alt+F4</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">Buffer circular temporal:</span>
                    <span className="font-semibold text-indigo-400">{session.security.bufferDurationSeconds} segons congelats davant incidències</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  <span>Navegació Web Restringida & Llista Blanca</span>
                </h4>

                <div className="text-xs text-slate-400">
                  L'alumnat només pot carregar la URL autoritzada i els recursos explicitats. Qualsevol altre domini extern activa un bloqueig immediat.
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="p-2 rounded bg-indigo-950/60 border border-indigo-700/50 text-xs font-mono text-indigo-200">
                    ⭐ Principal: {session.url}
                  </div>
                  {session.security.allowedDomains.map((dom) => (
                    <div key={dom} className="p-2 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{dom}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-300 font-semibold block">Vols tancar aquesta sessió?</span>
                <span className="text-slate-500">Tots els clients connectats seran alliberats del mode segur.</span>
              </div>
              <button
                onClick={onEndSession}
                className="px-4 py-2 bg-slate-800 hover:bg-rose-900/60 hover:text-rose-200 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Finalitzar Sessió d'Examen
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Modal Vista Ampliada & Diagnòstic de l'Alumne */}
      <StudentDetailModal
        student={selectedStudentForModal}
        isOpen={Boolean(selectedStudentForModal)}
        onClose={() => setSelectedStudentForModal(null)}
        onUnlockStudent={(id) => {
          onUnlockStudent(id);
          showNotice(`Ordre de desbloqueig transmesa amb èxit.`);
        }}
        onTakeSnapshot={(id) => {
          onTakeSnapshot(id);
        }}
      />

      {/* Modal Nova Sessió */}
      <NewSessionModal
        isOpen={isNewSessionModalOpen}
        onClose={() => setIsNewSessionModalOpen(false)}
        onCreateSession={(newSess) => {
          onCreateSession(newSess);
          showNotice(`Nova sessió creada amb codi ${newSess.code}.`);
        }}
      />

    </div>
  );
};
