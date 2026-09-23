export const statisticsQueryKeys = {
  all: ['statistics'] as const,
  overview: () => [...statisticsQueryKeys.all, 'overview'] as const,
  rendering: () => [...statisticsQueryKeys.all, 'rendering'] as const,
};
