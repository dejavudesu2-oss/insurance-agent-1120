import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  CreditCard,
  FileText,
  Flashlight,
  RefreshCw,
  ScanLine,
  Upload,
  X,
} from 'lucide-react';
import { RNCamera, RNCameraHandle } from 'react-native-camera';
import { ClientLead, IdentityScanResult } from '../domain/types';

interface RNCameraScannerModalProps {
  open: boolean;
  targetLead?: ClientLead | null; // null when scanning directly to create/populate a New Lead
  onClose: () => void;
  onApplyScanResult: (scan: IdentityScanResult) => void;
}

/**
 * Renders a crisp high-DPI physical Hong Kong Permanent Smart Identity Card specimen
 * onto an offscreen canvas so RNCamera.takePictureAsync() captures genuine pixel text
 * for Google Cloud Vision API (DOCUMENT_TEXT_DETECTION).
 */
function renderSpecimenHkidDataUrl(customLead?: ClientLead | null): string {
  const canvas = document.createElement('canvas');
  canvas.width = 920;
  canvas.height = 580;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Subtle pearlescent smart-card background
  const grad = ctx.createLinearGradient(0, 0, 920, 580);
  grad.addColorStop(0, '#F8FAFC');
  grad.addColorStop(0.55, '#EFF6FF');
  grad.addColorStop(1, '#F1F5F9');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 920, 580);

  // Outer card frame
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, 880, 540);

  // Bilingual HKSAR Header
  ctx.fillStyle = '#0F172A';
  ctx.font = '700 24px sans-serif';
  ctx.fillText('香港永久性居民身份證', 56, 76);
  ctx.font = '700 20px sans-serif';
  ctx.fillText('HONG KONG PERMANENT IDENTITY CARD', 56, 108);

  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(56, 128);
  ctx.lineTo(864, 128);
  ctx.stroke();

  // Simulated gold smart-card IC chip on left
  ctx.fillStyle = '#EAB308';
  ctx.fillRect(62, 168, 104, 82);
  ctx.strokeStyle = '#A16207';
  ctx.lineWidth = 2;
  ctx.strokeRect(62, 168, 104, 82);

  // Determine cardholder details
  const nameEn =
    customLead && customLead.residency === 'HK_RESIDENT'
      ? customLead.fullNameEn
      : 'WONG, Ka Ming';
  const nameZh =
    customLead && customLead.residency === 'HK_RESIDENT'
      ? customLead.fullNameZh
      : '黃家明';
  const hkid =
    customLead &&
    customLead.residency === 'HK_RESIDENT' &&
    /^[A-Z]{1,2}\d{6}/.test(customLead.hkidNumber || customLead.kycCheck.hkidDocNumber)
      ? customLead.hkidNumber || customLead.kycCheck.hkidDocNumber
      : 'K654321(9)';
  const birthYear = customLead ? 2026 - customLead.age : 1988;

  // Cardholder text block (crisp high-contrast OCR legibility)
  ctx.fillStyle = '#0F172A';
  ctx.font = '700 32px sans-serif';
  ctx.fillText(nameZh, 208, 192);

  ctx.font = '700 28px sans-serif';
  ctx.fillText(nameEn, 208, 236);

  ctx.fillStyle = '#334155';
  ctx.font = '600 21px monospace';
  ctx.fillText(`Date of Birth 出生日期: 15-05-${birthYear}`, 208, 304);
  ctx.fillText('Sex 性別: 男 M', 208, 348);
  ctx.fillText('Date of Issue 簽發日期: 12-09-2023', 208, 392);

  // Bottom-right HKID Number
  ctx.fillStyle = '#0F172A';
  ctx.font = '700 36px monospace';
  ctx.fillText(hkid, 560, 502);

  return canvas.toDataURL('image/png');
}

/**
 * Renders a crisp high-DPI HKSAR Immigration Visitor Landing Slip (入境標籤) specimen
 * onto an offscreen canvas for MCV onshore compliance scanning.
 */
function renderSpecimenEntrySlipDataUrl(customLead?: ClientLead | null): string {
  const canvas = document.createElement('canvas');
  canvas.width = 920;
  canvas.height = 560;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 920, 560);

  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, 872, 512);

  const nameEn =
    customLead && customLead.residency === 'MCV'
      ? customLead.fullNameEn.toUpperCase()
      : 'ZHOU YUTING';
  const nameZh =
    customLead && customLead.residency === 'MCV' ? customLead.fullNameZh : '周雨婷';
  const docNo =
    customLead && customLead.residency === 'MCV'
      ? customLead.hkidNumber || customLead.kycCheck.hkidDocNumber || 'EEP-CS8849201'
      : 'EEP-G6291048';
  const birthYear = customLead ? 2026 - customLead.age : 1991;

  ctx.fillStyle = '#0F172A';
  ctx.font = '700 26px sans-serif';
  ctx.fillText('IMMIGRATION DEPARTMENT, HKSAR 香港入境事務處', 56, 86);
  ctx.font = '700 23px sans-serif';
  ctx.fillText('VISITOR LANDING SLIP 旅客抵港入境標籤', 56, 128);

  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(56, 152);
  ctx.lineTo(864, 152);
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = '600 23px monospace';
  ctx.fillText(`NAME: ${nameEn} (${nameZh})`, 56, 210);
  ctx.fillText(`DATE OF BIRTH: 22-08-${birthYear}`, 56, 260);
  ctx.fillText(`TRAVEL DOC NO: ${docNo}`, 56, 310);
  ctx.fillText('ARRIVAL DATE (HKG): 2026-11-11', 56, 360);
  ctx.fillText('PERMITTED TO REMAIN UNTIL: 2026-11-18', 56, 410);

  ctx.fillStyle = '#15803D';
  ctx.font = '700 22px monospace';
  ctx.fillText('CONDITION: VISITOR - ONSHORE HKSAR VERIFIED', 56, 474);

  return canvas.toDataURL('image/png');
}

export const RNCameraScannerModal: React.FC<RNCameraScannerModalProps> = ({
  open,
  targetLead = null,
  onClose,
  onApplyScanResult,
}) => {
  const cameraRef = useRef<RNCameraHandle | null>(null);

  const [cameraType, setCameraType] = useState<'environment' | 'user'>(
    RNCamera.Constants.Type.back
  );
  const [flashMode, setFlashMode] = useState<'off' | 'torch'>(
    RNCamera.Constants.FlashMode.off
  );
  const [docMode, setDocMode] = useState<'AUTO' | 'HKID' | 'MCV_ENTRY_SLIP'>('AUTO');
  const [stagedImageUrl, setStagedImageUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<IdentityScanResult | null>(null);

  // Reset modal state whenever opened
  useEffect(() => {
    if (!open) return;
    setScanError(null);
    setScanResult(null);
    setCameraError(null);
    setCameraReady(false);
    setStagedImageUrl(null);
    if (targetLead) {
      setDocMode(targetLead.residency === 'MCV' ? 'MCV_ENTRY_SLIP' : 'HKID');
    } else {
      setDocMode('AUTO');
    }
  }, [open, targetLead]);

  if (!open) return null;

  const handleStageSpecimen = (kind: 'HKID' | 'MCV_ENTRY_SLIP') => {
    setScanError(null);
    setScanResult(null);
    setDocMode(kind);
    const url =
      kind === 'HKID'
        ? renderSpecimenHkidDataUrl(targetLead)
        : renderSpecimenEntrySlipDataUrl(targetLead);
    setStagedImageUrl(url);
  };

  const handleUploadDocumentFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError(null);
    setScanResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      setStagedImageUrl(String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  };

  const handleCaptureAndScan = async () => {
    if (!cameraRef.current) return;
    setScanning(true);
    setScanError(null);
    try {
      // Capture high-DPI frame directly from RNCamera (live hardware camera or staged specimen)
      const captured = await cameraRef.current.takePictureAsync({
        quality: 0.94,
        base64: true,
        width: 1024,
      });

      const response = await fetch('/api/kyc/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: captured.base64 || captured.uri,
          mimeType: 'image/jpeg',
          docType: docMode,
        }),
      });

      const data: IdentityScanResult & { error?: string } = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Google Cloud Vision OCR scan failed.');
      }

      setScanResult(data);
    } catch (err: any) {
      setScanError(err?.message || 'Unable to capture and scan identity document.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rncamera-scanner-title"
    >
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2
              id="rncamera-scanner-title"
              className="text-lg font-bold tracking-tight text-slate-900"
            >
              Physical ID & Entry Slip Camera Scanner 實體身份證及入境標籤掃描
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {targetLead
                ? `Updating KYC & CRM profile for ${targetLead.fullNameEn} (${targetLead.fullNameZh})`
                : 'Capture HKID or HKSAR Visitor Landing Slip via RNCamera & Google Cloud Vision API to auto-populate Lead CRM'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close document camera scanner"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT 7 COLS: RNCamera Viewfinder & Controls */}
          <div className="space-y-3 lg:col-span-7">
            {/* Document Type Selector + Hardware Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div
                role="group"
                aria-label="Document OCR mode"
                className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[11px] font-semibold"
              >
                <button
                  type="button"
                  onClick={() => setDocMode('AUTO')}
                  className={`rounded-md px-2.5 py-1 ${
                    docMode === 'AUTO'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Auto-Detect
                </button>
                <button
                  type="button"
                  onClick={() => setDocMode('HKID')}
                  className={`rounded-md px-2.5 py-1 ${
                    docMode === 'HKID'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  HKID 香港身份證
                </button>
                <button
                  type="button"
                  onClick={() => setDocMode('MCV_ENTRY_SLIP')}
                  className={`rounded-md px-2.5 py-1 ${
                    docMode === 'MCV_ENTRY_SLIP'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Entry Slip 入境標籤
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {stagedImageUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStagedImageUrl(null);
                      setCameraError(null);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Live Camera</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setCameraType((prev) =>
                          prev === RNCamera.Constants.Type.back
                            ? RNCamera.Constants.Type.front
                            : RNCamera.Constants.Type.back
                        )
                      }
                      aria-label="Switch front or rear camera"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <RefreshCw className="h-3 w-3" aria-hidden="true" />
                      <span>{cameraType === 'environment' ? 'Rear Cam' : 'Front Cam'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFlashMode((prev) =>
                          prev === RNCamera.Constants.FlashMode.off
                            ? RNCamera.Constants.FlashMode.torch
                            : RNCamera.Constants.FlashMode.off
                        )
                      }
                      aria-label="Toggle camera torch"
                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
                        flashMode === 'torch'
                          ? 'border-amber-400 bg-amber-50 text-amber-900'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Flashlight className="h-3 w-3" aria-hidden="true" />
                      <span>Torch</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* RNCamera Viewfinder Stage */}
            <RNCamera
              ref={cameraRef}
              type={cameraType}
              flashMode={flashMode}
              captureAudio={false}
              previewOverrideDataUrl={stagedImageUrl}
              onCameraReady={() => {
                setCameraReady(true);
                setCameraError(null);
              }}
              onMountError={(evt) => {
                setCameraReady(false);
                setCameraError(evt.message);
              }}
              className="aspect-[16/10] w-full rounded-xl border border-slate-800"
            >
              {/* ISO ID-1 Card Framing Reticle */}
              <div className="pointer-events-none absolute inset-5 flex flex-col justify-between border border-dashed border-white/35 rounded-lg p-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-white/85">
                  <span>
                    {stagedImageUrl
                      ? 'DOCUMENT FRAME STAGED'
                      : cameraReady
                        ? 'LIVE RNCAMERA STREAM'
                        : 'CAMERA STANDBY'}
                  </span>
                  <span>ISO/IEC 7810 ID-1 · VISION OCR</span>
                </div>

                {!stagedImageUrl && cameraError && (
                  <div className="mx-auto max-w-sm rounded-lg bg-slate-900/90 px-3.5 py-2.5 text-center text-xs text-slate-200">
                    {cameraError}
                  </div>
                )}

                <div className="text-center text-[11px] text-white/80">
                  Align HKID Smart Card or HKSAR Landing Slip within frame
                </div>
              </div>
            </RNCamera>

            {/* Specimen Card Stage & Photo Upload Strip */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-700">
                  No physical card in front of webcam? Stage a realistic specimen or upload photo:
                </span>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100">
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Upload ID Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadDocumentFile}
                    className="sr-only"
                  />
                </label>
              </div>

              <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleStageSpecimen('HKID')}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-800 hover:border-blue-600 hover:bg-blue-50/40"
                >
                  <CreditCard className="h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
                  <div>
                    <div>Stage HKID Smart Card</div>
                    <div className="font-mono text-[10px] font-normal text-slate-500">
                      {targetLead && targetLead.residency === 'HK_RESIDENT'
                        ? `${targetLead.fullNameEn} · ${targetLead.hkidNumber || targetLead.kycCheck.hkidDocNumber}`
                        : 'WONG, Ka Ming · K654321(9)'}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleStageSpecimen('MCV_ENTRY_SLIP')}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-800 hover:border-blue-600 hover:bg-blue-50/40"
                >
                  <FileText className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  <div>
                    <div>Stage MCV Entry Slip 入境標籤</div>
                    <div className="font-mono text-[10px] font-normal text-slate-500">
                      {targetLead && targetLead.residency === 'MCV'
                        ? `${targetLead.fullNameEn} · ${targetLead.hkidNumber || targetLead.kycCheck.hkidDocNumber}`
                        : 'ZHOU YUTING · EEP-G6291048'}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Primary Shutter Action */}
            <button
              type="button"
              disabled={scanning || (!cameraReady && !stagedImageUrl)}
              onClick={handleCaptureAndScan}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <ScanLine className="h-4 w-4" aria-hidden="true" />
              <span>
                {scanning
                  ? 'Scanning Frame via Google Cloud Vision API...'
                  : 'Capture & Scan Document'}
              </span>
            </button>

            {scanError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
                {scanError}
              </div>
            )}
          </div>

          {/* RIGHT 5 COLS: Extracted Cloud Vision OCR Fields & CRM Auto-Populate */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 lg:col-span-5">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Cloud Vision Extracted CRM Fields 識別結果
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Extracts fullNameEn, fullNameZh, hkidNumber (Mod-11 verified), DOB, and MCV stay validity
                </p>
              </div>

              {!scanResult ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500">
                  Frame a physical HKID or Entry Slip in the viewfinder (or stage a specimen card on the left) and click{' '}
                  <span className="font-semibold text-slate-800">Capture & Scan Document</span>.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                      <span>
                        {scanResult.docType === 'MCV_ENTRY_SLIP'
                          ? 'HKSAR Visitor Landing Slip (入境標籤) Extracted'
                          : 'Hong Kong Identity Card (HKID) Extracted'}
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-[10px] font-normal text-emerald-800">
                      Engine:{' '}
                      {scanResult.ocrEngine === 'google-cloud-vision'
                        ? 'Google Cloud Vision API (DOCUMENT_TEXT_DETECTION)'
                        : 'Google Vision Multimodal OCR + Mod-11 Parser'}
                    </div>
                  </div>

                  <dl className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white text-xs">
                    <div className="flex justify-between gap-2 px-3 py-2">
                      <dt className="text-slate-500">fullNameEn</dt>
                      <dd className="font-semibold text-slate-900">
                        {scanResult.fullNameEn || '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 px-3 py-2">
                      <dt className="text-slate-500">fullNameZh</dt>
                      <dd className="font-semibold text-slate-900">
                        {scanResult.fullNameZh || '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 px-3 py-2">
                      <dt className="text-slate-500">hkidNumber</dt>
                      <dd className="text-right font-mono font-semibold text-slate-900 tabular-nums">
                        <div>{scanResult.hkidNumber || '—'}</div>
                        {scanResult.hkidChecksumValid !== null && (
                          <span
                            className={`text-[10px] font-sans font-medium ${
                              scanResult.hkidChecksumValid
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {scanResult.hkidChecksumValid
                              ? '✓ Mod-11 Checksum Valid'
                              : 'Check Digit Unverified'}
                          </span>
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 px-3 py-2">
                      <dt className="text-slate-500">DOB / Age</dt>
                      <dd className="font-mono text-slate-800 tabular-nums">
                        {scanResult.dateOfBirth
                          ? `${scanResult.dateOfBirth} (Age ${scanResult.calculatedAge ?? '—'})`
                          : '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 px-3 py-2">
                      <dt className="text-slate-500">Residency Segment</dt>
                      <dd className="font-medium text-slate-800">
                        {scanResult.residency === 'MCV'
                          ? 'MCV 內地訪港旅客'
                          : 'HK Resident 香港居民'}
                      </dd>
                    </div>
                    {scanResult.docType === 'MCV_ENTRY_SLIP' && (
                      <div className="flex justify-between gap-2 px-3 py-2">
                        <dt className="text-slate-500">Permitted Stay</dt>
                        <dd className="font-mono text-emerald-700 tabular-nums">
                          {scanResult.entryDate || '—'} → {scanResult.permittedUntil || '—'}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {scanResult.rawOcrText && (
                    <div>
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Raw OCR Text Annotation
                      </span>
                      <pre className="mt-1 max-h-24 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 font-mono text-[10px] leading-relaxed text-slate-600 whitespace-pre-wrap">
                        {scanResult.rawOcrText}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!scanResult}
                onClick={() => {
                  if (scanResult) {
                    onApplyScanResult(scanResult);
                  }
                }}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {targetLead ? 'Update Lead KYC & Fields' : 'Auto-Populate Lead CRM'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
