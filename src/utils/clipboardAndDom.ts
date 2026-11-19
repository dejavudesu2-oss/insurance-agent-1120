/**
 * Safe clipboard & smooth scroll helpers for cross-origin preview iframes and desktop/mobile layouts.
 */

export async function copyTextSafe(text: string): Promise<boolean> {
  if (!text) return false;

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy textarea copy when cross-origin iframe blocks Permissions API
    }
  }

  if (typeof document === 'undefined') return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied || true;
  } catch {
    return false;
  }
}

export function scrollToElementSmooth(
  elementId: string,
  block: ScrollLogicalPosition = 'start'
): void {
  if (typeof document === 'undefined') return;
  window.setTimeout(() => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block });
    }
  }, 40);
}

export function scrollWindowToTop(): void {
  if (typeof window === 'undefined') return;
  try {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch {
    window.scrollTo(0, 0);
  }
}

export function triggerBrowserDownload(
  fileName: string,
  content: string | Uint8Array | Blob,
  mimeType: string = 'text/plain;charset=utf-8'
): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const blob =
    content instanceof Blob
      ? content
      : new Blob([content as unknown as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

