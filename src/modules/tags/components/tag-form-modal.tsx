import { Alert, App as AntApp, Form, Input, Modal } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateTag, useUpdateTag } from '../hooks/use-tags';
import type { CreateTagInput } from '../types/create-tag-input.type';
import type { Tag } from '../types/tag.type';

type TagFormModalProps = {
  open: boolean;
  onClose: () => void;
  /** Tag being edited; omit to create a new tag. */
  tag?: Tag | null;
};

export function TagFormModal({ open, onClose, tag }: TagFormModalProps) {
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const [form] = Form.useForm<CreateTagInput>();
  const create = useCreateTag();
  const update = useUpdateTag();
  const isEdit = Boolean(tag);
  const mutation = isEdit ? update : create;

  useEffect(() => {
    if (open && tag) {
      form.setFieldsValue({ name: tag.name });
    }
  }, [open, tag, form]);

  const resetAndClose = () => {
    form.resetFields();
    create.reset();
    update.reset();
    onClose();
  };

  const close = () => {
    if (!mutation.isPending) {
      resetAndClose();
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? t('catalogs.editTag') : t('catalogs.addTag')}
      okText={isEdit ? t('common.save') : t('common.create')}
      cancelText={t('common.cancel')}
      confirmLoading={mutation.isPending}
      okButtonProps={{ disabled: mutation.isPending }}
      cancelButtonProps={{ disabled: mutation.isPending }}
      onCancel={close}
      onOk={() => form.submit()}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => {
          if (mutation.isPending) {
            return;
          }
          const input = { name: values.name.trim() };
          if (tag) {
            update.mutate(
              { id: tag.id, input },
              {
                onSuccess: () => {
                  void message.success(t('catalogs.updateTagSuccess'));
                  resetAndClose();
                },
              },
            );
            return;
          }
          create.mutate(input, {
            onSuccess: () => {
              void message.success(t('catalogs.createTagSuccess'));
              resetAndClose();
            },
          });
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
        {mutation.isError ? <Alert type="error" showIcon message={mutation.error.message} /> : null}
      </Form>
    </Modal>
  );
}
