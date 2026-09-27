import { ReloadOutlined } from '@ant-design/icons';
import type { ButtonProps } from 'antd';
import { Button, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';

type TableRefreshButtonProps = {
  /** Refetches the table data. */
  onRefresh: () => void;
  /** Spins the icon while a refetch is in flight. */
  refreshing?: boolean;
  size?: ButtonProps['size'];
};

/** Icon-only "reload" button placed in a table toolbar or its card header. */
export function TableRefreshButton({ onRefresh, refreshing, size }: TableRefreshButtonProps) {
  const { t } = useTranslation();
  return (
    <Tooltip title={t('common.refresh')}>
      <Button
        aria-label={t('common.refresh')}
        icon={<ReloadOutlined />}
        loading={refreshing}
        size={size}
        onClick={onRefresh}
      />
    </Tooltip>
  );
}
