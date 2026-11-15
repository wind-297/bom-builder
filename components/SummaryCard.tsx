'use client';

import React from 'react';
import { Package, CheckCircle2, Banknote } from 'lucide-react';
import { BomItem } from '../lib/types';
import { calculateBomSummary, formatVnd, BomSummary } from './BomTable';

export interface SummaryCardProps {
  items?: BomItem[];
  summary?: BomSummary;
  className?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  items,
  summary: propSummary,
  className = '',
}) => {
  const summary: BomSummary =
    propSummary ||
    (items ? calculateBomSummary(items) : {
      totalItems: 0,
      foundItems: 0,
      pendingItems: 0,
      totalEstimatedBudget: 0,
    });

  const percentage =
    summary.totalItems > 0
      ? Math.round((summary.foundItems / summary.totalItems) * 100)
      : 0;

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${className}`}>
      {/* 1. Tổng số linh kiện */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Tổng số linh kiện
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Package className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-100 font-mono">
            {summary.totalItems}
          </span>
          <span className="text-xs text-slate-400">món</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {summary.pendingItems > 0
            ? `${summary.pendingItems} linh kiện đang chờ tìm link`
            : 'Đã sẵn sàng'}
        </p>
      </div>

      {/* 2. Đã tìm thấy link mua */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Đã tìm thấy link
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight text-emerald-400 font-mono">
              {summary.foundItems}
            </span>
            <span className="text-xs text-slate-400">/ {summary.totalItems}</span>
          </div>
          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            {percentage}%
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* 3. Tổng ngân sách ước tính */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Tổng ngân sách ước tính
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Banknote className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-cyan-400 font-mono">
            {formatVnd(summary.totalEstimatedBudget)}
          </span>
          <span className="text-xs font-medium text-slate-400">₫</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Định dạng VND theo giá tìm kiếm tốt nhất
        </p>
      </div>
    </div>
  );
};

export default SummaryCard;
