'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, Wrench } from 'lucide-react';
import { BomItem, createNewBomItem } from '../lib/types';

export interface ManualItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: BomItem) => void;
}

export const ManualItemModal: React.FC<ManualItemModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('');
  const [specification, setSpecification] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setSpecification('');
      setQuantity(1);
      setNote('');
      setError(null);
    }
  }, [isOpen]);

  // Handle ESC key
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Tên linh kiện không được để trống');
      return;
    }

    const qty = Math.max(1, Number(quantity) || 1);
    const newItem = createNewBomItem(trimmedName, specification.trim(), qty);
    if (note.trim()) {
      newItem.note = note.trim();
    }

    onAdd(newItem);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Wrench className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-100">Thêm linh kiện mới</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-950/40 px-3.5 py-2.5 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tên linh kiện <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Động cơ Servo MG996R, Cảm biến siêu âm HC-SR04..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Thông số kỹ thuật
              </label>
              <input
                type="text"
                value={specification}
                onChange={(e) => setSpecification(e.target.value)}
                placeholder="Ví dụ: 180 độ, 11kg/cm, 5V..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Số lượng
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-sm text-slate-100 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-center font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Ghi chú
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú thêm về linh kiện hoặc yêu cầu nơi mua..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-cyan-500 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
            >
              <Plus className="h-4 w-4" />
              Thêm vào BOM
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualItemModal;
