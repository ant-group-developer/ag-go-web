import { Avatar, Flex, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { AccountUserSummary } from '../types/account-user-summary.type';

export function UserCell({
  user,
  fallbackId,
  showEmail = true,
}: {
  user?: AccountUserSummary | null;
  fallbackId?: string;
  showEmail?: boolean;
}) {
  const { t } = useTranslation();
  const name = user?.name || user?.email || fallbackId || t('common.unknown');

  // Flex + minWidth 0 lets the texts shrink to the cell width so the ellipsis actually shows.
  return (
    <Flex align="center" gap={8} style={{ minWidth: 0 }}>
      <Avatar size={24} src={user?.avatar || undefined} style={{ flexShrink: 0 }}>
        {name.charAt(0).toUpperCase()}
      </Avatar>
      <Flex vertical style={{ minWidth: 0 }}>
        <Typography.Text ellipsis={{ tooltip: name }}>{name}</Typography.Text>
        {showEmail && user?.email && user.email !== name ? (
          <Typography.Text
            type="secondary"
            ellipsis={{ tooltip: user.email }}
            style={{ fontSize: 12 }}
          >
            {user.email}
          </Typography.Text>
        ) : null}
      </Flex>
    </Flex>
  );
}
