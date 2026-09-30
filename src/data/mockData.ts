import { ExamSession, StudentSession, AuditLogEntry } from '../types';
import { generateExamScreenSvg, generateCircularBufferFrames } from '../utils/screenRenderer';

export const INITIAL_DEFAULT_SESSION: ExamSession = {
  id: 'sess-estructures-01',
  code: '7K4TP9', // Example from specification
  name: 'Examen Estructures',
  subject: 'Tecnologia i Enginyeria',
  group: '3r ESO B',
  url: 'https://examens.insmollet.cat/estructures',
  durationMinutes: 60,
  security: {
    clipboardPolicy: 'internal',
    wipeClipboardOnStart: true,
    blockDevTools: true,
    blockExternalApps: true,
    blockShortcuts: true,
    autoCaptureOnIncident: true,
    bufferDurationSeconds: 15,
    allowedDomains: ['examens.insmollet.cat', 'geogebra.org', 'docs.google.com']
  },
  status: 'active',
  createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  teacherName: 'Prof. Àngel Castells'
};

export function createInitialStudents(sessionId: string = 'sess-estructures-01'): StudentSession[] {
  const now = Date.now();
  const timeStr = (offsetSec: number) =>
    new Date(now - offsetSec * 1000).toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Júlia Serra incident buffer (15s circular buffer)
  const juliaBuffer = generateCircularBufferFrames(
    'alt_tab',
    'ALT + TAB detectat (intent de canvi a Chrome)',
    'Júlia Serra',
    timeStr(45),
    15
  );

  const students: StudentSession[] = [
    {
      id: 'stud-01',
      sessionId,
      fullName: 'Anna Puig',
      deviceId: 'PC-01',
      deviceType: 'desktop',
      ip: '192.168.10.101',
      status: 'active',
      joinedAt: new Date(now - 2400000).toISOString(),
      lastPingAt: new Date(now - 1000).toISOString(),
      incidentCount: 0,
      currentScreen: {
        lastUpdated: new Date(now - 1000).toISOString(),
        screenTitle: 'Examen Estructures',
        activeUrl: 'https://examens.insmollet.cat/estructures',
        focusActive: true,
        scrollPercentage: 45,
        svgPreview: generateExamScreenSvg({
          studentName: 'Anna Puig',
          examTitle: 'Examen Estructures — 3r ESO B',
          activeUrl: 'https://examens.insmollet.cat/estructures',
          currentQuestion: 3,
          questionText: 'Descriu la funció d’un tirant en una estructura triangulada.',
          answerContent: 'Els tirants suporten esforços de tracció i ajuden a estabilitzar...',
          timestamp: timeStr(1)
        })
      },
      snapshots: []
    },
    {
      id: 'stud-02',
      sessionId,
      fullName: 'Marc Vila',
      deviceId: 'PC-02',
      deviceType: 'desktop',
      ip: '192.168.10.102',
      status: 'warning',
      joinedAt: new Date(now - 2350000).toISOString(),
      lastPingAt: new Date(now - 2000).toISOString(),
      incidentCount: 1,
      currentScreen: {
        lastUpdated: new Date(now - 2000).toISOString(),
        screenTitle: 'Examen Estructures',
        activeUrl: 'https://examens.insmollet.cat/estructures',
        focusActive: true,
        scrollPercentage: 60,
        svgPreview: generateExamScreenSvg({
          studentName: 'Marc Vila',
          examTitle: 'Examen Estructures — 3r ESO B',
          activeUrl: 'https://examens.insmollet.cat/estructures',
          currentQuestion: 4,
          questionText: 'Com influeix el moment d’inèrcia en la resistència a la flexió d’una biga?',
          answerContent: 'A major moment d’inèrcia respecte a l’eix de flexió, menor deformació...',
          timestamp: timeStr(2)
        })
      },
      activeIncident: {
        id: 'inc-marc-01',
        studentId: 'stud-02',
        studentName: 'Marc Vila',
        deviceId: 'PC-02',
        sessionId,
        type: 'focus_lost',
        title: 'Pèrdua breu de focus',
        description: 'La finestra de ContrOwl ha perdut el focus durant 1.8 segons.',
        detectedAction: 'ContrOwl ha perdut el focus (1.8s)',
        timestamp: timeStr(180),
        durationSeconds: 1.8,
        severity: 'warning',
        status: 'reviewed',
        bufferHistory: generateCircularBufferFrames('focus_lost', 'Pèrdua de focus temporal', 'Marc Vila', timeStr(180), 10)
      },
      snapshots: []
    },
    {
      id: 'stud-03',
      sessionId,
      fullName: 'Júlia Serra',
      deviceId: 'PC-03',
      deviceType: 'desktop',
      ip: '192.168.10.103',
      status: 'blocked',
      joinedAt: new Date(now - 2200000).toISOString(),
      lastPingAt: new Date(now - 500).toISOString(),
      incidentCount: 2,
      currentScreen: {
        lastUpdated: new Date(now - 500).toISOString(),
        screenTitle: 'Sessió temporalment bloquejada',
        activeUrl: 'https://examens.insmollet.cat/estructures',
        focusActive: false,
        scrollPercentage: 30,
        svgPreview: generateExamScreenSvg({
          studentName: 'Júlia Serra',
          examTitle: 'Examen Estructures — 3r ESO B',
          activeUrl: 'https://examens.insmollet.cat/estructures',
          isBlocked: true,
          incidentLabel: 'ALT + TAB detectat (intent de canvi a Chrome)',
          timestamp: timeStr(45)
        })
      },
      activeIncident: {
        id: 'inc-julia-01',
        studentId: 'stud-03',
        studentName: 'Júlia Serra',
        deviceId: 'PC-03',
        sessionId,
        type: 'alt_tab',
        title: 'Intent de canvi d’aplicació (ALT + TAB)',
        description: 'L’alumne ha utilitzat la drecera de teclat Alt+Tab intentant commutar a Google Chrome.',
        detectedAction: 'ALT + TAB detectat',
        timestamp: timeStr(45),
        durationSeconds: 0,
        severity: 'critical_block',
        status: 'open',
        bufferHistory: juliaBuffer
      },
      snapshots: []
    },
    {
      id: 'stud-04',
      sessionId,
      fullName: 'Pol Garcia',
      deviceId: 'PC-04',
      deviceType: 'desktop',
      ip: '192.168.10.104',
      status: 'offline',
      joinedAt: new Date(now - 2500000).toISOString(),
      lastPingAt: new Date(now - 350000).toISOString(),
      incidentCount: 0,
      currentScreen: {
        lastUpdated: new Date(now - 350000).toISOString(),
        screenTitle: 'Desconnectat',
        activeUrl: 'https://examens.insmollet.cat/estructures',
        focusActive: false,
        svgPreview: generateExamScreenSvg({
          studentName: 'Pol Garcia',
          examTitle: 'Examen Estructures — 3r ESO B',
          activeUrl: 'https://examens.insmollet.cat/estructures',
          currentQuestion: 1,
          questionText: 'Connexió perduda fa 5 minuts (Mode segur mantingut al client)',
          answerContent: 'Dades desades al dispositiu de l’alumne...',
          timestamp: timeStr(350)
        })
      },
      snapshots: []
    },
    {
      id: 'stud-05',
      sessionId,
      fullName: 'Biel Soler',
      deviceId: 'PC-05',
      deviceType: 'laptop',
      ip: '192.168.10.105',
      status: 'active',
      joinedAt: new Date(now - 2100000).toISOString(),
      lastPingAt: new Date(now - 1200).toISOString(),
      incidentCount: 0,
      currentScreen: {
        lastUpdated: new Date(now - 1200).toISOString(),
        screenTitle: 'Examen Estructures',
        activeUrl: 'https://examens.insmollet.cat/estructures',
        focusActive: true,
        svgPreview: generateExamScreenSvg({
          studentName: 'Biel Soler',
          examTitle: 'Examen Estructures — 3r ESO B',
          activeUrl: 'https://examens.insmollet.cat/estructures',
          currentQuestion: 2,
          questionText: 'Calcula el mòdul resistent d’un perfil rectangular de fusta.',
          answerContent: 'Wz = (b · h²) / 6 = (10 · 20²) / 6 = 666.7 cm³',
          timestamp: timeStr(1)
        })
      },
      snapshots: []
    },
    {
      id: 'stud-06',
      sessionId,
      fullName: 'Carla Rovira',
      deviceId: 'PC-06',
      deviceType: 'desktop',
      ip: '192.168.10.106',
      status: 'active',
      joinedAt: new Date(now - 2000000).toISOString(),
      lastPingAt: new Date(now - 800).toISOString(),
      incidentCount: 0,
      currentScreen: {
        lastUpdated: new Date(now - 800).toISOString(),
        screenTitle: 'Examen Estructures',
        activeUrl: 'https://examens.insmollet.cat/estructures',
        focusActive: true,
        svgPreview: generateExamScreenSvg({
          studentName: 'Carla Rovira',
          examTitle: 'Examen Estructures — 3r ESO B',
          activeUrl: 'https://examens.insmollet.cat/estructures',
          currentQuestion: 5,
          questionText: 'Proposa una mesura per evitar el vinclament en columnes esveltes.',
          answerContent: 'Disminuir la longitud efectiva de vinclament afegint arriostraments.',
          timestamp: timeStr(2)
        })
      },
      snapshots: []
    },
    {
      id: 'stud-07',
      sessionId,
      fullName: 'Pau Font',
      deviceId: 'PC-07',
      deviceType: 'chromebook',
      ip: '192.168.10.107',
      status: 'active',
      joinedAt: new Date(now - 1950000).toISOString(),
      lastPingAt: new Date(now - 1500).toISOString(),
      incidentCount: 0,
      currentScreen: {
        lastUpdated: new Date(now - 1500).toISOString(),
        screenTitle: 'Examen Estructures',
        activeUrl: 'https://examens.insmollet.cat/estructures',
        focusActive: true,
        svgPreview: generateExamScreenSvg({
          studentName: 'Pau Font',
          examTitle: 'Examen Estructures — 3r ESO B',
          activeUrl: 'https://examens.insmollet.cat/estructures',
          currentQuestion: 1,
          questionText: 'Quins tipus d’unions s’utilitzen en estructures metàl·liques?',
          answerContent: 'Soldadura elèctrica i cargols calibrats d’alta resistència.',
          timestamp: timeStr(3)
        })
      },
      snapshots: []
    },
    {
      id: 'stud-08',
      sessionId,
      fullName: 'Laia Martínez',
      deviceId: 'PC-23', // From prompt example
      deviceType: 'desktop',
      ip: '192.168.10.123',
      status: 'active',
      joinedAt: new Date(now - 1900000).toISOString(),
      lastPingAt: new Date(now - 900).toISOString(),
      incidentCount: 0,
      currentScreen: {
        lastUpdated: new Date(now - 900).toISOString(),
        screenTitle: 'Examen Estructures',
        activeUrl: 'https://examens.insmollet.cat/estructures',
        focusActive: true,
        svgPreview: generateExamScreenSvg({
          studentName: 'Laia Martínez',
          examTitle: 'Examen Estructures — 3r ESO B',
          activeUrl: 'https://examens.insmollet.cat/estructures',
          currentQuestion: 4,
          questionText: 'Càlcul de la fletxa màxima en una biga recolzada.',
          answerContent: 'f = (5 · q · L⁴) / (384 · E · I) < L/500',
          timestamp: timeStr(1)
        })
      },
      snapshots: []
    },
    {
      id: 'stud-09',
      sessionId,
      fullName: 'Arnau Casals',
      deviceId: 'PC-09',
      deviceType: 'desktop',
      ip: '192.168.10.109',
      status: 'active',
      joinedAt: new Date(now - 1800000).toISOString(),
      lastPingAt: new Date(now - 1400).toISOString(),
      incidentCount: 0,
      currentScreen: {
        lastUpdated: new Date(now - 1400).toISOString(),
        screenTitle: 'Examen Estructures',
        activeUrl: 'https://examens.insmollet.cat/estructures',
        focusActive: true,
        svgPreview: generateExamScreenSvg({
          studentName: 'Arnau Casals',
          examTitle: 'Examen Estructures — 3r ESO B',
          activeUrl: 'https://examens.insmollet.cat/estructures',
          currentQuestion: 3,
          questionText: 'Com es calcula el coeficient de seguretat d’una estructura?',
          answerContent: 'γ = Tensió de trencament / Tensió de treball admissible ≥ 1.5',
          timestamp: timeStr(2)
        })
      },
      snapshots: []
    },
    {
      id: 'stud-10',
      sessionId,
      fullName: 'Mireia Valls',
      deviceId: 'PC-10',
      deviceType: 'chromebook',
      ip: '192.168.10.110',
      status: 'warning',
      joinedAt: new Date(now - 1750000).toISOString(),
      lastPingAt: new Date(now - 1100).toISOString(),
      incidentCount: 1,
      currentScreen: {
        lastUpdated: new Date(now - 1100).toISOString(),
        screenTitle: 'Examen Estructures',
        activeUrl: 'https://examens.insmollet.cat/estructures',
        focusActive: true,
        svgPreview: generateExamScreenSvg({
          studentName: 'Mireia Valls',
          examTitle: 'Examen Estructures — 3r ESO B',
          activeUrl: 'https://examens.insmollet.cat/estructures',
          currentQuestion: 2,
          questionText: 'Quina relació té la rigidesa torsional amb el perfil tancat?',
          answerContent: 'Els perfils tubulars buits suporten millor la torsió.',
          timestamp: timeStr(1)
        })
      },
      activeIncident: {
        id: 'inc-mireia-01',
        studentId: 'stud-10',
        studentName: 'Mireia Valls',
        deviceId: 'PC-10',
        sessionId,
        type: 'forbidden_shortcut',
        title: 'Drecera bloquejada (Win+D)',
        description: 'L’alumne ha premut Win+D (mostrar escriptori). El client ha bloquejat l’acció.',
        detectedAction: 'Tecla Windows + D detectada',
        timestamp: timeStr(120),
        durationSeconds: 0,
        severity: 'warning',
        status: 'reviewed',
        bufferHistory: generateCircularBufferFrames('forbidden_shortcut', 'Tecla Windows + D detectada', 'Mireia Valls', timeStr(120), 10)
      },
      snapshots: []
    },
    {
      id: 'stud-11',
      sessionId,
      fullName: 'Guillem Roca',
      deviceId: 'PC-11',
      deviceType: 'desktop',
      ip: '192.168.10.111',
      status: 'active',
      joinedAt: new Date(now - 1700000).toISOString(),
      lastPingAt: new Date(now - 700).toISOString(),
      incidentCount: 0,
      currentScreen: {
        lastUpdated: new Date(now - 700).toISOString(),
        screenTitle: 'Examen Estructures',
        activeUrl: 'https://examens.insmollet.cat/estructures',
        focusActive: true,
        svgPreview: generateExamScreenSvg({
          studentName: 'Guillem Roca',
          examTitle: 'Examen Estructures — 3r ESO B',
          activeUrl: 'https://examens.insmollet.cat/estructures',
          currentQuestion: 5,
          questionText: 'Com s’evita la ressonància en un pont penjant?',
          answerContent: 'Modificant la massa o instal·lant amortidors de massa sintonitzada.',
          timestamp: timeStr(1)
        })
      },
      snapshots: []
    },
    {
      id: 'stud-12',
      sessionId,
      fullName: 'Aina Mas',
      deviceId: 'PC-12',
      deviceType: 'desktop',
      ip: '192.168.10.112',
      status: 'active',
      joinedAt: new Date(now - 1650000).toISOString(),
      lastPingAt: new Date(now - 900).toISOString(),
      incidentCount: 0,
      currentScreen: {
        lastUpdated: new Date(now - 900).toISOString(),
        screenTitle: 'Examen Estructures',
        activeUrl: 'https://examens.insmollet.cat/estructures',
        focusActive: true,
        svgPreview: generateExamScreenSvg({
          studentName: 'Aina Mas',
          examTitle: 'Examen Estructures — 3r ESO B',
          activeUrl: 'https://examens.insmollet.cat/estructures',
          currentQuestion: 4,
          questionText: 'Quina propietat defineix el mòdul de Young?',
          answerContent: 'L’elasticitat longitudinal d’un material (E = σ / ε).',
          timestamp: timeStr(2)
        })
      },
      snapshots: []
    }
  ];

  return students;
}

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-01',
    sessionId: 'sess-estructures-01',
    timestamp: '10:00:00',
    event: 'Sessió creada',
    actor: 'Prof. Àngel Castells',
    details: 'Codi 7K4TP9 generat per a Examen Estructures (3r ESO B). URL: https://examens.insmollet.cat/estructures',
    type: 'session'
  },
  {
    id: 'log-02',
    sessionId: 'sess-estructures-01',
    timestamp: '10:05:12',
    event: 'Connexió massiva inicial',
    actor: 'Sistema',
    details: '12 alumnes connectats i sincronitzats en mode segur.',
    type: 'info'
  },
  {
    id: 'log-03',
    sessionId: 'sess-estructures-01',
    timestamp: '10:40:15',
    event: 'Incidència menor detectada',
    actor: 'Client ContrOwl (PC-02 / Marc Vila)',
    details: 'Pèrdua de focus de la finestra de ContrOwl (1.8 segons). Registrat com a advertència.',
    type: 'incident'
  },
  {
    id: 'log-04',
    sessionId: 'sess-estructures-01',
    timestamp: '10:43:21',
    event: 'ALT+TAB detectat — Dispositiu bloquejat',
    actor: 'Client ContrOwl (PC-03 / Júlia Serra)',
    details: 'L’alumne ha premut Alt+Tab. Bloqueig automàtic activat i buffer circular congelat.',
    type: 'incident'
  },
  {
    id: 'log-05',
    sessionId: 'sess-estructures-01',
    timestamp: '10:43:25',
    event: 'Professor revisa incidència',
    actor: 'Prof. Àngel Castells',
    details: 'Obertura del panell de diagnòstic i reproducció visual del buffer circular.',
    type: 'info'
  }
];
