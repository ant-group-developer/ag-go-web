import type { Country } from '../../countries/types/country.type';

export type Province = {
  id: string;
  countryId: string;
  code: string | null;
  name: string;
  country: Country;
};

export type ProvinceQueryParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  countryId?: string;
};

export type ProvincePage = {
  items: Province[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
