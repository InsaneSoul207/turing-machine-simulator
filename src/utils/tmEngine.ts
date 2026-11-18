import { TuringMachineConfig, Transition, MachineStatus, StepRecord, Direction } from '../types/tm';

/**
 * Normalizes tape symbol: if empty string or undefined, returns blank symbol.
 */
export function getTapeSymbol(tape: Record<number, string>, index: number, blankSymbol: string): string {
  const val = tape[index];
  return (val === undefined || val === '') ? blankSymbol : val;
}

/**
 * Initializes a tape record from an input string starting at index 0.
 */
export function initializeTape(input: string, blankSymbol: string): Record<number, string> {
  const tape: Record<number, string> = {};
  if (!input || input.trim() === '') {
    tape[0] = blankSymbol;
    return tape;
  }
  for (let i = 0; i < input.length; i++) {
    tape[i] = input[i];
  }
  return tape;
}

/**
 * Calculates current visible bounds of the tape, ensuring padding around head.
 */
export function getTapeBounds(
  tape: Record<number, string>,
  headIndex: number,
  padding: number = 7
): { min: number; max: number } {
  const keys = Object.keys(tape).map(Number);
  const minKey = keys.length > 0 ? Math.min(...keys) : 0;
  const maxKey = keys.length > 0 ? Math.max(...keys) : 0;

  const min = Math.min(minKey, headIndex) - padding;
  const max = Math.max(maxKey, headIndex) + padding;
  return { min, max };
}

/**
 * Generates formal Instantaneous Description (ID) string, e.g. "a b q1 c d"
 * In Automata Theory: u q v means tape content is uv, head is over first symbol of v, in state q.
 */
export function formatInstantaneousDescription(
  tape: Record<number, string>,
  headIndex: number,
  currentState: string,
  blankSymbol: string
): string {
  const keys = Object.keys(tape).map(Number).filter(k => tape[k] !== blankSymbol && tape[k] !== undefined);
  const minIdx = keys.length > 0 ? Math.min(Math.min(...keys), headIndex) : headIndex;
  const maxIdx = keys.length > 0 ? Math.max(Math.max(...keys), headIndex) : headIndex;

  let left = '';
  for (let i = minIdx; i < headIndex; i++) {
    left += getTapeSymbol(tape, i, blankSymbol);
  }

  const headSymbol = getTapeSymbol(tape, headIndex, blankSymbol);

  let right = '';
  for (let i = headIndex + 1; i <= maxIdx; i++) {
    right += getTapeSymbol(tape, i, blankSymbol);
  }

  // Left trim unnecessary leading blanks, right trim trailing blanks
  const cleanLeft = left.replace(new RegExp(`^\\${blankSymbol}+`), '');
  const cleanRight = right.replace(new RegExp(`\\${blankSymbol}+$`), '');

  return `${cleanLeft || 'ε'} [${currentState}] ${headSymbol}${cleanRight}`;
}

/**
 * Looks up matching transition for a given state and tape symbol.
 * Supports wildcard '*' if defined.
 */
export function findTransition(
  transitions: Transition[],
  state: string,
  symbol: string
): Transition | null {
  const exact = transitions.find(t => t.fromState === state && t.readSymbol === symbol);
  if (exact) return exact;

  const wildcard = transitions.find(t => t.fromState === state && t.readSymbol === '*');
  return wildcard || null;
}

/**
 * Execute one single step on the machine.
 */
export function executeStep(
  config: TuringMachineConfig,
  currentState: string,
  headIndex: number,
  tape: Record<number, string>,
  currentStepNumber: number
): StepRecord {
  const blank = config.blankSymbol || '_';
  const readSym = getTapeSymbol(tape, headIndex, blank);

  // Check terminal conditions first
  if (config.acceptStates.includes(currentState)) {
    return {
      step: currentStepNumber,
      state: currentState,
      headIndex,
      readSymbol: readSym,
      tapeSnapshot: { ...tape },
      transitionUsed: null,
      instantaneousDescription: formatInstantaneousDescription(tape, headIndex, currentState, blank),
      actionSummary: `Machine reached Accept State [${currentState}]. Computation finished.`,
      status: 'ACCEPTED'
    };
  }

  if (config.rejectStates.includes(currentState)) {
    return {
      step: currentStepNumber,
      state: currentState,
      headIndex,
      readSymbol: readSym,
      tapeSnapshot: { ...tape },
      transitionUsed: null,
      instantaneousDescription: formatInstantaneousDescription(tape, headIndex, currentState, blank),
      actionSummary: `Machine reached Reject State [${currentState}]. Input rejected.`,
      status: 'REJECTED'
    };
  }

  const transition = findTransition(config.transitions, currentState, readSym);

  if (!transition) {
    // No transition exists for (currentState, readSym) -> standard TOC behavior is Halt / Reject
    const isAccepted = config.acceptStates.includes(currentState);
    const finalStatus: MachineStatus = isAccepted ? 'ACCEPTED' : 'REJECTED';
    return {
      step: currentStepNumber,
      state: currentState,
      headIndex,
      readSymbol: readSym,
      tapeSnapshot: { ...tape },
      transitionUsed: null,
      instantaneousDescription: formatInstantaneousDescription(tape, headIndex, currentState, blank),
      actionSummary: isAccepted
        ? `Machine halted in Accept State [${currentState}].`
        : `No transition defined for δ(${currentState}, '${readSym}'). Machine halted → String REJECTED.`,
      status: finalStatus
    };
  }

  // Apply transition
  const newTape = { ...tape };
  const writeSym = transition.writeSymbol === '*' ? readSym : transition.writeSymbol;
  newTape[headIndex] = writeSym;

  let newHead = headIndex;
  if (transition.direction === 'R') newHead += 1;
  else if (transition.direction === 'L') newHead -= 1;
  // 'S' means stay

  const nextState = transition.toState;

  let nextStatus: MachineStatus = 'RUNNING';
  if (config.acceptStates.includes(nextState)) {
    nextStatus = 'ACCEPTED';
  } else if (config.rejectStates.includes(nextState)) {
    nextStatus = 'REJECTED';
  }

  const dirName = transition.direction === 'R' ? 'Right' : transition.direction === 'L' ? 'Left' : 'Stay';
  const actionSummary = `Read '${readSym}' at [${headIndex}] → Wrote '${writeSym}', Moved ${dirName} (${transition.direction}), State: ${currentState} → ${nextState}`;

  return {
    step: currentStepNumber + 1,
    state: nextState,
    headIndex: newHead,
    readSymbol: getTapeSymbol(newTape, newHead, blank),
    tapeSnapshot: newTape,
    transitionUsed: transition,
    instantaneousDescription: formatInstantaneousDescription(newTape, newHead, nextState, blank),
    actionSummary,
    status: nextStatus
  };
}

/**
 * Fast batch execution for testing strings against the Turing Machine.
 */
export function runBatchTest(
  config: TuringMachineConfig,
  input: string,
  maxSteps: number = 20000
): {
  status: 'accept' | 'reject' | 'halt' | 'timeout';
  steps: number;
  finalTape: string;
} {
  const blank = config.blankSymbol || '_';
  let tape = initializeTape(input, blank);
  let state = config.initialState;
  let head = 0;
  let steps = 0;

  while (steps < maxSteps) {
    if (config.acceptStates.includes(state)) {
      return { status: 'accept', steps, finalTape: stringifyTape(tape, blank) };
    }
    if (config.rejectStates.includes(state)) {
      return { status: 'reject', steps, finalTape: stringifyTape(tape, blank) };
    }

    const currentSym = getTapeSymbol(tape, head, blank);
    const transition = findTransition(config.transitions, state, currentSym);

    if (!transition) {
      // Halted without matching transition -> standard TOC rejection
      return {
        status: config.acceptStates.includes(state) ? 'accept' : 'reject',
        steps,
        finalTape: stringifyTape(tape, blank)
      };
    }

    // Write symbol
    tape[head] = transition.writeSymbol === '*' ? currentSym : transition.writeSymbol;

    // Move
    if (transition.direction === 'R') head++;
    else if (transition.direction === 'L') head--;

    // Update state
    state = transition.toState;
    steps++;
  }

  return { status: 'timeout', steps, finalTape: stringifyTape(tape, blank) };
}

/**
 * Converts tape record to a contiguous string representation without leading/trailing blanks.
 */
export function stringifyTape(tape: Record<number, string>, blankSymbol: string): string {
  const keys = Object.keys(tape).map(Number).filter(k => tape[k] !== blankSymbol && tape[k] !== undefined);
  if (keys.length === 0) return '';
  const min = Math.min(...keys);
  const max = Math.max(...keys);
  let res = '';
  for (let i = min; i <= max; i++) {
    res += getTapeSymbol(tape, i, blankSymbol);
  }
  return res;
}
