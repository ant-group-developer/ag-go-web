import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Empty, Table, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { getFolders, type Folder } from '../api/folders';

export function FoldersPage() {
  const { t } = useTranslation();
  const folders = useQuery({
    queryKey: ['folders', 'tree'],
    queryFn: getFolders,
  });

  if (folders.isError) {
    return <Alert type="error" message={folders.error.message} />;
  }

  return (
    <Card loading={folders.isPending}>
      <Typography.Title level={3}>{t('folders.title')}</Typography.Title>
      {!folders.isPending && folders.data?.length === 0 ? (
        <Empty description={t('folders.empty')} />
      ) : (
        <Table<Folder>
          rowKey="id"
          dataSource={folders.data}
          pagination={false}
          columns={[
            { title: t('folders.name'), dataIndex: 'name' },
            { title: t('folders.path'), dataIndex: 'pathText' },
            { title: t('folders.depth'), dataIndex: 'depth', width: 120 },
          ]}
        />
      )}
    </Card>
  );
}
