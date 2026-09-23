import { useQuery } from '@tanstack/react-query';
import { isAdminUserType } from '../../../shared/auth/user-type';
import { getCurrentAccountUser } from '../api/account';
import { accountQueryKeys } from '../queries/account-query-keys';

export function useCurrentAccount() {
  return useQuery({
    queryKey: accountQueryKeys.me(),
    queryFn: getCurrentAccountUser,
    staleTime: 60 * 1000,
  });
}

export function useHasPermission(permission: string) {
  const account = useCurrentAccount();
  return {
    ...account,
    allowed:
      isAdminUserType(account.data?.user_type) ||
      (account.data?.permissions.includes(permission) ?? false),
  };
}
