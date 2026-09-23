export const accountQueryKeys = {
  all: ['account'] as const,
  me: () => [...accountQueryKeys.all, 'me'] as const,
  applications: () => [...accountQueryKeys.all, 'applications'] as const,
};
