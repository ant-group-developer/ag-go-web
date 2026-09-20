export const tagQueryKeys = {
  all: () => ['tags'] as const,
  list: () => [...tagQueryKeys.all(), 'list'] as const,
};
