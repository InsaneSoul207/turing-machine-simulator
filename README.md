# Turing Machine Simulator & Laboratory

An interactive, high-fidelity **Deterministic Turing Machine (DTM)** simulator and visualization laboratory developed for **Automata Theory & Theory of Computation (TOC)** courses and projects.

Built with **React 19**, **TypeScript**, **Vite**, and **Tailwind CSS**.

---

## 🌟 Key Features & Requirements

### 1. Dynamic Input & Custom Machine Definition
- **Interactive DSL Editor:** Define custom machines using intuitive 5-tuple transition rules:
  ```text
  initial: q0
  accept: q_accept
  reject: q_reject
  blank: _
  
  # Format: fromState, readSymbol -> toState, writeSymbol, direction (L/R/S)
  q0, a -> q1, X, R
  q1, b -> q2, Y, R
  q2, c -> q3, Z, L
  ```
- **Real-Time 7-Tuple Validation:** Checks $M = \langle Q, \Sigma, \Gamma, \delta, q_0, B, F \rangle$ and flags duplicate/non-deterministic rules, invalid directions, or unreferenced states.
- **Export & Import:** Save machines to `.json` files or import existing machine configurations.

### 2. Interactive Infinite Tape Strip
- **Two-Way Infinite Tape ($\mathbb{Z}$):** Supports unbounded left and right tape expansion with negative and positive cell indexing.
- **Click-to-Edit Tape Cells:** Click any cell on the tape to modify its symbol before or during computation.
- **Visual Read/Write Head:** Animated head pointer displaying the current internal state $[q_i]$ directly above the scanned cell.
- **Tape Navigation:** Pan left/right or click **"Center Head"** to immediately snap focus back to the read/write head.

### 3. Step-by-Step Execution & Instantaneous Description (ID)
- **Playback Controls:** Play, Pause, Step Forward, Step Backward (Undo), and Fast-Forward to completion.
- **Speed Slider:** Adjust execution speed smoothly from 1 step/second up to 50 steps/second.
- **Formal Instantaneous Description (ID):** Real-time formal TOC configuration string tracking:
  $$\alpha_1 [q_i] a \alpha_2 \vdash \alpha_1' [q_j] b \alpha_2'$$
- **Time-Travel Execution Log:** Detailed historical log of all steps with human explanations; click any past step to rewind the machine to that exact snapshot.

### 4. Interactive State Transition Graph & Table
- **Automaton State Graph (SVG):** Visual node-link diagram distinguishing initial state ($\to q_0$), accept states (double ring), and reject states.
- **Live Transition Highlighting:** The active state and active transition arc/arrow illuminate and glow in real-time as transitions fire.
- **Formal Transition Table:** Filterable matrix view of $\delta(q, \sigma) \to (q', \sigma', D)$ with inline rule addition and deletion.

### 5. Automated Validation & Batch Test Suite
- Run batch test suites against strings with **Expected** vs **Actual** outcome comparison.
- Pre-loaded with positive and negative test cases for each classic language.
- One-click **"Trace"** button to load any test case onto the tape for interactive visualization.

---

## 📚 Pre-Configured Classic Automata Theory Machines

1. **$L = \{a^n b^n c^n \mid n \ge 1\}$**:
   - Classic context-sensitive language that proves Turing Machines are strictly more powerful than Pushdown Automata (PDA) via the Pumping Lemma.
2. **Binary Palindromes $\{w = w^R \mid w \in \{0, 1\}^*\}$**:
   - Decides even- and odd-length binary palindromes by marking opposite ends and rewinding.
3. **$L = \{0^n 1^n \mid n \ge 1\}$**:
   - Standard introductory deterministic Turing machine language.
4. **Binary Incrementer ($w + 1$ Transducer)**:
   - Computes addition of 1 to a binary integer with carry ripple.
5. **Unary Addition ($1^m 0 1^n \implies 1^{m+n}$)**:
   - Concatenates unary numbers and cleans the tape to output the arithmetic sum.

---

## 🚀 Quick Start & How to Run

### Option 1: Development Server
To run with hot-reload in the browser:
```bash
npm run dev
# or
pnpm run dev
```
Open the local URL displayed (e.g. `http://localhost:5173`) in your browser.

### Option 2: Production Preview
The project has already been compiled to `dist/`:
```bash
npm run preview
# or
pnpm run preview
```

### Option 3: Double-Click Batch File (Windows)
Double-click `start-simulator.bat` in this folder to launch the simulator in your browser.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| --- | --- |
| <kbd>Space</kbd> | Play / Pause execution |
| <kbd>→</kbd> | Step Forward one transition |
| <kbd>←</kbd> | Step Backward (Undo step) |
| <kbd>R</kbd> | Reset to initial tape and state |
