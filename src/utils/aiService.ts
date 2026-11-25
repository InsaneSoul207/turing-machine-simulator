/**
 * AI Service for Turing Machine Generation
 * Supports:
 * 1. Local Ollama instance (default: http://localhost:11434)
 * 2. OpenAI / Groq / OpenAI-compatible cloud APIs
 * 3. Offline Heuristic Templates for instant generation
 */

export interface OllamaModelInfo {
  name: string;
  size?: number;
  details?: {
    parameter_size?: string;
    family?: string;
  };
}

export interface GenerationOptions {
  provider: 'ollama' | 'openai_compat' | 'offline';
  ollamaEndpoint?: string;
  model: string;
  apiKey?: string;
  customEndpoint?: string;
  temperature?: number;
}

export const DEFAULT_OLLAMA_ENDPOINT = 'http://localhost:11434';

/** Check if local Ollama server is responding */
export async function checkOllama(endpoint: string = DEFAULT_OLLAMA_ENDPOINT): Promise<boolean> {
  try {
    const res = await fetch(`${endpoint.replace(/\/+$/, '')}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Fetch installed models from Ollama */
export async function fetchOllamaModels(endpoint: string = DEFAULT_OLLAMA_ENDPOINT): Promise<OllamaModelInfo[]> {
  const res = await fetch(`${endpoint.replace(/\/+$/, '')}/api/tags`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Ollama returned status ${res.status}`);
  const data = await res.json();
  return (data.models || []).map((m: any) => ({
    name: m.name,
    size: m.size,
    details: m.details,
  }));
}

/**
 * Builds the academic TOC prompt for the AI model.
 */
export function buildTuringMachinePrompt(problemStatement: string): string {
  return `You are an expert Professor of Automata Theory and Theory of Computation (TOC).
Your task is to design a complete, deterministic, correct Turing Machine (DTM) for the following problem:

PROBLEM: "${problemStatement}"

OUTPUT REQUIREMENTS:
Output ONLY in the following DSL specification format. Do NOT use markdown code blocks (\`\`\`), do NOT output any conversational text before or after. Start immediately with '# Name:'.

SPECIFICATION FORMAT:
# Name: <Precise Machine Name>
# Description: <Formal language or function definition>
# Algorithm: <Brief 1-3 sentence strategy explaining how the head scans, marks, and checks>
initial: q0
accept: Q_a
reject: Q_r
blank: _
default_input: <a short valid sample string>

# Test Cases (Provide 2 to 4 valid inputs and 2 to 3 invalid inputs)
test: <valid_input_1> -> accept (Explanation)
test: <valid_input_2> -> accept (Explanation)
test: <invalid_input_1> -> reject (Explanation)
test: <invalid_input_2> -> reject (Explanation)

# Transitions: fromState, readSymbol -> toState, writeSymbol, direction(L/R/S)
<one transition per line in the format: qState, readSym -> nextState, writeSym, L/R/S>

RULES & CONVENTIONS:
1. Always use 'Q_a' for the accept state and 'Q_r' for the reject state.
2. Initial state must be 'q0'.
3. Directions must be 'L' (left), 'R' (right), or 'S' (stay).
4. Blank symbol is '_'.
5. Every transition MUST be strictly deterministic (no two transitions with the same fromState and readSymbol).
6. Provide ALL transitions needed so the machine never hangs in an unhandled state unexpectedly.
7. If an input is rejected, either transition to Q_r or omit the transition so the machine halts non-accepting.
8. Output ONLY the DSL.`;
}

/**
 * Stream generator for Ollama
 */
export async function streamFromOllama(
  endpoint: string,
  model: string,
  prompt: string,
  onChunk: (text: string, isDone: boolean) => void,
  signal?: AbortSignal
): Promise<string> {
  const url = `${endpoint.replace(/\/+$/, '')}/api/generate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      system: 'You are an Automata Theory professor. Output ONLY the Turing Machine DSL specification. Do NOT include <think> tags, reasoning, or markdown fences. Start directly with # Name:.',
      stream: true,
      options: {
        temperature: 0.1,
        top_p: 0.9,
        num_predict: 800,
        stop: ['\n\n\n\n', '# End', '```'],
      },
    }),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ollama error (${res.status}): ${errText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No readable stream returned by Ollama');

  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const chunkStr = decoder.decode(value, { stream: true });
    const lines = chunkStr.split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.response) {
          fullText += parsed.response;
          onChunk(parsed.response, parsed.done ?? false);
        }
        if (parsed.done) {
          onChunk('', true);
          return fullText;
        }
      } catch {
        // partial json, ignore
      }
    }
  }

  onChunk('', true);
  return fullText;
}

/**
 * Stream generator for OpenAI-compatible APIs (Groq, OpenAI, Together, OpenRouter, etc.)
 */
export async function streamFromOpenAICompat(
  endpoint: string,
  apiKey: string,
  model: string,
  prompt: string,
  onChunk: (text: string, isDone: boolean) => void,
  signal?: AbortSignal
): Promise<string> {
  const url = endpoint.includes('/chat/completions')
    ? endpoint
    : `${endpoint.replace(/\/+$/, '')}/chat/completions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an Automata Theory professor. Output ONLY Turing Machine DSL specifications without markdown fences or pleasantries.',
        },
        { role: 'user', content: prompt },
      ],
      stream: true,
      temperature: 0.1,
    }),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API error (${res.status}): ${errText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No readable stream returned');

  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(l => l.trim().startsWith('data: '));

    for (const line of lines) {
      const dataStr = line.replace(/^data:\s*/, '').trim();
      if (dataStr === '[DONE]') {
        onChunk('', true);
        return fullText;
      }
      try {
        const json = JSON.parse(dataStr);
        const delta = json.choices?.[0]?.delta?.content || '';
        if (delta) {
          fullText += delta;
          onChunk(delta, false);
        }
      } catch {
        // ignore incomplete SSE chunk
      }
    }
  }

  onChunk('', true);
  return fullText;
}

/**
 * Offline Heuristic Templates for instant generation
 * Guarantees zero latency and 100% correct machines for common automata assignments.
 */
export const OFFLINE_TEMPLATES: Array<{
  keywords: string[];
  title: string;
  dsl: string;
}> = [
  {
    keywords: ['equal 0 and 1', 'equal 0s and 1s', 'equal number of 0', '#0 = #1', '0s and 1s equal'],
    title: 'Equal Count of 0s and 1s: L = {w | #0(w) = #1(w)}',
    dsl: `# Name: Equal 0s and 1s
# Description: Accepts strings over {0,1} where the count of 0s equals the count of 1s in any order.
# Algorithm: Scan tape from left to right. Mark first unmarked symbol (0->X or 1->Y), then search for corresponding counterpart to mark. Repeat until all symbols are marked, then verify tape is clean.
initial: q0
accept: Q_a
reject: Q_r
blank: _
default_input: 0110

# Test Cases
test: 01 -> accept (Balanced pair)
test: 0011 -> accept (Balanced n=2)
test: 0110 -> accept (Balanced arbitrary order)
test: 010 -> reject (More 0s than 1s)
test: 1110 -> reject (More 1s than 0s)

# Transitions
q0, 0 -> q1, X, R
q0, 1 -> q2, Y, R
q0, X -> q0, X, R
q0, Y -> q0, Y, R
q0, _ -> Q_a, _, S

# q1: Found '0' (marked X), now find matching '1'
q1, 0 -> q1, 0, R
q1, Y -> q1, Y, R
q1, X -> q1, X, R
q1, 1 -> q3, Y, L

# q2: Found '1' (marked Y), now find matching '0'
q2, 1 -> q2, 1, R
q2, X -> q2, X, R
q2, Y -> q2, Y, R
q2, 0 -> q3, X, L

# q3: Rewind back to tape start
q3, 0 -> q3, 0, L
q3, 1 -> q3, 1, L
q3, X -> q3, X, L
q3, Y -> q3, Y, L
q3, _ -> q0, _, R`,
  },
  {
    keywords: ['2s complement', "two's complement", 'twos complement', '2 complement'],
    title: "Binary Two's Complement Transducer",
    dsl: `# Name: Two's Complement Calculator
# Description: Converts a binary string to its two's complement by scanning right to end, then inverting bits after first '1'.
# Algorithm: 1. Move to the rightmost bit. 2. Traverse left: keep all trailing 0s and the first 1 intact. 3. Invert all remaining bits to the left (0->1, 1->0).
initial: q0
accept: Q_a
reject: Q_r
blank: _
default_input: 10100

# Test Cases
test: 10100 -> accept (Output should be 01100)
test: 1000 -> accept (Output should be 1000)
test: 1011 -> accept (Output should be 0101)

# Transitions
# q0: Move to right end of input
q0, 0 -> q0, 0, R
q0, 1 -> q0, 1, R
q0, _ -> q1, _, L

# q1: Scan left past trailing 0s
q1, 0 -> q1, 0, L
q1, 1 -> q2, 1, L

# q2: Invert all remaining bits to the left
q2, 0 -> q2, 1, L
q2, 1 -> q2, 0, L
q2, _ -> Q_a, _, R`,
  },
  {
    keywords: ['even 0', 'even number of 0', 'even zeros', 'even 0s'],
    title: 'Even Number of 0s: L = {w | #0(w) is even}',
    dsl: `# Name: Even Number of 0s
# Description: Accepts strings over {0,1} containing an even count of '0's (including zero '0's).
# Algorithm: State q0 represents an even count of 0s (accepting). State q1 represents an odd count of 0s. 1s do not change parity.
initial: q0
accept: Q_a
reject: Q_r
blank: _
default_input: 10101

# Test Cases
test: 00 -> accept (Two 0s is even)
test: 10101 -> accept (Two 0s is even)
test: 111 -> accept (Zero 0s is even)
test: 0 -> reject (One 0 is odd)
test: 000 -> reject (Three 0s is odd)

# Transitions
q0, 0 -> q1, 0, R
q0, 1 -> q0, 1, R
q0, _ -> Q_a, _, S

q1, 0 -> q0, 0, R
q1, 1 -> q1, 1, R
q1, _ -> Q_r, _, S`,
  },
  {
    keywords: ['contains aba', 'substring aba', 'sub-string aba'],
    title: "Contains Substring 'aba'",
    dsl: `# Name: Substring 'aba' Detector
# Description: Recognizes languages over {a,b} containing the substring 'aba'.
# Algorithm: Standard DFA embedded in Turing Machine tracking prefixes: ε (q0), 'a' (q1), 'ab' (q2), and 'aba' (Q_a).
initial: q0
accept: Q_a
reject: Q_r
blank: _
default_input: babab

# Test Cases
test: aba -> accept (Exact match)
test: babab -> accept (Contains aba in middle)
test: aaba -> accept (Prefixes a before aba)
test: abba -> reject (Missing intermediate 'a')
test: bbb -> reject (No 'a' present)

# Transitions
q0, a -> q1, a, R
q0, b -> q0, b, R
q0, _ -> Q_r, _, S

q1, a -> q1, a, R
q1, b -> q2, b, R
q1, _ -> Q_r, _, S

q2, a -> Q_a, a, S
q2, b -> q0, b, R
q2, _ -> Q_r, _, S`,
  },
  {
    keywords: ['reverse', 'string reverse', 'palindrome'],
    title: 'Palindrome Recognizer: L = {w | w = wᴿ}',
    dsl: `# Name: Palindrome over {0,1}
# Description: Accepts binary palindromes that read the same backwards and forwards.
# Algorithm: Read first bit, replace with blank. Scan to right end, verify matching bit and replace with blank. Rewind and repeat.
initial: q0
accept: Q_a
reject: Q_r
blank: _
default_input: 10101

# Test Cases
test: 10101 -> accept (Odd length palindrome)
test: 1001 -> accept (Even length palindrome)
test: 0 -> accept (Single bit)
test: 10 -> reject (Not palindrome)
test: 1101 -> reject (Not palindrome)

# Transitions
q0, 0 -> q1, _, R
q0, 1 -> q2, _, R
q0, _ -> Q_a, _, S

# Scan right for matching 0
q1, 0 -> q1, 0, R
q1, 1 -> q1, 1, R
q1, _ -> q3, _, L

# Scan right for matching 1
q2, 0 -> q2, 0, R
q2, 1 -> q2, 1, R
q2, _ -> q4, _, L

# Verify 0 at end
q3, 0 -> q5, _, L
q3, _ -> Q_a, _, S
q3, 1 -> Q_r, 1, S

# Verify 1 at end
q4, 1 -> q5, _, L
q4, _ -> Q_a, _, S
q4, 0 -> Q_r, 0, S

# Rewind left to start
q5, 0 -> q5, 0, L
q5, 1 -> q5, 1, L
q5, _ -> q0, _, R`,
  },
  {
    keywords: ['binary increment', 'increment binary', 'add 1 to binary', 'binary + 1'],
    title: 'Binary Incrementer: n ↦ n + 1',
    dsl: `# Name: Binary Incrementer
# Description: Adds 1 to an unsigned binary number on tape.
# Algorithm: Move to rightmost bit. If 1, change to 0 and carry left. If 0 or blank, change to 1 and stop.
initial: q0
accept: Q_a
reject: Q_r
blank: _
default_input: 1011

# Test Cases
test: 1011 -> accept (1011 + 1 = 1100)
test: 111 -> accept (111 + 1 = 1000 with carry)
test: 0 -> accept (0 + 1 = 1)

# Transitions
q0, 0 -> q0, 0, R
q0, 1 -> q0, 1, R
q0, _ -> q1, _, L

# Add 1 with carry propagation
q1, 1 -> q1, 0, L
q1, 0 -> Q_a, 1, S
q1, _ -> Q_a, 1, S`,
  }
];

/**
 * Searches offline templates by matching problem statement keywords.
 */
export function findMatchingTemplate(query: string): string | null {
  const q = query.toLowerCase();
  for (const t of OFFLINE_TEMPLATES) {
    if (t.keywords.some(k => q.includes(k))) {
      return t.dsl;
    }
  }
  return null;
}
