# RoboBOM Advanced Features: Product Comparison, Compatibility Graph & What-If Simulator

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Product Comparison (Section 14.5), Compatibility Graph (Section 14.6), and What-If Component Simulator (Section 14.7) for RoboBOM to turn BOM items into an interactive engineering and procurement workspace.

**Architecture:** Build pure TypeScript analysis functions in `lib/` paired with accessible, responsive React modals in `components/`. The Comparison engine aligns specification keys across 2-4 items; the Graph engine generates clean SVG dependency nodes with electrical/logic status badges; the What-If engine runs sandbox BOM replacement checks using deterministic compatibility rules.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5.8, Tailwind CSS, Lucide React, Vitest.

**Spec:** Section 14.5, 14.6, 14.7 of Master Prompt (`AGENTS.md` / `MASTER_PROMPT`).

## Global Constraints

- No auto-populated or AI-inferred unit prices displayed in search or comparison matrices (Section 12.1).
- No internal priority labels like "Tier 1", "Tier 2", or "Tier 1 Priority" in the UI (Section 16.1).
- SVG/CSS-native graph layout without heavy external dependencies (following lazy senior developer principles).
- Deterministic engineering calculations over raw LLM guesswork (Section 10).
- Vietnamese UI with standard English engineering terminology.

## Review Focus

- Product comparison handles items with disjoint specification keys without crash or misaligned table cells.
- Compatibility graph correctly identifies circular dependencies or disconnected subsystems without infinite loop.
- What-If simulator preserves user-entered manual prices of untouched items when simulating component swaps.
- Empty alternative lists or zero-candidate BOM items display helpful empty states instead of broken buttons.
- Accessible keyboard navigation (Escape to close modals, focus trap).

---

### Task 1: Product Comparison Engine & Modal (Section 14.5)

**Files:**
- Create: `lib/comparison.ts`
- Create: `components/ProductComparisonModal.tsx`
- Test: `tests/comparison.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface ComparisonMatrix {
    specKeys: string[];
    candidates: Array<{
      id: string;
      title: string;
      supplier: string;
      sourceUrl: string;
      verificationStatus: "verified" | "unverified" | "dead" | "blocked" | "invalid";
      specs: Record<string, string | number>;
      pros: string[];
      cons: string[];
      isPrimary?: boolean;
    }>;
  }
  export function buildComparisonMatrix(primary: BomItem, alternatives: BomItemAlternative[]): ComparisonMatrix;
  ```

- [ ] **Step 1: Write the failing test for `buildComparisonMatrix`**

Write `tests/comparison.test.ts` testing extraction of union of spec keys, normalization of supplier names (no Tier labels), mapping pros/cons, and handling empty specs gracefully.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/comparison.test.ts`
Expected: FAIL (module `lib/comparison` not found)

- [ ] **Step 3: Implement `lib/comparison.ts`**

Implement `buildComparisonMatrix` to gather unique specification keys from primary and alternative items, normalize spec units (V, A, mA, RPM), and extract comparative advantages/limitations.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/comparison.test.ts`
Expected: PASS

- [ ] **Step 5: Implement `components/ProductComparisonModal.tsx`**

Create modal component with:
- Side-by-side card layout comparing 2-4 items.
- Dynamic spec matrix table highlighting differing values.
- Supplier badge (Shopee, Hshop, etc. - strictly NO Tier 1/2 labels).
- Link verification indicator.
- Action button: "Chọn làm linh kiện chính" (Select as primary) callback.

- [ ] **Step 6: Commit**

```bash
git add lib/comparison.ts components/ProductComparisonModal.tsx tests/comparison.test.ts
git commit -m "feat: add product comparison engine and modal"
```

---

### Task 2: System Compatibility Graph Engine & Modal (Section 14.6)

**Files:**
- Create: `lib/graph-engine.ts`
- Create: `components/CompatibilityGraphModal.tsx`
- Test: `tests/graph-engine.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface GraphNode {
    id: string;
    label: string;
    subsystem: string;
    voltage?: string;
    current?: string;
    status: "compatible" | "conditional" | "incompatible" | "unknown";
  }
  export interface GraphEdge {
    source: string;
    target: string;
    type: "power" | "signal" | "mechanical";
    status: "compatible" | "conditional" | "incompatible" | "unknown";
    description: string;
  }
  export interface SystemGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
    summary: {
      compatibleCount: number;
      conditionalCount: number;
      incompatibleCount: number;
      unknownCount: number;
    };
  }
  export function buildSystemGraph(items: BomItem[]): SystemGraph;
  ```

- [ ] **Step 1: Write the failing test for `buildSystemGraph`**

Write `tests/graph-engine.test.ts` testing:
- Power distribution edges (Battery -> Buck Regulator -> Microcontroller & Motor Driver).
- Signal control edges (Microcontroller -> Motor Driver -> Motors; Sensors -> Microcontroller).
- Correct edge status propagation from `checkBomCompatibility`.
- Graceful handling of single-item or empty BOMs.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/graph-engine.test.ts`
Expected: FAIL (module `lib/graph-engine` not found)

- [ ] **Step 3: Implement `lib/graph-engine.ts`**

Map BOM items into subsystem-grouped nodes. Infer topology edges (Power source -> Consumers, Controller -> Actuators/Sensors) using deterministic rules from `lib/compatibility.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/graph-engine.test.ts`
Expected: PASS

- [ ] **Step 5: Implement `components/CompatibilityGraphModal.tsx`**

Build an interactive SVG diagram:
- Subsystem columns: Power, Compute/Control, Sensing, Actuation/Drive, Chassis/Misc.
- Connected quadratic Bezier SVG curves colored by compatibility status (Emerald for compatible, Amber for conditional, Rose for incompatible, Zinc for unknown).
- Hover tooltips detailing voltage/signal compatibility reasons.
- Filter toggle: "Tất cả" (All), "Chỉ cảnh báo/lỗi" (Warnings/Errors only).

- [ ] **Step 6: Commit**

```bash
git add lib/graph-engine.ts components/CompatibilityGraphModal.tsx tests/graph-engine.test.ts
git commit -m "feat: add compatibility graph engine and modal"
```

---

### Task 3: What-If Component Simulator (Section 14.7)

**Files:**
- Create: `lib/what-if.ts`
- Create: `components/WhatIfSimulatorModal.tsx`
- Test: `tests/what-if.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface WhatIfSimulationResult {
    originalItem: BomItem;
    candidateItem: BomItemAlternative;
    budgetImpact: {
      originalSubtotal: number | null;
      newEstimatedSubtotal: number | null;
      difference: number | null;
    };
    compatibilityDiff: {
      resolvedIssues: string[];
      newIssues: string[];
      unchangedIssues: string[];
      statusChangedFrom: "compatible" | "conditional" | "incompatible" | "unknown";
      statusChangedTo: "compatible" | "conditional" | "incompatible" | "unknown";
    };
    tradeoffs: string[];
  }
  export function simulateComponentSwap(
    currentBom: BomItem[],
    targetItemId: string,
    replacement: BomItemAlternative
  ): WhatIfSimulationResult;
  ```

- [ ] **Step 1: Write the failing test for `simulateComponentSwap`**

Write `tests/what-if.test.ts` testing:
- Replacing 5V motor with 12V motor creates new power incompatibility if power source is 5V.
- Budget calculation difference when manual price exists.
- Trade-offs extraction (weight, RPM, torque, logic level).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/what-if.test.ts`
Expected: FAIL (module `lib/what-if` not found)

- [ ] **Step 3: Implement `lib/what-if.ts`**

Clone BOM, substitute item properties (specs, voltages, currents) with replacement candidate, rerun `checkBomCompatibility`, compute diff between old & new compatibility issues, and calculate manual budget deltas.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/what-if.test.ts`
Expected: PASS

- [ ] **Step 5: Implement `components/WhatIfSimulatorModal.tsx`**

Build interactive modal:
- Select replacement candidate from item's alternatives or enter custom alternative.
- Visual side-by-side diff: Trước (Before) vs Sau (After).
- Highlights newly introduced electrical/power issues or resolved issues.
- Apply button: "Áp dụng thay thế vào BOM" to execute swap in actual BOM.

- [ ] **Step 6: Commit**

```bash
git add lib/what-if.ts components/WhatIfSimulatorModal.tsx tests/what-if.test.ts
git commit -m "feat: add what-if component simulator and modal"
```

---

### Task 4: UI Integration in BOM Workspace (`app/page.tsx`, `components/BomTable.tsx`, `components/BomTableRow.tsx`)

**Files:**
- Modify: `components/BomTableRow.tsx`
- Modify: `components/BomTable.tsx`
- Modify: `app/page.tsx`
- Test: `tests/workspace-integration.test.tsx`

- [ ] **Step 1: Write integration test**

Verify that clicking "So sánh" opens `ProductComparisonModal`, clicking "Sơ đồ tương thích" opens `CompatibilityGraphModal`, and clicking "Mô phỏng" opens `WhatIfSimulatorModal`.

- [ ] **Step 2: Update `components/BomTableRow.tsx` and `components/BomTable.tsx`**

Add action buttons:
- "So sánh" (Compare) icon button in alternatives section.
- "Mô phỏng" (Simulate) button.
- "Sơ đồ tương thích" in the BOM table header actions toolbar alongside Export & Manual Add.

- [ ] **Step 3: Wire state in `app/page.tsx`**

Manage active modal states (`comparisonTarget`, `simulatorTarget`, `isGraphOpen`), handle "Swap replacement" callback to update BOM state immutably.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/workspace-integration.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx components/BomTable.tsx components/BomTableRow.tsx tests/workspace-integration.test.tsx
git commit -m "feat: integrate comparison, graph, and simulator into workspace UI"
```

---

### Task 5: Full Regression Testing & Production Build Verification

**Files:**
- Test: All test suites (`tests/**/*.test.ts`, `tests/**/*.test.tsx`)

- [ ] **Step 1: Run complete test suite**

Run: `npm test`
Expected: All tests pass with zero failures.

- [ ] **Step 2: Run type checking and production build**

Run: `npm run build`
Expected: Successful compile and route generation with zero TypeScript/lint errors.

- [ ] **Step 3: Commit and summarize**

```bash
git add .
git commit -m "chore: complete advanced features verification"
```
