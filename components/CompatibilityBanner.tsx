'use client';

import React from 'react';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { BomItem } from '@/lib/types';
import { checkBomCompatibility, CompatibilityIssue } from '@/lib/compatibility';

interface CompatibilityBannerProps {
  items: BomItem[];
  className?: string;
}

export const CompatibilityBanner: React.FC<CompatibilityBannerProps> = ({
  items,
  className = '',
}) => {
  if (!items || items.length < 2) return null;

  const issues = checkBomCompatibility(items);

  if (issues.length === 0) {
    return (
      <div
        className={`flex items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-3.5 py-2.5 text-xs text-emerald-400 ${className}`}
      >
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
        <span>Kiểm tra tương thích: Toàn bộ linh kiện nguồn, vi điều khiển, driver và động cơ đồng bộ tốt.</span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {issues.map((issue, idx) => (
        <div
          key={idx}
          className={`flex items-start gap-3 rounded-lg border px-3.5 py-2.5 text-xs ${
            issue.severity === 'error'
              ? 'border-rose-500/30 bg-rose-950/20 text-rose-300'
              : issue.severity === 'warning'
              ? 'border-amber-500/30 bg-amber-950/20 text-amber-300'
              : 'border-blue-500/30 bg-blue-950/20 text-blue-300'
          }`}
        >
          {issue.severity === 'error' ? (
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          )}
          <div className="flex-1 space-y-1">
            <div className="font-semibold">{issue.message}</div>
            <div className="opacity-90 text-[11px] leading-relaxed">
              <span className="font-medium underline">Đề xuất:</span> {issue.recommendation}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
