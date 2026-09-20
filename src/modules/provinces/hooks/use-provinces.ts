import { useQuery } from '@tanstack/react-query';
import { getProvinces } from '../api/provinces';
import { provinceQueryKeys } from '../queries/province-query-keys';
import type { ProvinceQueryParams } from '../types/province.type';

export function useProvinces(params: ProvinceQueryParams) {
  return useQuery({
    queryKey: provinceQueryKeys.list(params),
    queryFn: () => getProvinces(params),
    placeholderData: (previousData) => previousData,
  });
}
