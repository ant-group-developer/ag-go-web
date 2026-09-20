import { PageContainer, ProTable, type ProColumns } from '@ant-design/pro-components';
import { Alert, Button, Empty } from 'antd';
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
  const columns: ProColumns<Folder>[] = [
    { title: t('folders.name'), dataIndex: 'name', width: 280, ellipsis: true },
    { title: t('folders.path'), dataIndex: 'pathText', width: 520, ellipsis: true },
    { title: t('folders.depth'), dataIndex: 'depth', width: 120 },
  ];

  if (folders.isError) {
    return (
      <PageContainer title={t('folders.title')}>
        <Alert type="error" message={folders.error.message} />
      </PageContainer>
    );
  }

  return (
    <>
      <PageContainer
        title={t('folders.title')}
        extra={[
          <Button
            key="create"
            type="primary"
            icon={<FolderPlus size={16} />}
            onClick={() => setCreateOpen(true)}
          >
            {t('folders.create')}
          </Button>,
        ]}
      >
        {!folders.isPending && folders.data?.length === 0 ? (
          <Empty description={t('folders.empty')} />
        ) : (
          <ProTable<Folder>
            rowKey="id"
            dataSource={folders.data}
            loading={folders.isFetching}
            request={async () => {
              const result = await folders.refetch();
              if (result.error) {
                throw result.error;
              }
              const data = result.data ?? [];
              return { data, success: true, total: data.length };
            }}
            manualRequest
            search={false}
            options={{ reload: true, density: false, setting: false, fullScreen: false }}
            pagination={{
              showTotal: (total, range) =>
                t('common.paginationTotal', {
                  start: range[0],
                  end: range[1],
                  total,
                }),
            }}
            columns={columns}
            sticky={{ offsetHeader: 56 }}
          />
        )}
      </PageContainer>
      <CreateFolderModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
