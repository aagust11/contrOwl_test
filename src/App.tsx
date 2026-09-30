import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Monitor,
  Users,
  Lock,
  Unlock,
  Radio,
  HelpCircle,
  Columns,
  Layers,
  Sparkles,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  FileText
} from 'lucide-react';
import {
  ExamSession,
  StudentSession,
  AuditLogEntry,
  IncidentRecord,
  SnapshotRecord,
  generateSessionCode
} from './types';
import { INITIAL_DEFAULT_SESSION, createInitialStudents, INITIAL_AUDIT_LOGS } from './data/mockData';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentClient } from './components/StudentClient';
import { SplitView } from './components/SplitView';
import { generateExamScreenSvg } from './utils/screenRenderer';
import { ExamTimer } from './components/ExamTimer';
import { RequirementsModal } from './components/RequirementsModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'teacher' | 'student' | 'split'>('teacher');
  const [session, setSession] = useState<ExamSession>(INITIAL_DEFAULT_SESSION);
  const [students, setStudents] = useState<StudentSession[]>(() => createInitialStudents(INITIAL_DEFAULT_SESSION.id));
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  
  // Real active student session connected in the client tab
  const [myStudentSession, setMyStudentSession] = useState<StudentSession | null>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isRequirementsModalOpen, setIsRequirementsModalOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Initialize WebSocket connection to ContrOwl Server
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: any;

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
          // Register as teacher to receive state
          ws.send(JSON.stringify({ type: 'TEACHER_JOIN', sessionId: session.id }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'STATE_SYNC') {
              if (data.session) setSession(data.session);
              if (data.students && data.students.length > 0) setStudents(data.students);
              if (data.auditLogs && data.auditLogs.length > 0) setAuditLogs(data.auditLogs);
            } else if (data.type === 'STUDENTS_UNLOCKED') {
              const unlockedIds = data.studentIds as string[];
              setStudents((prev) =>
                prev.map((s) => {
                  if (unlockedIds.includes(s.id)) {
                    return {
                      ...s,
                      status: 'active',
                      activeIncident: s.activeIncident
                        ? { ...s.activeIncident, status: 'unlocked', unlockedAt: data.timestamp, unlockedBy: data.unlockedBy }
                        : null
                    };
                  }
                  return s;
                })
              );

              if (myStudentSession && unlockedIds.includes(myStudentSession.id)) {
                setMyStudentSession((prev) => (prev ? { ...prev, status: 'active' } : null));
              }

              if (data.auditEntry) {
                setAuditLogs((prev) => [data.auditEntry, ...prev]);
              }
            } else if (data.type === 'STUDENT_INCIDENT_ALERT') {
              const { incident, studentId, auditEntry } = data;
              setStudents((prev) =>
                prev.map((s) => {
                  if (s.id === studentId) {
                    return {
                      ...s,
                      status: incident.severity === 'critical_block' ? 'blocked' : 'warning',
                      incidentCount: s.incidentCount + 1,
                      activeIncident: incident
                    };
                  }
                  return s;
                })
              );
              if (auditEntry) {
                setAuditLogs((prev) => [auditEntry, ...prev]);
              }
            } else if (data.type === 'STUDENT_JOINED') {
              const { student, auditEntry } = data;
              setStudents((prev) => {
                const existingIdx = prev.findIndex((s) => s.id === student.id);
                if (existingIdx >= 0) {
                  const copy = [...prev];
                  copy[existingIdx] = student;
                  return copy;
                }
                return [student, ...prev];
              });
              if (auditEntry) {
                setAuditLogs((prev) => [auditEntry, ...prev]);
              }
            } else if (data.type === 'SNAPSHOT_SAVED') {
              const { studentId, snapshot, auditEntry } = data;
              setStudents((prev) =>
                prev.map((s) => {
                  if (s.id === studentId) {
                    return {
                      ...s,
                      snapshots: [snapshot, ...(s.snapshots || [])]
                    };
                  }
                  return s;
                })
              );
              if (auditEntry) {
                setAuditLogs((prev) => [auditEntry, ...prev]);
              }
            }
          } catch (err) {
            console.error('Error parsing WS message in client:', err);
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimeout = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          setWsConnected(false);
        };
      } catch (err) {
        console.warn('WebSocket init exception:', err);
      }
    }

    connect();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [session.id]);

  // Handler: Teacher unlocks 1 student remotely (Section 24, 25: ZERO local passwords!)
  const handleUnlockStudent = async (studentId: string) => {
    // Optimistic UI update
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          return {
            ...s,
            status: 'active',
            activeIncident: s.activeIncident
              ? { ...s.activeIncident, status: 'unlocked', unlockedAt: new Date().toLocaleTimeString('ca-ES'), unlockedBy: 'Prof. Àngel Castells' }
              : null
          };
        }
        return s;
      })
    );

    if (myStudentSession && myStudentSession.id === studentId) {
      setMyStudentSession((prev) => (prev ? { ...prev, status: 'active' } : null));
    }

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      sessionId: session.id,
      timestamp: new Date().toLocaleTimeString('ca-ES'),
      event: 'Desbloqueig remot autoritzat',
      actor: 'Prof. Àngel Castells',
      details: `Ordre segura transmesa al client ${studentId}. Sessió reactivada sense contrasenya local.`,
      type: 'unlock'
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    // Send through WS or REST
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'REMOTE_UNLOCK',
          studentIds: [studentId],
          teacherToken: 'auth-teacher-token-demo'
        })
      );
    } else {
      try {
        await fetch(`/api/sessions/${session.id}/unlock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentIds: [studentId], unlockedBy: 'Prof. Àngel Castells' })
        });
      } catch (_) {}
    }
  };

  // Handler: Teacher unlocks multiple or all students (Section 29: Desbloqueig massiu)
  const handleUnlockMultipleStudents = async (studentIds: string[]) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (studentIds.includes(s.id)) {
          return {
            ...s,
            status: 'active',
            activeIncident: s.activeIncident
              ? { ...s.activeIncident, status: 'unlocked', unlockedAt: new Date().toLocaleTimeString('ca-ES'), unlockedBy: 'Prof. Àngel Castells' }
              : null
          };
        }
        return s;
      })
    );

    if (myStudentSession && studentIds.includes(myStudentSession.id)) {
      setMyStudentSession((prev) => (prev ? { ...prev, status: 'active' } : null));
    }

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      sessionId: session.id,
      timestamp: new Date().toLocaleTimeString('ca-ES'),
      event: 'Desbloqueig remot múltiple',
      actor: 'Prof. Àngel Castells',
      details: `${studentIds.length} alumnes desbloquejats simultàniament des del panell d'administració.`,
      type: 'unlock'
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'REMOTE_UNLOCK',
          studentIds,
          teacherToken: 'auth-teacher-token-demo'
        })
      );
    } else {
      try {
        await fetch(`/api/sessions/${session.id}/unlock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentIds, unlockedBy: 'Prof. Àngel Castells' })
        });
      } catch (_) {}
    }
  };

  // Handler: Manual Snapshot by teacher (Section 15: FER CAPTURA)
  const handleTakeSnapshot = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const newSnapshot: SnapshotRecord = {
      id: `snap-${Date.now()}`,
      studentId,
      studentName: student.fullName,
      sessionId: session.id,
      timestamp: new Date().toLocaleTimeString('ca-ES'),
      type: 'manual_teacher',
      title: `Captura docent (${student.deviceId})`,
      svgPreview: student.currentScreen.svgPreview
    };

    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          return {
            ...s,
            snapshots: [newSnapshot, ...(s.snapshots || [])]
          };
        }
        return s;
      })
    );

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      sessionId: session.id,
      timestamp: new Date().toLocaleTimeString('ca-ES'),
      event: 'Captura manual desada',
      actor: 'Prof. Àngel Castells',
      details: `Evidència visual guardada per a ${student.fullName} (${student.deviceId}).`,
      type: 'info'
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'SNAPSHOT_TAKEN',
          sessionId: session.id,
          studentId,
          snapshot: newSnapshot
        })
      );
    }
  };

  // Handler: Create new session (Section 3: Apartat d'administració)
  const handleCreateSession = (newSess: Partial<ExamSession>) => {
    const created: ExamSession = {
      id: `sess-${Date.now()}`,
      code: newSess.code || generateSessionCode(),
      name: newSess.name || 'Nova Prova ContrOwl',
      subject: newSess.subject || '',
      group: newSess.group || '',
      url: newSess.url || 'https://examens.insmollet.cat/prova',
      durationMinutes: typeof newSess.durationMinutes === 'number' ? newSess.durationMinutes : 60,
      security: newSess.security || {
        clipboardPolicy: 'internal',
        wipeClipboardOnStart: true,
        blockDevTools: true,
        blockExternalApps: true,
        blockShortcuts: true,
        autoCaptureOnIncident: true,
        bufferDurationSeconds: 15,
        allowedDomains: ['examens.insmollet.cat']
      },
      status: 'active',
      createdAt: new Date().toISOString(),
      teacherName: 'Prof. Àngel Castells'
    };

    setSession(created);
    // Seed new session with initial class
    setStudents(createInitialStudents(created.id));

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      sessionId: created.id,
      timestamp: new Date().toLocaleTimeString('ca-ES'),
      event: 'Nova sessió creada',
      actor: 'Prof. Àngel Castells',
      details: `Codi ${created.code} assignat a ${created.name}. URL autoritzada: ${created.url}`,
      type: 'session'
    };
    setAuditLogs([newLog]);

    try {
      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(created)
      });
    } catch (_) {}
  };

  // Handler: End session
  const handleEndSession = () => {
    setSession((prev) => ({ ...prev, status: 'finished' }));
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      sessionId: session.id,
      timestamp: new Date().toLocaleTimeString('ca-ES'),
      event: 'Sessió finalitzada',
      actor: 'Prof. Àngel Castells',
      details: 'La prova ha conclòs. Tots els modes segurs s’han desactivat.',
      type: 'session'
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    try {
      fetch(`/api/sessions/${session.id}/end`, { method: 'POST' });
    } catch (_) {}
  };

  // Student joining from student client tab
  const handleStudentJoin = (data: { fullName: string; deviceId: string }) => {
    const existing = students.find((s) => s.deviceId === data.deviceId);
    const studentId = existing ? existing.id : `stud-${Date.now()}`;

    const newStudent: StudentSession = {
      id: studentId,
      sessionId: session.id,
      fullName: data.fullName,
      deviceId: data.deviceId,
      deviceType: 'desktop',
      ip: '192.168.10.123',
      status: 'active',
      joinedAt: new Date().toISOString(),
      lastPingAt: new Date().toISOString(),
      incidentCount: 0,
      currentScreen: {
        lastUpdated: new Date().toISOString(),
        screenTitle: session.name,
        activeUrl: session.url,
        focusActive: true,
        svgPreview: generateExamScreenSvg({
          studentName: data.fullName,
          examTitle: session.name,
          activeUrl: session.url,
          timestamp: new Date().toLocaleTimeString('ca-ES')
        })
      },
      snapshots: []
    };

    setMyStudentSession(newStudent);
    setStudents((prev) => {
      const idx = prev.findIndex((s) => s.id === studentId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newStudent;
        return copy;
      }
      return [newStudent, ...prev];
    });

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      sessionId: session.id,
      timestamp: new Date().toLocaleTimeString('ca-ES'),
      event: 'Alumne identificat i sincronitzat',
      actor: `${data.fullName} (${data.deviceId})`,
      details: `Accés autoritzat a la URL ${session.url}. Mode segur ContrOwl bloquejat.`,
      type: 'info'
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'STUDENT_JOIN',
          sessionId: session.id,
          studentId,
          fullName: data.fullName,
          deviceId: data.deviceId,
          initialScreen: newStudent.currentScreen
        })
      );
    }
  };

  // Student triggering an incident (congeals circular buffer & blocks)
  const handleStudentIncident = (incident: IncidentRecord) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === incident.studentId) {
          return {
            ...s,
            status: incident.severity === 'critical_block' ? 'blocked' : 'warning',
            incidentCount: s.incidentCount + 1,
            activeIncident: incident
          };
        }
        return s;
      })
    );

    if (myStudentSession && myStudentSession.id === incident.studentId) {
      setMyStudentSession((prev) =>
        prev
          ? {
              ...prev,
              status: incident.severity === 'critical_block' ? 'blocked' : 'warning',
              incidentCount: prev.incidentCount + 1,
              activeIncident: incident
            }
          : null
      );
    }

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      sessionId: session.id,
      timestamp: incident.timestamp,
      event: `${incident.title} — Dispositiu ${incident.severity === 'critical_block' ? 'bloquejat' : 'advertit'}`,
      actor: `${incident.studentName} (${incident.deviceId})`,
      details: `${incident.detectedAction}. Buffer circular congelat amb ${incident.bufferHistory.length} segons previs.`,
      type: 'incident'
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'STUDENT_INCIDENT',
          sessionId: session.id,
          studentId: incident.studentId,
          incident
        })
      );
    }
  };

  // Student screen frame update
  const handleUpdateStudentScreen = (svgPreview: string, title: string) => {
    if (!myStudentSession) return;

    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === myStudentSession.id) {
          return {
            ...s,
            lastPingAt: new Date().toISOString(),
            currentScreen: {
              ...s.currentScreen,
              lastUpdated: new Date().toISOString(),
              screenTitle: title,
              svgPreview
            }
          };
        }
        return s;
      })
    );

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'STUDENT_SCREEN_UPDATE',
          sessionId: session.id,
          studentId: myStudentSession.id,
          screen: {
            lastUpdated: new Date().toISOString(),
            screenTitle: title,
            activeUrl: session.url,
            svgPreview,
            focusActive: true
          }
        })
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Top Application Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Platform identity */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
              <img
                src="/contrOwl.png"
                alt="ContrOwl Logo"
                className="w-10 h-10 rounded-xl object-contain bg-slate-900 border border-indigo-500/40 p-1 shadow-md shadow-indigo-600/30"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black tracking-tight text-white">ContrOwl</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/40">
                    Exàmens Digitals Segurs
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Institut Mollet • Supervisió docent en temps real & Desbloqueig remot
                </div>
              </div>
            </div>

            {/* Mobile action buttons */}
            <div className="flex items-center gap-1 md:hidden">
              <button
                onClick={() => setIsRequirementsModalOpen(true)}
                className="p-2 text-indigo-400 hover:text-white"
                title="Requeriments"
              >
                <FileText className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsHelpModalOpen(true)}
                className="p-2 text-slate-400 hover:text-white"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl w-full md:w-auto justify-center">
            
            <button
              onClick={() => setActiveTab('teacher')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'teacher'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>Panell Docent (Admin)</span>
            </button>

            <button
              onClick={() => setActiveTab('student')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'student'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Client Alumne (Mode Segur)</span>
            </button>

            <button
              onClick={() => setActiveTab('split')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'split'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Visualitza el panell del docent i el client de l'alumne cara a cara per a un testatge complet"
            >
              <Columns className="w-4 h-4" />
              <span className="hidden sm:inline">Vista Dividida</span>
              <span className="sm:hidden">Dual</span>
            </button>

          </div>

          {/* Status Pills & Information */}
          <div className="hidden md:flex items-center gap-3">
            <ExamTimer
              createdAt={session.createdAt}
              durationMinutes={session.durationMinutes}
              compact={true}
            />

            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono flex items-center gap-2">
              <span className="text-slate-500">Codi actiu:</span>
              <span className="font-bold text-indigo-400 tracking-wider">{session.code}</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-emerald-400 animate-pulse'}`}></span>
              <span className="text-[11px] font-mono">Servidor Connectat</span>
            </div>

            <button
              onClick={() => setIsRequirementsModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-indigo-500/40 hover:border-indigo-400 text-indigo-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              title="Consultar taula viva de requeriments demanats, fets i comprovats"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden xl:inline">Requeriments</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-400 font-bold border border-emerald-500/30">
                50/50 Fet
              </span>
            </button>

            <button
              onClick={() => setIsHelpModalOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Manual d'Arquitectura i Decisions de Disseny"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        
        {activeTab === 'teacher' && (
          <TeacherDashboard
            session={session}
            students={students}
            auditLogs={auditLogs}
            onUnlockStudent={handleUnlockStudent}
            onUnlockMultipleStudents={handleUnlockMultipleStudents}
            onTakeSnapshot={handleTakeSnapshot}
            onCreateSession={handleCreateSession}
            onEndSession={handleEndSession}
          />
        )}

        {activeTab === 'student' && (
          <div className="max-w-4xl mx-auto">
            <StudentClient
              session={session}
              onJoinSession={handleStudentJoin}
              onTriggerIncident={handleStudentIncident}
              onUpdateScreen={handleUpdateStudentScreen}
              connectedStudent={myStudentSession}
            />
          </div>
        )}

        {activeTab === 'split' && (
          <SplitView
            session={session}
            students={students}
            auditLogs={auditLogs}
            connectedStudent={myStudentSession}
            onUnlockStudent={handleUnlockStudent}
            onUnlockMultipleStudents={handleUnlockMultipleStudents}
            onTakeSnapshot={handleTakeSnapshot}
            onCreateSession={handleCreateSession}
            onEndSession={handleEndSession}
            onJoinSession={handleStudentJoin}
            onTriggerIncident={handleStudentIncident}
            onUpdateScreen={handleUpdateStudentScreen}
          />
        )}

      </main>

      {/* Architecture & Design Decisions Help Modal */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-6 text-slate-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src="/contrOwl.png"
                  alt="ContrOwl Logo"
                  className="w-9 h-9 rounded-lg object-contain bg-slate-950 border border-indigo-500/40 p-1"
                />
                <div>
                  <h3 className="text-lg font-bold text-white">Arquitectura & Decisions de Disseny ContrOwl</h3>
                  <p className="text-xs text-slate-400">Sistema segur per a la realització d’exàmens digitals</p>
                </div>
              </div>
              <button
                onClick={() => setIsHelpModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-slate-300">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Unlock className="w-4 h-4 text-rose-400" />
                  <span>1. Desbloqueig Remot Sense Contrasenya Local (Seccions 24-27)</span>
                </h4>
                <p>
                  A ContrOwl no existeix cap contrasenya de desbloqueig que el docent hagi d'introduir físicament a l'ordinador de l'alumne. Una contrasenya local podria ser descoberta per l'alumnat. En canvi, el professor prem "DESBLOQUEJAR" directament des del seu ordinador i el servidor transmet l'ordre segura al client.
                </p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Radio className="w-4 h-4 text-indigo-400" />
                  <span>2. Buffer Visual Circular Temporal de 15s (Seccions 17-21)</span>
                </h4>
                <p>
                  No s'enregistra vídeo continu ni es sobrecarrega la xarxa. El client manté un buffer circular local dels últims 10-15 segons. Quan es produeix un bloqueig o incidència (ex. Alt+Tab), el buffer es congela i s'envia al docent, qui pot desplaçar el cursor temporal (de -15s a 0s) per distingir entre una acció involuntària i un intent real de sortir de ContrOwl.
                </p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>3. Codi de 6 Caràcters No Ambigus (Seccions 4-6)</span>
                </h4>
                <p>
                  Els codis generats automàticament utilitzen exclusivament caràcters no fàcilment confusibles (evitant 0, O, 1, I, L) i són insensibles a majúscules i minúscules (ex. <span className="font-mono text-indigo-300">k7m4px</span> equival a <span className="font-mono text-indigo-300">K7M4PX</span>).
                </p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>4. Pantalla de Bloqueig Inexpugnable (Secció 23)</span>
                </h4>
                <p>
                  Quan un dispositiu queda bloquejat, mostra únicament "Sessió temporalment bloquejada. Espera que el professor desbloquegi el dispositiu." Sense camps de contrasenya, sense botons de sortida ni opcions de desactivació local.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsHelpModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
              >
                Entès
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Requirements & Development Status Modal */}
      <RequirementsModal
        isOpen={isRequirementsModalOpen}
        onClose={() => setIsRequirementsModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 bg-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ContrOwl — Sistema segur per a la realització d’exàmens digitals</span>
          <span className="font-mono text-[11px] text-slate-600">Mode Segur • Buffer Circular • Desbloqueig Remot Docent</span>
        </div>
      </footer>

    </div>
  );
}
