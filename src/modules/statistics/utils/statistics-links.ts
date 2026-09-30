import { GO_PERMISSIONS } from '../../../shared/auth/permissions';
import type { ProjectEvaluationStatus } from '../../projects/types/project-list-params.type';

/** What the viewer may open; mirrors the route gates of the project lists in App.tsx. */
export type StatisticsLinkAccess = {
  isAdmin: boolean;
  can: (permission: string) => boolean;
};

/**
 * Project list showing the projects of a status, or null when the viewer has no list that shows
 * it. Each list only shows some statuses: `/projects` evaluated ones, `/project-evaluations`
 * pending and failed ones, `/my-projects` the viewer's drafts; admins see all on `/all-projects`.
 */
export function projectStatusLink(
  status: ProjectEvaluationStatus,
  access: StatisticsLinkAccess,
): string | null {
  const query = `?evaluationStatuses=${status}`;
  if (access.isAdmin) return `/all-projects${query}`;
  if (status === 'draft') {
    return access.can(GO_PERMISSIONS.PROJECT_READ) ? `/my-projects${query}` : null;
  }
  if (status === 'completed' || status === 'partially_completed') {
    return access.can(GO_PERMISSIONS.PROJECT_READ) ? `/projects${query}` : null;
  }
  return access.can(GO_PERMISSIONS.PROJECT_EVALUATE) ? `/project-evaluations${query}` : null;
}

/** Projects of a folder (and its sub-folders), preferring the evaluation list when work waits. */
export function folderProjectsLink(
  folderId: string,
  hasPending: boolean,
  access: StatisticsLinkAccess,
): string | null {
  const query = `?folderId=${encodeURIComponent(folderId)}`;
  if (access.isAdmin) return `/all-projects${query}`;
  if (hasPending && access.can(GO_PERMISSIONS.PROJECT_EVALUATE)) {
    return `/project-evaluations${query}`;
  }
  return access.can(GO_PERMISSIONS.PROJECT_READ) ? `/projects${query}` : null;
}

/** Project list filtered on one category, country or tag, when the viewer has a list for it. */
export function projectFilterLink(
  filter: 'category' | 'country' | 'tag',
  id: string,
  access: StatisticsLinkAccess,
): string | null {
  const param = { category: 'categoryIds', country: 'countryId', tag: 'tagIds' }[filter];
  const query = `?${param}=${encodeURIComponent(id)}`;
  if (access.isAdmin) return `/all-projects${query}`;
  return access.can(GO_PERMISSIONS.PROJECT_READ) ? `/projects${query}` : null;
}

export function projectDetailLink(projectId: string, access: StatisticsLinkAccess): string | null {
  return access.can(GO_PERMISSIONS.PROJECT_READ)
    ? `/projects/${encodeURIComponent(projectId)}`
    : null;
}

/** Tab of the system logs page that lists render jobs or Drive imports, when visible. */
export function logsTabLink(tab: 'render' | 'import', access: StatisticsLinkAccess): string | null {
  const permission = tab === 'render' ? GO_PERMISSIONS.RENDER_READ : GO_PERMISSIONS.DRIVE_IMPORT;
  return access.can(permission) ? `/system/logs?tab=${tab}` : null;
}
