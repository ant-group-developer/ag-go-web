import { PageContainer } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import type { TablePaginationConfig } from 'antd';
import { Alert, DatePicker, Descriptions, Drawer, Input, Select, Space, Table, Tag } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getLogs, type SystemLog } from '../api/logs';

const { RangePicker } = DatePicker;

export function LogsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string>();
  const [action, setAction] = useState<string>();
  const [level, setLevel] = useState<'info' | 'warn' | 'error'>();
  const [range, setRange] = useState<[string, string]>();
  const [selected, setSelected] = useState<SystemLog>();
  const query = useQuery({
    queryKey: ['logs', { page, category, action, level, range }],
    queryFn: () =>
      getLogs({
        page,
        pageSize: 25,
        category,
        level,
        action,
        from: range?.[0],
        to: range?.[1],
      }),
  });

  const onTableChange = (pagination: TablePaginationConfig) => {
    setPage(pagination.current ?? 1);
  };

  return (
    <PageContainer title={t('logs.title')}>
      {query.isError ? <Alert type="error" showIcon message={query.error.message} /> : null}
      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          allowClear
          placeholder={t('logs.category')}
          value={category}
          onChange={(event) => {
            setPage(1);
            setCategory(event.target.value || undefined);
          }}
        />
        <Input
          allowClear
          placeholder={t('logs.action')}
          value={action}
          onChange={(event) => {
            setPage(1);
            setAction(event.target.value || undefined);
          }}
        />
        <RangePicker
          onChange={(values) => {
            setPage(1);
            setRange(
              values?.[0] && values[1]
                ? [values[0].startOf('day').toISOString(), values[1].endOf('day').toISOString()]
                : undefined,
            );
          }}
        />
        <Select
          allowClear
          placeholder={t('logs.level')}
          options={[
            { label: t('logs.levelInfo'), value: 'info' },
            { label: t('logs.levelWarn'), value: 'warn' },
            { label: t('logs.levelError'), value: 'error' },
          ]}
          value={level}
          onChange={(value) => {
            setPage(1);
            setLevel(value);
          }}
        />
      </Space>
      <Table<SystemLog>
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data?.items ?? []}
        pagination={{
          current: query.data?.page ?? page,
          pageSize: query.data?.pageSize ?? 25,
          total: query.data?.total ?? 0,
        }}
        onChange={onTableChange}
        onRow={(record) => ({ onClick: () => setSelected(record), style: { cursor: 'pointer' } })}
        columns={[
          {
            title: t('logs.time'),
            dataIndex: 'createdAt',
            render: (value: string) => new Date(value).toLocaleString('vi-VN'),
          },
          { title: t('logs.category'), dataIndex: 'category' },
          { title: t('logs.action'), dataIndex: 'action' },
          {
            title: t('logs.level'),
            dataIndex: 'level',
            render: (value: SystemLog['level']) => (
              <Tag color={value === 'error' ? 'red' : value === 'warn' ? 'orange' : 'blue'}>
                {value}
              </Tag>
            ),
          },
          {
            title: t('logs.actor'),
            dataIndex: 'actorUser',
            render: (_: unknown, record) =>
              record.actorUser?.name ?? record.actorUser?.email ?? record.userId ?? '—',
          },
          { title: t('logs.message'), dataIndex: 'message', ellipsis: true },
        ]}
      />
      <Drawer title={t('logs.details')} open={Boolean(selected)} onClose={() => setSelected(undefined)}>
        {selected ? (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">{selected.id}</Descriptions.Item>
            <Descriptions.Item label={t('logs.action')}>{selected.action}</Descriptions.Item>
            <Descriptions.Item label={t('logs.message')}>{selected.message}</Descriptions.Item>
            <Descriptions.Item label={t('logs.project')}>{selected.projectId ?? '—'}</Descriptions.Item>
            <Descriptions.Item label={t('logs.metadata')}>
              <pre style={{ whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(selected.metadata ?? {}, null, 2)}
              </pre>
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>
    </PageContainer>
  );
}
