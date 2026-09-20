export const mediaQueryKeys = {
  all: () => ['media'] as const,
  project: (projectId: string) => [...mediaQueryKeys.all(), 'project', projectId] as const,
  projectReview: (projectId: string) =>
    [...mediaQueryKeys.all(), 'project-review', projectId] as const,
  evaluationHistory: (mediaId: string) =>
    [...mediaQueryKeys.all(), 'evaluation-history', mediaId] as const,
};
