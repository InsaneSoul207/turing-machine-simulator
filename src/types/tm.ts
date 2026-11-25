export type Direction = 'L' | 'R' | 'S';

export interface Transition {
  id: string;
  fromState: string;
  readSymbol: string;
  toState: string;
  writeSymbol: string;
  direction: Direction;
}

export interface TestCase {
  id: string;
  input: string;
  expected: 'accept' | 'reject' | 'halt';
  description?: string;
  actual?: 'accept' | 'reject' | 'halt' | 'timeout' | 'error';
  passed?: boolean;
  stepsCount?: number;
  finalTape?: string;
}

export interface TuringMachineConfig {
  id: string;
  name: string;
  description: string;
  states: string[];
  alphabet: string[]; // Input alphabet Sigma
  tapeAlphabet: string[]; // Tape alphabet Gamma
  initialState: string;
  blankSymbol: string; // usually '_' or '␣'
  acceptStates: string[];
  rejectStates: string[];
  transitions: Transition[];
  defaultInput: string;
  testCases: TestCase[];
  isCustom?: boolean;
  category?: string;
  createdAt?: number;
  algorithmSummary?: string;
}

export type MachineStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'ACCEPTED' | 'REJECTED' | 'HALTED' | 'TIMEOUT';

export interface TapeCell {
  index: number;
  symbol: string;
}

export interface StepRecord {
  step: number;
  state: string;
  headIndex: number;
  readSymbol: string;
  tapeSnapshot: Record<number, string>;
  transitionUsed: Transition | null;
  instantaneousDescription: string;
  actionSummary: string;
  status: MachineStatus;
}
