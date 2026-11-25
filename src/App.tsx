import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TuringMachineConfig, MachineStatus, StepRecord, Transition } from './types/tm';
import { PRESETS } from './presets';
import { initializeTape, executeStep, formatInstantaneousDescription, getTapeSymbol } from './utils/tmEngine';
import { fireAcceptConfetti } from './utils/confetti';
import { Header } from './components/Header';
import { TapeVisualizer } from './components/TapeVisualizer';
import { Controls } from './components/Controls';
import { StateDiagram } from './components/StateDiagram';
import { TransitionTable } from './components/TransitionTable';
import { ExecutionLog } from './components/ExecutionLog';
import { TestRunner } from './components/TestRunner';
import { StatusBanner } from './components/StatusBanner';
import { MachineEditorModal } from './components/MachineEditorModal';
import { GuideModal } from './components/GuideModal';
import { AIGeneratorModal } from './components/AIGeneratorModal';
import { NewPresetModal } from './components/NewPresetModal';
import { Sparkles, BookmarkPlus } from 'lucide-react';

export const App: React.FC = () => {
  // Presets Library (Built-in + localStorage custom presets)
  const [presets, setPresets] = useState<TuringMachineConfig[]>(() => {
    try {
      const saved = localStorage.getItem('turing_custom_presets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return [...PRESETS, ...parsed];
        }
      }
    } catch {
      // fallback
    }
    return PRESETS;
  });

  const [config, setConfig] = useState<TuringMachineConfig>(PRESETS[0]);
  const [inputString, setInputString] = useState<string>(PRESETS[0].defaultInput || '');
  const [tape, setTape] = useState<Record<number, string>>(() =>
    initializeTape(PRESETS[0].defaultInput || '', PRESETS[0].blankSymbol || '_')
  );
  const [headIndex, setHeadIndex] = useState<number>(0);
  const [currentState, setCurrentState] = useState<string>(PRESETS[0].initialState);
  const [status, setStatus] = useState<MachineStatus>('IDLE');
  const [speedMs, setSpeedMs] = useState<number>(350);
  const [activeTransition, setActiveTransition] = useState<Transition | null>(null);

  // Execution History Stack (enables step forward, step backward / undo, and jumping)
  const [history, setHistory] = useState<StepRecord[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Modals & Tabs
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isAIOpen, setIsAIOpen] = useState<boolean>(false);
  const [isNewPresetOpen, setIsNewPresetOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'graph' | 'table' | 'tests'>('graph');

  const timerRef = useRef<number | null>(null);

  // Initialize / reset machine with current config and input string
  const resetMachine = useCallback((cfg: TuringMachineConfig = config, input: string = inputString) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const blank = cfg.blankSymbol || '_';
    const newTape = initializeTape(input, blank);
    const startState = cfg.initialState;
    const initialID = formatInstantaneousDescription(newTape, 0, startState, blank);

    const initialRecord: StepRecord = {
      step: 0,
      state: startState,
      headIndex: 0,
      readSymbol: getTapeSymbol(newTape, 0, blank),
      tapeSnapshot: newTape,
      transitionUsed: null,
      instantaneousDescription: initialID,
      actionSummary: `Initial Configuration. Head at [0], state: ${startState}.`,
      status: 'IDLE'
    };

    setTape(newTape);
    setHeadIndex(0);
    setCurrentState(startState);
    setStatus('IDLE');
    setActiveTransition(null);
    setHistory([initialRecord]);
    setCurrentStepIndex(0);
  }, [config, inputString]);

  // Initial mount
  useEffect(() => {
    resetMachine(config, inputString);
  }, []);

  // Preset switch
  const handleSelectPreset = (newPreset: TuringMachineConfig) => {
    setConfig(newPreset);
    setInputString(newPreset.defaultInput || '');
    resetMachine(newPreset, newPreset.defaultInput || '');
  };

  // Preset Add / Save
  const handleSaveNewPreset = (newPreset: TuringMachineConfig) => {
    setPresets(prev => {
      const filtered = prev.filter(p => p.id !== newPreset.id);
      const updated = [...filtered, newPreset];
      const customOnly = updated.filter(p => p.isCustom);
      try {
        localStorage.setItem('turing_custom_presets', JSON.stringify(customOnly));
      } catch {
        // storage quota
      }
      return updated;
    });

    setConfig(newPreset);
    setInputString(newPreset.defaultInput || '');
    resetMachine(newPreset, newPreset.defaultInput || '');
  };

  // Preset Delete
  const handleDeletePreset = (id: string) => {
    setPresets(prev => {
      const updated = prev.filter(p => p.id !== id);
      const customOnly = updated.filter(p => p.isCustom);
      try {
        localStorage.setItem('turing_custom_presets', JSON.stringify(customOnly));
      } catch {
        // storage quota
      }
      return updated;
    });

    if (config.id === id) {
      handleSelectPreset(PRESETS[0]);
    }
  };

  // Perform one forward simulation step
  const stepForward = useCallback((): boolean => {
    if (status === 'ACCEPTED' || status === 'REJECTED' || status === 'HALTED' || status === 'TIMEOUT') {
      return false;
    }

    const nextStepNum = currentStepIndex;
    const nextRecord = executeStep(config, currentState, headIndex, tape, nextStepNum);

    // Apply next step
    setTape(nextRecord.tapeSnapshot);
    setHeadIndex(nextRecord.headIndex);
    setCurrentState(nextRecord.state);
    setStatus(nextRecord.status);
    setActiveTransition(nextRecord.transitionUsed);

    // If we were viewing a past step in history, truncate redo branch
    const updatedHistory = history.slice(0, currentStepIndex + 1);
    updatedHistory.push(nextRecord);
    setHistory(updatedHistory);
    setCurrentStepIndex(updatedHistory.length - 1);

    if (nextRecord.status === 'ACCEPTED') {
      return false;
    }

    return nextRecord.status === 'RUNNING';
  }, [config, currentState, headIndex, tape, currentStepIndex, history, status]);

  // Step backward (Undo)
  const stepBackward = useCallback(() => {
    if (currentStepIndex <= 0) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const targetIdx = currentStepIndex - 1;
    const targetRecord = history[targetIdx];

    setTape(targetRecord.tapeSnapshot);
    setHeadIndex(targetRecord.headIndex);
    setCurrentState(targetRecord.state);
    setStatus(targetRecord.status === 'IDLE' ? 'IDLE' : 'PAUSED');
    setActiveTransition(targetRecord.transitionUsed);
    setCurrentStepIndex(targetIdx);
  }, [currentStepIndex, history]);

  // Jump to specific step in history
  const jumpToStep = (index: number) => {
    if (index < 0 || index >= history.length) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const target = history[index];
    setTape(target.tapeSnapshot);
    setHeadIndex(target.headIndex);
    setCurrentState(target.state);
    setStatus(target.status === 'ACCEPTED' ? 'ACCEPTED' : 'PAUSED');
    setActiveTransition(target.transitionUsed);
    setCurrentStepIndex(index);
  };

  // Handle typing in the input box with auto-sync when in initial state
  const handleInputChange = (val: string) => {
    setInputString(val);
    if (status === 'IDLE' || currentStepIndex === 0) {
      const blank = config.blankSymbol || '_';
      const newTape = initializeTape(val, blank);
      setTape(newTape);
      setHeadIndex(0);
      setCurrentState(config.initialState);
      const initialID = formatInstantaneousDescription(newTape, 0, config.initialState, blank);
      const initialRecord: StepRecord = {
        step: 0,
        state: config.initialState,
        headIndex: 0,
        readSymbol: getTapeSymbol(newTape, 0, blank),
        tapeSnapshot: newTape,
        transitionUsed: null,
        instantaneousDescription: initialID,
        actionSummary: `Initial Configuration. Head at [0], state: ${config.initialState}.`,
        status: 'IDLE'
      };
      setHistory([initialRecord]);
      setCurrentStepIndex(0);
    }
  };

  // Play / Pause controls
  const handlePlay = useCallback(() => {
    if (status === 'ACCEPTED' || status === 'REJECTED' || status === 'HALTED' || status === 'TIMEOUT') {
      // Re-initialize and run immediately
      resetMachine(config, inputString);
      setTimeout(() => setStatus('RUNNING'), 50);
      return;
    }
    setStatus('RUNNING');
  }, [status, resetMachine, config, inputString]);

  const handlePause = useCallback(() => {
    setStatus('PAUSED');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Interval execution runner
  useEffect(() => {
    if (status === 'RUNNING') {
      timerRef.current = window.setInterval(() => {
        const canContinue = stepForward();
        if (!canContinue) {
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, speedMs);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, speedMs, stepForward]);

  // Run to completion (Fast Forward)
  const handleRunToCompletion = () => {
    if (status === 'ACCEPTED' || status === 'REJECTED' || status === 'HALTED') return;
    let curState = currentState;
    let curHead = headIndex;
    let curTape = { ...tape };
    let curStep = currentStepIndex;
    const updatedHistory = history.slice(0, currentStepIndex + 1);

    const maxLimit = 15000;
    let iterations = 0;

    while (iterations < maxLimit) {
      const nextRecord = executeStep(config, curState, curHead, curTape, curStep);
      curTape = nextRecord.tapeSnapshot;
      curHead = nextRecord.headIndex;
      curState = nextRecord.state;
      curStep++;
      updatedHistory.push(nextRecord);
      iterations++;

      if (nextRecord.status !== 'RUNNING') {
        setTape(curTape);
        setHeadIndex(curHead);
        setCurrentState(curState);
        setStatus(nextRecord.status);
        setActiveTransition(nextRecord.transitionUsed);
        setHistory(updatedHistory);
        setCurrentStepIndex(updatedHistory.length - 1);
        return;
      }
    }

    // Safety timeout
    setTape(curTape);
    setHeadIndex(curHead);
    setCurrentState(curState);
    setStatus('TIMEOUT');
    setHistory(updatedHistory);
    setCurrentStepIndex(updatedHistory.length - 1);
  };

  // Cell direct edit
  const handleCellChange = (cellIdx: number, newSymbol: string) => {
    const newTape = { ...tape, [cellIdx]: newSymbol };
    setTape(newTape);
    // update current history snapshot
    if (history[currentStepIndex]) {
      const updatedSnapshot = { ...history[currentStepIndex].tapeSnapshot, [cellIdx]: newSymbol };
      const updatedHistory = [...history];
      updatedHistory[currentStepIndex] = {
        ...updatedHistory[currentStepIndex],
        tapeSnapshot: updatedSnapshot,
        readSymbol: cellIdx === headIndex ? newSymbol : updatedHistory[currentStepIndex].readSymbol,
        instantaneousDescription: formatInstantaneousDescription(updatedSnapshot, headIndex, currentState, config.blankSymbol || '_')
      };
      setHistory(updatedHistory);
    }
  };

  // Add transition inline
  const handleAddTransition = (newT: Transition) => {
    const updated = {
      ...config,
      transitions: [...config.transitions, newT]
    };
    setConfig(updated);
  };

  // Delete transition inline
  const handleDeleteTransition = (id: string) => {
    const updated = {
      ...config,
      transitions: config.transitions.filter(t => t.id !== id)
    };
    setConfig(updated);
  };

  // Export JSON
  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${config.id || 'turing_machine'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.initialState && Array.isArray(parsed.transitions)) {
            setConfig(parsed);
            setInputString(parsed.defaultInput || '');
            resetMachine(parsed, parsed.defaultInput || '');
          } else {
            alert('Invalid Turing Machine JSON format.');
          }
        } catch (err: any) {
          alert('Failed to parse JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (status === 'RUNNING') handlePause();
        else handlePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        stepForward();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        stepBackward();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        resetMachine();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, handlePlay, handlePause, stepForward, stepBackward, resetMachine]);

  const currentID = formatInstantaneousDescription(
    tape,
    headIndex,
    currentState,
    config.blankSymbol || '_'
  );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Header */}
      <Header
        currentConfig={config}
        presets={presets}
        onSelectPreset={handleSelectPreset}
        onOpenEditor={() => setIsEditorOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenAI={() => setIsAIOpen(true)}
        onOpenNewPreset={() => setIsNewPresetOpen(true)}
        onDeletePreset={handleDeletePreset}
        onReset={() => resetMachine()}
        onExport={handleExport}
        onImport={handleImport}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-5 space-y-4">
        {/* Machine Metadata & Active Language */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-zinc-900 font-sans">
                {config.name}
              </h2>
              {config.isCustom && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Custom Preset
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5 max-w-3xl">
              {config.description}
            </p>
            {config.algorithmSummary && (
              <p className="text-[11px] text-zinc-700 mt-1 max-w-3xl bg-zinc-100/80 px-2 py-1 rounded border border-zinc-200">
                <span className="font-semibold text-zinc-900">💡 Algorithm: </span>
                {config.algorithmSummary}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-zinc-500">Initial:</span>
            <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 font-semibold border border-zinc-200">
              {config.initialState}
            </span>
            <span className="text-zinc-500 ml-2">Accept:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
              {config.acceptStates.join(', ') || '∅'}
            </span>
            <span className="text-zinc-500 ml-2">Reject:</span>
            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 font-semibold border border-rose-200">
              {config.rejectStates.join(', ') || '∅'}
            </span>
          </div>
        </div>

        {/* Status Alert Banner */}
        <StatusBanner
          status={status}
          currentState={currentState}
          stepCount={currentStepIndex}
        />

        {/* Interactive Tape Strip */}
        <TapeVisualizer
          tape={tape}
          headIndex={headIndex}
          currentState={currentState}
          blankSymbol={config.blankSymbol || '_'}
          onCellChange={handleCellChange}
          isRunning={status === 'RUNNING'}
        />

        {/* Playback Controls & String Input */}
        <Controls
          status={status}
          currentStep={currentStepIndex}
          speedMs={speedMs}
          onSpeedChange={setSpeedMs}
          onPlay={handlePlay}
          onPause={handlePause}
          onStepForward={stepForward}
          onStepBackward={stepBackward}
          onRunToCompletion={handleRunToCompletion}
          onReset={() => resetMachine()}
          canStepBackward={currentStepIndex > 0}
          canStepForward={status !== 'ACCEPTED' && status !== 'REJECTED' && status !== 'HALTED' && status !== 'TIMEOUT'}
          inputString={inputString}
          onInputChange={handleInputChange}
          onApplyInput={() => resetMachine(config, inputString)}
        />

        {/* Multi-Pane Diagnostic Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Side: State Diagram / Transition Table / Tests Tabs (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-2.5">
            {/* Tab navigation */}
            <div className="flex items-center gap-1 p-1 bg-zinc-200/70 border border-zinc-200 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab('graph')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'graph'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                State Graph
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'table'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Transition Table ({config.transitions.length})
              </button>
              <button
                onClick={() => setActiveTab('tests')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'tests'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Validation Suite ({config.testCases?.length || 0})
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 min-h-[340px]">
              {activeTab === 'graph' && (
                <StateDiagram
                  config={config}
                  currentState={currentState}
                  activeTransition={activeTransition}
                />
              )}
              {activeTab === 'table' && (
                <TransitionTable
                  config={config}
                  activeTransition={activeTransition}
                  onAddTransition={handleAddTransition}
                  onDeleteTransition={handleDeleteTransition}
                />
              )}
              {activeTab === 'tests' && (
                <TestRunner
                  config={config}
                  onLoadTestCase={(input) => {
                    setInputString(input);
                    resetMachine(config, input);
                  }}
                  onUpdateTestCases={(newTests) => {
                    setConfig(prev => ({ ...prev, testCases: newTests }));
                  }}
                />
              )}
            </div>
          </div>

          {/* Right Side: Step-by-Step Execution Log & ID (5 cols) */}
          <div className="lg:col-span-5 flex flex-col min-h-[340px]">
            <ExecutionLog
              history={history}
              currentStepIndex={currentStepIndex}
              onJumpToStep={jumpToStep}
              instantaneousDescription={currentID}
            />
          </div>
        </div>
      </main>

      {/* Dynamic Machine DSL Editor Modal */}
      <MachineEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        currentConfig={config}
        onSaveConfig={(newConfig) => {
          setConfig(newConfig);
          setInputString(newConfig.defaultInput || '');
          resetMachine(newConfig, newConfig.defaultInput || '');
        }}
        onSaveAsPreset={handleSaveNewPreset}
      />

      {/* New Preset Creator Modal */}
      <NewPresetModal
        isOpen={isNewPresetOpen}
        onClose={() => setIsNewPresetOpen(false)}
        currentConfig={config}
        onSavePreset={handleSaveNewPreset}
      />

      {/* AI Turing Machine Architect Modal */}
      <AIGeneratorModal
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        onLoadConfig={(newConfig) => {
          setConfig(newConfig);
          setInputString(newConfig.defaultInput || '');
          resetMachine(newConfig, newConfig.defaultInput || '');
        }}
        onSaveAsPreset={handleSaveNewPreset}
      />

      {/* TOC Theory & Operation Guide Modal */}
      <GuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-200 bg-white py-3 px-6 text-center text-xs text-zinc-500">
        Automata Theory & Computability Turing Machine Simulator • Built with React, TypeScript & Tailwind CSS
      </footer>
    </div>
  );
};
