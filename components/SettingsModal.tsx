'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Eye,
  EyeOff,
  Check,
  RotateCcw,
  Radio,
  Server,
  Key,
  Cpu,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { AppSettings } from '@/lib/types';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings?: AppSettings;
  onSaved?: (settings: AppSettings) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  searxngUrl: 'http://localhost:8080',
  llmBaseUrl: 'https://api.openai.com/v1',
  llmModel: 'gpt-4o-mini',
  llmApiKey: '',
};

const PRESET_PROVIDERS = [
  {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o'],
  },
  {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
  },
  {
    name: 'Gemini (OpenAI-compat)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro'],
  },
  {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['meta-llama/llama-3.3-70b-instruct', 'deepseek/deepseek-chat'],
  },
];

export function SettingsModal({
  isOpen,
  onClose,
  currentSettings,
  onSaved,
}: SettingsModalProps) {
  const [form, setForm] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingSearx, setIsTestingSearx] = useState(false);
  const [searxStatus, setSearxStatus] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearxStatus(null);
      setSaveSuccess(false);
      setErrorMessage(null);
      return;
    }

    if (currentSettings) {
      setForm(currentSettings);
    } else {
      const stored = localStorage.getItem('robotics_bom_settings');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setForm({ ...DEFAULT_SETTINGS, ...parsed });
        } catch {
          setForm(DEFAULT_SETTINGS);
        }
      } else {
        // Fetch from server settings route
        fetch('/api/settings')
          .then((res) => res.json())
          .then((data) => {
            if (data && !data.error) {
              setForm((prev) => ({
                ...prev,
                searxngUrl: data.searxngUrl || prev.searxngUrl,
                llmBaseUrl: data.llmBaseUrl || prev.llmBaseUrl,
                llmModel: data.llmModel || prev.llmModel,
                llmApiKey: data.llmApiKey || prev.llmApiKey,
              }));
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, currentSettings]);

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTestSearxng = async () => {
    setIsTestingSearx(true);
    setSearxStatus(null);
    try {
      const targetUrl = form.searxngUrl.trim() || DEFAULT_SETTINGS.searxngUrl;
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'arduino uno r3',
          customUrl: targetUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSearxStatus({
          tested: true,
          success: false,
          message: data.error || 'SearXNG trả về lỗi HTTP ' + res.status,
        });
      } else if (Array.isArray(data.results) && data.results.length > 0) {
        setSearxStatus({
          tested: true,
          success: true,
          message: `Kết nối tốt! Tìm thấy ${data.results.length} kết quả từ SearXNG.`,
        });
      } else {
        setSearxStatus({
          tested: true,
          success: true,
          message: 'Kết nối được nhưng không nhận được kết quả (có thể do rate-limit engine).',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không kết nối được đến máy chủ SearXNG';
      setSearxStatus({
        tested: true,
        success: false,
        message: msg,
      });
    } finally {
      setIsTestingSearx(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const cleanSettings: AppSettings = {
        searxngUrl: form.searxngUrl.trim() || DEFAULT_SETTINGS.searxngUrl,
        llmBaseUrl: form.llmBaseUrl.trim() || DEFAULT_SETTINGS.llmBaseUrl,
        llmModel: form.llmModel.trim() || DEFAULT_SETTINGS.llmModel,
        llmApiKey: form.llmApiKey.trim(),
      };

      // 1. Send to server
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanSettings),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Không thể lưu cài đặt lên server');
      }

      // 2. Save in localStorage
      localStorage.setItem('robotics_bom_settings', JSON.stringify(cleanSettings));

      if (onSaved) {
        onSaved(cleanSettings);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi lưu cài đặt';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setForm(DEFAULT_SETTINGS);
    setSearxStatus(null);
    setErrorMessage(null);
  };

  const handleSelectPreset = (preset: typeof PRESET_PROVIDERS[0]) => {
    setForm((prev) => ({
      ...prev,
      llmBaseUrl: preset.baseUrl,
      llmModel: preset.models[0],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl text-slate-100 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Cấu hình Hệ thống</h3>
              <p className="text-xs text-slate-400">
                Tùy chỉnh SearXNG Search Engine và API mô hình ngôn ngữ lớn (LLM)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-300">
            <Check className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>Đã lưu cấu hình thành công!</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="mt-4 space-y-4">
          {/* Section 1: SearXNG Configuration */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                <Server className="h-3.5 w-3.5" />
                Địa chỉ SearXNG URL
              </label>
              <button
                type="button"
                onClick={handleTestSearxng}
                disabled={isTestingSearx}
                className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 hover:underline disabled:opacity-50"
              >
                {isTestingSearx ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Đang thử...
                  </>
                ) : (
                  <>
                    <Radio className="h-3 w-3" />
                    Kiểm tra kết nối
                  </>
                )}
              </button>
            </div>

            <input
              type="url"
              value={form.searxngUrl}
              onChange={(e) => setForm({ ...form, searxngUrl: e.target.value })}
              placeholder="http://localhost:8080"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />

            {searxStatus && (
              <div
                className={`flex items-center gap-2 rounded-lg p-2 text-[11px] ${
                  searxStatus.success
                    ? 'border border-emerald-500/20 bg-emerald-950/30 text-emerald-300'
                    : 'border border-amber-500/20 bg-amber-950/30 text-amber-300'
                }`}
              >
                {searxStatus.success ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                )}
                <span>{searxStatus.message}</span>
              </div>
            )}
          </div>

          {/* Section 2: LLM Configuration */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                <Cpu className="h-3.5 w-3.5" />
                Cấu hình LLM (Mô hình ngôn ngữ)
              </label>

              {/* Quick Presets */}
              <div className="flex items-center gap-1">
                {PRESET_PROVIDERS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Base URL */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400">LLM Base URL (OpenAI-compatible)</span>
              <input
                type="url"
                value={form.llmBaseUrl}
                onChange={(e) => setForm({ ...form, llmBaseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {/* Model Name */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400">LLM Model Name</span>
              <input
                type="text"
                value={form.llmModel}
                onChange={(e) => setForm({ ...form, llmModel: e.target.value })}
                placeholder="gpt-4o-mini hoặc gemini-1.5-flash"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {/* API Key */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Key className="h-3 w-3" />
                  API Key
                </span>
                <span className="text-[10px] text-slate-500">
                  Lưu trữ cục bộ an toàn & trên runtime server
                </span>
              </div>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={form.llmApiKey}
                  onChange={(e) => setForm({ ...form, llmApiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 pl-3 pr-10 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Đặt lại mặc định
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-3.5 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:from-cyan-400 hover:to-blue-500 transition-all focus:ring-2 focus:ring-cyan-400/40 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Lưu cài đặt
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
