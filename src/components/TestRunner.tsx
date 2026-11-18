import React, { useState } from 'react';
import { TuringMachineConfig, TestCase } from '../types/tm';
import { runBatchTest } from '../utils/tmEngine';
import { CheckCircle2, XCircle, Play, Plus, Trash2, ArrowUpRight } from 'lucide-react';

interface TestRunnerProps {
  config: TuringMachineConfig;
  onLoadTestCase: (input: string) => void;
  onUpdateTestCases: (testCases: TestCase[]) => void;
}

export const TestRunner: React.FC<TestRunnerProps> = ({
  config,
  onLoadTestCase,
  onUpdateTestCases
}) => {
  const [testCases, setTestCases] = useState<TestCase[]>(config.testCases || []);
  const [isTesting, setIsTesting] = useState(false);
  const [newString, setNewString] = useState('');
  const [newExpected, setNewExpected] = useState<'accept' | 'reject' | 'halt'>('accept');
  const [newDesc, setNewDesc] = useState('');

  React.useEffect(() => {
    setTestCases(config.testCases || []);
  }, [config.id]);

  const handleRunAll = () => {
    setIsTesting(true);
    setTimeout(() => {
      const updated = testCases.map((tc) => {
        const result = runBatchTest(config, tc.input);
        const passed = result.status === tc.expected;
        return {
          ...tc,
          actual: result.status,
          passed,
          stepsCount: result.steps,
          finalTape: result.finalTape
        };
      });

      setTestCases(updated);
      onUpdateTestCases(updated);
      setIsTesting(false);
    }, 50);
  };

  const handleAddTestCase = (e: React.FormEvent) => {
    e.preventDefault();
    const newCase: TestCase = {
      id: `tc_${Date.now()}`,
      input: newString,
      expected: newExpected,
      description: newDesc.trim() || undefined
    };
    const updated = [...testCases, newCase];
    setTestCases(updated);
    onUpdateTestCases(updated);
    setNewString('');
    setNewDesc('');
  };

  const handleDeleteTestCase = (id: string) => {
    const updated = testCases.filter(tc => tc.id !== id);
    setTestCases(updated);
    onUpdateTestCases(updated);
  };

  const passedCount = testCases.filter(t => t.passed === true).length;
  const testedCount = testCases.filter(t => t.actual !== undefined).length;

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col h-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-zinc-600" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
            Validation Suite & Batch Runner
          </h3>
          {testedCount > 0 && (
            <span className={`text-[11px] px-2 py-0.5 rounded font-mono font-bold border ${
              passedCount === testedCount
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {passedCount}/{testedCount} Passed
            </span>
          )}
        </div>

        <button
          onClick={handleRunAll}
          disabled={isTesting || testCases.length === 0}
          className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white rounded text-xs font-semibold transition-colors"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isTesting ? 'Running...' : 'Run All Tests'}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[220px] border border-zinc-200 rounded-lg mb-3 scrollbar-thin">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead className="bg-zinc-50 text-zinc-500 sticky top-0 z-10 border-b border-zinc-200 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="py-2 px-3">Input</th>
              <th className="py-2 px-3">Description</th>
              <th className="py-2 px-3">Expected</th>
              <th className="py-2 px-3">Actual</th>
              <th className="py-2 px-3">Steps</th>
              <th className="py-2 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {testCases.map((tc) => {
              const isTested = tc.actual !== undefined;
              return (
                <tr key={tc.id} className="hover:bg-zinc-50 text-zinc-800">
                  <td className="py-2 px-3 font-bold text-zinc-900">
                    {tc.input === '' ? '<empty>' : tc.input}
                  </td>
                  <td className="py-2 px-3 font-sans text-zinc-500 text-[11px]">
                    {tc.description || '—'}
                  </td>
                  <td className="py-2 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border ${
                      tc.expected === 'accept'
                        ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                        : 'text-zinc-600 bg-zinc-100 border-zinc-200'
                    }`}>
                      {tc.expected}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    {isTested ? (
                      <span className={`flex items-center gap-1 font-bold ${
                        tc.passed ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {tc.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span className="uppercase text-[10px]">{tc.actual}</span>
                      </span>
                    ) : (
                      <span className="text-zinc-400 text-[11px]">Pending</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-zinc-500">
                    {tc.stepsCount !== undefined ? tc.stepsCount : '—'}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onLoadTestCase(tc.input)}
                        className="flex items-center gap-0.5 px-2 py-0.5 rounded border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 text-[10px] transition-colors"
                        title="Load into tape"
                      >
                        <span>Trace</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteTestCase(tc.id)}
                        className="p-1 text-zinc-400 hover:text-rose-600 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {testCases.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-zinc-400 font-sans text-xs">
                  No test cases defined.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleAddTestCase} className="p-2 bg-zinc-50 border border-zinc-200 rounded-lg flex flex-wrap items-center gap-2 text-xs">
        <input
          type="text"
          value={newString}
          onChange={(e) => setNewString(e.target.value)}
          placeholder="Input string (e.g. aabbcc)"
          className="flex-1 min-w-[120px] bg-white border border-zinc-300 rounded px-2.5 py-1 text-zinc-900 font-mono focus:outline-none"
        />
        <select
          value={newExpected}
          onChange={(e) => setNewExpected(e.target.value as any)}
          className="bg-white border border-zinc-300 rounded px-2 py-1 text-zinc-800 focus:outline-none"
        >
          <option value="accept">Expected: Accept</option>
          <option value="reject">Expected: Reject</option>
        </select>
        <input
          type="text"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          placeholder="Note (optional)"
          className="flex-1 min-w-[120px] bg-white border border-zinc-300 rounded px-2.5 py-1 text-zinc-800 focus:outline-none"
        />
        <button
          type="submit"
          className="flex items-center gap-1 px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded text-xs font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </form>
    </div>
  );
};
