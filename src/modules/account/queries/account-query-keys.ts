export const accountQueryKeys = {
  all: ['account'] as const,
  applications: () => [...accountQueryKeys.all, 'applications'] as const,
};
