import { PictureOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import type { UploadFile, UploadProps } from 'antd';
import {
  Alert,
  App as AntApp,
  Button,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Typography,
  Upload,
} from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CategorySelect } from '../../categories/components/category-select';
import { CountrySelect } from '../../countries/components/country-select';
import { FolderCascader } from '../../folders/components/folder-cascader';
import { useFolders } from '../../folders/hooks/use-folders';
import {
  abortUpload,
  attachProjectMedia,
  completeUpload,
  createUploadSession,
  setProjectThumbnail,
  uploadAssetContent,
} from '../../media/api/media';
import { mediaQueryKeys } from '../../media/queries/media-query-keys';
import { useProvinces } from '../../provinces/hooks/use-provinces';
import { useTags } from '../../tags/hooks/use-tags';
import { useCreateProject } from '../hooks/use-projects';
import { projectQueryKeys } from '../queries/project-query-keys';
import type { CreateProjectModalProps } from '../types/create-project-modal-props.type';
import type { ProjectFormValues } from '../types/project-form-values.type';

export function CreateProjectModal({ open, onClose, onComplete }: CreateProjectModalProps) {
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ProjectFormValues>();
  const folders = useFolders(open);
  const tags = useTags(open);
  const create = useCreateProject();
  const hasFolders = (folders.data?.length ?? 0) > 0;
  const countryId = Form.useWatch('countryId', form);
  const provinces = useProvinces({ page: 1, pageSize: 100, countryId }, open && Boolean(countryId));
  const [thumbnailFile, setThumbnailFile] = useState<UploadFile>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creationError, setCreationError] = useState<string>();

  useEffect(() => {
    if (!open) {
      return;
    }

    form.resetFields();
    setThumbnailFile(undefined);
    setCreationError(undefined);
  }, [form, open]);

  const close = () => {
    if (isSubmitting || create.isPending) {
      return;
    }
    form.resetFields();
    onClose();
  };

  const createProject = async (values: ProjectFormValues) => {
    const folderId = values.folderPath.at(-1);
    if (!folderId) {
      return;
    }

    setCreationError(undefined);
    setIsSubmitting(true);
    try {
      const tagNames = (values.tags ?? []).reduce<string[]>((uniqueNames, name) => {
        const trimmedName = name.trim();
        const normalizedName = trimmedName.toLocaleLowerCase('vi-VN');
        if (
          normalizedName &&
          !uniqueNames.some(
            (existingName) => existingName.toLocaleLowerCase('vi-VN') === normalizedName,
          )
        ) {
          uniqueNames.push(trimmedName);
        }
        return uniqueNames;
      }, []);
      const createdProject = await create.mutateAsync({
        folderId,
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        categoryId: values.categoryId,
        countryId: values.countryId,
        provinceId: values.provinceId,
        tags: tagNames,
      });

      if (thumbnailFile?.originFileObj) {
        const rawFile = thumbnailFile.originFileObj;
        let session: Awaited<ReturnType<typeof createUploadSession>> | undefined;
        let uploadCompleted = false;

        try {
          session = await createUploadSession(
            {
              assetType: 'image',
              originalFilename: rawFile.name,
              mimeType: rawFile.type || 'application/octet-stream',
              fileSizeBytes: rawFile.size,
              targetProjectId: createdProject.id,
            },
            globalThis.crypto.randomUUID(),
          );
          await uploadAssetContent(session, rawFile);
          const completedAsset = await completeUpload(session.assetId, session.uploadSessionId);
          uploadCompleted = true;
          const attachedMedia = await attachProjectMedia(createdProject.id, {
            assetId: completedAsset.id,
          });
          await setProjectThumbnail(createdProject.id, attachedMedia.id);
          void queryClient.invalidateQueries({
            queryKey: mediaQueryKeys.project(createdProject.id),
          });
          void queryClient.invalidateQueries({
            queryKey: projectQueryKeys.detail(createdProject.id),
          });
        } catch (error) {
          if (session && !uploadCompleted) {
            await abortUpload(session.assetId, session.uploadSessionId).catch(() => undefined);
          }
          void message.warning(
            error instanceof Error ? error.message : t('projects.thumbnailFailed'),
          );
        }
      }

      form.resetFields();
      onComplete(createdProject);
    } catch (error) {
      setCreationError(error instanceof Error ? error.message : t('projects.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleThumbnailChange: UploadProps['onChange'] = ({ fileList: nextFileList }) => {
    setThumbnailFile(nextFileList.at(-1));
  };

  const footer = (
    <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Button onClick={close} disabled={isSubmitting || create.isPending}>
        {t('common.cancel')}
      </Button>
      <Button
        type="primary"
        loading={isSubmitting || create.isPending}
        disabled={folders.isPending || folders.isError || !hasFolders}
        onClick={() => form.submit()}
      >
        {t('projects.create')}
      </Button>
    </Space>
  );

  return (
    <Drawer
      open={open}
      title={t('projects.create')}
      placement="right"
      width={720}
      closable={!isSubmitting && !create.isPending}
      maskClosable={!isSubmitting && !create.isPending}
      keyboard={!isSubmitting && !create.isPending}
      onClose={close}
      footer={footer}
      styles={{ body: { padding: 24 } }}
    >
      <Form<ProjectFormValues>
        form={form}
        layout="vertical"
        onFinish={(values) => void createProject(values)}
        style={{ maxWidth: 720, margin: '0 auto' }}
      >
        <Form.Item
          name="name"
          label={t('projects.name')}
          rules={[
            { required: true, whitespace: true, message: t('projects.nameRequired') },
            { max: 200, message: t('projects.nameTooLong') },
          ]}
        >
          <Input placeholder={t('projects.namePlaceholder')} maxLength={200} showCount />
        </Form.Item>

        <Form.Item
          name="folderPath"
          label={t('projects.folder')}
          rules={[{ required: true, message: t('projects.folderRequired') }]}
          extra={
            folders.isError
              ? folders.error.message
              : !hasFolders
                ? t('projects.noFolders')
                : undefined
          }
        >
          <FolderCascader enabled={open} changeOnSelect />
        </Form.Item>

        <Form.Item name="categoryId" label={t('projects.category')}>
          <CategorySelect enabled={open} />
        </Form.Item>

        <Form.Item name="countryId" label={t('projects.country')}>
          <CountrySelect
            enabled={open}
            onChange={() => form.setFieldValue('provinceId', undefined)}
          />
        </Form.Item>

        <Form.Item name="provinceId" label={t('projects.province')}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            disabled={!countryId}
            loading={provinces.isPending}
            options={provinces.data?.items.map((province) => ({
              value: province.id,
              label: province.name,
            }))}
            placeholder={t('projects.provincePlaceholder')}
          />
        </Form.Item>

        <Form.Item name="description" label={t('projects.description')}>
          <Input.TextArea rows={4} placeholder={t('projects.descriptionPlaceholder')} />
        </Form.Item>

        <Form.Item name="tags" label={t('projects.tags')}>
          <Select
            mode="tags"
            showSearch
            loading={tags.isPending}
            options={tags.data?.map((tag) => ({ value: tag.name, label: tag.name }))}
            placeholder={t('projects.tagsPlaceholder')}
            tokenSeparators={[',']}
          />
        </Form.Item>

        <Form.Item label={t('projects.thumbnail')}>
          <Upload
            accept="image/*"
            listType="picture"
            maxCount={1}
            fileList={thumbnailFile ? [thumbnailFile] : []}
            beforeUpload={(file) => {
              if (!file.type.startsWith('image/')) {
                void message.error(t('projects.thumbnailImageOnly'));
                return Upload.LIST_IGNORE;
              }
              return false;
            }}
            onChange={handleThumbnailChange}
            onRemove={() => setThumbnailFile(undefined)}
          >
            <Button icon={<PictureOutlined />}>{t('projects.selectThumbnail')}</Button>
          </Upload>
          <Typography.Text type="secondary">{t('projects.thumbnailHint')}</Typography.Text>
        </Form.Item>

        {creationError ? <Alert type="error" showIcon message={creationError} /> : null}
      </Form>
    </Drawer>
  );
}
