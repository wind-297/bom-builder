'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertOctagon, ArrowRight, Zap, RefreshCw, Check } from 'lucide-react';
import { BomItem, BomItemAlternative } from '@/lib/types';
import { simulateComponentSwap, WhatIfSimulationResult } from '@/lib/what-if';

interface WhatIfSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetItem: BomItem;
  allBomItems: BomItem[];
  onApplySwap: (targetItemId: string, replacement: BomItemAlternative) => void;
}

export const WhatIfSimulatorModal: React.FC<WhatIfSimulatorModalProps> = ({
  isOpen,
  onClose,
  targetItem,
  allBomItems,
  onApplySwap,
}) => {
  const alternatives = targetItem?.alternatives || [];
  const [selectedAltIndex, setSelectedAltIndex] = useState<number>(0);

  useEffect(() => {
    setSelectedAltIndex(0);
  }, [targetItem]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !targetItem) return null;

  const currentReplacement: BomItemAlternative | null =
    alternatives.length > 0 ? alternatives[selectedAltIndex] : null;

  let simResult: WhatIfSimulationResult | null = null;
  if (currentReplacement) {
    try {
      simResult = simulateComponentSwap(allBomItems, targetItem.id, currentReplacement);
    } catch {
      simResult = null;
    }
  }

  const handleApply = () => {
    if (currentReplacement) {
      onApplySwap(targetItem.id, currentReplacement);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mô phỏng thay thế linh kiện What-If"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card text-card-foreground border border-border w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                Kỹ thuật & Phân tích rủi ro (Section 14.7)
              </span>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Bộ mô phỏng thay thế linh kiện (What-If Simulator)
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dự báo trước biến động kỹ thuật, tương thích điện áp và ngân sách khi hoán đổi linh kiện
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {alternatives.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              <p>Linh kiện này hiện chưa có phương án thay thế khả dụng nào được tìm thấy.</p>
            </div>
          ) : (
            <>
              {/* Target & Replacement Selection Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Item Box */}
                <div className="p-4 rounded-xl border border-border bg-muted/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Linh kiện hiện tại trong BOM
                  </span>
                  <h3 className="text-sm font-semibold text-foreground mt-1">{targetItem.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {targetItem.specification || 'Không có thông số cụ thể'}
                  </p>
                  <div className="mt-3 text-xs flex items-center justify-between text-muted-foreground border-t border-border/60 pt-2">
                    <span>Số lượng: {targetItem.quantity}</span>
                    <span>
                      Giá thủ công:{' '}
                      {targetItem.manualPrice?.amount
                        ? `${targetItem.manualPrice.amount.toLocaleString('vi-VN')} VND`
                        : 'Chưa nhập'}
                    </span>
                  </div>
                </div>

                {/* Candidate Selection Box */}
                <div className="p-4 rounded-xl border border-primary/40 bg-primary/[0.03] ring-1 ring-primary/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Chọn linh kiện dự kiến thay thế ({alternatives.length} phương án)
                  </span>

                  <select
                    value={selectedAltIndex}
                    onChange={(e) => setSelectedAltIndex(Number(e.target.value))}
                    className="w-full mt-2 px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {alternatives.map((alt, idx) => (
                      <option key={idx} value={idx}>
                        {alt.title} {alt.supplierName ? `(${alt.supplierName})` : ''}
                      </option>
                    ))}
                  </select>

                  {currentReplacement && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {currentReplacement.reason || 'Phương án thay thế tương đương.'}
                    </p>
                  )}
                </div>
              </div>

              {/* Simulation Result Diff */}
              {simResult && (
                <div className="space-y-4">
                  <h4 className="text-xs uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" /> Kết quả mô phỏng hệ thống
                  </h4>

                  {/* KPI Impact Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl border border-border bg-card">
                      <span className="text-muted-foreground">Trạng thái tương thích</span>
                      <div className="font-semibold text-sm mt-1 flex items-center gap-1.5">
                        <span className="text-muted-foreground line-through text-xs">
                          {simResult.compatibilityDiff.statusChangedFrom}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                        <span
                          className={
                            simResult.compatibilityDiff.statusChangedTo === 'compatible'
                              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                              : simResult.compatibilityDiff.statusChangedTo === 'incompatible'
                              ? 'text-rose-600 dark:text-rose-400 font-bold'
                              : 'text-amber-600 dark:text-amber-400 font-bold'
                          }
                        >
                          {simResult.compatibilityDiff.statusChangedTo === 'compatible'
                            ? 'Hoàn toàn tương thích'
                            : simResult.compatibilityDiff.statusChangedTo === 'incompatible'
                            ? 'Xung đột kỹ thuật'
                            : 'Cần lưu ý thêm'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-border bg-card">
                      <span className="text-muted-foreground">Vấn đề kỹ thuật</span>
                      <div className="font-semibold text-sm mt-1">
                        {simResult.compatibilityDiff.resolvedIssues.length > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 mr-2">
                            +{simResult.compatibilityDiff.resolvedIssues.length} khắc phục
                          </span>
                        )}
                        {simResult.compatibilityDiff.newIssues.length > 0 && (
                          <span className="text-rose-600 dark:text-rose-400">
                            +{simResult.compatibilityDiff.newIssues.length} cảnh báo mới
                          </span>
                        )}
                        {simResult.compatibilityDiff.resolvedIssues.length === 0 &&
                          simResult.compatibilityDiff.newIssues.length === 0 && (
                            <span className="text-muted-foreground font-normal text-xs">
                              Không có thay đổi
                            </span>
                          )}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-border bg-card">
                      <span className="text-muted-foreground">Biến động ngân sách (Ước tính)</span>
                      <div className="font-semibold text-sm mt-1">
                        {simResult.budgetImpact.difference !== null ? (
                          simResult.budgetImpact.difference > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400">
                              +{simResult.budgetImpact.difference.toLocaleString('vi-VN')} VND
                            </span>
                          ) : simResult.budgetImpact.difference < 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              -{Math.abs(simResult.budgetImpact.difference).toLocaleString('vi-VN')} VND
                            </span>
                          ) : (
                            <span className="text-muted-foreground font-normal text-xs">0 VND (Không đổi)</span>
                          )
                        ) : (
                          <span className="text-muted-foreground font-normal text-xs">Cần nhập giá thủ công</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tradeoffs List */}
                  <div className="p-4 rounded-xl border border-border bg-card text-xs space-y-2">
                    <span className="font-semibold text-foreground">Đánh giá kỹ thuật & Khuyến nghị:</span>
                    <ul className="space-y-1.5 text-muted-foreground">
                      {simResult.tradeoffs.map((t, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Hủy
          </button>

          {currentReplacement && (
            <button
              onClick={handleApply}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Check className="w-3.5 h-3.5" /> Áp dụng thay thế vào BOM
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
