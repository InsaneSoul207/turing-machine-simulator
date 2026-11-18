import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, LocateFixed, Edit2 } from 'lucide-react';
import { getTapeBounds, getTapeSymbol } from '../utils/tmEngine';

interface TapeVisualizerProps {
  tape: Record<number, string>;
  headIndex: number;
  currentState: string;
  blankSymbol: string;
  onCellChange: (index: number, newSymbol: string) => void;
  isRunning: boolean;
}

export const TapeVisualizer: React.FC<TapeVisualizerProps> = ({
  tape,
  headIndex,
  currentState,
  blankSymbol,
  onCellChange,
  isRunning
}) => {
  const [editingCell, setEditingCell] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [viewOffset, setViewOffset] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep view centered around the head whenever head moves unless user explicitly panned far
  useEffect(() => {
    setViewOffset(0);
  }, [headIndex]);

  const { min, max } = getTapeBounds(tape, headIndex + viewOffset, 10);
  const cellIndices: number[] = [];
  for (let i = min; i <= max; i++) {
    cellIndices.push(i);
  }

  const handleStartEdit = (idx: number, currentSym: string) => {
    if (isRunning) return;
    setEditingCell(idx);
    setEditValue(currentSym === blankSymbol ? '' : currentSym);
  };

  const handleSaveEdit = (idx: number) => {
    const sym = editValue.trim() === '' ? blankSymbol : editValue[0];
    onCellChange(idx, sym);
    setEditingCell(null);
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
            Interactive Tape & Read/Write Head
          </h2>
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 font-mono border border-zinc-200">
            Head Index: <strong className="text-zinc-900 font-bold">{headIndex}</strong>
          </span>
        </div>

        {/* Tape Navigation Controls */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setViewOffset(prev => prev - 3)}
            className="p-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 transition-colors"
            title="Pan Left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewOffset(0)}
            className="flex items-center gap-1 px-2 py-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 transition-colors font-medium text-xs"
            title="Center on Head"
          >
            <LocateFixed className="w-3.5 h-3.5 text-blue-600" />
            <span>Center Head</span>
          </button>
          <button
            onClick={() => setViewOffset(prev => prev + 3)}
            className="p-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 transition-colors"
            title="Pan Right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tape Container */}
      <div
        ref={containerRef}
        className="relative py-6 overflow-x-auto scrollbar-thin flex justify-center items-center bg-zinc-50/70 border border-zinc-200/80 rounded-lg"
      >
        <div className="flex items-end gap-1 px-4 min-w-max">
          {cellIndices.map((idx) => {
            const symbol = getTapeSymbol(tape, idx, blankSymbol);
            const isHead = idx === headIndex;
            const isEditing = editingCell === idx;
            const isBlank = symbol === blankSymbol;

            return (
              <div key={idx} className="flex flex-col items-center group relative">
                {/* Minimal Head Pointer */}
                {isHead && (
                  <div className="absolute -top-10 flex flex-col items-center transition-all duration-150 z-20">
                    <div className="px-2 py-0.5 rounded bg-blue-600 text-white text-[11px] font-mono font-bold shadow-sm">
                      {currentState}
                    </div>
                    <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-blue-600 mt-0.5" />
                  </div>
                )}

                {/* Tape Cell Box */}
                <div
                  onClick={() => handleStartEdit(idx, symbol)}
                  className={`
                    w-11 h-13 rounded-md flex items-center justify-center font-mono text-lg font-bold transition-all duration-100 cursor-pointer select-none relative
                    ${isHead
                      ? 'bg-blue-50/80 border-2 border-blue-600 text-blue-950 shadow-sm z-10'
                      : 'bg-white border border-zinc-300 hover:border-zinc-400 text-zinc-800'
                    }
                    ${isBlank && !isHead ? 'text-zinc-300' : ''}
                  `}
                >
                  {isEditing ? (
                    <div className="flex items-center justify-center w-full h-full p-0.5">
                      <input
                        type="text"
                        maxLength={1}
                        value={editValue}
                        autoFocus
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleSaveEdit(idx)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(idx);
                          if (e.key === 'Escape') setEditingCell(null);
                        }}
                        className="w-full h-full text-center bg-white text-zinc-900 font-mono text-lg font-bold border border-blue-500 rounded focus:outline-none"
                      />
                    </div>
                  ) : (
                    <span>{symbol}</span>
                  )}

                  {!isRunning && !isEditing && (
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit2 className="w-2 h-2 text-zinc-400" />
                    </div>
                  )}
                </div>

                {/* Cell Index */}
                <span
                  className={`
                    text-[10px] font-mono mt-1.5 transition-colors
                    ${isHead ? 'text-blue-600 font-bold' : 'text-zinc-400 group-hover:text-zinc-600'}
                  `}
                >
                  {idx}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Helper footnote */}
      <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2.5 pt-2 border-t border-zinc-100">
        <span>Click any cell to edit symbol. Blank symbol: <code className="text-zinc-800 bg-zinc-100 px-1 py-0.5 rounded font-mono font-semibold">{blankSymbol}</code></span>
        <span className="hidden sm:inline text-zinc-400">Two-way infinite tape (ℤ index model)</span>
      </div>
    </div>
  );
};
