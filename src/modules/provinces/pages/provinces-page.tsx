import {
  PageContainer,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { Alert, Button, Flex, Input, Space, Typography } from 'antd';
import { FileUp } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CatalogImportModal } from '../../../shared/components/catalog-import-modal';
import { CountryFlag, CountrySelect } from '../../countries/components';
import { getProvinces } from '../api/provinces';
import { useImportProvinces } from '../hooks/use-provinces';
import type { Province } from '../types/province.type';

const DEFAULT_PAGE_SIZE = 20;

export function ProvincesPage() {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [countryId, setCountryId] = useState<string>();
  const [importOpen, setImportOpen] = useState(false);
  const tableAction = useRef<ActionType | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [requestError, setRequestError] = useState<Error>();
  const importProvinces = useImportProvinces();

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
        ellipsis: true,
        render: (_, province) => (
          <Flex align="center" gap={8} style={{ minWidth: 0 }}>
            <CountryFlag
              flagUrl={province.country.flagUrl}
              code={province.country.code}
              name={province.country.name}
              height={18}
            />
            <Typography.Text ellipsis={{ tooltip: province.country.name }}>
              {province.country.name}
            </Typography.Text>
          </Flex>
        ),
      },
    ],
    [t],
  );

  return (
    <>
      <PageContainer
        title={t('catalogs.provinces')}
        extra={[
          <Button key="import" icon={<FileUp size={16} />} onClick={() => setImportOpen(true)}>
            {t('catalogs.importCsv')}
          </Button>,
        ]}
      >
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
          <CountrySelect
            value={countryId}
            onChange={applyCountry}
            placeholder={t('catalogs.countryFilter')}
            style={{ width: 240 }}
          />
          <Button onClick={resetFilters}>{t('common.reset')}</Button>
        </Space>

        {requestError ? <Alert type="error" message={requestError.message} /> : null}
        <ProTable<Province>
          actionRef={tableAction}
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
      <CatalogImportModal
        open={importOpen}
        title={t('catalogs.importProvincesTitle')}
        description={t('catalogs.importProvincesDescription')}
        loading={importProvinces.isPending}
        onCancel={() => setImportOpen(false)}
        onImport={importProvinces.mutateAsync}
        onSuccess={() => {
          setImportOpen(false);
          tableAction.current?.reload();
        }}
      />
    </>
  );
}
