import React from 'react';
import { TuringMachineConfig } from '../types/tm';
import { PRESETS } from '../presets';
import { Edit3, RotateCcw, Upload, Download, BookOpen } from 'lucide-react';

interface HeaderProps {
  currentConfig: TuringMachineConfig;
  onSelectPreset: (preset: TuringMachineConfig) => void;
  onOpenEditor: () => void;
  onOpenGuide: () => void;
  onReset: () => void;
  onExport: () => void;
  onImport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentConfig,
  onSelectPreset,
  onOpenEditor,
  onOpenGuide,
  onReset,
  onExport,
  onImport
}) => {
  return (
    <header className="bg-white border-b border-zinc-200 sticky top-0 z-40 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Title / Project */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-mono font-bold text-sm">
            TM
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
              Turing Machine Simulator
              <span className="text-[11px] font-normal text-zinc-500 border border-zinc-200 rounded px-1.5 py-0.2">
                Automata Lab
              </span>
            </h1>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500 font-medium">Preset:</label>
          <select
            value={currentConfig.id}
            onChange={(e) => {
              const selected = PRESETS.find(p => p.id === e.target.value);
              if (selected) onSelectPreset(selected);
            }}
            className="bg-white text-xs font-medium text-zinc-800 border border-zinc-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            {!PRESETS.some(p => p.id === currentConfig.id) && (
              <option value={currentConfig.id}>Custom Machine</option>
            )}
          </select>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenEditor}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors"
            title="Edit Machine Definition"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Machine</span>
          </button>

          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-300 text-xs font-medium transition-colors"
            title="Theory Guide"
          >
            <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
            <span className="hidden sm:inline">Guide</span>
          </button>

          <button
            onClick={onExport}
            className="p-1.5 rounded-md bg-white hover:bg-zinc-50 text-zinc-600 border border-zinc-300 transition-colors"
            title="Export JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onImport}
            className="p-1.5 rounded-md bg-white hover:bg-zinc-50 text-zinc-600 border border-zinc-300 transition-colors"
            title="Import JSON"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-300 text-xs font-medium transition-colors ml-1"
            title="Reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};
