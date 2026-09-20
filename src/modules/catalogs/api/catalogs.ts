import { apiClient } from '../../../shared/lib/api-client';
import type { CatalogItem } from '../types/catalog-item.type';

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
