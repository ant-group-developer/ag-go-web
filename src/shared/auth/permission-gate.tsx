import { Flex, Spin } from 'antd';
import type { ReactNode } from 'react';
import { usePermissions } from '../../modules/account/hooks/use-current-account';
import { ForbiddenResult } from '../components/forbidden-result';

type PermissionGateProps = {
  /** User needs at least one of these permissions. */
  permissions: string[];
  children: ReactNode;
};

export function PermissionGate({ permissions, children }: PermissionGateProps) {
  const { isLoading, canAny } = usePermissions();

  if (isLoading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: 320 }}>
        <Spin size="large" />
      </Flex>
    );
  }

  if (!canAny(permissions)) {
    return <ForbiddenResult />;
  }

  return children;
}
