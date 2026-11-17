'use client';

import React from 'react';
import { Package } from 'lucide-react';
import { BomItem } from '../lib/types';
import { formatPriceDisplay } from '../lib/price';
import BomTableRow from './BomTableRow';

export interface BomSummary {
  totalItems: number;
  foundItems: number;
  pendingItems: number;
  totalEstimatedBudget: number;
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
      totalEstimatedBudget: 0,
      hasUnavailablePrice: false,
    };
  }

  const totalItems = items.length;
  const foundItems = items.filter((item) => item.status === 'found').length;
  const pendingItems = items.filter((item) => item.status !== 'found').length;
  let hasUnavailablePrice = false;

  const totalEstimatedBudget = items.reduce((sum, item) => {
    if (item.alreadyOwned) return sum;
    if (item.status === 'found' && (item.unitPrice <= 0 || item.priceInfo?.status === 'unavailable')) {
      hasUnavailablePrice = true;
      return sum;
    }
    const qty = Math.max(0, Number(item.quantity) || 0);
    const unit = Math.max(0, Number(item.unitPrice) || 0);
    const itemTotal =
      typeof item.totalPrice === 'number' && !isNaN(item.totalPrice) && item.totalPrice > 0
        ? item.totalPrice
        : qty * unit;
    return sum + itemTotal;
  }, 0);

  return {
    totalItems,
    foundItems,
    pendingItems,
    totalEstimatedBudget,
    hasUnavailablePrice,
  };
}

export interface BomTableProps {
  items: BomItem[];
  onUpdateItem: (item: BomItem) => void;
  onDeleteItem: (id: string) => void;
  onResearchItem: (id: string) => void;
  className?: string;
}

export const BomTable: React.FC<BomTableProps> = ({
  items,
  onUpdateItem,
  onDeleteItem,
  onResearchItem,
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
              <th scope="col" className="min-w-[180px] px-4 py-3.5">Thông số kỹ thuật</th>
              <th scope="col" className="w-20 px-3 py-3.5 text-center">SL</th>
              <th scope="col" className="min-w-[120px] px-4 py-3.5 text-right">Đơn giá (₫)</th>
              <th scope="col" className="min-w-[120px] px-4 py-3.5 text-right">Thành tiền (₫)</th>
              <th scope="col" className="min-w-[130px] px-4 py-3.5 text-center">Trạng thái</th>
              <th scope="col" className="min-w-[180px] px-4 py-3.5">Link mua chính</th>
              <th scope="col" className="w-28 px-3 py-3.5 text-center">Thao tác</th>
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
