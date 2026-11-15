'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileSpreadsheet, FileText } from 'lucide-react';
import { BomItem } from '@/lib/types';
import { exportBomToCsv, exportBomToExcel } from '@/lib/excel';

export interface ExportDropdownProps {
  items: BomItem[];
  projectName?: string;
  disabled?: boolean;
  className?: string;
}

export function ExportDropdown({
  items,
  projectName = 'Robotics_BOM',
  disabled = false,
  className = '',
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isEmpty = items.length === 0;
  const isDisabled = disabled || isEmpty;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getDateStr = () => new Date().toISOString().slice(0, 10);

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    if (items.length === 0) return;
    try {
      const buffer = exportBomToExcel(items, projectName);
      const blob = new Blob([new Uint8Array(buffer)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      triggerDownload(blob, `${projectName}_${getDateStr()}.xlsx`);
    } catch (err) {
      console.error('Lỗi khi xuất file Excel:', err);
    }
    setIsOpen(false);
  };

  const handleExportCsv = () => {
    if (items.length === 0) return;
    try {
      const csv = exportBomToCsv(items);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      triggerDownload(blob, `${projectName}_${getDateStr()}.csv`);
    } catch (err) {
      console.error('Lỗi khi xuất file CSV:', err);
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-xs font-semibold text-slate-200 shadow-sm transition-all hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-40"
        title={isEmpty ? 'Chưa có linh kiện để xuất' : 'Xuất dữ liệu BOM'}
      >
        <Download className="h-3.5 w-3.5 text-cyan-400" />
        <span>Xuất dữ liệu</span>
        <ChevronDown
          className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1.5 w-52 origin-top-right rounded-xl border border-slate-700/80 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-200 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold">Tải file Excel (.xlsx)</div>
              <div className="text-[10px] text-slate-400">Đầy đủ cột, công thức định dạng</div>
            </div>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-200 transition-colors hover:bg-cyan-500/10 hover:text-cyan-300"
          >
            <FileText className="h-4 w-4 text-cyan-400 shrink-0" />
            <div>
              <div className="font-semibold">Tải file CSV (.csv)</div>
              <div className="text-[10px] text-slate-400">UTF-8 BOM chuẩn tiếng Việt</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
