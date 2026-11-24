'use client';

import React, { useEffect } from 'react';
import { X, ExternalLink, CheckCircle2, AlertCircle, HelpCircle, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { BomItem, BomItemAlternative } from '@/lib/types';
import { buildComparisonMatrix, ComparisonCandidate } from '@/lib/comparison';

interface ProductComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryItem: BomItem;
  alternatives: BomItemAlternative[];
  onSelectAsPrimary?: (candidate: ComparisonCandidate) => void;
}

export const ProductComparisonModal: React.FC<ProductComparisonModalProps> = ({
  isOpen,
  onClose,
  primaryItem,
  alternatives,
  onSelectAsPrimary,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const matrix = buildComparisonMatrix(primaryItem, alternatives);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="So sánh linh kiện"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card text-card-foreground border border-border w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                Kỹ thuật & Mua sắm
              </span>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                So sánh linh kiện tương đương
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Đánh giá đa chiều thông số kỹ thuật, nhà cung cấp và độ tương thích cho <span className="font-medium text-foreground">{primaryItem.name}</span>
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

        {/* Content Body - Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Candidate Cards Grid */}
          <div className={`grid gap-4 ${
            matrix.candidates.length === 1
              ? 'grid-cols-1 max-w-md mx-auto'
              : matrix.candidates.length === 2
              ? 'grid-cols-1 md:grid-cols-2'
              : matrix.candidates.length === 3
              ? 'grid-cols-1 md:grid-cols-3'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
          }`}>
            {matrix.candidates.map((cand) => (
              <div
                key={cand.id}
                className={`relative rounded-xl p-4 border transition-all flex flex-col justify-between ${
                  cand.isPrimary
                    ? 'border-primary/50 bg-primary/[0.03] ring-1 ring-primary/20'
                    : 'border-border bg-card hover:border-border/80'
                }`}
              >
                {cand.isPrimary && (
                  <span className="absolute -top-2.5 left-4 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
                    Linh kiện hiện tại
                  </span>
                )}

                <div>
                  <div className="flex items-start justify-between gap-2 mb-2 mt-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground inline-flex items-center gap-1">
                      {cand.supplier}
                    </span>
                    {cand.verificationStatus === 'verified' ? (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-0.5">
                        <ShieldCheck className="w-3.5 h-3.5" /> Link thực
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium inline-flex items-center gap-0.5">
                        <AlertCircle className="w-3.5 h-3.5" /> Chưa verify
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-foreground line-clamp-2 min-h-[2.5rem]" title={cand.title}>
                    {cand.title}
                  </h3>

                  {/* Pros & Cons summary */}
                  <div className="mt-3 space-y-1.5 text-xs">
                    {cand.pros.map((p, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{p}</span>
                      </div>
                    ))}
                    {cand.cons.map((c, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-amber-700 dark:text-amber-300">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                  {cand.sourceUrl ? (
                    <a
                      href={cand.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      Mở link <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Không có link</span>
                  )}

                  {!cand.isPrimary && onSelectAsPrimary && (
                    <button
                      onClick={() => onSelectAsPrimary(cand)}
                      className="text-xs px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-medium inline-flex items-center gap-1 transition-colors"
                    >
                      Chọn dùng <Check className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Spec Comparison Table */}
          <div className="mt-6">
            <h4 className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-3">
              Bảng ma trận thông số kỹ thuật chi tiết
            </h4>
            <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="py-2.5 px-4 font-semibold text-muted-foreground w-1/4">
                      Thuộc tính
                    </th>
                    {matrix.candidates.map((c) => (
                      <th
                        key={c.id}
                        className={`py-2.5 px-4 font-semibold text-foreground ${
                          c.isPrimary ? 'bg-primary/5 text-primary' : ''
                        }`}
                      >
                        <div className="truncate max-w-[200px]" title={c.title}>
                          {c.title}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {matrix.specKeys.map((key) => (
                    <tr key={key} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2 px-4 font-medium text-muted-foreground bg-muted/10">
                        {key}
                      </td>
                      {matrix.candidates.map((c) => {
                        const val = c.specs[key];
                        return (
                          <td
                            key={c.id}
                            className={`py-2 px-4 ${
                              c.isPrimary ? 'bg-primary/[0.02]' : ''
                            } ${!val ? 'text-muted-foreground italic' : 'text-foreground'}`}
                          >
                            {val || '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            Lưu ý: Không tự ý hiển thị giá scraped; người dùng tự nhập giá thực tế trong BOM theo quy định.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
