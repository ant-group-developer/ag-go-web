import { apiClient } from '../../../shared/lib/api-client';

export type CatalogItem = {
  id: string;
  name: string;
};

export function getCategories(): Promise<CatalogItem[]> {
  return apiClient<CatalogItem[]>('/categories');
}

export function getCountries(): Promise<CatalogItem[]> {
  return apiClient<CatalogItem[]>('/countries');
}

export function getProvinces(): Promise<CatalogItem[]> {
  return apiClient<CatalogItem[]>('/provinces');
}

export function getTags(): Promise<CatalogItem[]> {
  return apiClient<CatalogItem[]>('/tags');
}
