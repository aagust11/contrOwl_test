import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, AlertCircle, Hourglass, CheckCircle2 } from 'lucide-react';

interface ExamTimerProps {
  createdAt: string; // ISO date string when session was created/started
  durationMinutes?: number; // e.g. 60, 45, 30, or 0 for unlimited
  onTimeExpired?: () => void;
  compact?: boolean; // compact style for top bar
  showProgress?: boolean;
  className?: string;
}

export const ExamTimer: React.FC<ExamTimerProps> = ({
  createdAt,
  durationMinutes = 60,
  onTimeExpired,
  compact = false,
  showProgress = true,
  className = ''
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (!durationMinutes || durationMinutes <= 0) return 0;
    const startMs = new Date(createdAt).getTime();
    const totalDurationMs = durationMinutes * 60 * 1000;
    const endMs = startMs + totalDurationMs;
    const nowMs = Date.now();
    return Math.max(0, Math.floor((endMs - nowMs) / 1000));
  });

  const [hasExpired, setHasExpired] = useState<boolean>(false);
  const [isNearEnd, setIsNearEnd] = useState<boolean>(false);
  const [isWarning, setIsWarning] = useState<boolean>(false);

  useEffect(() => {
    if (!durationMinutes || durationMinutes <= 0) return;

    const calculateRemaining = () => {
      const startMs = new Date(createdAt).getTime();
      const totalDurationMs = durationMinutes * 60 * 1000;
      const endMs = startMs + totalDurationMs;
      const nowMs = Date.now();
      const diffSec = Math.max(0, Math.floor((endMs - nowMs) / 1000));

      setSecondsRemaining(diffSec);

      if (diffSec === 0) {
        if (!hasExpired) {
          setHasExpired(true);
          onTimeExpired?.();
        }
      } else {
        setHasExpired(false);
      }

      setIsNearEnd(diffSec > 0 && diffSec <= 180); // <= 3 minutes
      setIsWarning(diffSec > 180 && diffSec <= 600); // <= 10 minutes
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);

    return () => clearInterval(interval);
  }, [createdAt, durationMinutes, hasExpired, onTimeExpired]);

  // Format seconds to HH:MM:SS or MM:SS
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num: number) => num.toString().padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  // If no duration set (unlimited)
  if (!durationMinutes || durationMinutes <= 0) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono ${className}`}>
        <Hourglass className="w-3.5 h-3.5 text-indigo-400" />
        <span>Sense límit de temps</span>
      </div>
    );
  }

  // Calculate percentage of remaining time
  const totalSeconds = durationMinutes * 60;
  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / totalSeconds) * 100));

  // Visual variants based on time left
  let containerBg = 'bg-slate-900/90 border-slate-700/80 text-slate-200';
  let badgeColor = 'bg-indigo-950 text-indigo-300 border-indigo-800/40';
  let iconColor = 'text-indigo-400';
  let progressBarColor = 'bg-indigo-500';

  if (hasExpired) {
    containerBg = 'bg-rose-950/90 border-rose-600/80 text-rose-200 shadow-rose-950/50 shadow-lg';
    badgeColor = 'bg-rose-900 text-rose-100 border-rose-700';
    iconColor = 'text-rose-400';
    progressBarColor = 'bg-rose-500';
  } else if (isNearEnd) {
    containerBg = 'bg-rose-950/80 border-rose-500 text-rose-200 animate-pulse shadow-rose-950/40 shadow-md';
    badgeColor = 'bg-rose-900/90 text-rose-100 border-rose-600';
    iconColor = 'text-rose-400';
    progressBarColor = 'bg-rose-500';
  } else if (isWarning) {
    containerBg = 'bg-amber-950/70 border-amber-500/60 text-amber-200';
    badgeColor = 'bg-amber-900/80 text-amber-200 border-amber-700/50';
    iconColor = 'text-amber-400';
    progressBarColor = 'bg-amber-500';
  } else {
    containerBg = 'bg-slate-900/90 border-indigo-500/30 text-slate-100';
    badgeColor = 'bg-indigo-950 text-indigo-300 border-indigo-800/40';
    iconColor = 'text-emerald-400';
    progressBarColor = 'bg-emerald-500';
  }

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl border transition-all ${containerBg} ${className}`}
        title={`Temps restant configurat pel docent: ${formatTime(secondsRemaining)} (Total: ${durationMinutes} min)`}
      >
        <div className="flex items-center gap-1.5">
          <Clock className={`w-3.5 h-3.5 ${iconColor} ${isNearEnd ? 'animate-spin' : ''}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">
            Temps:
          </span>
          <span className="font-mono font-black text-xs tracking-wider">
            {hasExpired ? '00:00 (Exhaurit)' : formatTime(secondsRemaining)}
          </span>
        </div>

        {isNearEnd && !hasExpired && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-600 text-white animate-pulse">
            Últims 3 min!
          </span>
        )}

        {isWarning && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-600/80 text-white">
            &lt; 10 min
          </span>
        )}

        {hasExpired && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-600 text-white">
            Exhaurit
          </span>
        )}

        {showProgress && !hasExpired && (
          <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden ml-1 hidden sm:block">
            <div
              className={`h-full transition-all duration-1000 ${progressBarColor}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  // Full widget card (for student exam header or dashboard)
  return (
    <div className={`p-4 rounded-2xl border shadow-xl transition-all ${containerBg} ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${badgeColor}`}>
            <Clock className={`w-4 h-4 ${iconColor}`} />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Temps restant d'examen
            </div>
            <div className="text-xs text-slate-400">
              Configurat pel docent: <strong>{durationMinutes} minuts</strong>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className={`font-mono text-2xl sm:text-3xl font-black tracking-wider ${hasExpired ? 'text-rose-400' : isNearEnd ? 'text-rose-400' : isWarning ? 'text-amber-300' : 'text-white'}`}>
            {hasExpired ? '00:00' : formatTime(secondsRemaining)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {hasExpired ? 'Temps oficial exhaurit' : `${Math.round(progressPercent)}% del temps restant`}
          </div>
        </div>
      </div>

      {showProgress && (
        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80 mt-1">
          <div
            className={`h-full transition-all duration-1000 rounded-full ${progressBarColor}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {hasExpired && (
        <div className="mt-3 p-2 rounded-lg bg-rose-900/60 border border-rose-500/50 text-xs text-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>El temps assignat pel professor ha finalitzat. Revisa i tramet les teves respostes.</span>
        </div>
      )}

      {isNearEnd && !hasExpired && (
        <div className="mt-2 text-[11px] text-rose-300 flex items-center gap-1.5 font-semibold">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
          <span>Atenció: Queden menys de 3 minuts per finalitzar la prova!</span>
        </div>
      )}
    </div>
  );
};
