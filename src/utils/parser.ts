import { TuringMachineConfig, Transition, Direction, TestCase } from '../types/tm';

export interface ParseResult {
  config: TuringMachineConfig | null;
  errors: string[];
  warnings: string[];
}

/**
 * Formats a machine configuration into readable text DSL.
 */
export function stringifyConfigToDSL(config: TuringMachineConfig): string {
  const lines: string[] = [];
  lines.push(`# Name: ${config.name}`);
  if (config.description) {
    lines.push(`# Description: ${config.description}`);
  }
  if (config.algorithmSummary) {
    lines.push(`# Algorithm: ${config.algorithmSummary}`);
  }
  lines.push(`initial: ${config.initialState}`);
  lines.push(`accept: ${config.acceptStates.join(', ')}`);
  if (config.rejectStates && config.rejectStates.length > 0) {
    lines.push(`reject: ${config.rejectStates.join(', ')}`);
  }
  lines.push(`blank: ${config.blankSymbol || '_'}`);
  lines.push(`default_input: ${config.defaultInput || ''}`);
  
  if (config.testCases && config.testCases.length > 0) {
    lines.push('');
    lines.push('# Test Cases');
    config.testCases.forEach(tc => {
      lines.push(`test: ${tc.input} -> ${tc.expected}${tc.description ? ` (${tc.description})` : ''}`);
    });
  }

  lines.push('');
  lines.push('# Transitions: fromState, readSymbol -> toState, writeSymbol, direction(L/R/S)');

  config.transitions.forEach(t => {
    lines.push(`${t.fromState}, ${t.readSymbol} -> ${t.toState}, ${t.writeSymbol}, ${t.direction}`);
  });

  return lines.join('\n');
}

/**
 * Parses user-provided text DSL into a TuringMachineConfig.
 */
export function parseDSLToConfig(text: string, id: string = 'custom'): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let name = 'Custom Turing Machine';
  let description = 'User-defined Turing Machine';
  let algorithmSummary = '';
  let initialState = 'q0';
  let acceptStates: string[] = [];
  let rejectStates: string[] = [];
  let blankSymbol = '_';
  let defaultInput = '';
  const testCases: TestCase[] = [];
  const transitions: Transition[] = [];
  const stateSet = new Set<string>();
  const alphabetSet = new Set<string>();
  const tapeAlphabetSet = new Set<string>();

  // Clean text from LLM thinking tags (<think>...</think>) and markdown fences
  let cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // If <think> tag is unclosed (in the middle of streaming), strip whatever is after <think>
  cleanText = cleanText.replace(/<think>[\s\S]*$/gi, '');

  const lines = cleanText.split('\n');

  lines.forEach((rawLine, lineIndex) => {
    const lineNum = lineIndex + 1;
    const line = rawLine.trim();

    if (!line) return;

    // Ignore markdown code fences
    if (line.startsWith('```')) return;

    // Comments
    if (line.startsWith('#') || line.startsWith('//')) {
      if (line.toLowerCase().includes('name:')) {
        name = line.substring(line.indexOf(':') + 1).trim();
      } else if (line.toLowerCase().includes('description:')) {
        description = line.substring(line.indexOf(':') + 1).trim();
      } else if (line.toLowerCase().includes('algorithm:') || line.toLowerCase().includes('strategy:')) {
        const algoText = line.substring(line.indexOf(':') + 1).trim();
        algorithmSummary = algorithmSummary ? `${algorithmSummary} ${algoText}` : algoText;
      }
      return;
    }

    // Directives
    const lower = line.toLowerCase();
    if (lower.startsWith('initial:')) {
      initialState = line.substring(8).trim();
      stateSet.add(initialState);
      return;
    }
    if (lower.startsWith('accept:')) {
      const rest = line.substring(7).trim();
      acceptStates = rest ? rest.split(',').map(s => s.trim()).filter(Boolean) : [];
      acceptStates.forEach(s => stateSet.add(s));
      return;
    }
    if (lower.startsWith('reject:')) {
      const rest = line.substring(7).trim();
      rejectStates = rest ? rest.split(',').map(s => s.trim()).filter(Boolean) : [];
      rejectStates.forEach(s => stateSet.add(s));
      return;
    }
    if (lower.startsWith('blank:')) {
      blankSymbol = line.substring(6).trim() || '_';
      return;
    }
    if (lower.startsWith('default_input:') || lower.startsWith('input:')) {
      defaultInput = line.substring(line.indexOf(':') + 1).trim();
      return;
    }
    if (lower.startsWith('test:')) {
      // Format: test: input -> accept (description) or test: input, accept, description
      const rawTest = line.substring(5).trim();
      let testInput = '';
      let testExpected: 'accept' | 'reject' | 'halt' = 'accept';
      let testDesc = '';

      if (rawTest.includes('->')) {
        const [left, right] = rawTest.split('->').map(s => s.trim());
        testInput = left;
        const descMatch = right.match(/\((.*?)\)/);
        if (descMatch) {
          testDesc = descMatch[1].trim();
        }
        const expClean = right.replace(/\(.*?\)/, '').trim().toLowerCase();
        if (expClean.includes('reject')) testExpected = 'reject';
        else if (expClean.includes('halt')) testExpected = 'halt';
        else testExpected = 'accept';
      } else {
        const parts = rawTest.split(',').map(s => s.trim());
        testInput = parts[0] || '';
        const expClean = (parts[1] || 'accept').toLowerCase();
        testExpected = expClean.includes('reject') ? 'reject' : expClean.includes('halt') ? 'halt' : 'accept';
        testDesc = parts[2] || '';
      }

      testCases.push({
        id: `tc_${testCases.length + 1}_${Date.now()}`,
        input: testInput,
        expected: testExpected,
        description: testDesc || (testExpected === 'accept' ? 'Valid input' : 'Invalid input')
      });
      return;
    }

    // Transition rule parsing
    // Standard format: q0, a -> q1, X, R
    // or: q0, a, q1, X, R
    // or: (q0, a) = (q1, X, R)
    let parts: string[] = [];
    if (line.includes('->')) {
      const [left, right] = line.split('->');
      const leftParts = left.split(',').map(s => s.trim());
      const rightParts = right.split(',').map(s => s.trim());
      parts = [...leftParts, ...rightParts];
    } else if (line.includes('=')) {
      const clean = line.replace(/[()]/g, '');
      const [left, right] = clean.split('=');
      const leftParts = left.split(',').map(s => s.trim());
      const rightParts = right.split(',').map(s => s.trim());
      parts = [...leftParts, ...rightParts];
    } else {
      parts = line.split(',').map(s => s.trim());
    }

    if (parts.length < 5) {
      errors.push(`Line ${lineNum}: Invalid transition format. Expected 'state, read -> nextState, write, dir'. Found: "${line}"`);
      return;
    }

    const [fromState, readSymbol, toState, writeSymbol, dirRaw] = parts;
    const direction = dirRaw.toUpperCase() as Direction;

    if (!['L', 'R', 'S'].includes(direction)) {
      errors.push(`Line ${lineNum}: Invalid direction '${dirRaw}'. Must be L, R, or S.`);
      return;
    }

    // Check for duplicate deterministic transition
    const duplicate = transitions.find(t => t.fromState === fromState && t.readSymbol === readSymbol);
    if (duplicate) {
      warnings.push(`Line ${lineNum}: Non-deterministic or duplicate transition detected for δ(${fromState}, '${readSymbol}'). Latest transition will be used.`);
    }

    stateSet.add(fromState);
    stateSet.add(toState);
    if (readSymbol !== blankSymbol && readSymbol !== '*') {
      alphabetSet.add(readSymbol);
    }
    tapeAlphabetSet.add(readSymbol);
    tapeAlphabetSet.add(writeSymbol);

    transitions.push({
      id: `rule_${lineNum}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      fromState,
      readSymbol,
      toState,
      writeSymbol,
      direction
    });
  });

  if (!initialState) {
    errors.push('Initial state is not defined. Use "initial: q0"');
  }

  if (acceptStates.length === 0) {
    warnings.push('No accept states defined. The machine may halt only on undefined transitions.');
  }

  tapeAlphabetSet.add(blankSymbol);

  const config: TuringMachineConfig = {
    id,
    name,
    description,
    algorithmSummary: algorithmSummary || undefined,
    states: Array.from(stateSet),
    alphabet: Array.from(alphabetSet),
    tapeAlphabet: Array.from(tapeAlphabetSet),
    initialState,
    blankSymbol,
    acceptStates,
    rejectStates,
    transitions,
    defaultInput,
    testCases
  };

  return { config, errors, warnings };
}

/**
 * Validates JSON structure of TuringMachineConfig.
 */
export function validateJSONConfig(jsonStr: string): ParseResult {
  try {
    const parsed = JSON.parse(jsonStr) as TuringMachineConfig;
    if (!parsed.initialState || !Array.isArray(parsed.transitions)) {
      return { config: null, errors: ['Invalid JSON: missing initialState or transitions array.'], warnings: [] };
    }
    return { config: parsed, errors: [], warnings: [] };
  } catch (err: any) {
    return { config: null, errors: [`JSON parse error: ${err.message}`], warnings: [] };
  }
}
