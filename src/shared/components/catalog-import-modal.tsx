import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { Alert, App as AntApp, Descriptions, Modal, Table, Typography, Upload } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CONTAINER_TABLE_STICKY } from '../lib/sticky-table-header';
import { type CatalogImportResult, importResultFromError } from '../types/catalog-import.type';

const MAX_CSV_FILE_SIZE_BYTES = 5 * 1024 * 1024;

type CatalogImportModalProps = {
  open: boolean;
  title: string;
  description?: string;
  loading: boolean;
  onCancel: () => void;
  onImport: (file: File) => Promise<CatalogImportResult>;
  onSuccess: (result: CatalogImportResult) => void;
};

export function CatalogImportModal({
  open,
  title,
  description,
  loading,
  onCancel,
  onImport,
  onSuccess,
}: CatalogImportModalProps) {
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File>();
  const [result, setResult] = useState<CatalogImportResult>();
  const [requestError, setRequestError] = useState<string>();

  useEffect(() => {
    if (!open) {
      setFileList([]);
      setSelectedFile(undefined);
      setResult(undefined);
      setRequestError(undefined);
    }
  }, [open]);

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    if (!file.name.toLocaleLowerCase().endsWith('.csv')) {
      void message.error(t('catalogs.importCsvOnly'));
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_CSV_FILE_SIZE_BYTES) {
      void message.error(t('catalogs.importFileTooLarge'));
      return Upload.LIST_IGNORE;
    }

    setSelectedFile(file);
    setFileList([file]);
    setResult(undefined);
    setRequestError(undefined);
    return false;
  };

  const submit = async () => {
    if (!selectedFile || loading) {
      return;
    }
    setResult(undefined);
    setRequestError(undefined);
    try {
      const importResult = await onImport(selectedFile);
      if (importResult.failed > 0) {
        setResult(importResult);
        return;
      }
      void message.success(
        t('catalogs.importSuccess', {
          count: importResult.inserted,
        }),
      );
      onSuccess(importResult);
    } catch (error) {
      const importResult = importResultFromError(error);
      if (importResult) {
        setResult(importResult);
      } else {
        setRequestError(error instanceof Error ? error.message : t('catalogs.importFailed'));
      }
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      okText={t('catalogs.importCsv')}
      cancelText={t('common.cancel')}
      confirmLoading={loading}
      okButtonProps={{ disabled: !selectedFile || loading }}
      cancelButtonProps={{ disabled: loading }}
      onCancel={() => !loading && onCancel()}
      onOk={() => void submit()}
      width={760}
    >
      {description ? (
        <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
      ) : null}
      <Upload.Dragger
        accept=".csv,text/csv"
        maxCount={1}
        multiple={false}
        fileList={fileList}
        beforeUpload={beforeUpload}
        onRemove={() => {
          setFileList([]);
          setSelectedFile(undefined);
          setResult(undefined);
          setRequestError(undefined);
          return true;
        }}
        disabled={loading}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">{t('catalogs.importDropFile')}</p>
        <p className="ant-upload-hint">{t('catalogs.importFileHint')}</p>
      </Upload.Dragger>

      {requestError ? (
        <Alert type="error" showIcon message={requestError} style={{ marginTop: 16 }} />
      ) : null}

      {result ? (
        <>
          <Descriptions
            size="small"
            column={3}
            style={{ marginTop: 16 }}
            items={[
              { key: 'total', label: t('catalogs.importTotalRows'), children: result.totalRows },
              { key: 'inserted', label: t('catalogs.importInserted'), children: result.inserted },
              { key: 'failed', label: t('catalogs.importFailedRows'), children: result.failed },
            ]}
          />
          {result.errors.length > 0 ? (
            <Table
              size="small"
              rowKey={(_, index) => String(index)}
              dataSource={result.errors}
              pagination={false}
              scroll={{ y: 260 }}
              sticky={CONTAINER_TABLE_STICKY}
              style={{ marginTop: 16 }}
              columns={[
                {
                  title: t('catalogs.importRow'),
                  dataIndex: 'row',
                  width: 70,
                  render: (row: number) => (row > 0 ? row : '-'),
                },
                {
                  title: t('catalogs.importField'),
                  dataIndex: 'field',
                  width: 130,
                  ellipsis: true,
                },
                {
                  title: t('catalogs.importValue'),
                  dataIndex: 'value',
                  width: 180,
                  ellipsis: true,
                },
                { title: t('catalogs.importReason'), dataIndex: 'reason', ellipsis: true },
              ]}
            />
          ) : null}
        </>
      ) : null}
    </Modal>
  );
}
