import { PageContainer, ProTable } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import type { TablePaginationConfig } from 'antd';
import { Alert, DatePicker, Descriptions, Drawer, Input, Select, Space, Tag } from 'antd';
import { useState } from 'react';
import { getLogs, type SystemLog } from '../api/logs';

const { RangePicker } = DatePicker;

export function LogsPage() {
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
    <PageContainer title="Logs">
      {query.isError ? <Alert type="error" showIcon message={query.error.message} /> : null}
      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          allowClear
          placeholder="Category"
          value={category}
          onChange={(event) => {
            setPage(1);
            setCategory(event.target.value || undefined);
          }}
        />
        <Input
          allowClear
          placeholder="Action"
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
          placeholder="Level"
          options={[
            { label: 'Info', value: 'info' },
            { label: 'Warning', value: 'warn' },
            { label: 'Error', value: 'error' },
          ]}
          value={level}
          onChange={(value) => {
            setPage(1);
            setLevel(value);
          }}
        />
      </Space>
      <ProTable<SystemLog>
        rowKey="id"
        sticky={{ offsetHeader: 64 }}
        search={false}
        loading={query.isLoading}
        dataSource={query.data?.items ?? []}
        pagination={{
          current: query.data?.page ?? page,
          pageSize: query.data?.pageSize ?? 25,
          total: query.data?.total ?? 0,
        }}
        bordered
        onChange={onTableChange}
        onRow={(record) => ({ onClick: () => setSelected(record), style: { cursor: 'pointer' } })}
        columns={[
          {
            title: 'Thời gian',
            dataIndex: 'createdAt',
            render: (_, record) =>
              record.createdAt ? new Date(record.createdAt).toLocaleString('vi-VN') : '—',
          },
          { title: 'Category', dataIndex: 'category' },
          { title: 'Action', dataIndex: 'action' },
          {
            title: 'Mức',
            dataIndex: 'level',
            render: (_, record) => (
              <Tag color={record.level === 'error' ? 'red' : record.level === 'warn' ? 'orange' : 'blue'}>
                {record.level}
              </Tag>
            ),
          },
          {
            title: 'Actor',
            dataIndex: 'actorUser',
            render: (_, record) =>
              record.actorUser?.name ?? record.actorUser?.email ?? record.userId ?? '—',
          },
          { title: 'Message', dataIndex: 'message', ellipsis: true },
        ]}
      />
      <Drawer title="Chi tiết log" open={Boolean(selected)} onClose={() => setSelected(undefined)}>
        {selected ? (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">{selected.id}</Descriptions.Item>
            <Descriptions.Item label="Action">{selected.action}</Descriptions.Item>
            <Descriptions.Item label="Message">{selected.message}</Descriptions.Item>
            <Descriptions.Item label="Project">{selected.projectId ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Metadata">
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
