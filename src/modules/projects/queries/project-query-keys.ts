import type { ProjectListParams } from '../types/project-list-params.type';

export const projectQueryKeys = {
  all: () => ['projects'] as const,
  list: (params?: ProjectListParams) =>
    params
      ? ([...projectQueryKeys.all(), 'list', params] as const)
      : ([...projectQueryKeys.all(), 'list'] as const),
  owners: () => [...projectQueryKeys.all(), 'owners'] as const,
  detail: (projectId: string) => [...projectQueryKeys.all(), 'detail', projectId] as const,
  media: (projectId: string) => [...projectQueryKeys.all(), 'media', projectId] as const,
};
