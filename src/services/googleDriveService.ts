import { DriveSyncedFile } from '../domain/types';

const DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_ENDPOINT = 'https://www.googleapis.com/upload/drive/v3/files';
export const INSUREHUB_DRIVE_FOLDER_NAME = 'HK InsureHub Pro';

async function assertDriveOk(res: Response, actionLabel: string): Promise<any> {
  if (!res.ok) {
    let detail = '';
    try {
      const errJson = await res.json();
      detail = errJson?.error?.message || JSON.stringify(errJson);
    } catch {
      detail = await res.text();
    }
    throw new Error(`${actionLabel} failed (${res.status}): ${detail}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/**
 * Finds or creates the dedicated 'HK InsureHub Pro' folder in the user's Google Drive (via drive.file scope).
 */
export async function ensureInsureHubFolder(accessToken: string): Promise<string> {
  const query = encodeURIComponent(
    `name = '${INSUREHUB_DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const searchRes = await fetch(
    `${DRIVE_FILES_ENDPOINT}?q=${query}&fields=files(id,name)&pageSize=5`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const searchData = await assertDriveOk(searchRes, 'Search Drive folder');
  if (searchData?.files?.length > 0) {
    return searchData.files[0].id as string;
  }

  const createRes = await fetch(`${DRIVE_FILES_ENDPOINT}?fields=id,name,webViewLink`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: INSUREHUB_DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  const created = await assertDriveOk(createRes, 'Create Drive folder');
  return created.id as string;
}

/**
 * Lists all non-folder files created by HK InsureHub Pro in Google Drive.
 */
export async function listInsureHubDriveFiles(accessToken: string): Promise<DriveSyncedFile[]> {
  const query = encodeURIComponent(
    `mimeType != 'application/vnd.google-apps.folder' and trashed = false`
  );
  const res = await fetch(
    `${DRIVE_FILES_ENDPOINT}?q=${query}&orderBy=modifiedTime desc&pageSize=25&fields=files(id,name,mimeType,modifiedTime,webViewLink,size)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const data = await assertDriveOk(res, 'List Drive files');
  return (data?.files || []) as DriveSyncedFile[];
}

/**
 * Checks if a file with the given name already exists in the app's Drive folder so the caller can confirm before overwriting.
 */
export async function findExistingDriveFileByName(
  accessToken: string,
  fileName: string,
  folderId: string
): Promise<DriveSyncedFile | null> {
  const escapedName = fileName.replace(/'/g, "\\'");
  const query = encodeURIComponent(
    `name = '${escapedName}' and '${folderId}' in parents and trashed = false`
  );
  const res = await fetch(
    `${DRIVE_FILES_ENDPOINT}?q=${query}&pageSize=1&fields=files(id,name,mimeType,modifiedTime,webViewLink,size)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const data = await assertDriveOk(res, 'Check existing Drive file');
  return data?.files?.[0] || null;
}

/**
 * Uploads a new file or updates an existing file (when existingFileId is passed after explicit user confirmation).
 */
export async function uploadToGoogleDrive(params: {
  accessToken: string;
  fileName: string;
  mimeType: string;
  content: string | Uint8Array;
  folderId: string;
  existingFileId?: string;
}): Promise<DriveSyncedFile> {
  const { accessToken, fileName, mimeType, content, folderId, existingFileId } = params;

  const metadata: Record<string, unknown> = {
    name: fileName,
    mimeType,
  };
  if (!existingFileId) {
    metadata.parents = [folderId];
  }

  const boundary = `insurehub_boundary_${Date.now()}`;
  const metaHeader =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`;
  const closingFooter = `\r\n--${boundary}--`;

  const encoder = new TextEncoder();
  const headerBytes = encoder.encode(metaHeader);
  const bodyBytes = typeof content === 'string' ? encoder.encode(content) : content;
  const footerBytes = encoder.encode(closingFooter);

  const combined = new Uint8Array(headerBytes.length + bodyBytes.length + footerBytes.length);
  combined.set(headerBytes, 0);
  combined.set(bodyBytes, headerBytes.length);
  combined.set(footerBytes, headerBytes.length + bodyBytes.length);

  const url = existingFileId
    ? `${DRIVE_UPLOAD_ENDPOINT}/${existingFileId}?uploadType=multipart&fields=id,name,mimeType,modifiedTime,webViewLink,size`
    : `${DRIVE_UPLOAD_ENDPOINT}?uploadType=multipart&fields=id,name,mimeType,modifiedTime,webViewLink,size`;

  const res = await fetch(url, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: combined,
  });

  return (await assertDriveOk(res, existingFileId ? 'Overwrite Drive file' : 'Upload Drive file')) as DriveSyncedFile;
}

/**
 * Permanently deletes a synced file created by this app (must only be called after explicit user confirmation dialog).
 */
export async function deleteInsureHubDriveFile(
  accessToken: string,
  fileId: string
): Promise<void> {
  const res = await fetch(`${DRIVE_FILES_ENDPOINT}/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  await assertDriveOk(res, 'Delete Drive file');
}

export const APPDATA_WORKSPACE_BACKUP_FILENAME = 'hk_insurehub_appdata_backup_v3.json';

/**
 * Checks if a private appDataFolder workspace backup already exists in Google Drive (via drive.appdata scope).
 */
export async function findAppDataBackupFile(
  accessToken: string
): Promise<DriveSyncedFile | null> {
  const query = encodeURIComponent(
    `name = '${APPDATA_WORKSPACE_BACKUP_FILENAME}' and trashed = false`
  );
  const res = await fetch(
    `${DRIVE_FILES_ENDPOINT}?spaces=appDataFolder&q=${query}&orderBy=modifiedTime desc&pageSize=1&fields=files(id,name,mimeType,modifiedTime,size)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const data = await assertDriveOk(res, 'Inspect Google Drive appDataFolder');
  return (data?.files?.[0] as DriveSyncedFile | undefined) || null;
}

/**
 * Uploads or updates the encrypted/private workspace JSON inside Google Drive's hidden appDataFolder.
 * When existingFileId is passed, must only be invoked after explicit user confirmation.
 */
export async function saveWorkspaceToAppDataFolder(params: {
  accessToken: string;
  jsonContent: string;
  existingFileId?: string;
}): Promise<DriveSyncedFile> {
  const { accessToken, jsonContent, existingFileId } = params;
  const metadata: Record<string, unknown> = {
    name: APPDATA_WORKSPACE_BACKUP_FILENAME,
    mimeType: 'application/json',
  };
  if (!existingFileId) {
    metadata.parents = ['appDataFolder'];
  }

  const boundary = `insurehub_appdata_${Date.now()}`;
  const bodyString =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${jsonContent}\r\n` +
    `--${boundary}--`;

  const url = existingFileId
    ? `${DRIVE_UPLOAD_ENDPOINT}/${existingFileId}?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size`
    : `${DRIVE_UPLOAD_ENDPOINT}?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size`;

  const res = await fetch(url, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: new TextEncoder().encode(bodyString),
  });

  return (await assertDriveOk(
    res,
    existingFileId ? 'Update appDataFolder backup' : 'Create appDataFolder backup'
  )) as DriveSyncedFile;
}

/**
 * Downloads and parses the latest workspace snapshot from Google Drive's appDataFolder.
 */
export async function restoreWorkspaceFromAppDataFolder(
  accessToken: string,
  fileId: string
): Promise<unknown> {
  const res = await fetch(`${DRIVE_FILES_ENDPOINT}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return assertDriveOk(res, 'Download appDataFolder backup');
}

