'use client';

import React from 'react';
import { Package } from 'lucide-react';
import { BomItem } from '../lib/types';
import BomTableRow from './BomTableRow';

export interface BomSummary {
  totalItems: number;
  foundItems: number;
  pendingItems: number;
  unpricedItems: number;
  pricedItems: number;
  totalEstimatedBudget: number;
  isBudgetComplete: boolean;
  hasUnavailablePrice?: boolean;
}

export function formatVnd(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0';
  }
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function calculateBomSummary(items: BomItem[]): BomSummary {
  if (!items || !Array.isArray(items)) {
    return {
      totalItems: 0,
      foundItems: 0,
      pendingItems: 0,
      unpricedItems: 0,
      pricedItems: 0,
      totalEstimatedBudget: 0,
      isBudgetComplete: true,
      hasUnavailablePrice: false,
    };
  }

  const totalItems = items.length;
  const foundItems = items.filter((item) => item.status === 'found').length;
  const pendingItems = items.filter((item) => item.status !== 'found').length;

  let unpricedItems = 0;
  let pricedItems = 0;
  let totalEstimatedBudget = 0;

  for (const item of items) {
    if (item.alreadyOwned) {
      continue;
    }

    const unit = Number(item.unitPrice) || 0;
    const qty = Math.max(1, Number(item.quantity) || 1);

    if (unit > 0) {
      pricedItems++;
      const itemTotal =
        typeof item.totalPrice === 'number' && item.totalPrice > 0
          ? item.totalPrice
          : qty * unit;
      totalEstimatedBudget += itemTotal;
    } else {
      unpricedItems++;
    }
  }

  const isBudgetComplete = unpricedItems === 0;

  return {
    totalItems,
    foundItems,
    pendingItems,
    unpricedItems,
    pricedItems,
    totalEstimatedBudget,
    isBudgetComplete,
    hasUnavailablePrice: unpricedItems > 0,
  };
}

export interface BomTableProps {
  items: BomItem[];
  onUpdateItem: (item: BomItem) => void;
  onDeleteItem: (id: string) => void;
  onResearchItem: (id: string) => void;
  onCompareItem?: (item: BomItem) => void;
  onSimulateItem?: (item: BomItem) => void;
  className?: string;
}

export const BomTable: React.FC<BomTableProps> = ({
  items,
  onUpdateItem,
  onDeleteItem,
  onResearchItem,
  onCompareItem,
  onSimulateItem,
  className = '',
}) => {
  return (
    <div className={`w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70 shadow-lg ${className}`}>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900/90 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th scope="col" className="w-12 px-3 py-3.5 text-center">#</th>
              <th scope="col" className="min-w-[180px] px-4 py-3.5">Tên linh kiện</th>
              <th scope="col" className="min-w-[170px] px-4 py-3.5">Thông số kỹ thuật</th>
              <th scope="col" className="w-16 px-3 py-3.5 text-center">SL</th>
              <th scope="col" className="min-w-[140px] px-4 py-3.5 text-right">Đơn giá (₫)</th>
              <th scope="col" className="min-w-[130px] px-4 py-3.5 text-right">Thành tiền (₫)</th>
              <th scope="col" className="min-w-[120px] px-4 py-3.5 text-center">Trạng thái</th>
              <th scope="col" className="min-w-[210px] px-4 py-3.5">Sản phẩm & Nguồn</th>
              <th scope="col" className="w-24 px-3 py-3.5 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Package className="h-10 w-10 text-slate-600" />
                    <p className="text-sm font-medium text-slate-300">Chưa có linh kiện nào trong BOM</p>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Nhập tên robot để AI tự động phân rã linh kiện hoặc tải lên file BOM Excel/CSV có sẵn.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <BomTableRow
                  key={item.id || idx}
                  item={item}
                  index={idx}
                  onUpdate={onUpdateItem}
                  onDelete={onDeleteItem}
                  onResearch={onResearchItem}
                  onCompare={onCompareItem}
                  onSimulate={onSimulateItem}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BomTable;
