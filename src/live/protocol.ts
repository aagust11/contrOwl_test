export interface LiveSession {
  id: string; code: string; name: string; url: string;
  createdAt: number; endedAt?: number;
}
export interface Frame { at: number; image: string }
export interface LiveIncident { id: string; at: number; reason: string; frames: Frame[] }
export interface LiveStudent {
  id: string; sessionId: string; name: string; device: string;
  connected: boolean; blocked: boolean; joinedAt: number;
  lastSeen: number; lastFrameAt?: number; image?: string;
  incidents: LiveIncident[]; snapshots: Frame[];
  pendingCommand?: string;
}
export interface LiveLog { at: number; message: string }
export interface TeacherState { sessions: LiveSession[]; students: LiveStudent[]; logs: LiveLog[] }
export interface Credentials { token: string; studentId: string; session: LiveSession; publicKey: JsonWebKey }
