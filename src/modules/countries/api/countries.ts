import { apiClient } from '../../../shared/lib/api-client';
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
