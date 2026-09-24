import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
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

/**
 * Permission checks for the current user. `can` is false while the account is loading,
 * so UI gated by it never flashes before permissions are known.
 */
export function usePermissions() {
  const account = useCurrentAccount();
  const data = account.data;

  const can = useCallback(
    (permission: string) =>
      Boolean(data) &&
      (isAdminUserType(data?.user_type) || (data?.permissions.includes(permission) ?? false)),
    [data],
  );
  const canAny = useCallback(
    (permissions: string[]) => permissions.some((permission) => can(permission)),
    [can],
  );

  return { isLoading: account.isLoading, isError: account.isError, can, canAny };
}
