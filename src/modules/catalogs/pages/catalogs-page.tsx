import { useQueries } from '@tanstack/react-query';
import { Alert, Card, Col, Empty, List, Row, Spin, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { getCategories, getCountries, getProvinces, getTags } from '../api/catalogs';

export function CatalogsPage() {
  const { t } = useTranslation();
  const catalogs = useQueries({
    queries: [
      { queryKey: ['catalogs', 'categories'], queryFn: getCategories },
      { queryKey: ['catalogs', 'countries'], queryFn: getCountries },
      { queryKey: ['catalogs', 'provinces'], queryFn: getProvinces },
      { queryKey: ['catalogs', 'tags'], queryFn: getTags },
    ],
  });
  const hasError = catalogs.some((query) => query.isError);
  const isLoading = catalogs.some((query) => query.isPending);

  if (hasError) {
    return <Alert type="error" message="Không tải được danh mục" />;
  }

  const sections = [
    [t('catalogs.categories'), catalogs[0].data],
    [t('catalogs.countries'), catalogs[1].data],
    [t('catalogs.provinces'), catalogs[2].data],
    [t('catalogs.tags'), catalogs[3].data],
  ] as const;

  return (
    <Card>
      <Typography.Title level={3}>{t('catalogs.title')}</Typography.Title>
      {isLoading ? (
        <Spin />
      ) : (
        <Row gutter={[16, 16]}>
          {sections.map(([title, items]) => (
            <Col key={title} xs={24} md={12} xl={6}>
              <Card size="small" title={title}>
                {items?.length ? (
                  <List
                    size="small"
                    dataSource={items}
                    renderItem={(item) => <List.Item>{item.name}</List.Item>}
                  />
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Card>
  );
}
