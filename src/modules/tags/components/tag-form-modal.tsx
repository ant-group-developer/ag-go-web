import { Alert, App as AntApp, Form, Input, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { useCreateTag } from '../hooks/use-tags';
import type { CreateTagInput } from '../types/create-tag-input.type';

type TagFormModalProps = {
  open: boolean;
  onClose: () => void;
};

export function TagFormModal({ open, onClose }: TagFormModalProps) {
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const [form] = Form.useForm<CreateTagInput>();
  const create = useCreateTag();

  const resetAndClose = () => {
    form.resetFields();
    create.reset();
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
      title={t('catalogs.addTag')}
      okText={t('common.create')}
      cancelText={t('common.cancel')}
      confirmLoading={create.isPending}
      okButtonProps={{ disabled: create.isPending }}
      cancelButtonProps={{ disabled: create.isPending }}
      onCancel={close}
      onOk={() => form.submit()}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => {
          if (create.isPending) {
            return;
          }
          create.mutate(
            { name: values.name.trim() },
            {
              onSuccess: () => {
                void message.success(t('catalogs.createTagSuccess'));
                resetAndClose();
              },
            },
          );
        }}
      >
        <Form.Item
          name="name"
          label={t('catalogs.name')}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('catalogs.tagNameRequired'),
            },
            {
              max: 100,
              message: t('catalogs.tagNameTooLong'),
            },
          ]}
        >
          <Input maxLength={100} placeholder={t('catalogs.tagNamePlaceholder')} />
        </Form.Item>
        {create.isError ? <Alert type="error" showIcon message={create.error.message} /> : null}
      </Form>
    </Modal>
  );
}
