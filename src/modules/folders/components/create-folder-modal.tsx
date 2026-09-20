import { Alert, Cascader, Form, Input, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { useCreateFolder, useFolders } from '../hooks/use-folders';
import type { CreateFolderModalProps } from '../types/create-folder-modal-props.type';
import type { FolderFormValues } from '../types/folder-form-values.type';
import { buildFolderCascaderOptions } from '../utils/build-folder-cascader-options';

export function CreateFolderModal({ open, onClose }: CreateFolderModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<FolderFormValues>();
  const folders = useFolders(open);
  const create = useCreateFolder();
  const options = buildFolderCascaderOptions(folders.data ?? []);

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
      title={t('folders.create', 'Tạo thư mục')}
      okText={t('folders.create', 'Tạo thư mục')}
      cancelText={t('common.cancel', 'Hủy')}
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
            { onSuccess: resetAndClose },
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
              message: t('folders.nameRequired', 'Vui lòng nhập tên thư mục'),
            },
            {
              max: 200,
              message: t('folders.nameTooLong', 'Tên thư mục không được vượt quá 200 ký tự'),
            },
          ]}
        >
          <Input placeholder={t('folders.namePlaceholder', 'Nhập tên thư mục')} />
        </Form.Item>
        <Form.Item name="parentPath" label={t('folders.parent', 'Thư mục cha')}>
          <Cascader
            allowClear
            options={options}
            showSearch
            placeholder={t('folders.parentPlaceholder', 'Chọn thư mục cha (không bắt buộc)')}
          />
        </Form.Item>
        {folders.isError ? <Alert type="error" message={folders.error.message} /> : null}
        {create.isError ? <Alert type="error" message={create.error.message} /> : null}
      </Form>
    </Modal>
  );
}
