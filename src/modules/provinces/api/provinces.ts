import { apiClient } from '../../../shared/lib/api-client';
import type { ProvincePage, ProvinceQueryParams } from '../types/province.type';

export function getProvinces(params: ProvinceQueryParams): Promise<ProvincePage> {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });

  if (params.search) {
    query.set('search', params.search);
  }
  if (params.countryId) {
    query.set('countryId', params.countryId);
  }

  return apiClient<ProvincePage>(`/provinces?${query.toString()}`);
}
