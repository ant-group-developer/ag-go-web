import type { CatalogResource } from '../types/catalog-resource.type';

export const catalogQueryKeys = {
  all: () => ['catalogs'] as const,
  resource: (resource: CatalogResource) => [...catalogQueryKeys.all(), resource] as const,
};
