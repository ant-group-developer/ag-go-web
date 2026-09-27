import { PageContainer, ProTable, type ProColumns } from '@ant-design/pro-components';
import { Alert, App as AntApp, Button, Popconfirm, Space, Tooltip } from 'antd';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GO_PERMISSIONS } from '../../../shared/auth/permissions';
import { ApiError } from '../../../shared/lib/api-client';
import { PAGE_TABLE_STICKY } from '../../../shared/lib/sticky-table-header';
import { usePermissions } from '../../account/hooks/use-current-account';
import { TagFormModal } from '../components/tag-form-modal';
import { useDeleteTag, useTags } from '../hooks/use-tags';
import type { Tag } from '../types/tag.type';

export function TagsPage() {
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const { can } = usePermissions();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const tags = useTags();
  const deleteMutation = useDeleteTag();
  const canCreate = can(GO_PERMISSIONS.TAG_CREATE);
  const canEdit = can(GO_PERMISSIONS.TAG_EDIT);
  const canDelete = can(GO_PERMISSIONS.TAG_DELETE);

  const handleDelete = async (tag: Tag) => {
    try {
      await deleteMutation.mutateAsync(tag.id);
      void message.success(t('catalogs.deleteTagSuccess'));
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        void message.error(t('catalogs.deleteTagInUse'));
        return;
      }
      void message.error(error instanceof Error ? error.message : t('catalogs.deleteTagFailed'));
    }
  };

  const columns: ProColumns<Tag>[] = [
    { title: t('catalogs.name'), dataIndex: 'name', width: 360, ellipsis: true },
  ];
  if (canEdit || canDelete) {
    columns.push({
      title: t('common.actions'),
      key: 'actions',
      width: 110,
      fixed: 'right',
      render: (_, tag) => (
        <Space size={0}>
          {canEdit ? (
            <Tooltip title={t('common.edit')}>
              <Button
                aria-label={t('common.edit')}
                icon={<Pencil size={16} />}
                type="text"
                onClick={() => setEditingTag(tag)}
              />
            </Tooltip>
          ) : null}
          {canDelete ? (
            <Popconfirm
              title={t('catalogs.deleteTagConfirm', { name: tag.name })}
              okText={t('common.delete')}
              cancelText={t('common.cancel')}
              okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
              onConfirm={() => handleDelete(tag)}
            >
              <Tooltip title={t('common.delete')}>
                <Button
                  aria-label={t('common.delete')}
                  danger
                  icon={<Trash2 size={16} />}
                  loading={deleteMutation.isPending && deleteMutation.variables === tag.id}
                  type="text"
                />
              </Tooltip>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    });
  }

  return (
    <>
      <PageContainer
        title={t('catalogs.tags')}
        extra={
          canCreate
            ? [
                <Button
                  key="create"
                  type="primary"
                  icon={<Plus size={16} />}
                  onClick={() => setCreateOpen(true)}
                >
                  {t('catalogs.addTag')}
                </Button>,
              ]
            : undefined
        }
      >
        {tags.isError ? <Alert type="error" message={tags.error.message} /> : null}
        {!tags.isError ? (
          <ProTable<Tag>
            rowKey="id"
            loading={tags.isFetching}
            dataSource={tags.data}
            request={async () => {
              const result = await tags.refetch();
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
            sticky={PAGE_TABLE_STICKY}
          />
        ) : null}
      </PageContainer>
      <TagFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <TagFormModal
        open={Boolean(editingTag)}
        tag={editingTag}
        onClose={() => setEditingTag(null)}
      />
    </>
  );
}
