import React, { useState } from 'react';
import { X, BookmarkPlus, AlertTriangle, CheckCircle2, FileText, Code } from 'lucide-react';
import { TuringMachineConfig } from '../types/tm';
import { stringifyConfigToDSL, parseDSLToConfig } from '../utils/parser';

interface NewPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: TuringMachineConfig;
  onSavePreset: (newPreset: TuringMachineConfig) => void;
}

export const NewPresetModal: React.FC<NewPresetModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onSavePreset
}) => {
  if (!isOpen) return null;

  const [presetName, setPresetName] = useState(() => `${currentConfig.name} (Copy)`);
  const [description, setDescription] = useState(() => currentConfig.description || '');
  const [category, setCategory] = useState<string>('Custom');
  const [defaultInput, setDefaultInput] = useState(() => currentConfig.defaultInput || '');
  const [dslText, setDslText] = useState(() => stringifyConfigToDSL(currentConfig));

  const parseResult = parseDSLToConfig(dslText, 'custom_preset_' + Date.now());
  const isValid = parseResult.config && parseResult.errors.length === 0;

  const handleSave = () => {
    if (!isValid || !parseResult.config) return;

    const newPreset: TuringMachineConfig = {
      ...parseResult.config,
      id: `custom_preset_${Date.now()}`,
      name: presetName.trim() || 'Custom Preset',
      description: description.trim() || 'User-defined Turing Machine preset',
      category: category.trim() || 'Custom',
      defaultInput: defaultInput.trim(),
      isCustom: true,
      createdAt: Date.now(),
      testCases: currentConfig.testCases || []
    };

    onSavePreset(newPreset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-xs">
      <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold">
              <BookmarkPlus className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                Add / Save New Preset
              </h2>
              <p className="text-xs text-zinc-500">
                Save a Turing Machine into your personal presets library
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Preset Name *
              </label>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g. Binary Subtraction"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs font-medium text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Homework, Language, Arithmetic"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs font-medium text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Description / Language Definition
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. L = {w | w has twice as many 1s as 0s}"
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Default Tape Input String
            </label>
            <input
              type="text"
              value={defaultInput}
              onChange={(e) => setDefaultInput(e.target.value)}
              placeholder="e.g. 0110"
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs font-mono text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-700">
                Machine Specification (DSL)
              </label>
              <span className="text-[11px] text-zinc-400 font-mono">
                {parseResult.config?.transitions.length || 0} transitions
              </span>
            </div>
            <textarea
              value={dslText}
              onChange={(e) => setDslText(e.target.value)}
              rows={8}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-lg p-3 font-mono text-xs text-zinc-900 leading-relaxed focus:bg-white focus:outline-none focus:border-zinc-500 resize-none scrollbar-thin"
              spellCheck={false}
            />
          </div>

          {/* Validation Feedback */}
          {parseResult.errors.length > 0 ? (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Errors in specification:</span>
              </div>
              <ul className="list-disc list-inside text-[11px] pl-1 space-y-0.5">
                {parseResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Valid Turing Machine specification ready to save.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-200 bg-zinc-50 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || !presetName.trim()}
            className="px-4 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
          >
            Save to Presets Library
          </button>
        </div>

      </div>
    </div>
  );
};
