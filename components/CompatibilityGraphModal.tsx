'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle, Zap, Cpu, Activity, MoveRight, Filter } from 'lucide-react';
import { BomItem } from '@/lib/types';
import { buildSystemGraph, GraphNode, GraphEdge } from '@/lib/graph-engine';

interface CompatibilityGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: BomItem[];
}

export const CompatibilityGraphModal: React.FC<CompatibilityGraphModalProps> = ({
  isOpen,
  onClose,
  items,
}) => {
  const [filter, setFilter] = useState<'all' | 'issues_only'>('all');

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

  const graph = buildSystemGraph(items);

  const displayedEdges = filter === 'issues_only'
    ? graph.edges.filter((e) => e.status === 'conditional' || e.status === 'incompatible')
    : graph.edges;

  const getNode = (id: string): GraphNode | undefined => graph.nodes.find((n) => n.id === id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sơ đồ tương thích hệ thống"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card text-card-foreground border border-border w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                Kiến trúc & Tương thích (Section 14.6)
              </span>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Sơ đồ liên kết & Tương thích hệ thống Robot
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Trực quan hóa luồng cấp nguồn, tín hiệu điều khiển và phát hiện sớm xung đột điện áp / công suất
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status KPI Banner */}
        <div className="px-6 py-3 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Tương thích: {graph.summary.compatibleCount}
            </span>
            <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              Cần lưu ý: {graph.summary.conditionalCount}
            </span>
            <span className="flex items-center gap-1.5 font-medium text-rose-600 dark:text-rose-400">
              <AlertOctagon className="w-4 h-4" />
              Xung đột/Lỗi: {graph.summary.incompatibleCount}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tất cả ({graph.edges.length})
            </button>
            <button
              onClick={() => setFilter('issues_only')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                filter === 'issues_only'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Chỉ cảnh báo & lỗi ({graph.summary.conditionalCount + graph.summary.incompatibleCount})
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {graph.nodes.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <p>Chưa có linh kiện nào trong BOM để thiết lập sơ đồ liên kết.</p>
            </div>
          ) : (
            <>
              {/* Node Overview Grid by Subsystem */}
              <div>
                <h3 className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-primary" /> Khối linh kiện trong hệ thống
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {graph.nodes.map((node) => (
                    <div
                      key={node.id}
                      className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                        node.status === 'incompatible'
                          ? 'border-rose-500/50 bg-rose-500/5 ring-1 ring-rose-500/20'
                          : node.status === 'conditional'
                          ? 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20'
                          : 'border-border bg-card'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {node.subsystem}
                          </span>
                          {node.status === 'compatible' && (
                            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              OK
                            </span>
                          )}
                          {node.status === 'conditional' && (
                            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                              Lưu ý
                            </span>
                          )}
                          {node.status === 'incompatible' && (
                            <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                              Xung đột
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-foreground text-sm line-clamp-1" title={node.label}>
                          {node.label}
                        </h4>
                      </div>

                      <div className="mt-2 pt-2 border-t border-border/60 flex items-center gap-3 text-muted-foreground text-[11px]">
                        {node.voltage && <span>⚡ {node.voltage}</span>}
                        {node.current && <span>🔋 {node.current}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Edge Topology Connections */}
              <div>
                <h3 className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" /> Luồng kết nối điện áp & Tín hiệu logic ({displayedEdges.length})
                </h3>

                {displayedEdges.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                    Không có kết nối nào phù hợp bộ lọc hiện tại.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {displayedEdges.map((edge) => {
                      const srcNode = getNode(edge.source);
                      const tgtNode = getNode(edge.target);

                      const isRose = edge.status === 'incompatible';
                      const isAmber = edge.status === 'conditional';

                      return (
                        <div
                          key={edge.id}
                          className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isRose
                              ? 'border-rose-500/40 bg-rose-500/[0.03]'
                              : isAmber
                              ? 'border-amber-500/40 bg-amber-500/[0.03]'
                              : 'border-border bg-card'
                          }`}
                        >
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                edge.type === 'power'
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              }`}
                            >
                              {edge.type === 'power' ? 'Nguồn DC' : 'Tín hiệu'}
                            </span>

                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                              <span className="truncate max-w-[150px]" title={srcNode?.label}>
                                {srcNode?.label || edge.source}
                              </span>
                              <MoveRight className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="truncate max-w-[150px]" title={tgtNode?.label}>
                                {tgtNode?.label || edge.target}
                              </span>
                            </div>
                          </div>

                          <div className="text-[11px] text-muted-foreground sm:text-right flex items-center gap-2">
                            <span>{edge.description}</span>
                            {isRose && (
                              <span className="text-rose-600 dark:text-rose-400 font-bold shrink-0">
                                [Xung đột]
                              </span>
                            )}
                            {isAmber && (
                              <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">
                                [Cần điều kiện]
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            Sơ đồ được phân tích tự động dựa trên quy tắc kỹ thuật điện áp, dòng điện và mức logic MCU/Driver.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
