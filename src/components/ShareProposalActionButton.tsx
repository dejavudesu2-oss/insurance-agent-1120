import React, { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Share2 } from 'lucide-react';
import {
  buildProposalSharePayload,
  ProposalSharePayloadInput,
} from '../domain/advisorToolkitSuiteEngine';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import { copyTextSafe } from '../utils/clipboardAndDom';

export interface ShareProposalActionButtonProps {
  shareInput: ProposalSharePayloadInput;
  variant?: 'gold' | 'teal' | 'outline';
  testId?: string;
  onBeforeShare?: () => Promise<void> | void;
  getOptionalFile?: () => Promise<File | null>;
  onNotify?: (msg: string) => void;
}

export const ShareProposalActionButton: React.FC<ShareProposalActionButtonProps> = ({
  shareInput,
  variant = 'teal',
  testId = 'native-share-proposal-btn',
  onBeforeShare,
  getOptionalFile,
  onNotify,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);

  const [copiedFallback, setCopiedFallback] = useState(false);

  const payload = useMemo(() => buildProposalSharePayload(shareInput), [shareInput]);

  const handleShareClick = async () => {
    await onBeforeShare?.();

    const shareTitle = lang === 'en' ? payload.titleEn : conv(payload.titleZh);
    const shareText = lang === 'en' ? payload.textEn : conv(payload.textZh);

    // 1. Native Mobile / OS Share Sheet (WhatsApp, WeChat, AirDrop, Mail)
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        let sharedWithFile = false;
        if (getOptionalFile && typeof navigator.canShare === 'function') {
          const maybeFile = await getOptionalFile();
          if (maybeFile && navigator.canShare({ files: [maybeFile] })) {
            await navigator.share({
              title: shareTitle,
              text: shareText,
              files: [maybeFile],
            });
            sharedWithFile = true;
          }
        }

        if (!sharedWithFile) {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: payload.url,
          });
        }

        onNotify?.(
          t(
            'Opened system Share Sheet for WhatsApp / WeChat.',
            conv('已開啟手機分享選單（可直接傳送至 WhatsApp／WeChat）！')
          )
        );
        return;
      } catch (err) {
        // User cancelled native dialog: do nothing noisy; otherwise fall back to clipboard
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
      }
    }

    // 2. Desktop Graceful Fallback: Copy formatted WhatsApp/WeChat message + reveal direct wa.me link
    await copyTextSafe(shareText);
    setCopiedFallback(true);
    window.setTimeout(() => setCopiedFallback(false), 4000);
    onNotify?.(
      t(
        'Copied formatted WhatsApp/WeChat summary & proposal link to clipboard!',
        conv('已複製 WhatsApp／WeChat 建議書摘要及連結！亦可撳旁邊按鈕直接打開 WhatsApp 發送。')
      )
    );
  };

  const buttonClasses =
    variant === 'gold'
      ? 'inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/60 bg-[#F3D37A] px-3.5 py-2 text-xs font-bold text-[#060D18] hover:bg-[#f7df96] transition-colors whitespace-nowrap shrink-0'
      : variant === 'outline'
      ? 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0'
      : 'inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0';

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        data-testid={testId}
        onClick={handleShareClick}
        className={buttonClasses}
      >
        {copiedFallback ? (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        <span>
          {copiedFallback
            ? t('Copied for WhatsApp!', conv('已複製 WhatsApp 摘要！'))
            : t(
                'Share to WhatsApp / WeChat',
                conv('一鍵分享至 WhatsApp／WeChat')
              )}
        </span>
      </button>

      <a
        href={payload.whatsappWebHref}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={`${testId}-wa-direct`}
        className="inline-flex items-center gap-1 rounded-lg border border-emerald-600/40 bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0"
        title={t('Open WhatsApp directly with pre-filled message', conv('直接打開 WhatsApp 並自動帶入建議書訊息'))}
      >
        {copiedFallback ? (
          <ExternalLink className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
        )}
        <span>{t('WhatsApp Direct', conv('直發 WhatsApp'))}</span>
      </a>
    </div>
  );
};
