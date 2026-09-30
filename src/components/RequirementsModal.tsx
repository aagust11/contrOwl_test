import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import requirements from '../../REQUERIMENTS.md?raw';

interface RequirementsModalProps { isOpen: boolean; onClose: () => void }

export const RequirementsModal: React.FC<RequirementsModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 p-4 flex items-center justify-center">
      <section role="dialog" aria-modal="true" aria-labelledby="requirements-title"
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 id="requirements-title" className="font-bold text-lg">Requeriments i estat real</h2>
          <button autoFocus onClick={onClose} aria-label="Tancar requeriments" className="p-2"><X /></button>
        </header>
        <pre className="p-5 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{requirements}</pre>
      </section>
    </div>
  );
};
