import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Sparkles, Cpu, AlertTriangle, CheckCircle2,
  RefreshCw, ChevronDown, Loader2, StopCircle, Zap,
  ArrowRight, BookmarkPlus, HelpCircle, Code, Layers, Check,
  Brain
} from 'lucide-react';
import { TuringMachineConfig } from '../types/tm';
import {
  checkOllama,
  fetchOllamaModels,
  streamFromOllama,
  streamFromOpenAICompat,
  buildTuringMachinePrompt,
  findMatchingTemplate,
  OllamaModelInfo,
  DEFAULT_OLLAMA_ENDPOINT
} from '../utils/aiService';
import { parseDSLToConfig } from '../utils/parser';

interface AIGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadConfig: (config: TuringMachineConfig) => void;
  onSaveAsPreset?: (config: TuringMachineConfig) => void;
}

type ProviderMode = 'ollama' | 'cloud' | 'instant';

const CURATED_PROBLEMS = [
  {
    category: 'Language Recognition',
    problems: [
      { label: 'Equal 0s and 1s', prompt: 'Turing Machine for strings over {0,1} having an equal number of 0s and 1s' },
      { label: 'Binary Palindrome', prompt: 'Turing Machine to recognize binary palindromes where w = w^R' },
      { label: 'Substring "aba"', prompt: 'Turing machine that accepts all strings containing the substring "aba" over {a,b}' },
      { label: 'Even number of 0s', prompt: 'Turing machine that accepts binary strings with an even number of 0s' }
    ]
  },
  {
    category: 'Arithmetic & Transducers',
    problems: [
      { label: "Two's Complement", prompt: "Turing Machine transducer to compute the 2's complement of an unsigned binary number" },
      { label: 'Binary Increment (+1)', prompt: 'Turing Machine that adds 1 to an unsigned binary number on tape' }
    ]
  }
];

export const AIGeneratorModal: React.FC<AIGeneratorModalProps> = ({
  isOpen,
  onClose,
  onLoadConfig,
  onSaveAsPreset
}) => {
  const [provider, setProvider] = useState<ProviderMode>('instant');
  const [ollamaEndpoint, setOllamaEndpoint] = useState<string>(DEFAULT_OLLAMA_ENDPOINT);
  const [ollamaHealthy, setOllamaHealthy] = useState<boolean>(false);
  const [checkingOllama, setCheckingOllama] = useState<boolean>(false);
  const [ollamaModels, setOllamaModels] = useState<OllamaModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  
  // Cloud API settings
  const [cloudEndpoint, setCloudEndpoint] = useState<string>('https://api.openai.com/v1');
  const [cloudApiKey, setCloudApiKey] = useState<string>('');
  const [cloudModel, setCloudModel] = useState<string>('gpt-4o-mini');

  // Input & Generation State
  const [problemInput, setProblemInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [streamedDSL, setStreamedDSL] = useState<string>('');
  const [generationError, setGenerationError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'preview' | 'dsl'>('preview');
  const [copiedPresetSuccess, setCopiedPresetSuccess] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const dslRef = useRef<HTMLTextAreaElement>(null);

  // Check matching template
  const matchedTemplate = findMatchingTemplate(problemInput);

  // Clean raw stream to remove thinking tags (<think>...</think>)
  const cleanDSL = React.useMemo(() => {
    let text = streamedDSL;
    // If text contains unclosed <think>, everything after <think> is thinking
    if (text.includes('<think>') && !text.includes('</think>')) {
      return '';
    }
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    text = text.replace(/```[a-z]*\n?/gi, '');
    return text.trim();
  }, [streamedDSL]);

  // Parse streamed DSL in real-time
  const parseResult = parseDSLToConfig(cleanDSL || streamedDSL.trim(), 'ai_generated');
  const isValidConfig = parseResult.config && parseResult.errors.length === 0;

  // Check Ollama health on open
  const checkLocalOllama = useCallback(async () => {
    setCheckingOllama(true);
    const healthy = await checkOllama(ollamaEndpoint);
    setOllamaHealthy(healthy);
    if (healthy) {
      try {
        const models = await fetchOllamaModels(ollamaEndpoint);
        setOllamaModels(models);
        if (models.length > 0) {
          // Auto-select preferred non-thinking model if available, or first
          const preferred = models.find(m =>
            m.name.includes('llama3.1') || m.name.includes('qwen') || m.name.includes('mistral') || m.name.includes('deepseek')
          );
          setSelectedModel(preferred?.name || models[0].name);
        }
      } catch {
        // ignore error fetching models
      }
    }
    setCheckingOllama(false);
  }, [ollamaEndpoint]);

  useEffect(() => {
    if (isOpen) {
      checkLocalOllama();
      setCopiedPresetSuccess(false);
    }
  }, [isOpen, checkLocalOllama]);

  // Auto-scroll DSL view as it streams
  useEffect(() => {
    if (dslRef.current) {
      dslRef.current.scrollTop = dslRef.current.scrollHeight;
    }
  }, [cleanDSL]);

  // Handle Generate
  const handleGenerate = async (forceInstant: boolean = false) => {
    if (!problemInput.trim() || isGenerating) return;

    setGenerationError('');
    setIsGenerating(true);
    setIsThinking(false);

    // 1. If instant requested or matched template exists and instant mode
    if (forceInstant || provider === 'instant') {
      const matched = findMatchingTemplate(problemInput);
      if (matched) {
        setStreamedDSL(matched);
        setIsGenerating(false);
        setActiveTab('preview');
        return;
      }
    }

    setStreamedDSL('');
    abortControllerRef.current = new AbortController();

    // Safety timeout after 25 seconds
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        setGenerationError('Generation timed out. Switched to verified solution.');
        const fallback = findMatchingTemplate(problemInput);
        if (fallback) setStreamedDSL(fallback);
        setIsGenerating(false);
        setIsThinking(false);
      }
    }, 25000);

    try {
      const prompt = buildTuringMachinePrompt(problemInput.trim());

      if (provider === 'ollama') {
        if (!selectedModel) {
          throw new Error('Please select an Ollama model, or click Instant Verified Solution.');
        }

        let accumulated = '';
        await streamFromOllama(
          ollamaEndpoint,
          selectedModel,
          prompt,
          (chunk, isDone) => {
            accumulated += chunk;
            if (accumulated.includes('<think>') && !accumulated.includes('</think>')) {
              setIsThinking(true);
            } else {
              setIsThinking(false);
            }
            setStreamedDSL(accumulated);
            if (isDone) {
              setIsGenerating(false);
              setIsThinking(false);
            }
          },
          abortControllerRef.current.signal
        );
      } else if (provider === 'cloud') {
        if (!cloudApiKey.trim()) {
          throw new Error('Please enter an API Key for cloud generation.');
        }
        let accumulated = '';
        await streamFromOpenAICompat(
          cloudEndpoint,
          cloudApiKey.trim(),
          cloudModel.trim(),
          prompt,
          (chunk, isDone) => {
            accumulated += chunk;
            setStreamedDSL(accumulated);
            if (isDone) {
              setIsGenerating(false);
            }
          },
          abortControllerRef.current.signal
        );
      } else {
        const matched = findMatchingTemplate(problemInput);
        if (matched) {
          setStreamedDSL(matched);
        } else {
          throw new Error('No template matched. Select Local Ollama or Cloud API for custom generation.');
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User stopped generation
      } else {
        setGenerationError(err.message || 'Generation failed');
        const fallback = findMatchingTemplate(problemInput);
        if (fallback) {
          setStreamedDSL(fallback);
        }
      }
    } finally {
      clearTimeout(timeoutId);
      setIsGenerating(false);
      setIsThinking(false);
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
    setIsThinking(false);
  };

  const handleLoad = () => {
    if (isValidConfig && parseResult.config) {
      onLoadConfig({
        ...parseResult.config,
        id: `ai_${Date.now()}`
      });
      onClose();
    }
  };

  const handleSavePreset = () => {
    if (isValidConfig && parseResult.config && onSaveAsPreset) {
      onSaveAsPreset({
        ...parseResult.config,
        id: `preset_ai_${Date.now()}`,
        isCustom: true
      });
      setCopiedPresetSuccess(true);
      setTimeout(() => setCopiedPresetSuccess(false), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-900/50 backdrop-blur-xs">
      <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-5xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                AI Turing Machine Architect
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700">
                  Automata Theory
                </span>
              </h2>
              <p className="text-xs text-zinc-500">
                Write any formal language or computational problem → Generates complete 7-tuple and transitions
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

        {/* Engine / Provider Tabs */}
        <div className="px-5 py-2 border-b border-zinc-200 bg-zinc-50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 p-0.5 bg-zinc-200/70 rounded-lg">
            <button
              onClick={() => setProvider('instant')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                provider === 'instant'
                  ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Instant 0s Library ⚡
            </button>
            <button
              onClick={() => setProvider('ollama')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                provider === 'ollama'
                  ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Local Ollama {ollamaHealthy && '🟢'}
            </button>
            <button
              onClick={() => setProvider('cloud')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                provider === 'cloud'
                  ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Cloud API (OpenAI/Groq)
            </button>
          </div>

          {/* Provider Specific Configuration Bar */}
          {provider === 'ollama' && (
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-[11px]">Model:</span>
              {ollamaHealthy && ollamaModels.length > 0 ? (
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-white border border-zinc-300 rounded px-2 py-1 text-xs font-medium text-zinc-800 cursor-pointer"
                >
                  {ollamaModels.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name} {m.details?.parameter_size ? `(${m.details.parameter_size})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-rose-600 flex items-center gap-1 text-[11px]">
                  <AlertTriangle className="w-3 h-3" /> Ollama not running at localhost:11434
                </span>
              )}
              <button
                onClick={checkLocalOllama}
                disabled={checkingOllama}
                className="p-1 rounded text-zinc-500 hover:text-zinc-900 transition-colors"
                title="Refresh Ollama connection"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingOllama ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}

          {provider === 'cloud' && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="password"
                placeholder="API Key (Bearer)"
                value={cloudApiKey}
                onChange={(e) => setCloudApiKey(e.target.value)}
                className="px-2 py-1 rounded border border-zinc-300 bg-white text-xs w-36"
              />
              <input
                type="text"
                placeholder="Model (e.g. gpt-4o-mini)"
                value={cloudModel}
                onChange={(e) => setCloudModel(e.target.value)}
                className="px-2 py-1 rounded border border-zinc-300 bg-white text-xs w-28 font-mono"
              />
            </div>
          )}
        </div>

        {/* Modal Main Body (2 Columns: Problem Input on Left, Live Result on Right) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200 overflow-hidden">
          
          {/* Left Column (Input & Quick Prompts, 5 cols) */}
          <div className="lg:col-span-5 p-4 flex flex-col gap-3.5 overflow-y-auto">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
                Problem Description
              </label>
              <textarea
                value={problemInput}
                onChange={(e) => setProblemInput(e.target.value)}
                placeholder="Describe your Turing Machine problem in plain English...&#10;&#10;e.g.:&#10;• 'Design a TM for strings over {a,b,c} with equal count of a, b, c'&#10;• 'TM that checks if binary string is palindrome'&#10;• 'Compute 2s complement of a binary number'"
                className="w-full h-28 p-3 text-xs text-zinc-900 bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:bg-white focus:border-zinc-500 resize-none font-sans leading-relaxed"
                disabled={isGenerating}
              />
            </div>

            {/* Curated Problem Category Chips */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block">
                Click to load instant solution:
              </span>
              <div className="space-y-2">
                {CURATED_PROBLEMS.map((cat, idx) => (
                  <div key={idx} className="space-y-1">
                    <span className="text-[10px] font-medium text-zinc-400 block">{cat.category}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.problems.map((p, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => {
                            setProblemInput(p.prompt);
                            const match = findMatchingTemplate(p.prompt);
                            if (match) {
                              setStreamedDSL(match);
                              setActiveTab('preview');
                            }
                          }}
                          className="px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-medium border border-zinc-200 transition-colors text-left"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Error Message if any */}
            {generationError && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{generationError}</span>
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="mt-auto pt-2 space-y-2">
              {matchedTemplate && !isGenerating && (
                <button
                  onClick={() => {
                    setStreamedDSL(matchedTemplate);
                    setActiveTab('preview');
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  Load Instant Verified Solution (0s)
                </button>
              )}

              {isGenerating ? (
                <button
                  onClick={handleStop}
                  className="w-full py-2.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  <StopCircle className="w-4 h-4" /> Stop Generation
                </button>
              ) : (
                <button
                  onClick={() => handleGenerate(false)}
                  disabled={!problemInput.trim()}
                  className="w-full py-2.5 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  {provider === 'instant' ? 'Generate Solution' : 'Run AI Model'}
                </button>
              )}
            </div>
          </div>

          {/* Right Column (Generated Specification & Real-time Visualizer, 7 cols) */}
          <div className="lg:col-span-7 p-4 flex flex-col gap-3 overflow-hidden bg-zinc-50/30">
            {/* View Switcher Tabs */}
            <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    activeTab === 'preview'
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Automaton Overview
                </button>
                <button
                  onClick={() => setActiveTab('dsl')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    activeTab === 'dsl'
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  DSL / Transition Code
                </button>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-1.5 text-xs">
                {isThinking && (
                  <span className="flex items-center gap-1.5 text-violet-700 font-medium text-[11px] bg-violet-50 px-2 py-0.5 rounded border border-violet-200 animate-pulse">
                    <Brain className="w-3.5 h-3.5 text-violet-600" /> Reasoning & Designing States...
                  </span>
                )}
                {isGenerating && !isThinking && (
                  <span className="flex items-center gap-1 text-zinc-600 font-mono text-[11px]">
                    <Loader2 className="w-3 h-3 animate-spin text-zinc-900" /> Writing Transitions...
                  </span>
                )}
                {isValidConfig && !isGenerating && (
                  <span className="flex items-center gap-1 text-emerald-700 font-medium text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Valid Specification
                  </span>
                )}
              </div>
            </div>

            {/* Tab 1: Preview & Theory Breakdown */}
            {activeTab === 'preview' && (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {isThinking ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl border border-zinc-200">
                    <Brain className="w-10 h-10 mb-3 text-violet-500 animate-bounce" />
                    <p className="text-xs font-semibold text-zinc-800">AI is thinking & planning the state machine...</p>
                    <p className="text-[11px] text-zinc-400 mt-1 max-w-sm">
                      Formulating the head movement strategy and states for your problem. The transitions will appear in seconds.
                    </p>
                  </div>
                ) : !cleanDSL ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                    <Layers className="w-10 h-10 mb-2 text-zinc-300" />
                    <p className="text-xs font-medium text-zinc-600">No machine generated yet</p>
                    <p className="text-[11px] text-zinc-400 max-w-sm mt-1">
                      Type your problem statement on the left or click any quick example to generate the formal 7-tuple and transitions.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Machine Title & Algorithm Strategy Card */}
                    <div className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-zinc-900">
                          {parseResult.config?.name || 'Generated Turing Machine'}
                        </h3>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {parseResult.config?.transitions.length || 0} transitions
                        </span>
                      </div>
                      {parseResult.config?.description && (
                        <p className="text-[11px] text-zinc-600">
                          {parseResult.config.description}
                        </p>
                      )}
                      {parseResult.config?.algorithmSummary && (
                        <div className="bg-zinc-50 rounded p-2 text-[11px] text-zinc-800 border border-zinc-200/80">
                          <span className="font-semibold text-zinc-900 block mb-0.5">Algorithm Strategy:</span>
                          {parseResult.config.algorithmSummary}
                        </div>
                      )}
                    </div>

                    {/* 7-Tuple Parameters Grid */}
                    {parseResult.config && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
                          <span className="text-[10px] text-zinc-400 uppercase font-semibold block">States (Q)</span>
                          <span className="font-mono text-zinc-800 text-[11px] font-medium truncate block">
                            {parseResult.config.states.join(', ') || '∅'}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
                          <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Start (q₀)</span>
                          <span className="font-mono text-zinc-800 text-[11px] font-semibold block">
                            {parseResult.config.initialState}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
                          <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Accept (F)</span>
                          <span className="font-mono text-emerald-700 text-[11px] font-bold block">
                            {parseResult.config.acceptStates.join(', ') || '∅'}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
                          <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Reject (Q_r)</span>
                          <span className="font-mono text-rose-700 text-[11px] font-bold block">
                            {parseResult.config.rejectStates.join(', ') || '∅'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Test Cases Preview */}
                    {parseResult.config?.testCases && parseResult.config.testCases.length > 0 && (
                      <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-xs">
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-2">
                          Generated Test Cases ({parseResult.config.testCases.length}):
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {parseResult.config.testCases.map((tc, i) => (
                            <div
                              key={i}
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded border text-[11px] font-mono ${
                                tc.expected === 'accept'
                                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                                  : 'bg-rose-50/60 border-rose-200 text-rose-900'
                              }`}
                            >
                              <span className="font-bold">"{tc.input || 'ε'}"</span>
                              <span className="text-[10px] font-sans uppercase font-bold">
                                {tc.expected}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Tab 2: Raw DSL Output & Live Editor */}
            {activeTab === 'dsl' && (
              <div className="flex-1 flex flex-col min-h-0">
                <textarea
                  ref={dslRef}
                  value={cleanDSL}
                  onChange={(e) => setStreamedDSL(e.target.value)}
                  placeholder="# Transitions and machine specification will appear here..."
                  className="flex-1 w-full bg-zinc-900 text-zinc-100 p-3 rounded-lg font-mono text-xs leading-relaxed resize-none focus:outline-none scrollbar-thin"
                />
              </div>
            )}

            {/* Footer Action Buttons */}
            <div className="border-t border-zinc-200 pt-3 flex flex-wrap items-center justify-between gap-2 mt-auto">
              <div className="flex items-center gap-2">
                {onSaveAsPreset && (
                  <button
                    onClick={handleSavePreset}
                    disabled={!isValidConfig}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 disabled:opacity-40 text-zinc-700 text-xs font-medium transition-colors"
                    title="Save this machine into your presets list"
                  >
                    {copiedPresetSuccess ? (
                      <><Check className="w-3.5 h-3.5 text-emerald-600" /> Saved as Preset!</>
                    ) : (
                      <><BookmarkPlus className="w-3.5 h-3.5 text-zinc-500" /> Save as Preset</>
                    )}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLoad}
                  disabled={!isValidConfig}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white text-xs font-semibold transition-colors shadow-xs"
                >
                  Load into Simulator & Test <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
