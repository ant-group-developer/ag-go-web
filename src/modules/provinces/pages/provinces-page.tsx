import { PageContainer, ProTable, type ProColumns } from '@ant-design/pro-components';
import { Alert, Button, Image, Input, Select, Space } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCountries } from '../../countries/hooks/use-countries';
import { getProvinces } from '../api/provinces';
import type { Province } from '../types/province.type';

const DEFAULT_PAGE_SIZE = 20;

export function ProvincesPage() {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [countryId, setCountryId] = useState<string>();
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [requestError, setRequestError] = useState<Error>();
  const countries = useCountries();

  const applySearch = (value: string) => {
    setSearchInput(value);
    setSearch(value.trim());
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const applyCountry = (value: string | undefined) => {
    setCountryId(value);
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setCountryId(undefined);
    setPagination((current) => ({ ...current, page: 1 }));
  };
  const columns = useMemo<ProColumns<Province>[]>(
    () => [
      {
        title: t('catalogs.name'),
        dataIndex: 'name',
        width: 280,
        ellipsis: true,
      },
      { title: t('catalogs.code'), dataIndex: 'code', width: 120 },
      {
        title: t('catalogs.country'),
        width: 280,
        render: (_, province) => (
          <Space>
            {province.country.flagUrl ? (
              <Image
                src={province.country.flagUrl}
                alt={province.country.name}
                width={28}
                height={18}
                preview={false}
                style={{ objectFit: 'cover' }}
              />
            ) : null}
            <span>{province.country.name}</span>
          </Space>
        ),
      },
    ],
    [t],
  );

  return (
    <PageContainer title={t('catalogs.provinces')}>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          allowClear
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onClear={() => applySearch('')}
          onSearch={applySearch}
          placeholder={t('catalogs.provinceSearch')}
          style={{ width: 320 }}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          loading={countries.isPending}
          value={countryId}
          onChange={applyCountry}
          placeholder={t('catalogs.countryFilter')}
          options={countries.data?.map((country) => ({
            value: country.id,
            label: country.name,
          }))}
          style={{ width: 240 }}
        />
        <Button onClick={resetFilters}>{t('common.reset')}</Button>
      </Space>

      {requestError ? <Alert type="error" message={requestError.message} /> : null}
      <ProTable<Province>
        rowKey="id"
        request={async (params) => {
          setRequestError(undefined);
          const response = await getProvinces({
            page: params.current ?? pagination.page,
            pageSize: params.pageSize ?? pagination.pageSize,
            keyword: search || undefined,
            countryId,
          });
          return {
            data: response.items,
            success: true,
            total: response.total,
          };
        }}
        params={{ keyword: search, countryId }}
        search={false}
        options={{ reload: true, density: false, setting: false, fullScreen: false }}
        columns={columns}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          showSizeChanger: true,
          showTotal: (total, range) =>
            t('common.paginationTotal', {
              start: range[0],
              end: range[1],
              total,
            }),
          onChange: (page, pageSize) => setPagination({ page, pageSize }),
        }}
        onRequestError={setRequestError}
        sticky={{ offsetHeader: 56 }}
      />
    </PageContainer>
  );
}
