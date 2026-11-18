import React from 'react';
import { MachineStatus } from '../types/tm';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface StatusBannerProps {
  status: MachineStatus;
  currentState: string;
  stepCount: number;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  status,
  currentState,
  stepCount
}) => {
  if (status === 'ACCEPTED') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-emerald-900 tracking-tight font-sans">
                Input String Accepted
              </h3>
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-mono font-medium">
                State: [{currentState}]
              </span>
            </div>
            <p className="text-xs text-emerald-700 mt-0.5">
              The Turing Machine reached an accepting state in {stepCount} steps. The language condition is satisfied.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'REJECTED') {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700 border border-rose-200">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-rose-900 tracking-tight font-sans">
                Input String Rejected
              </h3>
              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 text-xs font-mono font-medium">
                State: [{currentState}]
              </span>
            </div>
            <p className="text-xs text-rose-700 mt-0.5">
              The machine halted in non-accepting state [{currentState}] after {stepCount} steps. By standard TOC definition, the input is not in the language.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'HALTED') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-amber-900 font-sans">
                Computation Halted
              </h3>
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 text-xs font-mono">
                State: [{currentState}]
              </span>
            </div>
            <p className="text-xs text-amber-700 mt-0.5">
              No transition defined for current (state, symbol). By TOC semantics, string is rejected.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'TIMEOUT') {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-rose-900 font-sans">
              Step Threshold Exceeded (Possible Loop)
            </h3>
            <p className="text-xs text-rose-700 mt-0.5">
              Computation halted after reaching the safety step threshold without halting.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
