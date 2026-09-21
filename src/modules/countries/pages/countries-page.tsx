import { PageContainer, ProTable, type ProColumns } from '@ant-design/pro-components';
import { Alert, Button, Form, Image, Input, Modal, Space } from 'antd';
import { FileUp, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CatalogImportModal } from '../../../shared/components/catalog-import-modal';
import { useCountries, useCreateCountry, useImportCountries } from '../hooks/use-countries';
import type { CountryFormValues } from '../types/country-form-values.type';
import type { Country } from '../types/country.type';

export function CountriesPage() {
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form] = Form.useForm<CountryFormValues>();
  const countries = useCountries();
  const create = useCreateCountry();
  const importCountries = useImportCountries();

  const resetAndClose = () => {
    form.resetFields();
    setCreateOpen(false);
  };

  const close = () => {
    if (!create.isPending) {
      resetAndClose();
    }
  };

  const columns: ProColumns<Country>[] = [
    {
      title: t('catalogs.flag'),
      dataIndex: 'flagUrl',
      width: 80,
      search: false,
      render: (_, country) =>
        country.flagUrl ? (
          <Image
            src={country.flagUrl}
            alt={country.name}
            width={32}
            height={22}
            preview={false}
            style={{ objectFit: 'cover' }}
          />
        ) : (
          '-'
        ),
    },
    { title: t('catalogs.name'), dataIndex: 'name', width: 240, ellipsis: true },
    { title: t('catalogs.code'), dataIndex: 'code', width: 120 },
    {
      title: t('catalogs.flagUrl'),
      dataIndex: 'flagUrl',
      width: 420,
      ellipsis: true,
      render: (_, country) =>
        country.flagUrl ? (
          <Space direction="vertical" size={0}>
            <span>{country.flagUrl}</span>
          </Space>
        ) : (
          '-'
        ),
    },
  ];

  return (
    <>
      <PageContainer
        title={t('catalogs.countries')}
        extra={[
          <Button key="import" icon={<FileUp size={16} />} onClick={() => setImportOpen(true)}>
            {t('catalogs.importCsv')}
          </Button>,
          <Button
            key="create"
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => setCreateOpen(true)}
          >
            {t('catalogs.createCountry')}
          </Button>,
        ]}
      >
        {countries.isError ? <Alert type="error" message={countries.error.message} /> : null}
        {!countries.isError ? (
          <ProTable<Country>
            rowKey="id"
            loading={countries.isFetching}
            dataSource={countries.data}
            request={async () => {
              const result = await countries.refetch();
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
      <Modal
        open={createOpen}
        title={t('catalogs.createCountry')}
        okText={t('common.create')}
        cancelText={t('common.cancel')}
        confirmLoading={create.isPending}
        onCancel={close}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            create.mutate(
              {
                name: values.name.trim(),
                code: values.code?.trim() || undefined,
                flagUrl: values.flagUrl?.trim() || undefined,
              },
              { onSuccess: resetAndClose },
            );
          }}
        >
          <Form.Item
            name="name"
            label={t('catalogs.name')}
            rules={[
              {
                required: true,
                message: t('catalogs.countryNameRequired'),
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="code" label={t('catalogs.code')}>
            <Input maxLength={10} />
          </Form.Item>
          <Form.Item
            name="flagUrl"
            label={t('catalogs.flagUrl')}
            rules={[
              {
                type: 'url',
                message: t('catalogs.flagUrlInvalid'),
              },
            ]}
          >
            <Input placeholder="https://..." />
          </Form.Item>
          {create.isError ? <Alert type="error" message={create.error.message} /> : null}
        </Form>
      </Modal>
      <CatalogImportModal
        open={importOpen}
        title={t('catalogs.importCountriesTitle')}
        description={t('catalogs.importCountriesDescription')}
        loading={importCountries.isPending}
        onCancel={() => setImportOpen(false)}
        onImport={importCountries.mutateAsync}
        onSuccess={() => setImportOpen(false)}
      />
    </>
  );
}
