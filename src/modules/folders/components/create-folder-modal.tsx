import { Alert, Cascader, Form, Input, Modal } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateFolder, useFolders } from '../hooks/use-folders';
import type { CreateFolderModalProps } from '../types/create-folder-modal-props.type';
import type { FolderFormValues } from '../types/folder-form-values.type';
import { buildFolderCascaderOptions } from '../utils/build-folder-cascader-options';

export function CreateFolderModal({
  open,
  onClose,
  defaultParentPath,
  onCreated,
}: CreateFolderModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<FolderFormValues>();
  const folders = useFolders(open);
  const create = useCreateFolder();
  const options = buildFolderCascaderOptions(folders.data ?? []);

  useEffect(() => {
    if (open) {
      form.setFieldValue('parentPath', defaultParentPath?.length ? defaultParentPath : undefined);
    }
  }, [open, defaultParentPath, form]);

  const resetAndClose = () => {
    form.resetFields();
    onClose();
  };

  const close = () => {
    if (!create.isPending) {
      resetAndClose();
    }
  };

  return (
    <Modal
      open={open}
      title={t('folders.create')}
      okText={t('folders.create')}
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
              parentId: values.parentPath?.at(-1),
            },
            {
              onSuccess: (folder) => {
                resetAndClose();
                onCreated?.(folder);
              },
            },
          );
        }}
      >
        <Form.Item
          name="name"
          label={t('folders.name')}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('folders.nameRequired'),
            },
            {
              max: 200,
              message: t('folders.nameTooLong'),
            },
          ]}
        >
          <Input placeholder={t('folders.namePlaceholder')} />
        </Form.Item>
        <Form.Item name="parentPath" label={t('folders.parent')}>
          <Cascader
            allowClear
            options={options}
            showSearch
            placeholder={t('folders.parentPlaceholder')}
          />
        </Form.Item>
        {folders.isError ? <Alert type="error" message={folders.error.message} /> : null}
        {create.isError ? <Alert type="error" message={create.error.message} /> : null}
      </Form>
    </Modal>
  );
}
