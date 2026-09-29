import type { RenderJob, RenderJobOutput } from '../api/render';

export const RENDER_STATUS_COLORS: Record<string, string> = {
  queued: 'default',
  processing: 'processing',
  paused: 'gold',
  completed: 'success',
  partial: 'warning',
  failed: 'error',
  cancelled: 'default',
};

export function renderStatusLabel(status: string, t: (key: string) => string): string {
  return (
    {
      queued: t('render.status.queued'),
      processing: t('render.status.processing'),
      paused: t('render.status.paused'),
      completed: t('render.status.completed'),
      partial: t('render.status.partial'),
      failed: t('render.status.failed'),
      cancelled: t('render.status.cancelled'),
    }[status] ?? status
  );
}

/** Batch statuses that can be paused; a paused batch can be resumed or cancelled. */
export const RENDER_PAUSABLE_STATUSES = ['queued', 'processing'];

/**
 * True when the batch has failed jobs it can queue again: a cancelled batch cannot, and a
 * paused one retries them itself when resumed.
 */
export function canRetryFailedRenderJobs(batch: { status: string; failedJobs: number }): boolean {
  return batch.failedJobs > 0 && !['cancelled', 'paused'].includes(batch.status);
}

export function renderJobSourceLabel(source: string, t: (key: string) => string): string {
  return (
    {
      batch: t('render.source.batch'),
      upload: t('render.source.upload'),
      import: t('render.source.import'),
      retry: t('render.source.retry'),
    }[source] ?? t('render.source.other')
  );
}

export const RENDER_JOB_SOURCE_COLORS: Record<string, string> = {
  batch: 'purple',
  upload: 'cyan',
  import: 'geekblue',
  retry: 'orange',
};

export function formatResolution(width?: number | null, height?: number | null): string {
  return width && height ? `${width}×${height}` : '-';
}

/** Elapsed time between two timestamps, e.g. "1m 05s". */
export function formatElapsed(from?: string | null, to?: string | null): string {
  if (!from || !to) {
    return '-';
  }
  const seconds = Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 1000));
  return seconds >= 60
    ? `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`
    : `${seconds}s`;
}

export function isThumbnailOutput(output: RenderJobOutput): boolean {
  return output.variantCode === 'thumbnail';
}

/** Rendered previews (watermarked sizes), smallest first; the thumbnail is reported separately. */
export function previewOutputs(job: RenderJob): RenderJobOutput[] {
  return (job.outputs ?? [])
    .filter((output) => !isThumbnailOutput(output))
    .sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
}

export function totalOutputBytes(job: RenderJob): number {
  return (job.outputs ?? []).reduce((sum, output) => sum + Number(output.fileSizeBytes || 0), 0);
}
