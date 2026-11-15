'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';
import { BomItem } from '../lib/types';
import { parseBomFile } from '../lib/excel';

export interface FileUploadZoneProps {
  onFileLoaded: (items: BomItem[], fileName: string) => void;
  disabled?: boolean;
  className?: string;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileLoaded,
  disabled = false,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setErrorMessage(null);
    const lowerName = file.name.toLowerCase();
    const isSupported =
      lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv');

    if (!isSupported) {
      setErrorMessage('Định dạng file không hỗ trợ. Vui lòng chọn file .xlsx, .xls hoặc .csv');
      return;
    }

    try {
      setIsLoading(true);
      const arrayBuffer = await file.arrayBuffer();
      const items = await parseBomFile(arrayBuffer, file.name);

      if (items.length === 0) {
        setErrorMessage('Không tìm thấy linh kiện nào trong file. Vui lòng kiểm tra lại cấu trúc bảng.');
      } else {
        onFileLoaded(items, file.name);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi đọc file';
      setErrorMessage(`Lỗi xử lý file: ${msg}`);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isLoading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled || isLoading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleClick = () => {
    if (!disabled && !isLoading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
          isDragging
            ? 'border-cyan-400 bg-cyan-950/30 ring-2 ring-cyan-500/30'
            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80'
        } ${disabled || isLoading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isLoading}
        />

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/80 text-cyan-400 border border-slate-700/60 shadow-inner group-hover:scale-105 group-hover:bg-slate-800 transition-transform">
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          ) : (
            <UploadCloud className="h-6 w-6" />
          )}
        </div>

        <p className="mt-3 text-sm font-medium text-slate-200">
          {isLoading ? (
            'Đang trích xuất dữ liệu BOM...'
          ) : (
            <>
              Kéo thả file BOM vào đây hoặc{' '}
              <span className="text-cyan-400 underline underline-offset-4">duyệt tìm file</span>
            </>
          )}
        </p>

        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Hỗ trợ định dạng Excel (.xlsx, .xls) và CSV (.csv)
        </p>
      </div>

      {errorMessage && (
        <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-950/40 px-3.5 py-2 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export default FileUploadZone;
