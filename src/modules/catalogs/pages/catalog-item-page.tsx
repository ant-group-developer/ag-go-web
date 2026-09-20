import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Empty, List, Spin, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  getCategories,
  getCountries,
  getProvinces,
  getTags,
  type CatalogItem,
} from '../api/catalogs';

type CatalogResource = 'categories' | 'countries' | 'provinces' | 'tags';

const resourceConfig: Record<
  CatalogResource,
  {
    titleKey: string;
    queryFn: () => Promise<CatalogItem[]>;
  }
> = {
  categories: { titleKey: 'catalogs.categories', queryFn: getCategories },
  countries: { titleKey: 'catalogs.countries', queryFn: getCountries },
  provinces: { titleKey: 'catalogs.provinces', queryFn: getProvinces },
  tags: { titleKey: 'catalogs.tags', queryFn: getTags },
};

type CatalogItemPageProps = {
  resource: CatalogResource;
};

export function CatalogItemPage({ resource }: CatalogItemPageProps) {
  const { t } = useTranslation();
  const config = resourceConfig[resource];
  const items = useQuery({
    queryKey: ['catalogs', resource],
    queryFn: config.queryFn,
  });

  return (
    <Card>
      <Typography.Title level={3}>{t(config.titleKey)}</Typography.Title>
      {items.isPending ? <Spin /> : null}
      {items.isError ? <Alert type="error" message={items.error.message} /> : null}
      {!items.isPending && !items.isError ? (
        items.data.length > 0 ? (
          <List dataSource={items.data} renderItem={(item) => <List.Item>{item.name}</List.Item>} />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )
      ) : null}
    </Card>
  );
}
