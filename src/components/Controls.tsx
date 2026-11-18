import React from 'react';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, FastForward, Sliders, Type } from 'lucide-react';
import { MachineStatus } from '../types/tm';

interface ControlsProps {
  status: MachineStatus;
  currentStep: number;
  speedMs: number;
  onSpeedChange: (speed: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onRunToCompletion: () => void;
  onReset: () => void;
  canStepBackward: boolean;
  canStepForward: boolean;
  inputString: string;
  onInputChange: (val: string) => void;
  onApplyInput: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  status,
  currentStep,
  speedMs,
  onSpeedChange,
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
  onRunToCompletion,
  onReset,
  canStepBackward,
  canStepForward,
  inputString,
  onInputChange,
  onApplyInput
}) => {
  const isRunning = status === 'RUNNING';
  const isTerminal = status === 'ACCEPTED' || status === 'REJECTED' || status === 'HALTED' || status === 'TIMEOUT';

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
      {/* Input string controller */}
      <div className="flex items-center gap-2 w-full md:w-auto">
        <div className="relative flex-1 md:w-64">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400">
            <Type className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={inputString}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onApplyInput();
            }}
            placeholder="Tape input string (e.g. aabbcc)..."
            className="w-full bg-zinc-50 border border-zinc-300 rounded-md pl-8 pr-2.5 py-1.5 text-xs font-mono text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-500 transition-colors"
          />
        </div>
        <button
          onClick={onApplyInput}
          className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300 rounded-md text-xs font-medium transition-colors whitespace-nowrap"
          title="Reload tape with this input string"
        >
          Load
        </button>
      </div>

      {/* Main Playback Buttons */}
      <div className="flex items-center gap-1.5">
        {/* Step Backward */}
        <button
          onClick={onStepBackward}
          disabled={!canStepBackward || isRunning}
          className="p-1.5 rounded-md bg-white hover:bg-zinc-50 disabled:opacity-30 disabled:hover:bg-white text-zinc-700 border border-zinc-300 transition-colors"
          title="Step Backward (Left Arrow)"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        {/* Play / Pause Toggle */}
        {isRunning ? (
          <button
            onClick={onPause}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs transition-colors shadow-sm"
            title="Pause execution (Spacebar)"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>Pause</span>
          </button>
        ) : (
          <button
            onClick={onPlay}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors shadow-sm"
            title={isTerminal ? "Restart and Run from beginning" : "Play execution (Spacebar)"}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isTerminal ? 'Re-run' : 'Run'}</span>
          </button>
        )}

        {/* Step Forward */}
        <button
          onClick={onStepForward}
          disabled={!canStepForward || isRunning}
          className="p-1.5 rounded-md bg-white hover:bg-zinc-50 disabled:opacity-30 disabled:hover:bg-white text-zinc-700 border border-zinc-300 transition-colors"
          title="Step Forward (Right Arrow)"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Fast-Forward */}
        <button
          onClick={onRunToCompletion}
          disabled={isTerminal || isRunning || !canStepForward}
          className="p-1.5 rounded-md bg-white hover:bg-zinc-50 disabled:opacity-30 text-zinc-700 border border-zinc-300 transition-colors"
          title="Run to completion instantly"
        >
          <FastForward className="w-4 h-4" />
        </button>

        {/* Reset */}
        <button
          onClick={onReset}
          className="p-1.5 rounded-md bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-300 transition-colors"
          title="Reset Tape & Machine (Key: R)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Speed Slider & Step Counter */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-zinc-400" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-zinc-500 font-mono">
              Speed: {Math.round(1000 / speedMs)}/s
            </span>
            <input
              type="range"
              min="20"
              max="1000"
              step="20"
              value={1020 - speedMs}
              onChange={(e) => onSpeedChange(1020 - Number(e.target.value))}
              className="w-20 h-1 bg-zinc-200 rounded appearance-none cursor-pointer accent-blue-600"
              title="Execution Speed"
            />
          </div>
        </div>

        <div className="bg-zinc-100 px-2.5 py-1 rounded border border-zinc-200 font-mono text-xs text-zinc-700">
          <span className="text-zinc-500 text-[10px] mr-1">STEP</span>
          <span className="font-bold text-zinc-900">{currentStep}</span>
        </div>
      </div>
    </div>
  );
};
