import { Alert, Cascader, Form, Input, Modal } from 'antd';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cascaderSearchFilter } from '../../../shared/lib/select-search';
import { useFolders, useUpdateFolder } from '../hooks/use-folders';
import type { EditFolderModalProps } from '../types/edit-folder-modal-props.type';
import type { FolderFormValues } from '../types/folder-form-values.type';
import type { UpdateFolderInput } from '../types/update-folder-input.type';
import { buildFolderCascaderOptions } from '../utils/build-folder-cascader-options';

export function EditFolderModal({ folder, onClose }: EditFolderModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<FolderFormValues>();
  const folders = useFolders(Boolean(folder));
  const update = useUpdateFolder();
  // Moving re-parents the whole subtree and changes inherited access, so the API requires manager.
  const canMove = folder?.myAccessLevel === 'manager';

  // A folder cannot move into itself or any of its subfolders.
  const options = useMemo(() => {
    const items = folders.data ?? [];
    return buildFolderCascaderOptions(
      folder ? items.filter((item) => !(item.pathIds ?? [item.id]).includes(folder.id)) : items,
    );
  }, [folders.data, folder]);

  const { reset } = update;

  useEffect(() => {
    if (folder) {
      reset();
      const parentPath = folder.pathIds?.slice(0, -1);
      form.setFieldsValue({
        name: folder.name,
        parentPath: parentPath?.length ? parentPath : undefined,
      });
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
          const input: UpdateFolderInput = { name: values.name.trim() };
          const parentId = values.parentPath?.at(-1) ?? null;
          if (canMove && parentId !== folder.parentId) {
            input.parentId = parentId;
          }
          update.mutate({ id: folder.id, input }, { onSuccess: onClose });
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
        <Form.Item
          name="parentPath"
          label={t('folders.parent')}
          extra={canMove ? t('folders.moveHint') : t('folders.moveManagerOnly')}
        >
          <Cascader
            allowClear
            changeOnSelect
            disabled={!canMove}
            options={options}
            showSearch={{ filter: cascaderSearchFilter }}
            placeholder={t('folders.moveToRootPlaceholder')}
          />
        </Form.Item>
        {folders.isError ? <Alert type="error" message={folders.error.message} /> : null}
        {update.isError ? <Alert type="error" message={update.error.message} /> : null}
      </Form>
    </Modal>
  );
}
