import { Alert, Cascader, Form, Input, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { useFolders } from '../../folders/hooks/use-folders';
import { buildFolderCascaderOptions } from '../../folders/utils/build-folder-cascader-options';
import { useCreateProject } from '../hooks/use-projects';
import type { CreateProjectModalProps } from '../types/create-project-modal-props.type';
import type { ProjectFormValues } from '../types/project-form-values.type';

export function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<ProjectFormValues>();
  const folders = useFolders(open);
  const create = useCreateProject();
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
      title={t('projects.create', 'Tạo dự án')}
      okText={t('projects.create', 'Tạo dự án')}
      cancelText={t('common.cancel', 'Hủy')}
      confirmLoading={create.isPending}
      okButtonProps={{
        disabled: folders.isPending || folders.isError || options.length === 0,
      }}
      onCancel={close}
      onOk={() => form.submit()}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => {
          const folderId = values.folderPath.at(-1);
          if (!folderId) {
            return;
          }

          create.mutate(
            {
              folderId,
              name: values.name.trim(),
              description: values.description?.trim() || undefined,
            },
            { onSuccess: resetAndClose },
          );
        }}
      >
        <Form.Item
          name="name"
          label={t('projects.name')}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('projects.nameRequired', 'Vui lòng nhập tên dự án'),
            },
            {
              max: 200,
              message: t('projects.nameTooLong', 'Tên dự án không được vượt quá 200 ký tự'),
            },
          ]}
        >
          <Input placeholder={t('projects.namePlaceholder', 'Nhập tên dự án')} />
        </Form.Item>
        <Form.Item
          name="folderPath"
          label={t('projects.folder')}
          rules={[
            { required: true, message: t('projects.folderRequired', 'Vui lòng chọn thư mục') },
          ]}
          extra={
            folders.isError
              ? folders.error.message
              : options.length === 0
                ? t('projects.noFolders', 'Bạn chưa có thư mục được cấp quyền chỉnh sửa')
                : undefined
          }
        >
          <Cascader
            options={options}
            showSearch
            changeOnSelect
            placeholder={t('projects.folderPlaceholder', 'Chọn thư mục lưu dự án')}
          />
        </Form.Item>
        <Form.Item name="description" label={t('projects.description', 'Mô tả')}>
          <Input.TextArea
            rows={4}
            placeholder={t('projects.descriptionPlaceholder', 'Nhập mô tả (không bắt buộc)')}
          />
        </Form.Item>
        {create.isError ? <Alert type="error" message={create.error.message} /> : null}
      </Form>
    </Modal>
  );
}
