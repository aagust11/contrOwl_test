import React from 'react';
import { TeacherDashboard } from './TeacherDashboard';
import { StudentClient } from './StudentClient';
import { ExamSession, StudentSession, AuditLogEntry, IncidentRecord } from '../types';
import { Columns, Smartphone, Laptop, Sparkles } from 'lucide-react';

interface SplitViewProps {
  session: ExamSession;
  students: StudentSession[];
  auditLogs: AuditLogEntry[];
  connectedStudent: StudentSession | null;
  onUnlockStudent: (studentId: string) => void;
  onUnlockMultipleStudents: (studentIds: string[]) => void;
  onTakeSnapshot: (studentId: string) => void;
  onCreateSession: (newSession: Partial<ExamSession>) => void;
  onEndSession: () => void;
  onJoinSession: (data: { fullName: string; deviceId: string }) => void;
  onTriggerIncident: (incident: IncidentRecord) => void;
  onUpdateScreen: (svg: string, title: string) => void;
}

export const SplitView: React.FC<SplitViewProps> = (props) => {
  return (
    <div className="space-y-4">
      {/* Helper notice */}
      <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 border border-indigo-500/30 rounded-2xl p-4 text-xs text-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300">
            <Columns className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-white text-sm block">Mode de Demostració en Paral·lel (Docent + Alumne)</span>
            <span className="text-slate-400">
              A l'esquerra: Panell Docent en temps real. A la dreta: Client Alumne en Mode Segur. Prova a disparar una incidència a la dreta per veure la transmissió del buffer i el desbloqueig remot.
            </span>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-indigo-300 flex items-center gap-1.5 flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Sincronització directa activa</span>
        </div>
      </div>

      {/* Two columns layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Left Column: Teacher Admin */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span>1. Panell del Docent (Supervisió & Desbloqueig Remot)</span>
            </span>
          </div>
          <TeacherDashboard
            session={props.session}
            students={props.students}
            auditLogs={props.auditLogs}
            onUnlockStudent={props.onUnlockStudent}
            onUnlockMultipleStudents={props.onUnlockMultipleStudents}
            onTakeSnapshot={props.onTakeSnapshot}
            onCreateSession={props.onCreateSession}
            onEndSession={props.onEndSession}
          />
        </div>

        {/* Right Column: Student Client */}
        <div className="space-y-4 sticky top-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>2. Client Alumne ContrOwl (Mode Segur)</span>
            </span>
          </div>
          <StudentClient
            session={props.session}
            onJoinSession={props.onJoinSession}
            onTriggerIncident={props.onTriggerIncident}
            onUpdateScreen={props.onUpdateScreen}
            connectedStudent={props.connectedStudent}
          />
        </div>
      </div>
    </div>
  );
};
