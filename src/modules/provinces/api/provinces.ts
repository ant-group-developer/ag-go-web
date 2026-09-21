import { apiClient } from '../../../shared/lib/api-client';
import type { CatalogImportResult } from '../../../shared/types/catalog-import.type';
import type { ProvincePage, ProvinceQueryParams } from '../types/province.type';

export function getProvinces(params: ProvinceQueryParams): Promise<ProvincePage> {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });

  if (params.keyword) {
    query.set('keyword', params.keyword);
  }
  if (params.countryId) {
    query.set('countryId', params.countryId);
  }

  return apiClient<ProvincePage>(`/provinces?${query.toString()}`);
}

export function importProvinces(file: File): Promise<CatalogImportResult> {
  const body = new FormData();
  body.append('file', file);
  return apiClient<CatalogImportResult>('/provinces/import', {
    method: 'POST',
    body,
  });
}
