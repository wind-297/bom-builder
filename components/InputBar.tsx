'use client';

import React, { useState } from 'react';
import { Bot, Loader2, Sparkles, Send } from 'lucide-react';

export interface InputBarProps {
  onDecompose: (prompt: string) => Promise<void> | void;
  isLoading?: boolean;
  disabled?: boolean;
}

const SAMPLE_PROMPTS = [
  'Robot cứu hỏa tự hành dò line',
  'Xe robot 4 bánh Mecanum tránh vật cản',
  'Cánh tay robot 4 bậc tự do gắp vật',
  'Robot thám hiểm mini camera ESP32-CAM',
];

export const InputBar: React.FC<InputBarProps> = ({
  onDecompose,
  isLoading = false,
  disabled = false,
}) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || isLoading || disabled) return;
    onDecompose(trimmed);
  };

  const handleSelectSample = (sample: string) => {
    if (isLoading || disabled) return;
    setPrompt(sample);
  };

  return (
    <div className="w-full space-y-2.5">
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center rounded-2xl border border-slate-800 bg-slate-900/90 p-1.5 shadow-xl backdrop-blur-md transition-all focus-within:border-cyan-500/50 focus-within:ring-2 focus-within:ring-cyan-500/20"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
          <Bot className="h-5 w-5" />
        </div>

        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isLoading || disabled}
          placeholder="Nhập ý tưởng/tên robot (ví dụ: Robot cứu hỏa tự hành dò line, Xe Mecanum 4 bánh...)"
          className="flex-1 bg-transparent px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={!prompt.trim() || isLoading || disabled}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md transition-all hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span>Đang phân rã BOM...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>AI Phân Rã BOM</span>
            </>
          )}
        </button>
      </form>

      {/* Gợi ý nhanh */}
      <div className="flex flex-wrap items-center gap-1.5 px-1 text-xs text-slate-400">
        <span className="text-slate-500">Gợi ý mẫu:</span>
        {SAMPLE_PROMPTS.map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => handleSelectSample(sample)}
            disabled={isLoading || disabled}
            className="rounded-lg border border-slate-800/80 bg-slate-950/60 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            {sample}
          </button>
        ))}
      </div>
    </div>
  );
};

export default InputBar;
