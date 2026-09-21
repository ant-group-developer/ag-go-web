import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCountry, getCountries, importCountries } from '../api/countries';
import { countryQueryKeys } from '../queries/country-query-keys';

export function useCountries(enabled = true) {
  return useQuery({
    queryKey: countryQueryKeys.list(),
    queryFn: getCountries,
    enabled,
  });
}

export function useCreateCountry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCountry,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: countryQueryKeys.all() }),
  });
}

export function useImportCountries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importCountries,
    onSuccess: (result) => {
      if (result.inserted > 0) {
        void queryClient.invalidateQueries({ queryKey: countryQueryKeys.all() });
      }
    },
  });
}
