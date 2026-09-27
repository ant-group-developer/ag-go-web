import { sortRows, toTimestamp, type SortValue } from '../../../shared/lib/compare-sort-values';
import type { RenderJob, RenderJobSort, RenderJobSortField } from '../api/render';

export const RENDER_JOB_SORT_FIELDS: readonly RenderJobSortField[] = [
  'createdAt',
  'startedAt',
  'elapsed',
];

/** Newest first, the order the server returns without a sort. */
export const DEFAULT_RENDER_JOB_SORT: RenderJobSort = { sortBy: 'createdAt', sortOrder: 'desc' };

/** Processing time in ms, or `null` while the job has not started or not finished. */
export function renderJobElapsedMs(job: RenderJob): number | null {
  const started = toTimestamp(job.startedAt);
  const finished = toTimestamp(job.finishedAt);
  return started === null || finished === null ? null : Math.max(0, finished - started);
}

const SORT_VALUES: Record<RenderJobSortField, (job: RenderJob) => SortValue> = {
  createdAt: (job) => toTimestamp(job.createdAt),
  startedAt: (job) => toTimestamp(job.startedAt),
  elapsed: renderJobElapsedMs,
};

/** Sorted copy of `jobs`, for tables sorting in the browser; jobs without the value go last. */
export function sortRenderJobs(jobs: readonly RenderJob[], sort: RenderJobSort): RenderJob[] {
  return sortRows(jobs, SORT_VALUES[sort.sortBy], sort.sortOrder);
}
