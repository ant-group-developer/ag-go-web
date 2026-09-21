import { Alert, App as AntApp, Form, Input, InputNumber, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { useCreateCategory } from '../hooks/use-categories';
import type { CreateCategoryInput } from '../types/create-category-input.type';

type CategoryFormModalProps = {
  open: boolean;
  onClose: () => void;
};

export function CategoryFormModal({ open, onClose }: CategoryFormModalProps) {
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const [form] = Form.useForm<CreateCategoryInput>();
  const create = useCreateCategory();

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
      title={t('catalogs.addCategory')}
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
        initialValues={{ sortOrder: 0 }}
        onFinish={(values) => {
          if (create.isPending) {
            return;
          }
          create.mutate(
            {
              name: values.name.trim(),
              slug: createSlug(values.name),
              description: values.description?.trim() || undefined,
              sortOrder: values.sortOrder,
            },
            {
              onSuccess: () => {
                void message.success(t('catalogs.createCategorySuccess'));
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
              message: t('catalogs.categoryNameRequired'),
            },
            {
              max: 200,
              message: t('catalogs.categoryNameTooLong'),
            },
          ]}
        >
          <Input
            maxLength={200}
            placeholder={t('catalogs.categoryNamePlaceholder')}
            onChange={(event) => form.setFieldValue('slug', createSlug(event.target.value))}
          />
        </Form.Item>
        <Form.Item
          name="slug"
          label={t('catalogs.slug')}
          extra={t('catalogs.categorySlugAutoHint')}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('catalogs.categorySlugRequired'),
            },
            {
              max: 220,
              message: t('catalogs.categorySlugTooLong'),
            },
          ]}
        >
          <Input readOnly maxLength={220} placeholder={t('catalogs.categorySlugAutoPlaceholder')} />
        </Form.Item>
        <Form.Item name="description" label={t('catalogs.description')}>
          <Input.TextArea rows={3} placeholder={t('catalogs.categoryDescriptionPlaceholder')} />
        </Form.Item>
        <Form.Item
          name="sortOrder"
          label={t('catalogs.sortOrder')}
          rules={[
            {
              type: 'number',
              min: 0,
              message: t('catalogs.sortOrderMinimum'),
            },
          ]}
        >
          <InputNumber min={0} precision={0} style={{ width: '100%' }} />
        </Form.Item>
        {create.isError ? <Alert type="error" showIcon message={create.error.message} /> : null}
      </Form>
    </Modal>
  );
}

function createSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
