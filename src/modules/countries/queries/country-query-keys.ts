export const countryQueryKeys = {
  all: () => ['countries'] as const,
  list: () => [...countryQueryKeys.all(), 'list'] as const,
};
