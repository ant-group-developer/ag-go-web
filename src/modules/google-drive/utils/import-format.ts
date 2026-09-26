import type { ImportItem } from '../api/google-drive';

export const IMPORT_FINISHED_STATUSES = ['completed', 'partial', 'failed', 'cancelled'];

/** Statuses a batch can still be paused or cancelled from. */
export const IMPORT_PAUSABLE_STATUSES = ['queued', 'processing'];

/**
 * True while the batch's source folders are not listed yet, so its file count and size are
 * still unknown (the list is filled by the discovery job, usually seconds after creation).
 */
export function isImportScanning(batch: {
  status: string;
  sourceFolders?: Array<{ status: string }>;
}): boolean {
  return (
    !IMPORT_FINISHED_STATUSES.includes(batch.status) &&
    (batch.sourceFolders ?? []).some((folder) => ['queued', 'importing'].includes(folder.status))
  );
}

export function displayFilename(name: string, mimeType?: string | null): string {
  if (name.lastIndexOf('.') > 0) {
    return name;
  }
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/quicktime': 'mp4',
    'video/webm': 'webm',
  };
  const extension = mimeType ? extensions[mimeType.toLowerCase()] : undefined;
  return extension ? `${name}.${extension}` : name;
}

export function importStatusLabel(status: string, t: (key: string) => string): string {
  const normalized = status.toLowerCase();
  return (
    {
      queued: t('googleDrive.status.queued'),
      importing: t('googleDrive.status.importing'),
      processing: t('googleDrive.status.processing'),
      paused: t('googleDrive.status.paused'),
      completed: t('googleDrive.status.completed'),
      partial: t('googleDrive.status.partial'),
      partially_completed: t('googleDrive.status.partial'),
      failed: t('googleDrive.status.failed'),
      cancelled: t('googleDrive.status.cancelled'),
    }[normalized] ?? status
  );
}

export function importStatusColor(status: string): string {
  const normalized = status.toLowerCase();
  switch (normalized) {
    case 'completed':
      return 'success';
    case 'failed':
      return 'error';
    case 'cancelled':
      return 'default';
    case 'paused':
      return 'gold';
    case 'partial':
    case 'partially_completed':
      return 'warning';
    default:
      return 'processing';
  }
}

export function formatDimensions(width: number | null, height: number | null): string {
  return width && height ? `${width} × ${height}` : '-';
}

export function formatDuration(value: string | null): string {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '-';
  }
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Folder entries are only traversal records; the file tables hide them. */
export function isFolderItem(item: Pick<ImportItem, 'sourceMimeType'>): boolean {
  const mime = item.sourceMimeType?.toLowerCase();
  return mime === 'application/vnd.google-apps.folder' || Boolean(mime?.includes('folder'));
}
