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
  ShieldCheck,
  Globe,
  Store,
  Scale,
  Cpu,
} from 'lucide-react';
import { BomItem, BomItemAlternative } from '../lib/types';
import { formatVnd } from './BomTable';

export interface BomTableRowProps {
  item: BomItem;
  index: number;
  onUpdate: (item: BomItem) => void;
  onDelete: (id: string) => void;
  onResearch: (id: string) => void;
  onCompare?: (item: BomItem) => void;
  onSimulate?: (item: BomItem) => void;
}

export function cleanUiText(text?: string): string {
  if (!text) return '';
  return text
    .replace(/\s*\([^)]*(?:Tier\s*[1-4]|Ưu tiên)[^)]*\)/gi, '')
    .replace(/\bTier\s*[1-4]\s*(?:Source|Supplier|VN)?\b/gi, '')
    .replace(/\b(?:Priority|Source)\s*Tier\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const BomTableRow: React.FC<BomTableRowProps> = ({
  item,
  index,
  onUpdate,
  onDelete,
  onResearch,
  onCompare,
  onSimulate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  // Editable fields state
  const [editName, setEditName] = useState(item.name);
  const [editSpecification, setEditSpecification] = useState(item.specification);
  const [editQuantity, setEditQuantity] = useState(item.quantity);
  const [editUnitPrice, setEditUnitPrice] = useState<string>(
    item.unitPrice > 0 ? String(item.unitPrice) : ''
  );
  const [editNote, setEditNote] = useState(item.note || '');

  // Quick inline edit state for quantity & price
  const [editingField, setEditingField] = useState<'quantity' | 'unitPrice' | null>(null);
  const [quickQuantity, setQuickQuantity] = useState(item.quantity);
  const [quickUnitPrice, setQuickUnitPrice] = useState<string>(
    item.unitPrice > 0 ? String(item.unitPrice) : ''
  );

  const handleStartEdit = () => {
    setEditName(item.name);
    setEditSpecification(item.specification);
    setEditQuantity(item.quantity);
    setEditUnitPrice(item.unitPrice > 0 ? String(item.unitPrice) : '');
    setEditNote(item.note || '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const qty = Math.max(1, Number(editQuantity) || 1);
    const parsedPrice = editUnitPrice.trim() ? Math.max(0, Number(editUnitPrice) || 0) : 0;
    const hasPrice = parsedPrice > 0;
    const totalPrice = qty * parsedPrice;

    onUpdate({
      ...item,
      name: editName.trim() || item.name,
      specification: editSpecification.trim(),
      quantity: qty,
      unitPrice: parsedPrice,
      totalPrice,
      manualPrice: {
        amount: hasPrice ? parsedPrice : null,
        currency: 'VND',
        entrySource: hasPrice ? 'user_input' : null,
        enteredAt: hasPrice ? new Date().toISOString() : undefined,
      },
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
    const parsedPrice = quickUnitPrice.trim() ? Math.max(0, Number(quickUnitPrice) || 0) : 0;
    const hasPrice = parsedPrice > 0;
    const totalPrice = item.quantity * parsedPrice;

    onUpdate({
      ...item,
      unitPrice: parsedPrice,
      totalPrice,
      manualPrice: {
        amount: hasPrice ? parsedPrice : null,
        currency: 'VND',
        entrySource: hasPrice ? 'user_input' : null,
        enteredAt: hasPrice ? new Date().toISOString() : undefined,
      },
    });
    setEditingField(null);
  };

  const handleSelectAlternative = (alt: BomItemAlternative) => {
    onUpdate({
      ...item,
      selectedLink: alt.url,
      supplierName: alt.supplierName || item.supplierName,
      supplierDomain: alt.supplierDomain || item.supplierDomain,
      supplierTier: alt.supplierTier || item.supplierTier,
      supplierCountry: alt.supplierCountry || item.supplierCountry,
      linkStatus: alt.linkStatus || 'verified',
      matchType: alt.matchType || 'alternative',
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

  const renderSupplierBadge = (
    tier?: number,
    country?: string,
    name?: string,
    domain?: string
  ) => {
    let displayName = cleanUiText(name || (domain ? domain.replace('www.', '') : ''));
    if (!displayName) return null;

    if (tier === 1 || domain?.includes('shopee.vn') || name?.toLowerCase().includes('shopee')) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-500/15 text-orange-300 border border-orange-500/30">
          <span>Shopee VN</span>
        </span>
      );
    }
    if (tier === 2) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <Store className="w-3 h-3 text-emerald-400" />
          <span>{displayName}</span>
        </span>
      );
    }
    if (tier === 3) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <span>{displayName}</span>
        </span>
      );
    }
    if (tier === 4 || country === 'INT') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
          <Globe className="w-3 h-3 text-purple-400" />
          <span>{displayName} (Quốc tế)</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
        <span>{displayName}</span>
      </span>
    );
  };

  const renderLinkVerificationBadge = (linkStatus?: string) => {
    if (linkStatus === 'verified') {
      return (
        <span
          className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-400"
          title="Đường dẫn sản phẩm thực tế đã xác minh"
        >
          <ShieldCheck className="w-3 h-3" />
          <span>Đã xác minh</span>
        </span>
      );
    }
    if (linkStatus === 'blocked') {
      return (
        <span
          className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-400"
          title="Website chặn kiểm tra tự động (mở link trực tiếp)"
        >
          <AlertCircle className="w-3 h-3" />
          <span>Chặn bot</span>
        </span>
      );
    }
    if (linkStatus === 'dead') {
      return (
        <span
          className="inline-flex items-center gap-0.5 text-[10px] font-medium text-rose-400"
          title="Đường dẫn bị lỗi 404 hoặc không tồn tại"
        >
          <AlertCircle className="w-3 h-3" />
          <span>Link lỗi</span>
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-400"
        title="Đường dẫn chưa kiểm tra HTTP"
      >
        <span>Chưa xác minh</span>
      </span>
    );
  };

  const renderMatchTypeBadge = (matchType?: string) => {
    if (!matchType) return null;
    if (matchType === 'best_match' || matchType === 'exact_match') {
      return (
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          title="Đúng linh kiện, đúng model hoặc quy cách cần tìm"
        >
          Khớp chính xác
        </span>
      );
    }
    if (matchType === 'strong_match' || matchType === 'most_reliable') {
      return (
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30"
          title="Cùng chức năng và các thông số quan trọng phù hợp"
        >
          Phù hợp cao
        </span>
      );
    }
    if (matchType === 'possible_alternative' || matchType === 'alternative') {
      return (
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30"
          title="Có khả năng đáp ứng nhu cầu nhưng cần kiểm tra thêm thông số"
        >
          Lựa chọn thay thế
        </span>
      );
    }
    if (matchType === 'related') {
      return (
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/15 text-purple-400 border border-purple-500/30"
          title="Sản phẩm liên quan mang tính tham khảo"
        >
          Tham khảo
        </span>
      );
    }
    return null;
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
              {item.subsystem && (
                <span className="text-[11px] text-cyan-400/80">{item.subsystem}</span>
              )}
              {item.note && (
                <span className="text-xs text-slate-500 truncate max-w-xs">{cleanUiText(item.note)}</span>
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
              className="w-14 rounded bg-slate-800 px-2 py-1 text-center text-sm text-slate-100 border border-slate-700 focus:outline-none focus:border-cyan-500"
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
              className="w-14 rounded bg-slate-800 px-2 py-1 text-center text-sm text-slate-100 border border-cyan-500 focus:outline-none"
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

        {/* Đơn giá thủ công (Manual Pricing) */}
        <td className="px-4 py-3 text-right">
          {item.alreadyOwned ? (
            <span className="inline-block rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 border border-amber-500/20">
              Đã có sẵn
            </span>
          ) : isEditing ? (
            <div className="flex items-center justify-end gap-1">
              <input
                type="number"
                min="0"
                step="1000"
                placeholder="Nhập giá"
                value={editUnitPrice}
                onChange={(e) => setEditUnitPrice(e.target.value)}
                className="w-24 rounded bg-slate-800 px-2 py-1 text-right text-sm text-slate-100 border border-slate-700 focus:outline-none focus:border-cyan-500"
              />
              <span className="text-xs text-slate-400">₫</span>
            </div>
          ) : editingField === 'unitPrice' ? (
            <div className="flex items-center justify-end gap-1">
              <input
                type="number"
                min="0"
                step="1000"
                placeholder="Nhập giá"
                autoFocus
                value={quickUnitPrice}
                onChange={(e) => setQuickUnitPrice(e.target.value)}
                onBlur={handleSaveQuickUnitPrice}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveQuickUnitPrice();
                  if (e.key === 'Escape') setEditingField(null);
                }}
                className="w-24 rounded bg-slate-800 px-2 py-1 text-right text-sm text-slate-100 border border-cyan-500 focus:outline-none"
              />
              <span className="text-xs text-slate-400">₫</span>
            </div>
          ) : item.unitPrice > 0 ? (
            <button
              type="button"
              onClick={() => {
                setQuickUnitPrice(String(item.unitPrice));
                setEditingField('unitPrice');
              }}
              title="Click để sửa đơn giá thủ công"
              className="cursor-pointer rounded px-2 py-0.5 hover:bg-slate-800/80 font-mono text-xs text-emerald-400 inline-flex items-center gap-1"
            >
              <span>{formatVnd(item.unitPrice)} ₫</span>
              <Edit2 className="w-2.5 h-2.5 text-slate-500" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setQuickUnitPrice('');
                setEditingField('unitPrice');
              }}
              title="Click để nhập đơn giá thủ công"
              className="rounded border border-dashed border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-[11px] font-medium text-cyan-400 hover:bg-cyan-500/20 transition-colors"
            >
              + Nhập giá
            </button>
          )}
        </td>

        {/* Thành tiền */}
        <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-slate-100">
          {item.alreadyOwned ? (
            <span className="text-slate-500 italic">0 ₫ (Sẵn có)</span>
          ) : item.unitPrice <= 0 ? (
            <span className="text-slate-500 font-normal">—</span>
          ) : (
            <span className="text-emerald-400">{formatVnd(calculatedTotal)} ₫</span>
          )}
        </td>

        {/* Trạng thái */}
        <td className="px-4 py-3 text-center">{renderStatusBadge()}</td>

        {/* Sản phẩm & Nguồn link */}
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {renderSupplierBadge(
                item.supplierTier,
                item.supplierCountry,
                item.supplierName,
                item.supplierDomain
              )}
              {item.matchType && renderMatchTypeBadge(item.matchType)}
              {item.selectedLink && renderLinkVerificationBadge(item.linkStatus)}
            </div>

            {item.selectedLink ? (
              <a
                href={item.selectedLink}
                target="_blank"
                rel="noopener noreferrer"
                title={item.selectedLink}
                className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 hover:underline max-w-[210px] truncate"
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
                title="Tìm lại sản phẩm"
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

      {/* Expanded alternatives list (Grouped by Source Category per Mandatory Policy) */}
      {showAlternatives && item.alternatives && item.alternatives.length > 0 && (() => {
        const shopeeAlts = item.alternatives.filter(
          (a) => a.supplierTier === 1 || a.url.includes('shopee.vn') || a.supplierDomain?.includes('shopee.vn')
        );
        const specializedAlts = item.alternatives.filter(
          (a) => (a.supplierTier === 2 || a.tier === 2) && !a.url.includes('shopee.vn') && !a.supplierDomain?.includes('shopee.vn')
        );
        const otherMarketAlts = item.alternatives.filter(
          (a) => (a.supplierTier === 3 || a.tier === 3) && !a.url.includes('shopee.vn') && !a.supplierDomain?.includes('shopee.vn')
        );
        const intlAlts = item.alternatives.filter(
          (a) => a.supplierTier === 4 || a.tier === 4 || a.supplierCountry === 'INT' || a.country === 'INT'
        );

        const groups = [
          { title: 'Shopee Việt Nam', items: shopeeAlts, badgeColor: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
          { title: 'Cửa hàng linh kiện chuyên ngành', items: specializedAlts, badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
          { title: 'Các sàn thương mại điện tử khác', items: otherMarketAlts, badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
          { title: 'Nhà cung cấp quốc tế', items: intlAlts, badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
        ].filter((g) => g.items.length > 0);

        return (
          <tr className="bg-slate-900/60 border-b border-slate-800">
            <td colSpan={9} className="px-6 py-3">
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Các nguồn mua thay thế ({item.alternatives.length}):
                    </span>
                    {onCompare && item.alternatives.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onCompare(item)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors"
                        title="So sánh chi tiết thông số và ưu/nhược điểm các nguồn"
                      >
                        <Scale className="w-3 h-3" />
                        <span>So sánh chi tiết</span>
                      </button>
                    )}
                    {onSimulate && (
                      <button
                        type="button"
                        onClick={() => onSimulate(item)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-colors"
                        title="Mô phỏng thay thế linh kiện này và kiểm tra ảnh hưởng hệ thống"
                      >
                        <Cpu className="w-3 h-3" />
                        <span>Mô phỏng What-If</span>
                      </button>
                    )}
                  </div>
                  {item.searchLog && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      <span className="font-medium text-orange-400">Shopee log:</span>
                      <span>
                        {item.searchLog.shopeeFound
                          ? `Tìm thấy ${item.searchLog.shopeeProductsRetained} sản phẩm`
                          : 'Đã gửi truy vấn Shopee qua SearXNG'}
                      </span>
                    </div>
                  )}
                </div>

                {groups.map((grp, gIdx) => (
                  <div key={gIdx} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${grp.badgeColor}`}>
                        {grp.title} ({grp.items.length})
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {grp.items.map((alt, altIdx) => (
                        <div
                          key={altIdx}
                          className="flex flex-wrap items-center justify-between gap-2 rounded bg-slate-900/70 p-2.5 text-xs border border-slate-800/80 hover:border-slate-700 transition-colors"
                        >
                          <div className="flex flex-col flex-1 min-w-[220px]">
                            <div className="flex items-center gap-2">
                              {renderSupplierBadge(
                                alt.supplierTier,
                                alt.supplierCountry,
                                alt.supplierName,
                                alt.supplierDomain
                              )}
                              {alt.matchType && renderMatchTypeBadge(alt.matchType)}
                              {renderLinkVerificationBadge(alt.linkStatus)}
                            </div>

                            <div className="flex items-center gap-1.5 font-medium text-slate-200 mt-1">
                              <span className="truncate">{alt.title || getDomainFromUrl(alt.url)}</span>
                              <a
                                href={alt.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 hover:text-cyan-300"
                                title="Mở link xem sản phẩm"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>

                            {alt.reason && (
                              <span className="text-[11px] text-slate-400 mt-0.5">{cleanUiText(alt.reason)}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleSelectAlternative(alt)}
                              className="rounded bg-cyan-600/20 px-2.5 py-1 text-xs font-medium text-cyan-400 hover:bg-cyan-600/30 border border-cyan-500/30 transition-colors"
                            >
                              Chọn nguồn này
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {item.searchLog?.shopeeQueries && item.searchLog.shopeeQueries.length > 0 && (
                  <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/50 flex flex-wrap gap-x-3">
                    <span>Truy vấn Shopee đã thực hiện:</span>
                    {item.searchLog.shopeeQueries.map((q, qIdx) => (
                      <code key={qIdx} className="bg-slate-900 px-1 py-0.2 text-slate-400 rounded">
                        {q}
                      </code>
                    ))}
                  </div>
                )}
              </div>
            </td>
          </tr>
        );
      })()}
    </>
  );
};

export default BomTableRow;
