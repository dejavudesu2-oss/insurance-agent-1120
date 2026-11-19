import React from 'react';
import {
  CheckCircle2,
  CloudUpload,
  Download,
  ExternalLink,
  FileJson,
  FileText,
  LogOut,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { useLanguage } from '../domain/i18n';
import { DriveSyncedFile } from '../domain/types';
import {
  MASTER_GUIDE_FILENAME,
  MASTER_GUIDE_MARKDOWN,
  MASTER_GUIDE_TITLE,
} from '../data/masterGuideContent';
import { INSUREHUB_DRIVE_FOLDER_NAME } from '../services/googleDriveService';
import { triggerBrowserDownload } from '../services/pdfGenerator';
import { LoginButton } from './LoginButton';

interface GoogleDriveGuideViewProps {
  googleUser: User | null;
  driveConnected: boolean;
  isSigningIn: boolean;
  driveBusy: boolean;
  driveError: string | null;
  driveFiles: DriveSyncedFile[];
  appDataBackupFile?: DriveSyncedFile | null;
  onSignInGoogle: () => Promise<void>;
  onAuthAndCloudBackup: (params: {
    user: User;
    accessToken: string;
  }) => Promise<void>;
  onRestoreFromAppData: () => Promise<void>;
  onSignOutGoogle: () => Promise<void>;
  onRefreshDriveFiles: () => Promise<void>;
  onSaveMasterGuideToDrive: () => Promise<void>;
  onSaveWorkspaceBackupToDrive: () => Promise<void>;
  onSaveBundleToDrive: () => Promise<void>;
  onRequestDeleteDriveFile: (file: DriveSyncedFile) => void;
  workspaceBackupJsonString: string;
}

export const GoogleDriveGuideView: React.FC<GoogleDriveGuideViewProps> = ({
  googleUser,
  driveConnected,
  isSigningIn,
  driveBusy,
  driveError,
  driveFiles,
  appDataBackupFile,
  onAuthAndCloudBackup,
  onRestoreFromAppData,
  onSignOutGoogle,
  onRefreshDriveFiles,
  onSaveMasterGuideToDrive,
  onSaveWorkspaceBackupToDrive,
  onSaveBundleToDrive,
  onRequestDeleteDriveFile,
  workspaceBackupJsonString,
}) => {
  const { t } = useLanguage();
  const guideSections = MASTER_GUIDE_MARKDOWN.split(/\n---\n/);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-slate-900"
            style={{ textWrap: 'balance' }}
          >
            {t(
              'Google Drive Cloud Sync & Private AppData Backup',
              'Google Drive 雲端自動備份（AppData）及合規操作指南'
            )}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            {t(
              `Sign in with Google to back up your encrypted CRM workspace to Google Drive's private appDataFolder and sync client PDFs to /${INSUREHUB_DRIVE_FOLDER_NAME}.`,
              `使用 Google 登入即可將完整 CRM 客戶管線、會面筆記及建議書備份至 Google Drive 專屬隱藏空間（appDataFolder），並同步保單 PDF 至 /${INSUREHUB_DRIVE_FOLDER_NAME}。`
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <LoginButton
            connectedUser={googleUser}
            isBusy={isSigningIn || driveBusy}
            onAuthAndBackup={onAuthAndCloudBackup}
          />
          {driveConnected && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2">
              <div className="text-xs">
                <div className="font-semibold text-slate-900">
                  {googleUser?.displayName || 'Connected Account'}
                </div>
                <div className="text-slate-500">{googleUser?.email}</div>
              </div>
              <button
                type="button"
                onClick={onSignOutGoogle}
                aria-label="Sign out of Google Drive"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Private Google Drive appDataFolder Cloud Backup & Restore Card */}
      <section
        data-testid="appdata-cloud-backup-panel"
        className="rounded-xl border border-slate-200 bg-white p-6 space-y-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {t(
                '00. Private Cloud AppData Backup & Cross-Device Restore (drive.appdata)',
                '00. 專屬雲端隱藏空間備份與跨裝置還原（Google Drive appDataFolder）'
              )}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              {t(
                'Stores your CRM leads, meeting notes, 3-plan comparisons, and HKIA compliance logs in your private application data container with your permission.',
                '經您授權後，將 CRM 客戶名單、顧問筆記、紅藍黃三計劃比較及保監合規紀錄安全儲存於您個人 Google Drive 的應用程式專屬空間。'
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <LoginButton
              connectedUser={googleUser}
              isBusy={isSigningIn || driveBusy}
              labelOverride={
                driveConnected
                  ? t('Backup Workspace to Cloud', '立即備份工作區至雲端')
                  : t('Sign in & Backup to Cloud', '使用 Google 登入並備份')
              }
              onAuthAndBackup={onAuthAndCloudBackup}
            />
            {driveConnected && appDataBackupFile && (
              <button
                type="button"
                data-testid="restore-appdata-backup-btn"
                disabled={driveBusy}
                onClick={onRestoreFromAppData}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {t('Restore from Cloud', '從雲端備份還原')}
                </span>
              </button>
            )}
          </div>
        </div>

        {appDataBackupFile && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
            <span className="font-semibold text-emerald-700">
              {t('Latest Cloud Snapshot:', '最新雲端備份快照：')}
            </span>
            <span className="font-mono text-slate-800">{appDataBackupFile.name}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {appDataBackupFile.modifiedTime
                ? new Date(appDataBackupFile.modifiedTime).toLocaleString()
                : 'Synced'}
            </span>
          </div>
        )}
      </section>

      {/* Cloud Backup & Local Export Control Panel */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              01. Save Work & Master Guide to Google Drive 儲存工作及操作指南至 Google Drive
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Creates folder <span className="font-mono font-semibold text-slate-700">/{INSUREHUB_DRIVE_FOLDER_NAME}</span> in your Google Drive with permission and prompts before overwriting existing files.
            </p>
          </div>

          {driveConnected && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>Google Drive Ready</span>
            </span>
          )}
        </div>

        {driveError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
            {driveError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Action 1: Save Both */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div>
              <div className="text-sm font-bold text-slate-900">
                Complete Project Bundle (Recommended)
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Saves both the HKIA Master Architecture & Operations Guide (.md) and your live CRM + Policy Workspace (.json) to Google Drive in one step.
              </p>
            </div>
            <button
              type="button"
              disabled={driveBusy}
              onClick={onSaveBundleToDrive}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300 whitespace-nowrap"
            >
              <CloudUpload className="h-4 w-4" aria-hidden="true" />
              <span>
                {driveBusy
                  ? 'Syncing to Google Drive...'
                  : driveConnected
                  ? 'Save Work & Guide to Drive'
                  : 'Sign In & Save Bundle to Drive'}
              </span>
            </button>
          </div>

          {/* Action 2: Master Guide */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 p-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FileText className="h-4 w-4 text-slate-600" aria-hidden="true" />
                <span>Master Guide Only</span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-slate-500">
                {MASTER_GUIDE_FILENAME}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Full HKIA regulatory handbook (RBAC, 6.0%/6.5% IRR caps, GL30, GL16, MCV rules) and deployment guide.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                disabled={driveBusy}
                onClick={onSaveMasterGuideToDrive}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300 whitespace-nowrap"
              >
                <CloudUpload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Save to Drive</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  triggerBrowserDownload(
                    MASTER_GUIDE_FILENAME,
                    MASTER_GUIDE_MARKDOWN,
                    'text/markdown;charset=utf-8'
                  )
                }
                aria-label="Download Master Guide Markdown locally"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>.md</span>
              </button>
            </div>
          </div>

          {/* Action 3: Workspace JSON Backup */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 p-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FileJson className="h-4 w-4 text-slate-600" aria-hidden="true" />
                <span>CRM & STP Workspace State</span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-slate-500">
                HK_InsureHub_Workspace_Backup.json
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Snapshot of all client leads, signed GL30 FNA records, indexed clauses, and generated STP policy records.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                disabled={driveBusy}
                onClick={onSaveWorkspaceBackupToDrive}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300 whitespace-nowrap"
              >
                <CloudUpload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Save to Drive</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  triggerBrowserDownload(
                    'HK_InsureHub_Workspace_Backup.json',
                    workspaceBackupJsonString,
                    'application/json;charset=utf-8'
                  )
                }
                aria-label="Download Workspace Backup JSON locally"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>.json</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Synced Files in Google Drive */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              02. Files Saved in Google Drive 已同步雲端檔案 ({driveFiles.length})
            </h2>
            <p className="text-xs text-slate-500">
              Shows guides, comparison proposals, STP policy PDFs, and workspace snapshots saved by HK InsureHub Pro
            </p>
          </div>

          {driveConnected && (
            <button
              type="button"
              disabled={driveBusy}
              onClick={onRefreshDriveFiles}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Refresh</span>
            </button>
          )}
        </div>

        {!driveConnected ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-sm font-medium text-slate-800">
              Sign in with Google above to view and manage files saved inside your Google Drive folder.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Only files created with HK InsureHub Pro are accessed, with your permission.
            </p>
          </div>
        ) : driveFiles.length === 0 ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-sm font-medium text-slate-800">
              No files saved in your "{INSUREHUB_DRIVE_FOLDER_NAME}" Drive folder yet
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Click "Save Work & Guide to Drive" above to upload your Master Guide and workspace snapshot now.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="py-3 px-4 font-semibold">File Name</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Last Modified</th>
                  <th className="py-3 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {driveFiles.map((file) => (
                  <tr key={file.id}>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {file.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{file.mimeType}</td>
                    <td className="py-3 px-4 font-mono text-slate-500 tabular-nums">
                      {new Date(file.modifiedTime).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <span>Open in Drive</span>
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => onRequestDeleteDriveFile(file)}
                          aria-label={`Delete ${file.name} from Google Drive`}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Embedded Readable Master Guide */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="border-b border-slate-200 pb-4">
          <h2 className="text-lg font-bold text-slate-900">{MASTER_GUIDE_TITLE}</h2>
          <p className="mt-1 text-xs text-slate-500">
            Interactive reference included inside the app and formatted for one-click export to Google Drive
          </p>
        </div>

        <div className="mt-5 space-y-6">
          {guideSections.map((sec, idx) => (
            <div
              key={idx}
              className="border-b border-slate-100 pb-5 last:border-none last:pb-0"
            >
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-700">
                {sec.trim()}
              </pre>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
