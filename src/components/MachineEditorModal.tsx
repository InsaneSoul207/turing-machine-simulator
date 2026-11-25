import React, { useState } from 'react';
import { TuringMachineConfig } from '../types/tm';
import { stringifyConfigToDSL, parseDSLToConfig } from '../utils/parser';
import { X, Code, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { PRESETS } from '../presets';

interface MachineEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: TuringMachineConfig;
  onSaveConfig: (config: TuringMachineConfig) => void;
  onSaveAsPreset?: (config: TuringMachineConfig) => void;
}

export const MachineEditorModal: React.FC<MachineEditorModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onSaveConfig,
  onSaveAsPreset
}) => {
  if (!isOpen) return null;

  const [dslText, setDslText] = useState(() => stringifyConfigToDSL(currentConfig));
  const [parseResult, setParseResult] = useState(() => parseDSLToConfig(stringifyConfigToDSL(currentConfig)));

  const handleTextChange = (val: string) => {
    setDslText(val);
    const result = parseDSLToConfig(val, currentConfig.id || 'custom');
    setParseResult(result);
  };

  const handleSave = () => {
    if (parseResult.config && parseResult.errors.length === 0) {
      onSaveConfig({
        ...parseResult.config,
        testCases: currentConfig.testCases || []
      });
      onClose();
    }
  };

  const handleLoadSample = (sample: TuringMachineConfig) => {
    const text = stringifyConfigToDSL(sample);
    setDslText(text);
    setParseResult(parseDSLToConfig(text, sample.id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs">
      <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-4xl max-h-[90vh] shadow-xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-zinc-200 text-zinc-800">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                Machine Definition Editor
              </h2>
              <p className="text-xs text-zinc-500">
                Rule format: <code className="text-zinc-800 font-semibold">state, read → nextState, write, direction</code>
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

        {/* Quick Load Preset Bar */}
        <div className="px-5 py-2 bg-zinc-50/50 border-b border-zinc-200 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-zinc-500 font-medium whitespace-nowrap">Load Template:</span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleLoadSample(p)}
              className="px-2 py-0.5 rounded border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 font-mono text-[11px] whitespace-nowrap transition-colors"
            >
              {p.name.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Body Editor & Validation */}
        <div className="flex-1 p-5 grid grid-cols-1 lg:grid-cols-3 gap-5 overflow-hidden">
          {/* Editor Area */}
          <div className="lg:col-span-2 flex flex-col h-full">
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Configuration DSL</span>
              <span className="font-mono text-[11px]">L/R/S</span>
            </div>
            <textarea
              value={dslText}
              onChange={(e) => handleTextChange(e.target.value)}
              className="flex-1 w-full bg-zinc-50 border border-zinc-300 rounded-lg p-3 font-mono text-xs text-zinc-900 leading-relaxed focus:outline-none focus:bg-white focus:border-zinc-400 resize-none scrollbar-thin"
              spellCheck={false}
            />
          </div>

          {/* Validation & Live Summary Area */}
          <div className="flex flex-col gap-3 overflow-y-auto">
            {/* Parser Status */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-zinc-500" /> Validation Report
              </h3>

              {parseResult.errors.length > 0 ? (
                <div className="space-y-1.5">
                  {parseResult.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Valid Turing Machine specification</span>
                </div>
              )}

              {parseResult.warnings.map((warn, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200 mt-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{warn}</span>
                </div>
              ))}
            </div>

            {/* Parsed 7-Tuple Summary */}
            {parseResult.config && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3.5 text-xs font-mono space-y-1.5">
                <h4 className="text-[11px] font-sans font-semibold uppercase tracking-wider text-zinc-600">
                  Automaton 7-Tuple
                </h4>
                <div>
                  <span className="text-zinc-500">States (Q): </span>
                  <span className="text-zinc-900 font-semibold">{parseResult.config.states.join(', ') || '∅'}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Alphabet (Γ): </span>
                  <span className="text-zinc-900 font-semibold">{parseResult.config.tapeAlphabet.join(', ') || '∅'}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Start (q₀): </span>
                  <span className="text-zinc-900 font-semibold">{parseResult.config.initialState}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Accept (F): </span>
                  <span className="text-emerald-700 font-semibold">{parseResult.config.acceptStates.join(', ') || '∅'}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Rules (|δ|): </span>
                  <span className="text-zinc-900 font-bold">{parseResult.config.transitions.length}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between gap-2.5">
          <div>
            {onSaveAsPreset && (
              <button
                onClick={() => {
                  if (parseResult.config && parseResult.errors.length === 0) {
                    onSaveAsPreset({
                      ...parseResult.config,
                      id: `custom_preset_${Date.now()}`,
                      isCustom: true,
                      testCases: currentConfig.testCases || []
                    });
                    onClose();
                  }
                }}
                disabled={parseResult.errors.length > 0}
                className="px-3 py-1.5 rounded border border-zinc-300 bg-white hover:bg-zinc-100 disabled:opacity-40 text-zinc-700 text-xs font-medium transition-colors"
              >
                Save as Preset
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={parseResult.errors.length > 0}
              className="px-4 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
            >
              Save Machine
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
