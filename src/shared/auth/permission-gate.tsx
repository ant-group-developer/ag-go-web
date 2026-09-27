import { Flex, Spin } from 'antd';
import type { ReactNode } from 'react';
import { usePermissions } from '../../modules/account/hooks/use-current-account';
import { ForbiddenResult } from '../components/forbidden-result';

type PermissionGateProps = {
  /** User needs at least one of these permissions. */
  permissions: string[];
  /** Also require an ADMIN user type (checked by user type, not by permission). */
  adminOnly?: boolean;
  children: ReactNode;
};

export function PermissionGate({ permissions, adminOnly, children }: PermissionGateProps) {
  const { isLoading, isAdmin, canAny } = usePermissions();

  if (isLoading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: 320 }}>
        <Spin size="large" />
      </Flex>
    );
  }

  if (!canAny(permissions) || (adminOnly && !isAdmin)) {
    return <ForbiddenResult />;
  }

  return children;
}
