import { Alert, Form, Input, Modal } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdateFolder } from '../hooks/use-folders';
import type { EditFolderModalProps } from '../types/edit-folder-modal-props.type';

export function EditFolderModal({ folder, onClose }: EditFolderModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<{ name: string }>();
  const update = useUpdateFolder();

  const { reset } = update;

  useEffect(() => {
    if (folder) {
      reset();
      form.setFieldsValue({ name: folder.name });
    }
  }, [folder, form, reset]);

  const close = () => {
    if (!update.isPending) {
      onClose();
    }
  };

  return (
    <Modal
      open={Boolean(folder)}
      title={t('folders.edit')}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={update.isPending}
      onCancel={close}
      onOk={() => form.submit()}
      forceRender
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => {
          if (!folder) {
            return;
          }
          update.mutate({ id: folder.id, input: { name: values.name.trim() } }, { onSuccess: onClose });
        }}
      >
        <Form.Item
          name="name"
          label={t('folders.name')}
          rules={[
            { required: true, whitespace: true, message: t('folders.nameRequired') },
            { max: 200, message: t('folders.nameTooLong') },
          ]}
        >
          <Input placeholder={t('folders.namePlaceholder')} />
        </Form.Item>
        {update.isError ? <Alert type="error" message={update.error.message} /> : null}
      </Form>
    </Modal>
  );
}
