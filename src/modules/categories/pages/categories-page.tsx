import { PageContainer, ProTable, type ProColumns } from '@ant-design/pro-components';
import { Alert, Empty } from 'antd';
import { useTranslation } from 'react-i18next';
import { useCategories } from '../hooks/use-categories';
import type { Category } from '../types/category.type';

export function CategoriesPage() {
  const { t } = useTranslation();
  const categories = useCategories();
  const columns: ProColumns<Category>[] = [
    { title: t('catalogs.name', 'Tên danh mục'), dataIndex: 'name', width: 280, ellipsis: true },
    { title: t('catalogs.slug', 'Slug'), dataIndex: 'slug', width: 220, ellipsis: true },
    {
      title: t('catalogs.description', 'Mô tả'),
      dataIndex: 'description',
      width: 420,
      ellipsis: true,
    },
  ];

  return (
    <PageContainer title={t('catalogs.categories')}>
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
          columns={columns}
          tableProps={{
            sticky: true,
            scroll: { x: 'max-content', y: 'calc(100vh - 280px)' },
            locale: { emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> },
          }}
        />
      ) : null}
    </PageContainer>
  );
}
