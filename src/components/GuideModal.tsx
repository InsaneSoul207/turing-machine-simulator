import React from 'react';
import { X, BookOpen, Layers, Cpu, Compass } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs">
      <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-2xl max-h-[85vh] shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-zinc-200 text-zinc-800">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                Turing Machine Theory & Reference
              </h2>
              <p className="text-xs text-zinc-500">
                Formal definitions and operations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 text-zinc-700 text-xs leading-relaxed scrollbar-thin">
          {/* Formal Definition */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3.5">
            <h3 className="text-xs font-bold text-zinc-900 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
              <Cpu className="w-4 h-4 text-zinc-600" /> Formal 7-Tuple Definition
            </h3>
            <p className="mb-2 text-zinc-600">
              A standard Deterministic Turing Machine (DTM) is defined as:
            </p>
            <div className="bg-white p-2 rounded font-mono text-zinc-900 font-bold mb-2.5 border border-zinc-200">
              M = ⟨Q, Σ, Γ, δ, q₀, B, F⟩
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[11px] text-zinc-600">
              <li><strong className="text-zinc-900">Q:</strong> Internal states</li>
              <li><strong className="text-zinc-900">Σ:</strong> Input alphabet (B ∉ Σ)</li>
              <li><strong className="text-zinc-900">Γ:</strong> Tape alphabet (Σ ⊂ Γ, B ∈ Γ)</li>
              <li><strong className="text-zinc-900">δ:</strong> Transition function: Q × Γ → Q × Γ × &#123;L, R, S&#125;</li>
              <li><strong className="text-zinc-900">q₀:</strong> Start state</li>
              <li><strong className="text-zinc-900">B:</strong> Blank symbol (usually _)</li>
              <li><strong className="text-zinc-900">F:</strong> Accept states</li>
            </ul>
          </div>

          {/* Instantaneous Description */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3.5">
            <h3 className="text-xs font-bold text-zinc-900 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
              <Layers className="w-4 h-4 text-zinc-600" /> Instantaneous Description (ID)
            </h3>
            <div className="bg-white p-2 rounded font-mono text-zinc-900 font-bold mb-1.5 border border-zinc-200">
              α₁ [q] a α₂  ⊢  α₁' [q'] b α₂'
            </div>
            <p className="text-[11px] text-zinc-500">
              Where <code className="text-zinc-800">α₁</code> is tape content to the left of the head, <code className="text-blue-700">[q]</code> is the current state, <code className="text-zinc-900 font-bold">a</code> is the symbol under the head, and <code className="text-zinc-800">α₂</code> is the tape content to the right. The turnstile (⊢) indicates one transition step.
            </p>
          </div>

          {/* Shortcuts */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3.5">
            <h3 className="text-xs font-bold text-zinc-900 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
              <Compass className="w-4 h-4 text-zinc-600" /> Keyboard Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-white border border-zinc-300 font-mono text-zinc-800 font-bold">Space</kbd>
                <span>Play / Pause</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-white border border-zinc-300 font-mono text-zinc-800 font-bold">→</kbd>
                <span>Step Forward</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-white border border-zinc-300 font-mono text-zinc-800 font-bold">←</kbd>
                <span>Step Backward</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-white border border-zinc-300 font-mono text-zinc-800 font-bold">R</kbd>
                <span>Reset</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-zinc-200 bg-zinc-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
