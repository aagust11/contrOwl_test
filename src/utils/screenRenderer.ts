/**
 * Generador de previsualitzacions visuals vectorials (SVG) per al buffer circular
 * i monitorització de pantalles en temps real.
 */

import { ScreenBufferFrame } from '../types';

export interface ScreenRenderParams {
  studentName: string;
  examTitle: string;
  activeUrl: string;
  currentQuestion?: number;
  questionText?: string;
  answerContent?: string;
  isBlocked?: boolean;
  incidentType?: string;
  incidentLabel?: string;
  accentColor?: string;
  timestamp?: string;
}

export function generateExamScreenSvg(params: ScreenRenderParams): string {
  const {
    studentName,
    examTitle,
    activeUrl,
    currentQuestion = 2,
    questionText = 'Calcula l’esforç de tracció a la barra diagonal B3 de la gelosia Pratt.',
    answerContent = 'σ = F / S = 14500 N / 0.00025 m² = 58 MPa (Admissible)',
    isBlocked = false,
    incidentLabel = '',
    timestamp = new Date().toLocaleTimeString('ca-ES')
  } = params;

  if (isBlocked) {
    // Official ContrOwl Blocked screen (Section 23)
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="100%" height="100%">
      <rect width="640" height="400" fill="#090d16"/>
      <rect x="20" y="20" width="600" height="360" rx="16" fill="#0f172a" stroke="#dc2626" stroke-width="2"/>
      
      <!-- Lock Icon -->
      <g transform="translate(290, 80)">
        <circle cx="30" cy="30" r="38" fill="#450a0a" stroke="#ef4444" stroke-width="2"/>
        <path d="M22 28v-7a8 8 0 0 1 16 0v7M18 28h24a3 3 0 0 1 3 3v15a3 3 0 0 1-3 3H18a3 3 0 0 1-3-3V31a3 3 0 0 1 3-3z" fill="none" stroke="#f87171" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="30" cy="38" r="2" fill="#f87171"/>
      </g>

      <text x="320" y="180" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-size="24" font-weight="800" letter-spacing="2">CONTROWL</text>
      <text x="320" y="212" text-anchor="middle" fill="#fca5a5" font-family="system-ui, sans-serif" font-size="16" font-weight="600">Sessió temporalment bloquejada</text>
      <text x="320" y="240" text-anchor="middle" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">Espera que el professor desbloquegi el dispositiu des del seu panell.</text>

      ${incidentLabel ? `
      <g transform="translate(180, 268)">
        <rect width="280" height="36" rx="8" fill="#1e1b4b" stroke="#6366f1" stroke-width="1"/>
        <text x="140" y="22" text-anchor="middle" fill="#c7d2fe" font-family="system-ui, sans-serif" font-size="12" font-weight="600">🚨 ${incidentLabel}</text>
      </g>` : ''}

      <text x="320" y="340" text-anchor="middle" fill="#64748b" font-family="system-ui, sans-serif" font-size="11">Alumne: ${studentName} • ${timestamp}</text>
      <text x="320" y="358" text-anchor="middle" fill="#475569" font-family="system-ui, sans-serif" font-size="10">Mode segur ContrOwl actiu • Desbloqueig remot docent requerit</text>
    </svg>`;
  }

  // Active secure exam browser screen
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="100%" height="100%">
    <!-- Desktop background -->
    <rect width="640" height="400" fill="#0b1120"/>

    <!-- ContrOwl Client Window Frame -->
    <rect x="0" y="0" width="640" height="400" fill="#ffffff"/>
    
    <!-- Top Security Bar -->
    <rect x="0" y="0" width="640" height="36" fill="#1e1b4b"/>
    <circle cx="16" cy="18" r="5" fill="#10b981"/>
    <text x="28" y="22" fill="#c7d2fe" font-family="system-ui, sans-serif" font-size="11" font-weight="700">ContrOwl SafeMode</text>

    <!-- Browser Address / Whitelist Bar -->
    <g transform="translate(160, 6)">
      <rect width="320" height="24" rx="4" fill="#312e81"/>
      <path d="M10 8v-2a3 3 0 0 1 6 0v2m-4 0h6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z" fill="none" stroke="#34d399" stroke-width="1.2"/>
      <text x="24" y="16" fill="#e0e7ff" font-family="monospace" font-size="10">${activeUrl.slice(0, 42)}</text>
    </g>

    <text x="624" y="22" text-anchor="end" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="10">${studentName}</text>

    <!-- Exam Header Banner -->
    <rect x="0" y="36" width="640" height="44" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
    <text x="24" y="62" fill="#0f172a" font-family="system-ui, sans-serif" font-size="14" font-weight="700">${examTitle}</text>
    <rect x="520" y="46" width="96" height="24" rx="4" fill="#ecfdf5" stroke="#10b981" stroke-width="1"/>
    <text x="568" y="62" text-anchor="middle" fill="#047857" font-family="system-ui, sans-serif" font-size="10" font-weight="600">Pregunta ${currentQuestion}/5</text>

    <!-- Exam Content Area -->
    <g transform="translate(24, 96)">
      <!-- Question Card -->
      <rect width="592" height="130" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
      <text x="16" y="26" fill="#334155" font-family="system-ui, sans-serif" font-size="12" font-weight="700">Enunciat ${currentQuestion}:</text>
      <text x="16" y="48" fill="#1e293b" font-family="system-ui, sans-serif" font-size="11">${questionText.slice(0, 75)}</text>
      ${questionText.length > 75 ? `<text x="16" y="66" fill="#1e293b" font-family="system-ui, sans-serif" font-size="11">${questionText.slice(75, 150)}</text>` : ''}
      
      <!-- Mini Truss diagram schematic -->
      <g transform="translate(420, 16)">
        <polygon points="10,80 80,10 150,80" fill="none" stroke="#4f46e5" stroke-width="2"/>
        <line x1="80" y1="10" x2="80" y2="80" stroke="#4f46e5" stroke-width="1.5" stroke-dasharray="3,3"/>
        <line x1="10" y1="80" x2="150" y2="80" stroke="#4f46e5" stroke-width="2"/>
        <line x1="10" y1="80" x2="80" y2="45" stroke="#0ea5e9" stroke-width="1.5"/>
        <line x1="150" y1="80" x2="80" y2="45" stroke="#0ea5e9" stroke-width="1.5"/>
        <text x="80" y="94" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="9">Gelosia Pratt</text>
      </g>
    </g>

    <!-- Answer Box -->
    <g transform="translate(24, 238)">
      <rect width="592" height="110" rx="8" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
      <text x="16" y="24" fill="#475569" font-family="system-ui, sans-serif" font-size="10" font-weight="600">Resposta de l'alumne:</text>
      <text x="16" y="50" fill="#0f172a" font-family="monospace" font-size="12">${answerContent.slice(0, 60)}</text>
      ${answerContent.length > 60 ? `<text x="16" y="70" fill="#0f172a" font-family="monospace" font-size="12">${answerContent.slice(60, 120)}</text>` : ''}
      <!-- Cursor blink -->
      <line x1="${Math.min(500, 20 + (answerContent.length % 60) * 7.5)}" y1="40" x2="${Math.min(500, 20 + (answerContent.length % 60) * 7.5)}" y2="54" stroke="#4338ca" stroke-width="2"/>
    </g>

    <!-- Footer Bar -->
    <rect x="0" y="364" width="640" height="36" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="1"/>
    <text x="24" y="386" fill="#64748b" font-family="system-ui, sans-serif" font-size="11">🔒 Porta-retalls intern actiu • Tecles especials blocades</text>
    <text x="616" y="386" text-anchor="end" fill="#64748b" font-family="system-ui, sans-serif" font-size="10">Actualitzat: ${timestamp}</text>
  </svg>`;
}

export function generateIncidentScreenSvg(
  incidentType: string,
  detectedAction: string,
  studentName: string,
  timestamp: string,
  frameRelativeSec: number = 0
): string {
  // Highlights what happens during incident (e.g. Alt+Tab app switcher popup overlay, chrome icon, or unauthorized domain)
  if (incidentType === 'alt_tab' || detectedAction.includes('ALT') || detectedAction.includes('Tab')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="100%" height="100%">
      <!-- Background Exam Blurred -->
      <rect width="640" height="400" fill="#0f172a"/>
      <rect x="0" y="0" width="640" height="400" fill="#1e293b" opacity="0.4"/>
      
      <!-- Alt+Tab System Switcher Overlay -->
      <rect x="80" y="110" width="480" height="180" rx="16" fill="#030712" stroke="#6366f1" stroke-width="2" opacity="0.95"/>
      <text x="320" y="145" text-anchor="middle" fill="#c7d2fe" font-family="system-ui, sans-serif" font-size="13" font-weight="700">ALT + TAB DETECTAT PEL SISTEMA</text>
      
      <!-- App 1: ContrOwl Exam -->
      <g transform="translate(130, 165)">
        <rect width="110" height="90" rx="8" fill="#1e1b4b" stroke="#818cf8" stroke-width="2"/>
        <text x="55" y="45" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-size="24">🦉</text>
        <text x="55" y="75" text-anchor="middle" fill="#c7d2fe" font-family="system-ui, sans-serif" font-size="10" font-weight="600">ContrOwl</text>
      </g>

      <!-- App 2: Google Chrome (Unauthorized) -->
      <g transform="translate(265, 165)">
        <rect width="110" height="90" rx="8" fill="#450a0a" stroke="#ef4444" stroke-width="2.5"/>
        <circle cx="55" cy="40" r="18" fill="#dc2626"/>
        <circle cx="55" cy="40" r="8" fill="#ffffff"/>
        <text x="55" y="75" text-anchor="middle" fill="#fca5a5" font-family="system-ui, sans-serif" font-size="10" font-weight="700">Chrome (Prohibit)</text>
      </g>

      <!-- App 3: Discord / Apunts -->
      <g transform="translate(400, 165)">
        <rect width="110" height="90" rx="8" fill="#18181b" stroke="#3f3f46" stroke-width="1"/>
        <text x="55" y="45" text-anchor="middle" fill="#a1a1aa" font-family="system-ui, sans-serif" font-size="22">💬</text>
        <text x="55" y="75" text-anchor="middle" fill="#71717a" font-family="system-ui, sans-serif" font-size="10">Discord</text>
      </g>

      <!-- Top Warning Banner -->
      <g transform="translate(160, 20)">
        <rect width="320" height="34" rx="8" fill="#dc2626"/>
        <text x="160" y="22" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-size="12" font-weight="800">⚠️ INCIDÈNCIA: ${detectedAction}</text>
      </g>

      <text x="320" y="375" text-anchor="middle" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11">Temps relatiu: ${frameRelativeSec}s • ${timestamp}</text>
    </svg>`;
  }

  if (incidentType === 'unauthorized_app' || detectedAction.toLowerCase().includes('chrome') || detectedAction.toLowerCase().includes('discord')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="100%" height="100%">
      <rect width="640" height="400" fill="#111827"/>
      <!-- Window frame for unauthorized application -->
      <rect x="50" y="50" width="540" height="300" rx="8" fill="#ffffff" stroke="#ef4444" stroke-width="3"/>
      <rect x="50" y="50" width="540" height="36" fill="#ef4444"/>
      <text x="70" y="74" fill="#ffffff" font-family="system-ui, sans-serif" font-size="13" font-weight="700">🚫 APLICACIÓ EXTERNA BLOQUEJADA: ${detectedAction}</text>
      
      <!-- Content preview -->
      <g transform="translate(100, 130)">
        <rect width="440" height="150" rx="8" fill="#fef2f2" stroke="#fecaca" stroke-width="1"/>
        <text x="220" y="40" text-anchor="middle" fill="#991b1b" font-family="system-ui, sans-serif" font-size="16" font-weight="700">Intent d'obertura no autoritzat detectat</text>
        <text x="220" y="70" text-anchor="middle" fill="#7f1d1d" font-family="system-ui, sans-serif" font-size="13">L'aplicació externa ha intentat robar el focus del mode segur.</text>
        <text x="220" y="105" text-anchor="middle" fill="#dc2626" font-family="monospace" font-size="12">Procés: ${detectedAction}</text>
      </g>

      <text x="320" y="375" text-anchor="middle" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11">Temps relatiu: ${frameRelativeSec}s • Alumne: ${studentName}</text>
    </svg>`;
  }

  if (incidentType === 'unauthorized_url' || detectedAction.toLowerCase().includes('google') || detectedAction.toLowerCase().includes('url')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="100%" height="100%">
      <rect width="640" height="400" fill="#0f172a"/>
      <rect x="40" y="40" width="560" height="320" rx="10" fill="#ffffff" stroke="#f59e0b" stroke-width="2"/>
      
      <rect x="40" y="40" width="560" height="36" fill="#d97706"/>
      <text x="60" y="63" fill="#ffffff" font-family="system-ui, sans-serif" font-size="12" font-weight="700">NAVEGACIÓ RESTRINGIDA — DOMINI NO AUTORITZAT</text>

      <g transform="translate(80, 110)">
        <rect width="480" height="180" rx="8" fill="#fffbeb" stroke="#fde68a" stroke-width="1"/>
        <text x="240" y="50" text-anchor="middle" fill="#b45309" font-family="system-ui, sans-serif" font-size="15" font-weight="800">DOMINI NO INCLÒS A LA LLISTA BLANCA</text>
        <text x="240" y="85" text-anchor="middle" fill="#78350f" font-family="system-ui, sans-serif" font-size="12">L'alumne ha intentat navegar cap a:</text>
        <rect x="100" y="105" width="280" height="32" rx="4" fill="#fef3c7" stroke="#d97706" stroke-width="1"/>
        <text x="240" y="126" text-anchor="middle" fill="#92400e" font-family="monospace" font-size="12" font-weight="700">${detectedAction}</text>
      </g>

      <text x="320" y="380" text-anchor="middle" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11">Temps relatiu: ${frameRelativeSec}s • ${timestamp}</text>
    </svg>`;
  }

  // Generic loss of focus or Windows key
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="100%" height="100%">
    <rect width="640" height="400" fill="#18181b"/>
    <g transform="translate(120, 80)">
      <rect width="400" height="220" rx="12" fill="#27272a" stroke="#f87171" stroke-width="2"/>
      <circle cx="200" cy="50" r="28" fill="#450a0a" stroke="#ef4444" stroke-width="2"/>
      <text x="200" y="58" text-anchor="middle" fill="#f87171" font-family="system-ui, sans-serif" font-size="20">⚠️</text>
      <text x="200" y="115" text-anchor="middle" fill="#fecaca" font-family="system-ui, sans-serif" font-size="16" font-weight="700">${detectedAction}</text>
      <text x="200" y="145" text-anchor="middle" fill="#a1a1aa" font-family="system-ui, sans-serif" font-size="12">ContrOwl ha registrat la violació de l'entorn segur.</text>
      <text x="200" y="175" text-anchor="middle" fill="#e4e4e7" font-family="system-ui, sans-serif" font-size="11">Buffer circular congelat per a revisió docent.</text>
    </g>
    <text x="320" y="370" text-anchor="middle" fill="#71717a" font-family="system-ui, sans-serif" font-size="11">Temps relatiu: ${frameRelativeSec}s • Alumne: ${studentName}</text>
  </svg>`;
}

export function generateCircularBufferFrames(
  incidentType: string,
  detectedAction: string,
  studentName: string,
  baseTimeStr: string,
  durationSec: number = 15
): ScreenBufferFrame[] {
  const frames: ScreenBufferFrame[] = [];
  const baseDate = new Date();

  for (let i = durationSec; i >= 0; i--) {
    const relSec = -i;
    const frameDate = new Date(baseDate.getTime() - i * 1000);
    const timeFormatted = frameDate.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let actionLabel = 'Navegació i escriptura normal a l’examen';
    let svgPreview: string;

    if (relSec >= -2) {
      // Moment of incident trigger
      actionLabel = `🚨 ${detectedAction}`;
      svgPreview = generateIncidentScreenSvg(incidentType, detectedAction, studentName, timeFormatted, relSec);
    } else if (relSec >= -5) {
      // Pre-incident suspicious / distraction activity
      if (incidentType === 'alt_tab' || incidentType === 'unauthorized_app') {
        actionLabel = 'Punter es desplaça cap a la vora de pantalla / drecera premuda';
      } else if (incidentType === 'focus_lost') {
        actionLabel = 'Pèrdua imminent de focus de la finestra de ContrOwl';
      } else {
        actionLabel = 'Intent de copiar text o selecció no autoritzada';
      }
      svgPreview = generateExamScreenSvg({
        studentName,
        examTitle: 'Examen Estructures — 3r ESO B',
        activeUrl: 'https://examens.insmollet.cat/estructures',
        currentQuestion: 3,
        questionText: 'Quina diferència hi ha entre un esforç de tracció i un de compressió?',
        answerContent: 'La tracció tendeix a allargar l’element i la compressió a escurçar-lo...',
        timestamp: timeFormatted
      });
    } else {
      // Normal exam answering
      actionLabel = `Responent l'examen (t ${relSec}s)`;
      svgPreview = generateExamScreenSvg({
        studentName,
        examTitle: 'Examen Estructures — 3r ESO B',
        activeUrl: 'https://examens.insmollet.cat/estructures',
        currentQuestion: 2,
        questionText: 'Calcula l’esforç de tracció a la barra diagonal B3 de la gelosia Pratt.',
        answerContent: 'σ = F / S = 14500 N / 0.00025 m² = 58 MPa (Admissible)',
        timestamp: timeFormatted
      });
    }

    frames.push({
      id: `frame-${relSec}-${Date.now()}`,
      relativeSeconds: relSec,
      timestamp: timeFormatted,
      actionLabel,
      screenTitle: 'Examen Estructures',
      activeUrl: 'https://examens.insmollet.cat/estructures',
      svgPreview
    });
  }

  return frames;
}
