'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Upload,
  Search,
  Plus,
  Trash2,
  StopCircle,
  Loader2,
  Cpu,
  AlertCircle,
  X,
  Sliders,
} from 'lucide-react';
import { BomItem, createNewBomItem, AppSettings } from '@/lib/types';
import { buildProductSearchQuery } from '@/lib/searxng';
import { InputBar } from '@/components/InputBar';
import { FileUploadZone } from '@/components/FileUploadZone';
import { ManualItemModal } from '@/components/ManualItemModal';
import { BomTable } from '@/components/BomTable';
import { SummaryCard } from '@/components/SummaryCard';
import { ExportDropdown } from '@/components/ExportDropdown';
import { SettingsModal } from '@/components/SettingsModal';
import { CompatibilityBanner } from '@/components/CompatibilityBanner';

export default function Home() {
  const [items, setItems] = useState<BomItem[]>([]);
  const [activeTab, setActiveTab] = useState<'ai' | 'upload'>('ai');
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [budgetConstraint, setBudgetConstraint] = useState<number | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [searchProgress, setSearchProgress] = useState<{
    current: number;
    total: number;
    currentItemName?: string;
  }>({ current: 0, total: 0 });
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load settings & saved workspace on mount
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem('robotics_bom_settings');
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
      const storedWorkspace = localStorage.getItem('robotics_bom_workspace_v1');
      if (storedWorkspace) {
        const parsed = JSON.parse(storedWorkspace);
        if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
          setItems(parsed.items);
          if (parsed.projectName) setProjectName(parsed.projectName);
          if (parsed.budgetConstraint) setBudgetConstraint(parsed.budgetConstraint);
        }
      }
    } catch {}
  }, []);

  // Autosave workspace on changes
  useEffect(() => {
    try {
      if (items.length > 0) {
        const state = {
          version: 1,
          items,
          projectName,
          budgetConstraint,
          savedAt: Date.now(),
        };
        localStorage.setItem('robotics_bom_workspace_v1', JSON.stringify(state));
      } else {
        localStorage.removeItem('robotics_bom_workspace_v1');
      }
    } catch {}
  }, [items, projectName, budgetConstraint]);

  // 1. Phân rã BOM qua AI
  const handleDecompose = async (prompt: string) => {
    setIsDecomposing(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: prompt,
          apiKey: settings?.llmApiKey,
          baseUrl: settings?.llmBaseUrl,
          model: settings?.llmModel,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Lỗi khi phân rã BOM');
      }

      if (data.isAmbiguous && data.clarifyingQuestion) {
        setErrorBanner(data.clarifyingQuestion);
        return;
      }

      if (data.budgetConstraint) {
        setBudgetConstraint(data.budgetConstraint);
      }
      if (data.projectName) {
        setProjectName(data.projectName);
      }

      const rawItems = Array.isArray(data.items) ? data.items : [];
      if (rawItems.length === 0) {
        setErrorBanner('AI không tìm thấy linh kiện nào. Hãy thử mô tả cụ thể hơn.');
        return;
      }

      const newItems: BomItem[] = rawItems.map((raw: Partial<BomItem>) => {
        const item = createNewBomItem(
          raw.name || 'Linh kiện',
          raw.specification || '',
          raw.quantity || 1
        );
        if (typeof raw.unitPrice === 'number' && raw.unitPrice > 0) {
          item.unitPrice = raw.unitPrice;
          item.totalPrice = item.quantity * item.unitPrice;
        }
        if (raw.subsystem) item.subsystem = raw.subsystem;
        if (raw.priority) item.priority = raw.priority;
        if (raw.alreadyOwned) item.alreadyOwned = raw.alreadyOwned;
        if (raw.priceInfo) item.priceInfo = raw.priceInfo;
        if (raw.note) item.note = raw.note;
        return item;
      });

      setItems((prev) => [...prev, ...newItems]);

      // Tự động kích hoạt tìm kiếm và định giá chi tiết ngay sau khi bóc tách
      setTimeout(() => {
        runBatchSearchAndOptimize(newItems);
      }, 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi phân rã BOM';
      setErrorBanner(msg);
    } finally {
      setIsDecomposing(false);
    }
  };

  // 2. Tải file BOM Excel/CSV
  const handleFileLoaded = (loadedItems: BomItem[]) => {
    setErrorBanner(null);
    setItems((prev) => [...prev, ...loadedItems]);
  };

  // 3. Thêm thủ công
  const handleAddManualItem = (newItem: BomItem) => {
    setItems((prev) => [...prev, newItem]);
  };

  // 4. Cập nhật linh kiện
  const handleUpdateItem = (updated: BomItem) => {
    setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
  };

  // 5. Xóa 1 linh kiện
  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // 6. Tìm lại 1 linh kiện
  const handleResearchItem = async (id: string) => {
    const target = items.find((it) => it.id === id);
    if (!target) return;

    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status: 'searching' } : it))
    );

    try {
      const query = buildProductSearchQuery(target.name, target.specification);
      const searchRes = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          customUrl: settings?.searxngUrl,
        }),
      });
      const searchData = await searchRes.json();
      const searchResults = Array.isArray(searchData?.results) ? searchData.results : [];

      const optRes = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item: target,
          searchResults,
          apiKey: settings?.llmApiKey,
          baseUrl: settings?.llmBaseUrl,
          model: settings?.llmModel,
        }),
      });
      const optData = await optRes.json();
      if (optData?.item) {
        setItems((prev) => prev.map((it) => (it.id === id ? optData.item : it)));
      } else {
        setItems((prev) =>
          prev.map((it) =>
            it.id === id ? { ...it, status: searchResults.length > 0 ? 'found' : 'not_found' } : it
          )
        );
      }
    } catch {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, status: 'not_found' } : it))
      );
    }
  };

  // 7. Quy trình tự động tìm kiếm hàng loạt (SearXNG + AI)
  const runBatchSearchAndOptimize = async (targetItems: BomItem[]) => {
    const pendingItems = targetItems.filter((it) => it.status !== 'found');
    if (pendingItems.length === 0) return;

    setIsSearching(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setSearchProgress({
      current: 0,
      total: pendingItems.length,
      currentItemName: pendingItems[0].name,
    });

    try {
      for (let i = 0; i < pendingItems.length; i++) {
        if (controller.signal.aborted) break;

        const currentItem = pendingItems[i];
        setSearchProgress({
          current: i,
          total: pendingItems.length,
          currentItemName: currentItem.name,
        });

        // Set status 'searching'
        setItems((prev) =>
          prev.map((it) => (it.id === currentItem.id ? { ...it, status: 'searching' } : it))
        );

        try {
          const query = buildProductSearchQuery(currentItem.name, currentItem.specification);
          const searchRes = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query,
              customUrl: settings?.searxngUrl,
            }),
            signal: controller.signal,
          });

          if (!searchRes.ok) throw new Error('Search failed');
          const searchData = await searchRes.json();
          const searchResults = Array.isArray(searchData?.results) ? searchData.results : [];

          if (controller.signal.aborted) break;

          const optRes = await fetch('/api/optimize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              item: currentItem,
              searchResults,
              apiKey: settings?.llmApiKey,
              baseUrl: settings?.llmBaseUrl,
              model: settings?.llmModel,
            }),
            signal: controller.signal,
          });

          if (!optRes.ok) throw new Error('Optimize failed');
          const optData = await optRes.json();
          const optimized = optData?.item;

          if (optimized && optimized.id) {
            setItems((prev) => prev.map((it) => (it.id === currentItem.id ? optimized : it)));
          } else {
            setItems((prev) =>
              prev.map((it) =>
                it.id === currentItem.id
                  ? { ...it, status: searchResults.length > 0 ? 'found' : 'not_found' }
                  : it
              )
            );
          }
        } catch (err: unknown) {
          if (controller.signal.aborted) break;
          setItems((prev) =>
            prev.map((it) => (it.id === currentItem.id ? { ...it, status: 'not_found' } : it))
          );
        }

        setSearchProgress({
          current: i + 1,
          total: pendingItems.length,
          currentItemName: currentItem.name,
        });
      }
    } finally {
      setIsSearching(false);
      abortControllerRef.current = null;
    }
  };

  const handleStartAutoSearch = async () => {
    await runBatchSearchAndOptimize(items);
  };

  // 8. Hủy tìm kiếm
  const handleCancelSearch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsSearching(false);
    setItems((prev) =>
      prev.map((it) => (it.status === 'searching' ? { ...it, status: 'pending' } : it))
    );
  };

  // 9. Xóa tất cả
  const handleClearAll = () => {
    if (items.length === 0) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách linh kiện không?')) {
      if (isSearching) {
        handleCancelSearch();
      }
      setItems([]);
      setProjectName(null);
      setBudgetConstraint(null);
      try {
        localStorage.removeItem('robotics_bom_workspace_v1');
      } catch {}
    }
  };

  const pendingCount = items.filter((it) => it.status !== 'found').length;
  const progressPercent =
    searchProgress.total > 0
      ? Math.round((searchProgress.current / searchProgress.total) * 100)
      : 0;

  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8 text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner">
                <Cpu className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                  Robotics BOM Builder
                </h1>
                <div className="text-[11px] font-mono text-cyan-400/80">CLB ROBOTICS & TỰ ĐỘNG HÓA</div>
              </div>
            </div>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
              Tự động phân rã linh kiện robot, tra cứu nguồn mua qua SearXNG và tối ưu chi phí với AI.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {settings?.llmModel ? (
                <span className="font-mono text-cyan-300">{settings.llmModel}</span>
              ) : (
                'Hệ thống sẵn sàng'
              )}
            </span>

            <ExportDropdown items={items} />

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 shadow-sm transition-all hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              title="Cấu hình hệ thống"
            >
              <Sliders className="h-3.5 w-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Cài đặt</span>
            </button>
          </div>
        </header>

        {/* Error Notification */}
        {errorBanner && (
          <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-950/40 p-3.5 text-xs sm:text-sm text-red-300 shadow-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{errorBanner}</span>
            </div>
            <button
              onClick={() => setErrorBanner(null)}
              className="rounded p-1 text-red-400 hover:bg-red-900/50 hover:text-red-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Top Input Modes Section */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5 backdrop-blur-sm shadow-lg space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'ai'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Phân Rã BOM
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'upload'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              Tải file Excel / CSV
            </button>
          </div>

          <div>
            {activeTab === 'ai' ? (
              <InputBar
                onDecompose={handleDecompose}
                isLoading={isDecomposing}
                disabled={isSearching}
              />
            ) : (
              <FileUploadZone
                onFileLoaded={handleFileLoaded}
                disabled={isSearching || isDecomposing}
              />
            )}
          </div>
        </section>

        {/* Summary Metric Cards */}
        <SummaryCard items={items} budgetConstraint={budgetConstraint} />

        {/* Action Controls & Progress Bar */}
        <section className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Primary Search Actions */}
            <div className="flex items-center gap-2.5">
              {isSearching ? (
                <button
                  onClick={handleCancelSearch}
                  className="flex items-center gap-2 rounded-xl bg-red-600/90 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-red-500 transition-colors focus:ring-2 focus:ring-red-400/40"
                >
                  <StopCircle className="h-4 w-4" />
                  Hủy tìm kiếm
                </button>
              ) : (
                <button
                  onClick={handleStartAutoSearch}
                  disabled={items.length === 0 || pendingCount === 0 || isDecomposing}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:from-emerald-400 hover:to-teal-500 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Search className="h-4 w-4" />
                  Dò tìm link mua ({pendingCount} món chờ)
                </button>
              )}

              <button
                onClick={() => setIsManualModalOpen(true)}
                disabled={isSearching}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5 text-cyan-400" />
                Thêm linh kiện
              </button>
            </div>

            {/* Secondary Export & Clear Actions */}
            <div className="flex items-center gap-2">
              <ExportDropdown items={items} />

              <button
                onClick={handleClearAll}
                disabled={items.length === 0 || isSearching}
                className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-950/20 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-900/40 hover:text-red-300 transition-colors disabled:opacity-30"
                title="Xóa danh sách"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Xóa tất cả</span>
              </button>
            </div>
          </div>

          {/* Progress bar when searching */}
          {isSearching && (
            <div className="mt-2 space-y-1.5 border-t border-slate-800 pt-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                  <span>
                    Đang tìm kiếm ({searchProgress.current}/{searchProgress.total}):{' '}
                    <strong className="text-cyan-400">{searchProgress.currentItemName}</strong>
                  </span>
                </div>
                <span className="font-mono text-cyan-400 font-semibold">{progressPercent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* Main BOM Table */}
        <section className="space-y-2">
          {items.length > 0 && <CompatibilityBanner items={items} className="mb-2" />}
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Bảng linh kiện chi tiết
            </h2>
            <span className="text-xs text-slate-500">
              {items.length} món trong danh mục
            </span>
          </div>

          <BomTable
            items={items}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onResearchItem={handleResearchItem}
          />
        </section>

        {/* Modal thêm thủ công */}
        <ManualItemModal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          onAdd={handleAddManualItem}
        />

        {/* Modal cấu hình hệ thống */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          currentSettings={settings || undefined}
          onSaved={(newSettings) => setSettings(newSettings)}
        />
      </div>
    </main>
  );
}
