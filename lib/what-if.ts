import { BomItem, BomItemAlternative } from './types';
import { checkBomCompatibility, CompatibilityIssue } from './compatibility';

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
    statusChangedFrom: 'compatible' | 'conditional' | 'incompatible' | 'unknown';
    statusChangedTo: 'compatible' | 'conditional' | 'incompatible' | 'unknown';
  };
  tradeoffs: string[];
}

function computeOverallStatus(issues: CompatibilityIssue[]): 'compatible' | 'conditional' | 'incompatible' | 'unknown' {
  if (issues.length === 0) return 'compatible';
  const hasError = issues.some((i) => i.severity === 'error');
  if (hasError) return 'incompatible';
  return 'conditional';
}

export function simulateComponentSwap(
  currentBom: BomItem[],
  targetItemId: string,
  replacement: BomItemAlternative
): WhatIfSimulationResult {
  const originalIndex = currentBom.findIndex((it) => it.id === targetItemId);
  if (originalIndex === -1) {
    throw new Error(`Không tìm thấy linh kiện ID: ${targetItemId} trong BOM.`);
  }

  const originalItem = currentBom[originalIndex];

  // 1. Check current issues
  const currentIssues = checkBomCompatibility(currentBom);
  const statusChangedFrom = computeOverallStatus(currentIssues);

  // 2. Build simulated BOM
  const simulatedBom: BomItem[] = currentBom.map((item, idx) => {
    if (idx !== originalIndex) return item;

    return {
      ...item,
      name: replacement.title,
      specification: replacement.reason
        ? `${replacement.title}, ${replacement.reason}`
        : replacement.title,
      selectedLink: replacement.url,
      supplierName: replacement.supplierName || replacement.sourceName,
      supplierDomain: replacement.supplierDomain || replacement.sourceDomain,
      linkStatus: replacement.linkStatus || 'unverified',
      matchGrade: replacement.matchGrade,
    };
  });

  // 3. Check simulated issues
  const simulatedIssues = checkBomCompatibility(simulatedBom);
  const statusChangedTo = computeOverallStatus(simulatedIssues);

  const currentMessages = new Set(currentIssues.map((i) => i.message));
  const simulatedMessages = new Set(simulatedIssues.map((i) => i.message));

  const resolvedIssues: string[] = [];
  const unchangedIssues: string[] = [];
  const newIssues: string[] = [];

  for (const msg of currentMessages) {
    if (!simulatedMessages.has(msg)) {
      resolvedIssues.push(msg);
    } else {
      unchangedIssues.push(msg);
    }
  }

  for (const msg of simulatedMessages) {
    if (!currentMessages.has(msg)) {
      newIssues.push(msg);
    }
  }

  // 4. Budget calculations
  const qty = originalItem.quantity || 1;
  const originalUnitPrice = originalItem.manualPrice?.amount ?? (originalItem.unitPrice > 0 ? originalItem.unitPrice : null);
  const originalSubtotal = originalUnitPrice !== null ? originalUnitPrice * qty : null;

  let newUnitPrice: number | null = null;
  if (typeof replacement.price === 'number' && replacement.price > 0) {
    newUnitPrice = replacement.price;
  } else if (originalUnitPrice !== null) {
    newUnitPrice = originalUnitPrice; // fallback to same price if not given
  }

  const newEstimatedSubtotal = newUnitPrice !== null ? newUnitPrice * qty : null;
  const difference =
    originalSubtotal !== null && newEstimatedSubtotal !== null
      ? newEstimatedSubtotal - originalSubtotal
      : null;

  // 5. Deduce tradeoffs
  const tradeoffs: string[] = [];

  if (replacement.reason) {
    tradeoffs.push(replacement.reason);
  }

  if (resolvedIssues.length > 0) {
    tradeoffs.push(`Khắc phục triệt để ${resolvedIssues.length} vấn đề tương thích điện áp/tín hiệu.`);
  }

  if (newIssues.length > 0) {
    tradeoffs.push(`Phát sinh ${newIssues.length} cảnh báo kỹ thuật mới cần lưu ý trước khi thi công.`);
  }

  if (difference !== null) {
    if (difference > 0) {
      tradeoffs.push(`Ước tính tăng chi phí khoảng +${difference.toLocaleString('vi-VN')} VND.`);
    } else if (difference < 0) {
      tradeoffs.push(`Ước tính tiết kiệm khoảng ${Math.abs(difference).toLocaleString('vi-VN')} VND.`);
    } else {
      tradeoffs.push('Không làm biến động nhiều chi phí ước tính.');
    }
  }

  return {
    originalItem,
    candidateItem: replacement,
    budgetImpact: {
      originalSubtotal,
      newEstimatedSubtotal,
      difference,
    },
    compatibilityDiff: {
      resolvedIssues,
      newIssues,
      unchangedIssues,
      statusChangedFrom,
      statusChangedTo,
    },
    tradeoffs,
  };
}
