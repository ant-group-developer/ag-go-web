import { Avatar, Space, Typography } from 'antd';
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

  return (
    <Space size={8} style={{ minWidth: 0 }}>
      <Avatar size={24} src={user?.avatar || undefined}>
        {name.charAt(0).toUpperCase()}
      </Avatar>
      <Space direction="vertical" size={0} style={{ minWidth: 0 }}>
        <Typography.Text ellipsis>{name}</Typography.Text>
        {showEmail && user?.email && user.email !== name ? (
          <Typography.Text type="secondary" ellipsis style={{ fontSize: 12 }}>
            {user.email}
          </Typography.Text>
        ) : null}
      </Space>
    </Space>
  );
}
