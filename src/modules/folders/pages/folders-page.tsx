import { Alert, Button, Card, Empty, Table, Typography } from 'antd';
import { FolderPlus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreateFolderModal } from '../components/create-folder-modal';
import { useFolders } from '../hooks/use-folders';
import type { Folder } from '../types/folder.type';

export function FoldersPage() {
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const folders = useFolders();

  if (folders.isError) {
    return <Alert type="error" message={folders.error.message} />;
  }

  return (
    <>
      <Card
        loading={folders.isPending}
        title={<Typography.Title level={3}>{t('folders.title')}</Typography.Title>}
        extra={
          <Button
            type="primary"
            icon={<FolderPlus size={16} />}
            onClick={() => setCreateOpen(true)}
          >
            {t('folders.create', 'Tạo thư mục')}
          </Button>
        }
      >
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
      <CreateFolderModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
