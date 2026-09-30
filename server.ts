import http from 'http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ExamSession,
  StudentSession,
  AuditLogEntry,
  WsMessage,
  normalizeSessionCode
} from './src/types';
import {
  INITIAL_DEFAULT_SESSION,
  createInitialStudents,
  INITIAL_AUDIT_LOGS
} from './src/data/mockData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

const port = process.env.PORT || 3000;

// In-memory state store for sessions, students, and audit logs
const sessions = new Map<string, ExamSession>();
const sessionStudents = new Map<string, StudentSession[]>();
const sessionAuditLogs = new Map<string, AuditLogEntry[]>();

// Preseed initial session
sessions.set(INITIAL_DEFAULT_SESSION.id, INITIAL_DEFAULT_SESSION);
sessions.set(INITIAL_DEFAULT_SESSION.code, INITIAL_DEFAULT_SESSION); // alias by code
sessionStudents.set(INITIAL_DEFAULT_SESSION.id, createInitialStudents(INITIAL_DEFAULT_SESSION.id));
sessionAuditLogs.set(INITIAL_DEFAULT_SESSION.id, [...INITIAL_AUDIT_LOGS]);

// WebSocket connections pool
interface ConnectedClient {
  ws: WebSocket;
  role: 'teacher' | 'student';
  sessionId?: string;
  studentId?: string;
}
const connectedClients = new Set<ConnectedClient>();

function broadcastToSession(sessionId: string, message: any, excludeWs?: WebSocket) {
  const data = JSON.stringify(message);
  for (const client of connectedClients) {
    if (client.sessionId === sessionId && client.ws.readyState === WebSocket.OPEN && client.ws !== excludeWs) {
      client.ws.send(data);
    }
  }
}

// REST Endpoints
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ContrOwl Server', timestamp: new Date().toISOString() });
});

// Validate session code
app.get('/api/sessions/validate/:code', (req, res) => {
  const code = normalizeSessionCode(req.params.code);
  let matchedSession: ExamSession | undefined;

  for (const sess of sessions.values()) {
    if (sess.code === code && sess.status === 'active') {
      matchedSession = sess;
      break;
    }
  }

  if (!matchedSession) {
    res.status(404).json({ error: 'Codi de sessió no trobat o sessió finalitzada' });
    return;
  }

  res.json({
    id: matchedSession.id,
    code: matchedSession.code,
    name: matchedSession.name,
    subject: matchedSession.subject,
    group: matchedSession.group,
    url: matchedSession.url,
    durationMinutes: matchedSession.durationMinutes,
    security: matchedSession.security,
    teacherName: matchedSession.teacherName
  });
});

// Create new session
app.post('/api/sessions', (req, res) => {
  const body = req.body;
  const newCode = normalizeSessionCode(body.code || '');

  // Check if code in use
  for (const sess of sessions.values()) {
    if (sess.code === newCode && sess.status === 'active') {
      res.status(400).json({ error: 'Aquest codi ja està en ús per una sessió activa.' });
      return;
    }
  }

  const session: ExamSession = {
    id: `sess-${Date.now()}`,
    code: newCode,
    name: body.name || 'Nova Prova ContrOwl',
    subject: body.subject || '',
    group: body.group || '',
    url: body.url || 'https://examens.insmollet.cat/prova',
    durationMinutes: typeof body.durationMinutes === 'number' ? body.durationMinutes : 60,
    security: {
      clipboardPolicy: body.security?.clipboardPolicy || 'internal',
      wipeClipboardOnStart: body.security?.wipeClipboardOnStart ?? true,
      blockDevTools: body.security?.blockDevTools ?? true,
      blockExternalApps: body.security?.blockExternalApps ?? true,
      blockShortcuts: body.security?.blockShortcuts ?? true,
      autoCaptureOnIncident: body.security?.autoCaptureOnIncident ?? true,
      bufferDurationSeconds: body.security?.bufferDurationSeconds || 15,
      allowedDomains: body.security?.allowedDomains || ['examens.insmollet.cat']
    },
    status: 'active',
    createdAt: new Date().toISOString(),
    teacherName: body.teacherName || 'Docent'
  };

  sessions.set(session.id, session);
  sessions.set(session.code, session);
  sessionStudents.set(session.id, []);
  sessionAuditLogs.set(session.id, [
    {
      id: `log-${Date.now()}`,
      sessionId: session.id,
      timestamp: new Date().toLocaleTimeString('ca-ES'),
      event: 'Sessió creada',
      actor: session.teacherName,
      details: `Sessió creada amb codi ${session.code}. URL: ${session.url}`,
      type: 'session'
    }
  ]);

  res.status(201).json(session);
});

// Get session state
app.get('/api/sessions/:sessionId/state', (req, res) => {
  const sessionId = req.params.sessionId;
  const session = sessions.get(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Sessió no trobada' });
    return;
  }

  const students = sessionStudents.get(sessionId) || [];
  const auditLogs = sessionAuditLogs.get(sessionId) || [];

  res.json({ session, students, auditLogs });
});

// Remote unlock endpoint (single or multiple students)
app.post('/api/sessions/:sessionId/unlock', (req, res) => {
  const { sessionId } = req.params;
  const { studentIds, unlockedBy = 'Docent' } = req.body;

  const students = sessionStudents.get(sessionId);
  if (!students) {
    res.status(404).json({ error: 'Sessió no trobada' });
    return;
  }

  const targetIds: string[] = Array.isArray(studentIds) ? studentIds : [studentIds];
  const unlockedNames: string[] = [];

  students.forEach((student) => {
    if (targetIds.includes(student.id)) {
      student.status = 'active';
      if (student.activeIncident) {
        student.activeIncident.status = 'unlocked';
        student.activeIncident.unlockedAt = new Date().toLocaleTimeString('ca-ES');
        student.activeIncident.unlockedBy = unlockedBy;
      }
      unlockedNames.push(`${student.fullName} (${student.deviceId})`);
    }
  });

  const nowTime = new Date().toLocaleTimeString('ca-ES');
  const auditEntry: AuditLogEntry = {
    id: `log-${Date.now()}`,
    sessionId,
    timestamp: nowTime,
    event: targetIds.length > 1 ? 'Desbloqueig remot múltiple' : 'Desbloqueig remot autoritzat',
    actor: unlockedBy,
    details: `Ordre segura enviada al client. Desbloquejat: ${unlockedNames.join(', ')}`,
    type: 'unlock'
  };

  const logs = sessionAuditLogs.get(sessionId) || [];
  logs.unshift(auditEntry);
  sessionAuditLogs.set(sessionId, logs);

  // Broadcast to all clients in session
  broadcastToSession(sessionId, {
    type: 'STUDENTS_UNLOCKED',
    studentIds: targetIds,
    unlockedBy,
    timestamp: nowTime,
    auditEntry
  });

  res.json({ success: true, unlockedCount: unlockedNames.length, unlockedNames });
});

// End session
app.post('/api/sessions/:sessionId/end', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Sessió no trobada' });
    return;
  }
  session.status = 'finished';

  const auditEntry: AuditLogEntry = {
    id: `log-${Date.now()}`,
    sessionId,
    timestamp: new Date().toLocaleTimeString('ca-ES'),
    event: 'Sessió finalitzada pel docent',
    actor: session.teacherName,
    details: 'Sessió tancada. Tots els modes segurs s’han desactivat.',
    type: 'session'
  };

  const logs = sessionAuditLogs.get(sessionId) || [];
  logs.unshift(auditEntry);

  broadcastToSession(sessionId, {
    type: 'SESSION_FINISHED',
    sessionId
  });

  res.json({ success: true });
});

const httpServer = http.createServer(app);

// WebSocket Setup
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

wss.on('connection', (ws) => {
  const clientInfo: ConnectedClient = { ws, role: 'teacher' };
  connectedClients.add(clientInfo);

  ws.on('message', (rawData) => {
    try {
      const msg = JSON.parse(rawData.toString()) as WsMessage | any;

      if (msg.type === 'TEACHER_JOIN') {
        clientInfo.role = 'teacher';
        clientInfo.sessionId = msg.sessionId;

        const session = sessions.get(msg.sessionId);
        const students = sessionStudents.get(msg.sessionId) || [];
        const auditLogs = sessionAuditLogs.get(msg.sessionId) || [];

        ws.send(JSON.stringify({
          type: 'STATE_SYNC',
          session,
          students,
          auditLogs
        }));
      }

      if (msg.type === 'STUDENT_JOIN') {
        const studentId: string = msg.studentId || `stud-${Date.now()}`;
        clientInfo.role = 'student';
        clientInfo.sessionId = msg.sessionId;
        clientInfo.studentId = studentId;

        const students = sessionStudents.get(msg.sessionId) || [];
        let existing = students.find((s) => s.id === studentId);

        if (!existing) {
          const newStudent: StudentSession = {
            id: studentId,
            sessionId: msg.sessionId,
            fullName: msg.fullName,
            deviceId: msg.deviceId || 'PC-Alumne',
            deviceType: msg.deviceType || 'desktop',
            ip: '192.168.10.150',
            status: 'active',
            joinedAt: new Date().toISOString(),
            lastPingAt: new Date().toISOString(),
            incidentCount: 0,
            currentScreen: msg.initialScreen || {
              lastUpdated: new Date().toISOString(),
              screenTitle: 'Mode segur ContrOwl',
              activeUrl: msg.url || '',
              svgPreview: '',
              focusActive: true
            },
            snapshots: []
          };
          students.push(newStudent);
          existing = newStudent;
        } else {
          existing.status = 'active';
          existing.lastPingAt = new Date().toISOString();
        }

        sessionStudents.set(msg.sessionId, students);

        const auditEntry: AuditLogEntry = {
          id: `log-${Date.now()}`,
          sessionId: msg.sessionId,
          timestamp: new Date().toLocaleTimeString('ca-ES'),
          event: 'Alumne connectat',
          actor: `${msg.fullName} (${msg.deviceId || 'PC'})`,
          details: 'Mode segur activat i URL carregada automàticament.',
          type: 'info'
        };

        const logs = sessionAuditLogs.get(msg.sessionId) || [];
        logs.unshift(auditEntry);
        sessionAuditLogs.set(msg.sessionId, logs);

        // Notify teachers
        broadcastToSession(msg.sessionId, {
          type: 'STUDENT_JOINED',
          student: existing,
          auditEntry
        });

        ws.send(JSON.stringify({
          type: 'JOIN_CONFIRMED',
          student: existing
        }));
      }

      if (msg.type === 'STUDENT_SCREEN_UPDATE') {
        const students = sessionStudents.get(msg.sessionId);
        if (students) {
          const student = students.find((s) => s.id === msg.studentId);
          if (student) {
            student.currentScreen = msg.screen;
            student.lastPingAt = new Date().toISOString();
          }
        }
        broadcastToSession(msg.sessionId, msg, ws);
      }

      if (msg.type === 'STUDENT_INCIDENT') {
        const students = sessionStudents.get(msg.sessionId);
        if (students) {
          const student = students.find((s) => s.id === msg.studentId);
          if (student) {
            student.status = msg.incident.severity === 'critical_block' ? 'blocked' : 'warning';
            student.incidentCount += 1;
            student.activeIncident = msg.incident;
          }
        }

        const auditEntry: AuditLogEntry = {
          id: `log-${Date.now()}`,
          sessionId: msg.sessionId,
          timestamp: msg.incident.timestamp,
          event: `${msg.incident.title} — Dispositiu ${msg.incident.severity === 'critical_block' ? 'bloquejat' : 'advertit'}`,
          actor: `${msg.incident.studentName} (${msg.incident.deviceId})`,
          details: `${msg.incident.detectedAction}. Buffer circular de ${msg.incident.bufferHistory?.length || 15} segons congelat.`,
          type: 'incident'
        };

        const logs = sessionAuditLogs.get(msg.sessionId) || [];
        logs.unshift(auditEntry);
        sessionAuditLogs.set(msg.sessionId, logs);

        broadcastToSession(msg.sessionId, {
          type: 'STUDENT_INCIDENT_ALERT',
          incident: msg.incident,
          studentId: msg.studentId,
          auditEntry
        });
      }

      if (msg.type === 'REQUEST_SNAPSHOT') {
        // Teacher requested manual snapshot
        broadcastToSession(msg.sessionId, msg);
      }

      if (msg.type === 'SNAPSHOT_TAKEN') {
        const students = sessionStudents.get(msg.sessionId);
        if (students) {
          const student = students.find((s) => s.id === msg.studentId);
          if (student) {
            student.snapshots = student.snapshots || [];
            student.snapshots.unshift(msg.snapshot);
          }
        }

        const auditEntry: AuditLogEntry = {
          id: `log-${Date.now()}`,
          sessionId: msg.sessionId,
          timestamp: msg.snapshot.timestamp,
          event: 'Captura manual desada',
          actor: 'Professor',
          details: `Evidència visual guardada per a ${msg.snapshot.studentName} (${msg.snapshot.id}).`,
          type: 'info'
        };

        const logs = sessionAuditLogs.get(msg.sessionId) || [];
        logs.unshift(auditEntry);

        broadcastToSession(msg.sessionId, {
          type: 'SNAPSHOT_SAVED',
          studentId: msg.studentId,
          snapshot: msg.snapshot,
          auditEntry
        });
      }
    } catch (err) {
      console.error('Error handling WS message:', err);
    }
  });

  ws.on('close', () => {
    connectedClients.delete(clientInfo);
  });
});

// Vite middleware in dev or static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(port, () => {
    console.log(`ContrOwl Server running on http://localhost:${port}`);
  });
}

startServer();
