import { Alert, Button, Card, Input, Space, Switch, Table, Tag, Tooltip, Typography } from 'antd';
import { RotateCw } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from '../../../shared/components/select';
import { formatDate } from '../../../shared/lib/format-date';
import { bilingualSearchText } from '../../../shared/lib/search-text';
import type { AnalysisLogEntry, AnalysisLogLevel } from '../api/analysis';
import { useAnalysisLogs } from '../hooks/use-analysis';

const LEVEL_COLOR: Record<AnalysisLogLevel, string> = {
  info: 'blue',
  warn: 'orange',
  error: 'red',
};

/**
 * The analysis pipeline's processing log: each backfill run, farm submission, extract/AI result,
 * completion and failure, newest first. Refreshes itself while auto-refresh is on.
 */
export function AnalysisLogCard() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [level, setLevel] = useState<AnalysisLogLevel>();
  const [search, setSearch] = useState<string>();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const logs = useAnalysisLogs({ page, pageSize, level, search }, autoRefresh);

  return (
    <Card
      title={t('analysis.logTitle')}
      extra={
        <Space wrap size={8}>
          <Input.Search
            allowClear
            placeholder={t('analysis.logSearch')}
            style={{ width: 240 }}
            onSearch={(value) => {
              setPage(1);
              setSearch(value.trim() || undefined);
            }}
          />
          <Select
            allowClear
            placeholder={t('logs.level')}
            style={{ width: 110 }}
            value={level}
            options={(['info', 'warn', 'error'] as const).map((value) => {
              const key = `logs.level${value[0].toUpperCase()}${value.slice(1)}`;
              return { label: t(key), value, searchText: bilingualSearchText(key) };
            })}
            onChange={(value: AnalysisLogLevel | undefined) => {
              setPage(1);
              setLevel(value);
            }}
          />
          <Tooltip title={t('analysis.logAutoRefreshHint')}>
            <Space size={6}>
              <Switch size="small" checked={autoRefresh} onChange={setAutoRefresh} />
              <Typography.Text style={{ fontSize: 13 }}>
                {t('analysis.logAutoRefresh')}
              </Typography.Text>
            </Space>
          </Tooltip>
          <Tooltip title={t('analysis.logReload')}>
            <Button
              icon={<RotateCw size={14} />}
              loading={logs.isFetching}
              onClick={() => void logs.refetch()}
            />
          </Tooltip>
        </Space>
      }
    >
      {logs.isError ? (
        <Alert type="error" showIcon message={logs.error.message} style={{ marginBottom: 12 }} />
      ) : null}
      <Table<AnalysisLogEntry>
        rowKey="id"
        size="small"
        loading={logs.isPending}
        dataSource={logs.data?.items ?? []}
        locale={{ emptyText: t('analysis.logEmpty') }}
        pagination={{
          current: page,
          pageSize,
          total: logs.data?.total ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [20, 50, 100],
          showTotal: (total, range) =>
            t('common.paginationTotal', { start: range[0], end: range[1], total }),
          onChange: (nextPage, nextPageSize) => {
            setPage(nextPageSize === pageSize ? nextPage : 1);
            setPageSize(nextPageSize);
          },
        }}
        expandable={{
          expandedRowRender: (record) => (
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
              {JSON.stringify({ action: record.action, ...record.metadata }, null, 2)}
            </pre>
          ),
        }}
        columns={[
          {
            title: t('logs.time'),
            dataIndex: 'createdAt',
            width: 170,
            render: (value: string) => formatDate(value, 'HH:mm:ss DD/MM/YYYY'),
          },
          {
            title: t('logs.level'),
            dataIndex: 'level',
            width: 80,
            render: (value: AnalysisLogLevel) => <Tag color={LEVEL_COLOR[value]}>{value}</Tag>,
          },
          {
            title: t('logs.action'),
            dataIndex: 'action',
            width: 220,
            render: (value: string) => (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {value}
              </Typography.Text>
            ),
          },
          { title: t('logs.message'), dataIndex: 'message' },
        ]}
      />
    </Card>
  );
}
