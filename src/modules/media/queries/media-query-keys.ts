export const mediaQueryKeys = {
  all: () => ['media'] as const,
  project: (projectId: string) => [...mediaQueryKeys.all(), 'project', projectId] as const,
};
