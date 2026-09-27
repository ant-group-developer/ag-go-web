import { PageContainer, ProTable, type ProColumns } from '@ant-design/pro-components';
import { Alert, App as AntApp, Button, Popconfirm, Space, Tooltip } from 'antd';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GO_PERMISSIONS } from '../../../shared/auth/permissions';
import { ApiError } from '../../../shared/lib/api-client';
import { PAGE_TABLE_STICKY } from '../../../shared/lib/sticky-table-header';
import { usePermissions } from '../../account/hooks/use-current-account';
import { CategoryFormModal } from '../components/category-form-modal';
import { useCategories, useDeleteCategory } from '../hooks/use-categories';
import type { Category } from '../types/category.type';

export function CategoriesPage() {
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const { can } = usePermissions();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const categories = useCategories();
  const deleteMutation = useDeleteCategory();
  const canCreate = can(GO_PERMISSIONS.CATEGORY_CREATE);
  const canEdit = can(GO_PERMISSIONS.CATEGORY_EDIT);
  const canDelete = can(GO_PERMISSIONS.CATEGORY_DELETE);

  const handleDelete = async (category: Category) => {
    try {
      await deleteMutation.mutateAsync(category.id);
      void message.success(t('catalogs.deleteCategorySuccess'));
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        void message.error(t('catalogs.deleteCategoryInUse'));
        return;
      }
      void message.error(
        error instanceof Error ? error.message : t('catalogs.deleteCategoryFailed'),
      );
    }
  };

  const columns: ProColumns<Category>[] = [
    { title: t('catalogs.name'), dataIndex: 'name', width: 280, ellipsis: true },
    { title: t('catalogs.slug'), dataIndex: 'slug', width: 220, ellipsis: true },
    {
      title: t('catalogs.description'),
      dataIndex: 'description',
      width: 420,
      ellipsis: true,
    },
  ];
  if (canEdit || canDelete) {
    columns.push({
      title: t('common.actions'),
      key: 'actions',
      width: 110,
      fixed: 'right',
      render: (_, category) => (
        <Space size={0}>
          {canEdit ? (
            <Tooltip title={t('common.edit')}>
              <Button
                aria-label={t('common.edit')}
                icon={<Pencil size={16} />}
                type="text"
                onClick={() => setEditingCategory(category)}
              />
            </Tooltip>
          ) : null}
          {canDelete ? (
            <Popconfirm
              title={t('catalogs.deleteCategoryConfirm', { name: category.name })}
              okText={t('common.delete')}
              cancelText={t('common.cancel')}
              okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
              onConfirm={() => handleDelete(category)}
            >
              <Tooltip title={t('common.delete')}>
                <Button
                  aria-label={t('common.delete')}
                  danger
                  icon={<Trash2 size={16} />}
                  loading={deleteMutation.isPending && deleteMutation.variables === category.id}
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
        title={t('catalogs.categories')}
        extra={
          canCreate
            ? [
                <Button
                  key="create"
                  type="primary"
                  icon={<Plus size={16} />}
                  onClick={() => setCreateOpen(true)}
                >
                  {t('catalogs.addCategory')}
                </Button>,
              ]
            : undefined
        }
      >
        {categories.isError ? <Alert type="error" message={categories.error.message} /> : null}
        {!categories.isError ? (
          <ProTable<Category>
            rowKey="id"
            loading={categories.isFetching}
            dataSource={categories.data}
            request={async () => {
              const result = await categories.refetch();
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
      <CategoryFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <CategoryFormModal
        open={Boolean(editingCategory)}
        category={editingCategory}
        onClose={() => setEditingCategory(null)}
      />
    </>
  );
}
