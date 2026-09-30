/**
 * ContrOwl — Tipus i interfícies del sistema de control d'exàmens
 */

export const UNAMBIGUOUS_CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function generateSessionCode(): string {
  let result = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * UNAMBIGUOUS_CHARSET.length);
    result += UNAMBIGUOUS_CHARSET[randomIndex];
  }
  return result;
}

export function normalizeSessionCode(code: string): string {
  return code.trim().toUpperCase().replace(/[\s-]/g, '');
}

export function validateSessionCode(code: string): { valid: boolean; error?: string } {
  const normalized = normalizeSessionCode(code);
  if (normalized.length !== 6) {
    return { valid: false, error: 'El codi ha de tenir exactament 6 caràcters' };
  }
  return { valid: true };
}

export type ClipboardPolicy = 'blocked' | 'internal' | 'allowed';

export interface SecurityConfig {
  clipboardPolicy: ClipboardPolicy;
  wipeClipboardOnStart: boolean;
  blockDevTools: boolean;
  blockExternalApps: boolean;
  blockShortcuts: boolean;
  autoCaptureOnIncident: boolean;
  bufferDurationSeconds: number; // usually 10-15s
  allowedDomains: string[];
}

export interface ExamSession {
  id: string;
  code: string; // 6 uppercase chars
  name: string;
  subject?: string;
  group?: string;
  url: string;
  durationMinutes?: number; // e.g. 60 min, or 0 / undefined if unlimited
  security: SecurityConfig;
  status: 'active' | 'finished';
  createdAt: string;
  teacherName: string;
}

export type StudentStatus = 'active' | 'warning' | 'blocked' | 'offline';

export interface ScreenBufferFrame {
  id: string;
  relativeSeconds: number; // e.g. -15, -14, ..., 0
  timestamp: string; // formatted time e.g. 10:43:10
  actionLabel?: string;
  screenTitle?: string;
  activeUrl?: string;
  svgPreview: string; // SVG data or data URL for rendering high-fidelity screen snapshot
}

export type IncidentType =
  | 'alt_tab'
  | 'windows_key'
  | 'focus_lost'
  | 'unauthorized_app'
  | 'unauthorized_url'
  | 'forbidden_shortcut'
  | 'print_screen'
  | 'clipboard_violation'
  | 'client_closed';

export interface IncidentRecord {
  id: string;
  studentId: string;
  studentName: string;
  deviceId: string;
  sessionId: string;
  type: IncidentType;
  title: string;
  description: string;
  detectedAction: string; // e.g. "ALT + TAB", "Tecla Windows", "chrome.exe", "google.com"
  timestamp: string;
  durationSeconds?: number;
  severity: 'warning' | 'critical_block';
  status: 'open' | 'reviewed' | 'unlocked';
  bufferHistory: ScreenBufferFrame[];
  unlockedAt?: string;
  unlockedBy?: string;
}

export interface ScreenState {
  lastUpdated: string; // ISO string
  screenTitle: string;
  activeUrl: string;
  svgPreview: string;
  focusActive: boolean;
  scrollPercentage?: number;
}

export interface StudentSession {
  id: string;
  sessionId: string;
  fullName: string;
  deviceId: string; // e.g. "PC-23"
  deviceType: 'desktop' | 'laptop' | 'chromebook';
  ip: string;
  status: StudentStatus;
  joinedAt: string;
  lastPingAt: string;
  incidentCount: number;
  currentScreen: ScreenState;
  activeIncident?: IncidentRecord | null;
  snapshots: SnapshotRecord[];
}

export interface SnapshotRecord {
  id: string;
  studentId: string;
  studentName: string;
  sessionId: string;
  timestamp: string;
  type: 'manual_teacher' | 'auto_incident';
  title: string;
  svgPreview: string;
}

export interface AuditLogEntry {
  id: string;
  sessionId: string;
  timestamp: string;
  event: string;
  actor: string;
  details: string;
  type: 'info' | 'incident' | 'unlock' | 'session';
}

export type WsMessage =
  | { type: 'TEACHER_JOIN'; sessionId: string }
  | { type: 'STUDENT_JOIN'; sessionId: string; fullName: string; deviceId: string; deviceType?: 'desktop' | 'laptop' | 'chromebook' }
  | { type: 'STUDENT_SCREEN_UPDATE'; studentId: string; screen: ScreenState; frame: ScreenBufferFrame }
  | { type: 'STUDENT_INCIDENT'; studentId: string; incident: IncidentRecord }
  | { type: 'REMOTE_UNLOCK'; studentIds: string[]; teacherToken?: string }
  | { type: 'REQUEST_SNAPSHOT'; studentId: string }
  | { type: 'SNAPSHOT_TAKEN'; studentId: string; snapshot: SnapshotRecord }
  | { type: 'STATE_SYNC'; session: ExamSession; students: StudentSession[]; auditLogs: AuditLogEntry[] }
  | { type: 'STUDENT_UNLOCKED'; studentId: string };
