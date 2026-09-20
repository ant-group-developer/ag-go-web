import type { ProvinceQueryParams } from '../types/province.type';

export const provinceQueryKeys = {
  all: () => ['provinces'] as const,
  list: (params: ProvinceQueryParams) => [...provinceQueryKeys.all(), 'list', params] as const,
};
