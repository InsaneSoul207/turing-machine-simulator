import React, { useRef, useEffect } from 'react';
import { StepRecord } from '../types/tm';
import { ListOrdered, History, CornerDownRight } from 'lucide-react';

interface ExecutionLogProps {
  history: StepRecord[];
  currentStepIndex: number;
  onJumpToStep: (index: number) => void;
  instantaneousDescription: string;
}

export const ExecutionLog: React.FC<ExecutionLogProps> = ({
  history,
  currentStepIndex,
  onJumpToStep,
  instantaneousDescription
}) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history.length, currentStepIndex]);

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-zinc-600" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
            Step Execution Log & ID
          </h3>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 font-mono border border-zinc-200">
          {history.length > 0 ? history.length - 1 : 0} steps
        </span>
      </div>

      {/* Formal Instantaneous Description (ID) Banner */}
      <div className="mb-3 p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg">
        <div className="flex items-center justify-between text-[11px] text-zinc-600 font-medium mb-1">
          <span className="flex items-center gap-1">
            <CornerDownRight className="w-3.5 h-3.5 text-zinc-500" /> Instantaneous Description (ID):
          </span>
          <span className="text-[10px] text-zinc-400 font-sans">Formal: u [q] v</span>
        </div>
        <div className="font-mono text-xs font-bold text-zinc-900 tracking-wide bg-white p-2 rounded border border-zinc-200 overflow-x-auto whitespace-nowrap">
          ⊢ {instantaneousDescription}
        </div>
      </div>

      {/* History Sequence List */}
      <div className="flex-1 overflow-y-auto max-h-[260px] space-y-1 pr-1 scrollbar-thin">
        {history.map((record, idx) => {
          const isCurrent = idx === currentStepIndex;

          return (
            <div
              key={idx}
              onClick={() => onJumpToStep(idx)}
              className={`
                p-2 rounded-lg border text-xs font-mono cursor-pointer transition-colors duration-100 flex items-start gap-2.5
                ${isCurrent
                  ? 'bg-blue-50/80 border-blue-400 text-blue-950 font-medium'
                  : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-600'
                }
              `}
            >
              <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                  isCurrent ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-600'
                }`}>
                  {record.step}
                </span>
                <span className="px-1 py-0.2 rounded bg-zinc-100 text-[10px] text-zinc-800 font-semibold border border-zinc-200">
                  {record.state}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[11.5px] text-zinc-900 leading-snug break-words">
                  {record.actionSummary}
                </p>
                <p className="text-[10.5px] text-zinc-500 font-mono mt-0.5 break-words">
                  ID: {record.instantaneousDescription}
                </p>
              </div>

              {isCurrent && (
                <span className="text-[9px] font-sans font-semibold text-blue-700 uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-100 border border-blue-200">
                  Current
                </span>
              )}
            </div>
          );
        })}
        <div ref={logEndRef} />
      </div>

      <div className="mt-2 pt-2 border-t border-zinc-100 text-[10px] text-zinc-400 flex items-center gap-1">
        <History className="w-3 h-3 text-zinc-400" />
        <span>Click any past step to revert tape & state to that point.</span>
      </div>
    </div>
  );
};
