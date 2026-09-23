import { useQuery } from '@tanstack/react-query';
import { getAccountApplications } from '../api/account';
import { accountQueryKeys } from '../queries/account-query-keys';

export function useAccountApplications() {
  return useQuery({
    queryKey: accountQueryKeys.applications(),
    queryFn: getAccountApplications,
    staleTime: 5 * 60 * 1000,
  });
}
