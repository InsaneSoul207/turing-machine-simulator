import React, { useState } from 'react';
import { TuringMachineConfig, Transition } from '../types/tm';
import { Table, Search, Plus, Trash2 } from 'lucide-react';

interface TransitionTableProps {
  config: TuringMachineConfig;
  activeTransition: Transition | null;
  onAddTransition: (t: Transition) => void;
  onDeleteTransition: (id: string) => void;
  readOnly?: boolean;
}

export const TransitionTable: React.FC<TransitionTableProps> = ({
  config,
  activeTransition,
  onAddTransition,
  onDeleteTransition,
  readOnly = false
}) => {
  const [filterState, setFilterState] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [showAddRow, setShowAddRow] = useState<boolean>(false);

  const [newFrom, setNewFrom] = useState(config.states[0] || 'q0');
  const [newRead, setNewRead] = useState('0');
  const [newTo, setNewTo] = useState(config.states[0] || 'q0');
  const [newWrite, setNewWrite] = useState('1');
  const [newDir, setNewDir] = useState<'L' | 'R' | 'S'>('R');

  const filteredTransitions = config.transitions.filter((t) => {
    if (filterState !== 'ALL' && t.fromState !== filterState) return false;
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      const matchFrom = t.fromState.toLowerCase().includes(q);
      const matchTo = t.toState.toLowerCase().includes(q);
      const matchSym = t.readSymbol.toLowerCase().includes(q) || t.writeSymbol.toLowerCase().includes(q);
      return matchFrom || matchTo || matchSym;
    }
    return true;
  });

  const handleCreate = () => {
    onAddTransition({
      id: `custom_${Date.now()}`,
      fromState: newFrom,
      readSymbol: newRead,
      toState: newTo,
      writeSymbol: newWrite,
      direction: newDir
    });
    setShowAddRow(false);
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col h-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-zinc-600" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
            Transition Table δ(q, σ)
          </h3>
          <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 font-mono border border-zinc-200">
            {config.transitions.length} rules
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="bg-zinc-50 text-xs border border-zinc-300 rounded px-2 py-1 text-zinc-800 focus:outline-none"
          >
            <option value="ALL">All States</option>
            {config.states.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-zinc-50 text-xs pl-7 pr-2 py-1 rounded border border-zinc-300 text-zinc-800 focus:outline-none w-28"
            />
          </div>

          {!readOnly && (
            <button
              onClick={() => setShowAddRow(!showAddRow)}
              className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>

      {showAddRow && (
        <div className="mb-3 p-2 bg-zinc-50 border border-zinc-300 rounded-md flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-zinc-600 font-sans font-semibold">δ(</span>
          <input
            type="text"
            value={newFrom}
            onChange={(e) => setNewFrom(e.target.value)}
            placeholder="q0"
            className="w-16 bg-white border border-zinc-300 rounded px-1.5 py-0.5 text-center text-zinc-800"
          />
          <span className="text-zinc-400">,</span>
          <input
            type="text"
            maxLength={1}
            value={newRead}
            onChange={(e) => setNewRead(e.target.value)}
            placeholder="sym"
            className="w-10 bg-white border border-zinc-300 rounded px-1.5 py-0.5 text-center text-zinc-800"
          />
          <span className="text-zinc-600 font-sans font-semibold">) = (</span>
          <input
            type="text"
            value={newTo}
            onChange={(e) => setNewTo(e.target.value)}
            placeholder="q1"
            className="w-16 bg-white border border-zinc-300 rounded px-1.5 py-0.5 text-center text-zinc-800"
          />
          <span className="text-zinc-400">,</span>
          <input
            type="text"
            maxLength={1}
            value={newWrite}
            onChange={(e) => setNewWrite(e.target.value)}
            placeholder="sym"
            className="w-10 bg-white border border-zinc-300 rounded px-1.5 py-0.5 text-center text-zinc-800"
          />
          <span className="text-zinc-400">,</span>
          <select
            value={newDir}
            onChange={(e) => setNewDir(e.target.value as any)}
            className="bg-white border border-zinc-300 rounded px-1 py-0.5 text-zinc-800"
          >
            <option value="L">L</option>
            <option value="R">R</option>
            <option value="S">S</option>
          </select>
          <span className="text-zinc-600 font-sans font-semibold">)</span>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={handleCreate}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded font-sans text-xs font-semibold"
            >
              Save
            </button>
            <button
              onClick={() => setShowAddRow(false)}
              className="px-2 py-1 bg-white border border-zinc-300 text-zinc-700 rounded font-sans text-xs hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto max-h-[300px] border border-zinc-200 rounded-lg scrollbar-thin">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead className="bg-zinc-50 text-zinc-500 sticky top-0 z-10 border-b border-zinc-200 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="py-2 px-3">State (q)</th>
              <th className="py-2 px-3">Read (σ)</th>
              <th className="py-2 px-3">Next State (q')</th>
              <th className="py-2 px-3">Write (σ')</th>
              <th className="py-2 px-3">Move (D)</th>
              {!readOnly && <th className="py-2 px-2 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {filteredTransitions.map((t) => {
              const isActive = activeTransition?.id === t.id;
              return (
                <tr
                  key={t.id}
                  className={`
                    transition-colors duration-100
                    ${isActive
                      ? 'bg-blue-50/90 text-blue-900 font-bold border-l-4 border-blue-600'
                      : 'hover:bg-zinc-50 text-zinc-700'
                    }
                  `}
                >
                  <td className="py-1.5 px-3">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200 font-semibold">
                      {t.fromState}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 font-bold text-zinc-900">{t.readSymbol}</td>
                  <td className="py-1.5 px-3">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200 font-semibold">
                      {t.toState}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 font-bold text-blue-700">{t.writeSymbol}</td>
                  <td className="py-1.5 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      t.direction === 'R' ? 'bg-zinc-100 text-zinc-700 border border-zinc-200' :
                      t.direction === 'L' ? 'bg-zinc-100 text-zinc-700 border border-zinc-200' :
                      'bg-zinc-100 text-zinc-600'
                    }`}>
                      {t.direction === 'R' ? '→ Right' : t.direction === 'L' ? '← Left' : 'Stay'}
                    </span>
                  </td>
                  {!readOnly && (
                    <td className="py-1.5 px-2 text-right">
                      <button
                        onClick={() => onDeleteTransition(t.id)}
                        className="p-1 text-zinc-400 hover:text-rose-600 transition-colors"
                        title="Delete transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {filteredTransitions.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-zinc-400 font-sans text-xs">
                  No transitions match the filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
