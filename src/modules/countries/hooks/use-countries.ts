import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCountry, getCountries } from '../api/countries';
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
