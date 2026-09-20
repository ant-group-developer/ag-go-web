import { PageContainer, ProTable, type ProColumns } from '@ant-design/pro-components';
import { Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import { useTags } from '../hooks/use-tags';
import type { Tag } from '../types/tag.type';

export function TagsPage() {
  const { t } = useTranslation();
  const tags = useTags();
  const columns: ProColumns<Tag>[] = [
    { title: t('catalogs.name'), dataIndex: 'name', width: 360, ellipsis: true },
  ];

  return (
    <PageContainer title={t('catalogs.tags')}>
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
          sticky={{ offsetHeader: 56 }}
        />
      ) : null}
    </PageContainer>
  );
}
