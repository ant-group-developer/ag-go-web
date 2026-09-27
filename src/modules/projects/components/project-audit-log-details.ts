import type { TFunction } from 'i18next';
import { formatFileSize } from '../../../shared/lib/format-file-size';
import type { AuditLog } from '../../audit/api/audit';

const MAX_SOURCE_NAMES = 3;

type UploadAuditData = {
  fileCount?: number;
  imageCount?: number;
  videoCount?: number;
  totalBytes?: number;
  files?: Array<{ name?: string }>;
};

/** "12 file (10 ảnh, 2 video) · 1.2 GB — a.jpg, b.mp4, c.jpg và 9 file khác" */
function describeUploadBatch(data: UploadAuditData, t: TFunction): string | null {
  const fileCount = data.fileCount ?? 0;
  if (!fileCount) {
    return null;
  }
  const names = (data.files ?? []).map((file) => file.name).filter(Boolean);
  const shown = names.slice(0, MAX_SOURCE_NAMES).join(', ');
  const more = Math.max(fileCount - Math.min(names.length, MAX_SOURCE_NAMES), 0);
  const summary = t('projects.auditDetails.uploadSummary', {
    count: fileCount,
    images: data.imageCount ?? 0,
    videos: data.videoCount ?? 0,
    size: formatFileSize(data.totalBytes),
  });
  if (!shown) {
    return summary;
  }
  return more
    ? t('projects.auditDetails.uploadFilesMore', { summary, names: shown, count: more })
    : t('projects.auditDetails.uploadFiles', { summary, names: shown });
}

type ImportAuditData = {
  sourceCount?: number;
  sources?: Array<{ name?: string }>;
  totalItems?: number;
  completedItems?: number;
  failedItems?: number;
};

/**
 * One-line summary of what an audit entry changed, when its payload says more than the action
 * label (e.g. which files an upload batch or a Drive import brought in). Null otherwise.
 */
export function describeAuditLog(item: AuditLog, t: TFunction): string | null {
  if (item.action === 'media_uploaded') {
    return describeUploadBatch((item.afterData ?? {}) as UploadAuditData, t);
  }
  if (!item.action.startsWith('import_')) {
    return null;
  }
  const data = (item.afterData ?? {}) as ImportAuditData;

  if (item.action === 'import_started') {
    const names = (data.sources ?? []).map((source) => source.name).filter(Boolean);
    if (names.length === 0) {
      return null;
    }
    const shown = names.slice(0, MAX_SOURCE_NAMES).join(', ');
    const more = Math.max((data.sourceCount ?? names.length) - MAX_SOURCE_NAMES, 0);
    return more
      ? t('projects.auditDetails.importSourcesMore', { names: shown, count: more })
      : t('projects.auditDetails.importSources', { names: shown });
  }

  if (typeof data.totalItems !== 'number') {
    return null;
  }
  return t('projects.auditDetails.importProgress', {
    completed: data.completedItems ?? 0,
    total: data.totalItems,
    failed: data.failedItems ?? 0,
  });
}
