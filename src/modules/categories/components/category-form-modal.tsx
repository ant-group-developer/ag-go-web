import { Alert, App as AntApp, Form, Input, InputNumber, Modal } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateCategory, useUpdateCategory } from '../hooks/use-categories';
import type { Category } from '../types/category.type';
import type { CreateCategoryInput } from '../types/create-category-input.type';

type CategoryFormModalProps = {
  open: boolean;
  onClose: () => void;
  /** Called with the created category after a successful create. */
  onCreated?: (category: Category) => void;
  /** Prefills the name field when the modal opens. */
  defaultName?: string;
  /** Category being edited; omit to create a new category. */
  category?: Category | null;
};

export function CategoryFormModal({
  open,
  onClose,
  onCreated,
  defaultName,
  category,
}: CategoryFormModalProps) {
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const [form] = Form.useForm<CreateCategoryInput>();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const isEdit = Boolean(category);
  const mutation = isEdit ? update : create;

  useEffect(() => {
    if (!open) {
      return;
    }
    if (category) {
      form.setFieldsValue({
        name: category.name,
        slug: category.slug ?? createSlug(category.name),
        description: category.description ?? undefined,
        sortOrder: category.sortOrder ?? 0,
      });
      return;
    }
    const name = defaultName?.trim();
    if (name) {
      form.setFieldsValue({ name, slug: createSlug(name) });
    }
  }, [open, defaultName, category, form]);

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
      title={isEdit ? t('catalogs.editCategory') : t('catalogs.addCategory')}
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
        initialValues={{ sortOrder: 0 }}
        onFinish={(values) => {
          if (mutation.isPending) {
            return;
          }
          if (category) {
            update.mutate(
              {
                id: category.id,
                input: {
                  name: values.name.trim(),
                  slug: createSlug(values.name),
                  description: values.description?.trim() || null,
                  sortOrder: values.sortOrder,
                },
              },
              {
                onSuccess: () => {
                  void message.success(t('catalogs.updateCategorySuccess'));
                  resetAndClose();
                },
              },
            );
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
              onSuccess: (category) => {
                void message.success(t('catalogs.createCategorySuccess'));
                resetAndClose();
                onCreated?.(category);
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
        {mutation.isError ? <Alert type="error" showIcon message={mutation.error.message} /> : null}
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
