import { PageContainer, ProTable, type ProColumns } from '@ant-design/pro-components';
import { Alert, Button } from 'antd';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CategoryFormModal } from '../components/category-form-modal';
import { useCategories } from '../hooks/use-categories';
import type { Category } from '../types/category.type';

export function CategoriesPage() {
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const categories = useCategories();
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

  return (
    <>
      <PageContainer
        title={t('catalogs.categories')}
        extra={[
          <Button
            key="create"
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => setCreateOpen(true)}
          >
            {t('catalogs.addCategory')}
          </Button>,
        ]}
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
            sticky={{ offsetHeader: 56 }}
          />
        ) : null}
      </PageContainer>
      <CategoryFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
