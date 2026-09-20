export const projectQueryKeys = {
  all: () => ['projects'] as const,
  list: () => [...projectQueryKeys.all(), 'list'] as const,
  detail: (projectId: string) => [...projectQueryKeys.all(), 'detail', projectId] as const,
  media: (projectId: string) => [...projectQueryKeys.all(), 'media', projectId] as const,
};
