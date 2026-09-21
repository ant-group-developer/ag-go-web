import { apiClient } from '../../../shared/lib/api-client';
import type { CatalogImportResult } from '../../../shared/types/catalog-import.type';
import type { Country } from '../types/country.type';
import type { CreateCountryInput } from '../types/create-country-input.type';

export function getCountries(): Promise<Country[]> {
  return apiClient<Country[]>('/countries');
}

export function createCountry(input: CreateCountryInput): Promise<Country> {
  return apiClient<Country>('/countries', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function importCountries(file: File): Promise<CatalogImportResult> {
  const body = new FormData();
  body.append('file', file);
  return apiClient<CatalogImportResult>('/countries/import', {
    method: 'POST',
    body,
  });
}
