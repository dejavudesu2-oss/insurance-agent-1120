import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Calculator, Layers, Search, Shield, UserCheck, X } from 'lucide-react';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import {
  CommandPaletteItem,
  searchGlobalCommandPalette,
} from '../domain/proEnhancementsEngine';
import { TwentyUpgradeCode } from '../domain/twentyUpgradesEngine';
import { ClientLead, InsurancePlan } from '../domain/types';

interface GlobalCommandPaletteModalProps {
  open: boolean;
  onClose: () => void;
  leads: ClientLead[];
  plans: InsurancePlan[];
  canShowDrive?: boolean;
  onSelectCommand: (cmd: {
    kind: 'STAGE' | 'CLIENT' | 'PLAN' | 'TOOL';
    targetSection?: 'stage1' | 'stage2' | 'stage3' | 'stage4' | 'stage5' | 'stage6';
    targetSubTab?: string;
    leadId?: string;
    planId?: string;
    toolCode?: TwentyUpgradeCode;
  }) => void;
}

export const GlobalCommandPaletteModal: React.FC<GlobalCommandPaletteModalProps> = ({
  open,
  onClose,
  leads,
  plans,
  canShowDrive = false,
  onSelectCommand,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const results = useMemo(() => {
    const raw = searchGlobalCommandPalette({ query, leads, plans, limitPerGroup: 6 });
    return canShowDrive ? raw : raw.filter((item) => item.id !== 'nav-05b');
  }, [query, leads, plans, canShowDrive]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 20);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  const handleTrigger = (item: CommandPaletteItem) => {
    onSelectCommand({
      kind: item.kind,
      targetSection: item.targetSection,
      targetSubTab: item.targetSubTab,
      leadId: item.leadId,
      planId: item.planId,
      toolCode: item.toolCode,
    });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) =>
        results.length > 0 ? (prev - 1 + results.length) % results.length : 0
      );
      return;
    }
    if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      handleTrigger(results[activeIndex]);
    }
  };

  const getKindIcon = (kind: CommandPaletteItem['kind']) => {
    switch (kind) {
      case 'CLIENT':
        return <UserCheck className="h-4 w-4 text-teal-600 shrink-0" aria-hidden="true" />;
      case 'PLAN':
        return <Shield className="h-4 w-4 text-blue-700 shrink-0" aria-hidden="true" />;
      case 'TOOL':
        return <Calculator className="h-4 w-4 text-amber-600 shrink-0" aria-hidden="true" />;
      case 'STAGE':
      default:
        return <Layers className="h-4 w-4 text-slate-700 shrink-0" aria-hidden="true" />;
    }
  };

  const getKindLabel = (kind: CommandPaletteItem['kind']) => {
    switch (kind) {
      case 'CLIENT':
        return t('Saved Client', conv('建檔客戶'));
      case 'PLAN':
        return t('HK Market Plan', conv('香港保險計劃'));
      case 'TOOL':
        return t('Pro Calculator', conv('專項精算工具'));
      case 'STAGE':
      default:
        return t('Workflow Stage', conv('流程工作台'));
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Command Palette"
      data-testid="global-command-palette-modal"
      className="fixed inset-0 z-50 flex items-start justify-center bg-[#060D18]/75 p-4 pt-14 sm:pt-20"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#D4AF37]/45 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Victoria Harbour Private Wealth Search Header */}
        <div className="vh-harbour-surface flex items-center gap-3 px-4 py-3.5 text-white">
          <Search className="h-4 w-4 text-[#F3D37A] shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            data-testid="command-palette-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'Search clients, insurance plans, steps (01–06), or calculators...',
              conv('搜尋客戶姓名、保險計劃、功能頁面或計算機...')
            )}
            className="flex-1 bg-transparent text-sm font-medium text-white placeholder-slate-400 focus:outline-none"
          />
          <kbd className="hidden rounded border border-slate-700 bg-[#060D18] px-2 py-0.5 font-mono text-[10px] text-slate-300 sm:inline-block">
            ESC
          </kbd>
          <button
            type="button"
            aria-label="Close command palette"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[62vh] overflow-y-auto divide-y divide-slate-100">
          {results.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              {t(
                `No matching clients, plans, or stages found for "${query}".`,
                conv(`找不到與「${query}」相符的客戶、保險計劃或專項工具。`)
              )}
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`cmd-item-${item.id}`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => handleTrigger(item)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                    isSelected ? 'bg-slate-100/90' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5">{getKindIcon(item.kind)}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {lang === 'en' ? item.titleEn : conv(item.titleZh)}
                        </span>
                        <span className="font-mono text-[10px] font-semibold text-slate-500">
                          · {getKindLabel(item.kind)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-slate-600">
                        {lang === 'en' ? item.subtitleEn : conv(item.subtitleZh)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[11px] font-semibold text-slate-600 tabular-nums">
                      {item.badge}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Guide */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
          <span>
            {t(
              'Tip: Press ↑ / ↓ to navigate, Enter to jump immediately',
              conv('提示：按 ↑ / ↓ 上下選擇，按 Enter 即時跳轉並切換客戶／計劃')
            )}
          </span>
          <span className="font-mono font-semibold text-slate-700">Cmd / Ctrl + K</span>
        </div>
      </div>
    </div>
  );
};
