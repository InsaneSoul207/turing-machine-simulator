import { TuringMachineConfig } from '../types/tm';

export const PRESETS: TuringMachineConfig[] = [
  {
    id: 'an_bn_cn',
    name: 'L = {aⁿ bⁿ cⁿ | n ≥ 1}',
    description: 'Classic Non-Context-Free Language recognized by Turing Machine. Matches equal counts of a, b, and c in order.',
    states: ['q0', 'q1', 'q2', 'q3', 'q4', 'Q_a', 'Q_r'],
    alphabet: ['a', 'b', 'c'],
    tapeAlphabet: ['a', 'b', 'c', 'X', 'Y', 'Z', '_'],
    initialState: 'q0',
    blankSymbol: '_',
    acceptStates: ['Q_a'],
    rejectStates: ['Q_r'],
    defaultInput: 'aabbcc',
    transitions: [
      // q0: Start of a round. Replace 'a' with 'X', search for matching 'b'
      { id: 't1', fromState: 'q0', readSymbol: 'a', toState: 'q1', writeSymbol: 'X', direction: 'R' },
      { id: 't2', fromState: 'q0', readSymbol: 'Y', toState: 'q4', writeSymbol: 'Y', direction: 'R' }, // All 'a's processed

      // q1: Skip remaining 'a's and marked 'Y's to find first 'b'
      { id: 't3', fromState: 'q1', readSymbol: 'a', toState: 'q1', writeSymbol: 'a', direction: 'R' },
      { id: 't4', fromState: 'q1', readSymbol: 'Y', toState: 'q1', writeSymbol: 'Y', direction: 'R' },
      { id: 't5', fromState: 'q1', readSymbol: 'b', toState: 'q2', writeSymbol: 'Y', direction: 'R' },

      // q2: Skip remaining 'b's and marked 'Z's to find first 'c'
      { id: 't6', fromState: 'q2', readSymbol: 'b', toState: 'q2', writeSymbol: 'b', direction: 'R' },
      { id: 't7', fromState: 'q2', readSymbol: 'Z', toState: 'q2', writeSymbol: 'Z', direction: 'R' },
      { id: 't8', fromState: 'q2', readSymbol: 'c', toState: 'q3', writeSymbol: 'Z', direction: 'L' },

      // q3: Rewind left past Z, b, Y, a to return back to most recent X
      { id: 't9', fromState: 'q3', readSymbol: 'Z', toState: 'q3', writeSymbol: 'Z', direction: 'L' },
      { id: 't10', fromState: 'q3', readSymbol: 'b', toState: 'q3', writeSymbol: 'b', direction: 'L' },
      { id: 't11', fromState: 'q3', readSymbol: 'Y', toState: 'q3', writeSymbol: 'Y', direction: 'L' },
      { id: 't12', fromState: 'q3', readSymbol: 'a', toState: 'q3', writeSymbol: 'a', direction: 'L' },
      { id: 't13', fromState: 'q3', readSymbol: 'X', toState: 'q0', writeSymbol: 'X', direction: 'R' },

      // q4: Verify remaining symbols are only Y's and Z's, followed by blank
      { id: 't14', fromState: 'q4', readSymbol: 'Y', toState: 'q4', writeSymbol: 'Y', direction: 'R' },
      { id: 't15', fromState: 'q4', readSymbol: 'Z', toState: 'q4', writeSymbol: 'Z', direction: 'R' },
      { id: 't16', fromState: 'q4', readSymbol: '_', toState: 'Q_a', writeSymbol: '_', direction: 'S' }
    ],
    testCases: [
      { id: 'tc1', input: 'abc', expected: 'accept', description: 'n = 1 (valid)' },
      { id: 'tc2', input: 'aabbcc', expected: 'accept', description: 'n = 2 (valid)' },
      { id: 'tc3', input: 'aaabbbccc', expected: 'accept', description: 'n = 3 (valid)' },
      { id: 'tc4', input: 'ab', expected: 'reject', description: 'Missing c (invalid)' },
      { id: 'tc5', input: 'aabbc', expected: 'reject', description: 'Unequal counts (invalid)' },
      { id: 'tc6', input: 'ba', expected: 'reject', description: 'Wrong symbol order (invalid)' }
    ]
  },
  {
    id: 'palindrome_binary',
    name: 'Binary Palindromes {w = wᴿ | w ∈ {0,1}*}',
    description: 'Decides whether a binary string reads identically forwards and backwards (both even and odd lengths).',
    states: ['q0', 'q_have0', 'q_have1', 'q_match0', 'q_match1', 'q_rewind', 'Q_a'],
    alphabet: ['0', '1'],
    tapeAlphabet: ['0', '1', '_'],
    initialState: 'q0',
    blankSymbol: '_',
    acceptStates: ['Q_a'],
    rejectStates: [],
    defaultInput: '10101',
    transitions: [
      // q0: Read outermost left symbol
      { id: 'p1', fromState: 'q0', readSymbol: '0', toState: 'q_have0', writeSymbol: '_', direction: 'R' },
      { id: 'p2', fromState: 'q0', readSymbol: '1', toState: 'q_have1', writeSymbol: '_', direction: 'R' },
      { id: 'p3', fromState: 'q0', readSymbol: '_', toState: 'Q_a', writeSymbol: '_', direction: 'S' }, // Empty or single char left

      // q_have0: Moving right to end of tape
      { id: 'p4', fromState: 'q_have0', readSymbol: '0', toState: 'q_have0', writeSymbol: '0', direction: 'R' },
      { id: 'p5', fromState: 'q_have0', readSymbol: '1', toState: 'q_have0', writeSymbol: '1', direction: 'R' },
      { id: 'p6', fromState: 'q_have0', readSymbol: '_', toState: 'q_match0', writeSymbol: '_', direction: 'L' },

      // q_match0: Checking rightmost symbol
      { id: 'p7', fromState: 'q_match0', readSymbol: '0', toState: 'q_rewind', writeSymbol: '_', direction: 'L' },
      { id: 'p8', fromState: 'q_match0', readSymbol: '_', toState: 'Q_a', writeSymbol: '_', direction: 'S' }, // Single symbol odd palindrome

      // q_have1: Moving right to end of tape
      { id: 'p9', fromState: 'q_have1', readSymbol: '0', toState: 'q_have1', writeSymbol: '0', direction: 'R' },
      { id: 'p10', fromState: 'q_have1', readSymbol: '1', toState: 'q_have1', writeSymbol: '1', direction: 'R' },
      { id: 'p11', fromState: 'q_have1', readSymbol: '_', toState: 'q_match1', writeSymbol: '_', direction: 'L' },

      // q_match1: Checking rightmost symbol
      { id: 'p12', fromState: 'q_match1', readSymbol: '1', toState: 'q_rewind', writeSymbol: '_', direction: 'L' },
      { id: 'p13', fromState: 'q_match1', readSymbol: '_', toState: 'Q_a', writeSymbol: '_', direction: 'S' }, // Single symbol odd palindrome

      // q_rewind: Move left back to start of remaining string
      { id: 'p14', fromState: 'q_rewind', readSymbol: '0', toState: 'q_rewind', writeSymbol: '0', direction: 'L' },
      { id: 'p15', fromState: 'q_rewind', readSymbol: '1', toState: 'q_rewind', writeSymbol: '1', direction: 'L' },
      { id: 'p16', fromState: 'q_rewind', readSymbol: '_', toState: 'q0', writeSymbol: '_', direction: 'R' }
    ],
    testCases: [
      { id: 'ptc1', input: '10101', expected: 'accept', description: 'Odd length palindrome' },
      { id: 'ptc2', input: '1001', expected: 'accept', description: 'Even length palindrome' },
      { id: 'ptc3', input: '0', expected: 'accept', description: 'Single character 0' },
      { id: 'ptc4', input: '1111', expected: 'accept', description: 'Uniform string' },
      { id: 'ptc5', input: '1011', expected: 'reject', description: 'Non-palindrome (invalid)' },
      { id: 'ptc6', input: '01', expected: 'reject', description: 'Simple non-palindrome' }
    ]
  },
  {
    id: '0n_1n',
    name: 'L = {0ⁿ 1ⁿ | n ≥ 1}',
    description: 'Recognizes strings with equal numbers of 0s followed by equal numbers of 1s.',
    states: ['q0', 'q1', 'q2', 'q3', 'q4', 'Q_a'],
    alphabet: ['0', '1'],
    tapeAlphabet: ['0', '1', 'X', 'Y', '_'],
    initialState: 'q0',
    blankSymbol: '_',
    acceptStates: ['Q_a'],
    rejectStates: [],
    defaultInput: '000111',
    transitions: [
      { id: 'zn1', fromState: 'q0', readSymbol: '0', toState: 'q1', writeSymbol: 'X', direction: 'R' },
      { id: 'zn2', fromState: 'q0', readSymbol: 'Y', toState: 'q3', writeSymbol: 'Y', direction: 'R' },

      { id: 'zn3', fromState: 'q1', readSymbol: '0', toState: 'q1', writeSymbol: '0', direction: 'R' },
      { id: 'zn4', fromState: 'q1', readSymbol: 'Y', toState: 'q1', writeSymbol: 'Y', direction: 'R' },
      { id: 'zn5', fromState: 'q1', readSymbol: '1', toState: 'q2', writeSymbol: 'Y', direction: 'L' },

      { id: 'zn6', fromState: 'q2', readSymbol: '0', toState: 'q2', writeSymbol: '0', direction: 'L' },
      { id: 'zn7', fromState: 'q2', readSymbol: 'Y', toState: 'q2', writeSymbol: 'Y', direction: 'L' },
      { id: 'zn8', fromState: 'q2', readSymbol: 'X', toState: 'q0', writeSymbol: 'X', direction: 'R' },

      { id: 'zn9', fromState: 'q3', readSymbol: 'Y', toState: 'q3', writeSymbol: 'Y', direction: 'R' },
      { id: 'zn10', fromState: 'q3', readSymbol: '_', toState: 'Q_a', writeSymbol: '_', direction: 'S' }
    ],
    testCases: [
      { id: 'zntc1', input: '01', expected: 'accept', description: 'n = 1' },
      { id: 'zntc2', input: '000111', expected: 'accept', description: 'n = 3' },
      { id: 'zntc3', input: '0011', expected: 'accept', description: 'n = 2' },
      { id: 'zntc4', input: '001', expected: 'reject', description: 'More 0s than 1s' },
      { id: 'zntc5', input: '011', expected: 'reject', description: 'More 1s than 0s' },
      { id: 'zntc6', input: '10', expected: 'reject', description: '1 before 0' }
    ]
  },
  {
    id: 'binary_incrementer',
    name: 'Binary Incrementer (+1 Transducer)',
    description: 'Computes w + 1 on a binary numeral. Moves to least significant bit (LSB) and propagates carry leftward.',
    states: ['q_seek_end', 'q_add_carry', 'Q_a'],
    alphabet: ['0', '1'],
    tapeAlphabet: ['0', '1', '_'],
    initialState: 'q_seek_end',
    blankSymbol: '_',
    acceptStates: ['Q_a'],
    rejectStates: [],
    defaultInput: '1011',
    transitions: [
      { id: 'bi1', fromState: 'q_seek_end', readSymbol: '0', toState: 'q_seek_end', writeSymbol: '0', direction: 'R' },
      { id: 'bi2', fromState: 'q_seek_end', readSymbol: '1', toState: 'q_seek_end', writeSymbol: '1', direction: 'R' },
      { id: 'bi3', fromState: 'q_seek_end', readSymbol: '_', toState: 'q_add_carry', writeSymbol: '_', direction: 'L' },

      { id: 'bi4', fromState: 'q_add_carry', readSymbol: '0', toState: 'Q_a', writeSymbol: '1', direction: 'S' },
      { id: 'bi5', fromState: 'q_add_carry', readSymbol: '1', toState: 'q_add_carry', writeSymbol: '0', direction: 'L' },
      { id: 'bi6', fromState: 'q_add_carry', readSymbol: '_', toState: 'Q_a', writeSymbol: '1', direction: 'S' }
    ],
    testCases: [
      { id: 'bitc1', input: '1011', expected: 'accept', description: '11 + 1 = 12 (1100)' },
      { id: 'bitc2', input: '111', expected: 'accept', description: '7 + 1 = 8 (1000 with carry expansion)' },
      { id: 'bitc3', input: '0', expected: 'accept', description: '0 + 1 = 1' },
      { id: 'bitc4', input: '10', expected: 'accept', description: '2 + 1 = 3 (11)' }
    ]
  },
  {
    id: 'unary_addition',
    name: 'Unary Addition (1ᵐ 0 1ⁿ ⇒ 1ᵐ⁺ⁿ)',
    description: 'Computes addition of two unary numbers separated by 0. Converts separator into 1 and erases one 1 at the end.',
    states: ['q0', 'q1', 'q2', 'q3', 'Q_a'],
    alphabet: ['0', '1'],
    tapeAlphabet: ['0', '1', '_'],
    initialState: 'q0',
    blankSymbol: '_',
    acceptStates: ['Q_a'],
    rejectStates: [],
    defaultInput: '110111',
    transitions: [
      { id: 'ua1', fromState: 'q0', readSymbol: '1', toState: 'q0', writeSymbol: '1', direction: 'R' },
      { id: 'ua2', fromState: 'q0', readSymbol: '0', toState: 'q1', writeSymbol: '1', direction: 'R' },

      { id: 'ua3', fromState: 'q1', readSymbol: '1', toState: 'q1', writeSymbol: '1', direction: 'R' },
      { id: 'ua4', fromState: 'q1', readSymbol: '_', toState: 'q2', writeSymbol: '_', direction: 'L' },

      { id: 'ua5', fromState: 'q2', readSymbol: '1', toState: 'q3', writeSymbol: '_', direction: 'L' },

      { id: 'ua6', fromState: 'q3', readSymbol: '1', toState: 'q3', writeSymbol: '1', direction: 'L' },
      { id: 'ua7', fromState: 'q3', readSymbol: '_', toState: 'Q_a', writeSymbol: '_', direction: 'R' }
    ],
    testCases: [
      { id: 'uatc1', input: '110111', expected: 'accept', description: '2 + 3 = 5 (11111)' },
      { id: 'uatc2', input: '101', expected: 'accept', description: '1 + 1 = 2 (11)' },
      { id: 'uatc3', input: '11101', expected: 'accept', description: '3 + 1 = 4 (1111)' }
    ]
  }
];
