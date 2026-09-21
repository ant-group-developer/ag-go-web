import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getProvinces, importProvinces } from '../api/provinces';
import { provinceQueryKeys } from '../queries/province-query-keys';
import type { ProvinceQueryParams } from '../types/province.type';

export function useProvinces(params: ProvinceQueryParams, enabled = true) {
  return useQuery({
    queryKey: provinceQueryKeys.list(params),
    queryFn: () => getProvinces(params),
    enabled,
    placeholderData: (previousData) => previousData,
  });
}

export function useImportProvinces() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importProvinces,
    onSuccess: (result) => {
      if (result.inserted > 0) {
        void queryClient.invalidateQueries({ queryKey: provinceQueryKeys.all() });
      }
    },
  });
}
