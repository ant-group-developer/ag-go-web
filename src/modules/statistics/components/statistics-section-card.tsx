import { ProCard } from '@ant-design/pro-components';
import { Alert, Button, Empty, Skeleton, Space } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { TableRefreshButton } from '../../../shared/components/table-refresh-button';

export type StatisticsQueryState = {
  isPending: boolean;
  isError: boolean;
  /** True while a new period loads and the previous period's data is still shown. */
  isPlaceholderData?: boolean;
  /** True during any fetch (including background refetches), used to spin the refresh button. */
  isFetching?: boolean;
  data: unknown;
  refetch: () => unknown;
};

/**
 * Card shell shared by every statistics widget: skeleton while the first load runs, an error
 * with a retry button when nothing could be loaded, and an empty state. A failed background
 * refresh keeps showing the last data instead of the error; data of the previous period is
 * dimmed while the new one loads. `fillHeight` stretches the body to the card height (the row
 * height), so a list can scroll inside it instead of making the row taller.
 */
export function StatisticsSectionCard({
  title,
  extra,
  query,
  isEmpty = false,
  emptyText,
  fillHeight = false,
  /** Shows a reload button next to `extra`; pass the widget's own `query.refetch`. */
  onRefresh,
  children,
}: {
  title: ReactNode;
  extra?: ReactNode;
  query: StatisticsQueryState;
  isEmpty?: boolean;
  emptyText?: string;
  fillHeight?: boolean;
  onRefresh?: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  const cardExtra = onRefresh ? (
    <Space size={8}>
      {extra}
      <TableRefreshButton onRefresh={onRefresh} refreshing={query.isFetching} size="small" />
    </Space>
  ) : (
    extra
  );

  let body: ReactNode;
  if (query.isPending) {
    body = <Skeleton active paragraph={{ rows: 5 }} />;
  } else if (query.isError && !query.data) {
    body = <StatisticsLoadError onRetry={query.refetch} />;
  } else if (isEmpty) {
    body = (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={emptyText ?? t('statistics.empty')}
      />
    );
  } else {
    body = children;
  }

  return (
    <ProCard
      title={title}
      extra={cardExtra}
      bordered
      headerBordered
      style={{ height: '100%', borderRadius: 12, display: 'flex', flexDirection: 'column' }}
      bodyStyle={
        fillHeight ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : undefined
      }
    >
      <div
        style={{
          opacity: query.isPlaceholderData ? 0.55 : 1,
          transition: 'opacity 0.2s',
          ...(fillHeight
            ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }
            : {}),
        }}
      >
        {body}
      </div>
    </ProCard>
  );
}

export function StatisticsLoadError({ onRetry }: { onRetry: () => unknown }) {
  const { t } = useTranslation();
  return (
    <Alert
      type="error"
      showIcon
      message={t('statistics.errorLoading')}
      action={
        <Button size="small" onClick={() => void onRetry()}>
          {t('statistics.retry')}
        </Button>
      }
    />
  );
}
