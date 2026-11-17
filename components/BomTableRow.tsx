'use client';

import React, { useState } from 'react';
import {
  ExternalLink,
  Trash2,
  Edit2,
  RotateCw,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronDown,
  Check,
  X,
} from 'lucide-react';
import { BomItem, BomItemAlternative } from '../lib/types';
import { formatVnd } from './BomTable';

export interface BomTableRowProps {
  item: BomItem;
  index: number;
  onUpdate: (item: BomItem) => void;
  onDelete: (id: string) => void;
  onResearch: (id: string) => void;
}

export const BomTableRow: React.FC<BomTableRowProps> = ({
  item,
  index,
  onUpdate,
  onDelete,
  onResearch,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  // Editable fields state
  const [editName, setEditName] = useState(item.name);
  const [editSpecification, setEditSpecification] = useState(item.specification);
  const [editQuantity, setEditQuantity] = useState(item.quantity);
  const [editUnitPrice, setEditUnitPrice] = useState(item.unitPrice);
  const [editNote, setEditNote] = useState(item.note || '');

  // Quick inline edit state for quantity & price when not in full row edit mode
  const [editingField, setEditingField] = useState<'quantity' | 'unitPrice' | null>(null);
  const [quickQuantity, setQuickQuantity] = useState(item.quantity);
  const [quickUnitPrice, setQuickUnitPrice] = useState(item.unitPrice);

  const handleStartEdit = () => {
    setEditName(item.name);
    setEditSpecification(item.specification);
    setEditQuantity(item.quantity);
    setEditUnitPrice(item.unitPrice);
    setEditNote(item.note || '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const qty = Math.max(1, Number(editQuantity) || 1);
    const unitPrice = Math.max(0, Number(editUnitPrice) || 0);
    const totalPrice = qty * unitPrice;

    onUpdate({
      ...item,
      name: editName.trim() || item.name,
      specification: editSpecification.trim(),
      quantity: qty,
      unitPrice,
      totalPrice,
      note: editNote.trim(),
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveQuickQuantity = () => {
    const qty = Math.max(1, Number(quickQuantity) || 1);
    const totalPrice = qty * item.unitPrice;
    onUpdate({
      ...item,
      quantity: qty,
      totalPrice,
    });
    setEditingField(null);
  };

  const handleSaveQuickUnitPrice = () => {
    const unitPrice = Math.max(0, Number(quickUnitPrice) || 0);
    const totalPrice = item.quantity * unitPrice;
    onUpdate({
      ...item,
      unitPrice,
      totalPrice,
    });
    setEditingField(null);
  };

  const handleSelectAlternative = (alt: BomItemAlternative) => {
    const unitPrice = typeof alt.price === 'number' && alt.price > 0 ? alt.price : item.unitPrice;
    const totalPrice = item.quantity * unitPrice;

    onUpdate({
      ...item,
      selectedLink: alt.url,
      unitPrice,
      totalPrice,
      status: 'found',
    });
    setShowAlternatives(false);
  };

  const renderStatusBadge = () => {
    switch (item.status) {
      case 'found':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Tìm thấy</span>
          </span>
        );
      case 'searching':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <RotateCw className="w-3.5 h-3.5 animate-spin" />
            <span>Đang tìm</span>
          </span>
        );
      case 'not_found':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Chưa thấy</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            <span>Chờ tìm</span>
          </span>
        );
    }
  };

  const getDomainFromUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const calculatedTotal =
    typeof item.totalPrice === 'number' && !isNaN(item.totalPrice) && item.totalPrice > 0
      ? item.totalPrice
      : item.quantity * item.unitPrice;

  return (
    <>
      <tr
        className={`border-b border-slate-800/60 transition-colors ${
          isEditing ? 'bg-slate-900/70' : 'hover:bg-slate-900/40'
        }`}
      >
        {/* STT */}
        <td className="px-3 py-3 text-center text-xs text-slate-500 font-mono">
          {index + 1}
        </td>

        {/* Tên linh kiện */}
        <td className="px-4 py-3 font-medium text-slate-100">
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded bg-slate-800 px-2 py-1 text-sm text-slate-100 border border-slate-700 focus:outline-none focus:border-cyan-500"
              placeholder="Tên linh kiện"
            />
          ) : (
            <div className="flex flex-col">
              <span className="text-slate-100 font-medium">{item.name}</span>
              {item.note && (
                <span className="text-xs text-slate-500 truncate max-w-xs">{item.note}</span>
              )}
            </div>
          )}
        </td>

        {/* Thông số kỹ thuật */}
        <td className="px-4 py-3 text-slate-300">
          {isEditing ? (
            <input
              type="text"
              value={editSpecification}
              onChange={(e) => setEditSpecification(e.target.value)}
              className="w-full rounded bg-slate-800 px-2 py-1 text-sm text-slate-100 border border-slate-700 focus:outline-none focus:border-cyan-500"
              placeholder="Thông số kỹ thuật"
            />
          ) : (
            <span className="text-xs text-slate-400">{item.specification || '—'}</span>
          )}
        </td>

        {/* Số lượng */}
        <td className="px-3 py-3 text-center">
          {isEditing ? (
            <input
              type="number"
              min="1"
              value={editQuantity}
              onChange={(e) => setEditQuantity(Number(e.target.value))}
              className="w-16 rounded bg-slate-800 px-2 py-1 text-center text-sm text-slate-100 border border-slate-700 focus:outline-none focus:border-cyan-500"
            />
          ) : editingField === 'quantity' ? (
            <input
              type="number"
              min="1"
              autoFocus
              value={quickQuantity}
              onChange={(e) => setQuickQuantity(Number(e.target.value))}
              onBlur={handleSaveQuickQuantity}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveQuickQuantity();
                if (e.key === 'Escape') setEditingField(null);
              }}
              className="w-16 rounded bg-slate-800 px-2 py-1 text-center text-sm text-slate-100 border border-cyan-500 focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setQuickQuantity(item.quantity);
                setEditingField('quantity');
              }}
              title="Click để sửa số lượng"
              className="cursor-pointer rounded px-2 py-0.5 hover:bg-slate-800/80 font-mono text-sm text-slate-200"
            >
              {item.quantity}
            </button>
          )}
        </td>

        {/* Đơn giá */}
        <td className="px-4 py-3 text-right">
          {item.alreadyOwned ? (
            <span className="inline-block rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 border border-amber-500/20">
              Đã có sẵn
            </span>
          ) : isEditing ? (
            <input
              type="number"
              min="0"
              step="1000"
              value={editUnitPrice}
              onChange={(e) => setEditUnitPrice(Number(e.target.value))}
              className="w-24 rounded bg-slate-800 px-2 py-1 text-right text-sm text-slate-100 border border-slate-700 focus:outline-none focus:border-cyan-500"
            />
          ) : editingField === 'unitPrice' ? (
            <input
              type="number"
              min="0"
              step="1000"
              autoFocus
              value={quickUnitPrice}
              onChange={(e) => setQuickUnitPrice(Number(e.target.value))}
              onBlur={handleSaveQuickUnitPrice}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveQuickUnitPrice();
                if (e.key === 'Escape') setEditingField(null);
              }}
              className="w-24 rounded bg-slate-800 px-2 py-1 text-right text-sm text-slate-100 border border-cyan-500 focus:outline-none"
            />
          ) : item.status === 'found' && (item.unitPrice <= 0 || item.priceInfo?.status === 'unavailable') ? (
            <button
              type="button"
              onClick={() => {
                setQuickUnitPrice(item.unitPrice);
                setEditingField('unitPrice');
              }}
              title="Click để nhập giá thủ công"
              className="text-[11px] text-amber-300/90 italic hover:underline cursor-pointer"
            >
              Chưa lấy được giá — Xem shop
            </button>
          ) : item.priceInfo?.status === 'range' && item.priceInfo.minAmount && item.priceInfo.maxAmount ? (
            <button
              type="button"
              onClick={() => {
                setQuickUnitPrice(item.unitPrice);
                setEditingField('unitPrice');
              }}
              title="Click để sửa đơn giá"
              className="cursor-pointer rounded px-2 py-0.5 hover:bg-slate-800/80 font-mono text-xs text-amber-300"
            >
              {formatVnd(item.priceInfo.minAmount)} - {formatVnd(item.priceInfo.maxAmount)}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setQuickUnitPrice(item.unitPrice);
                setEditingField('unitPrice');
              }}
              title="Click để sửa đơn giá"
              className="cursor-pointer rounded px-2 py-0.5 hover:bg-slate-800/80 font-mono text-xs text-slate-300 inline-flex items-center gap-1"
            >
              <span>{formatVnd(item.unitPrice)}</span>
              {item.priceInfo?.status === 'verified' && (
                <span className="text-[10px] text-emerald-400 font-sans" title="Đã xác thực từ shop">✓</span>
              )}
            </button>
          )}
        </td>

        {/* Thành tiền */}
        <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-slate-100">
          {item.alreadyOwned ? (
            <span className="text-slate-500 italic">0 (sẵn có)</span>
          ) : item.unitPrice <= 0 ? (
            <span className="text-slate-500">—</span>
          ) : (
            formatVnd(calculatedTotal)
          )}
        </td>

        {/* Trạng thái */}
        <td className="px-4 py-3 text-center">{renderStatusBadge()}</td>

        {/* Link mua chính + Alternatives */}
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
            {item.selectedLink ? (
              <a
                href={item.selectedLink}
                target="_blank"
                rel="noopener noreferrer"
                title={item.selectedLink}
                className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 hover:underline max-w-[180px] truncate"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{getDomainFromUrl(item.selectedLink)}</span>
              </a>
            ) : (
              <span className="text-xs text-slate-500 italic">Chưa có link</span>
            )}

            {item.alternatives && item.alternatives.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAlternatives(!showAlternatives)}
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 mt-0.5"
              >
                <span>{item.alternatives.length} link thay thế</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${
                    showAlternatives ? 'rotate-180' : ''
                  }`}
                />
              </button>
            )}
          </div>
        </td>

        {/* Thao tác */}
        <td className="px-3 py-3 text-center">
          {isEditing ? (
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={handleSaveEdit}
                title="Lưu"
                className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                title="Hủy"
                className="p-1 rounded text-slate-400 hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={handleStartEdit}
                title="Sửa dòng"
                className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onResearch(item.id)}
                title="Tìm lại với AI"
                className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                title="Xóa linh kiện"
                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </td>
      </tr>

      {/* Expanded alternatives list */}
      {showAlternatives && item.alternatives && item.alternatives.length > 0 && (
        <tr className="bg-slate-900/60 border-b border-slate-800">
          <td colSpan={9} className="px-6 py-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Các link mua thay thế ({item.alternatives.length}):
              </div>
              <div className="space-y-2">
                {item.alternatives.map((alt, altIdx) => (
                  <div
                    key={altIdx}
                    className="flex flex-wrap items-center justify-between gap-2 rounded bg-slate-900/70 p-2 text-xs border border-slate-800/80"
                  >
                    <div className="flex flex-col flex-1 min-w-[200px]">
                      <div className="flex items-center gap-1.5 font-medium text-slate-200">
                        <span className="truncate">{alt.title || getDomainFromUrl(alt.url)}</span>
                        <a
                          href={alt.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300"
                          title="Mở link"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      {alt.reason && (
                        <span className="text-[11px] text-slate-400 mt-0.5">{alt.reason}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {typeof alt.price === 'number' && alt.price > 0 && (
                        <span className="font-mono text-emerald-400 font-semibold">
                          {formatVnd(alt.price)} ₫
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSelectAlternative(alt)}
                        className="rounded bg-cyan-600/20 px-2 py-1 text-[11px] font-medium text-cyan-400 hover:bg-cyan-600/30 border border-cyan-500/30 transition-colors"
                      >
                        Chọn link này
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default BomTableRow;
