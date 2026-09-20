import { InboxOutlined, PictureOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import {
  Alert,
  App as AntApp,
  Button,
  Cascader,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Steps,
  Typography,
  Upload,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCategories } from '../../categories/hooks/use-categories';
import { useCountries } from '../../countries/hooks/use-countries';
import { useFolders } from '../../folders/hooks/use-folders';
import { buildFolderCascaderOptions } from '../../folders/utils/build-folder-cascader-options';
import {
  abortUpload,
  attachProjectMedia,
  completeUpload,
  createUploadSession,
  setProjectThumbnail,
  uploadAssetContent,
} from '../../media/api/media';
import { useProvinces } from '../../provinces/hooks/use-provinces';
import { useTags } from '../../tags/hooks/use-tags';
import { useCreateProject } from '../hooks/use-projects';
import type { CreateProjectModalProps } from '../types/create-project-modal-props.type';
import type { ProjectFormValues } from '../types/project-form-values.type';
import type { Project } from '../types/project.type';

export function CreateProjectModal({ open, onClose, onComplete }: CreateProjectModalProps) {
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const [form] = Form.useForm<ProjectFormValues>();
  const folders = useFolders(open);
  const categories = useCategories(open);
  const countries = useCountries(open);
  const tags = useTags(open);
  const create = useCreateProject();
  const folderOptions = useMemo(
    () => buildFolderCascaderOptions(folders.data ?? []),
    [folders.data],
  );
  const countryId = Form.useWatch('countryId', form);
  const provinces = useProvinces({ page: 1, pageSize: 100, countryId }, open && Boolean(countryId));
  const [step, setStep] = useState(0);
  const [project, setProject] = useState<Project>();
  const [thumbnailFile, setThumbnailFile] = useState<UploadFile>();
  const [thumbnailUid, setThumbnailUid] = useState<string>();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [creationError, setCreationError] = useState<string>();
  const [uploadError, setUploadError] = useState<string>();
  const [thumbnailError, setThumbnailError] = useState<string>();

  useEffect(() => {
    if (!open) {
      return;
    }

    form.resetFields();
    setStep(0);
    setProject(undefined);
    setThumbnailFile(undefined);
    setThumbnailUid(undefined);
    setFileList([]);
    setCreationError(undefined);
    setUploadError(undefined);
    setThumbnailError(undefined);
  }, [form, open]);

  const close = () => {
    if (project || create.isPending || isUploading) {
      return;
    }
    form.resetFields();
    onClose();
  };

  const finish = (createdProject: Project) => {
    if (!isUploading) {
      onComplete(createdProject);
    }
  };

  const createProject = async (values: ProjectFormValues) => {
    const folderId = values.folderPath.at(-1);
    if (!folderId) {
      return;
    }

    setCreationError(undefined);
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

      setProject(createdProject);
      if (thumbnailFile) {
        setThumbnailUid(thumbnailFile.uid);
        setFileList([{ ...thumbnailFile, status: undefined }]);
      }
      setStep(1);
    } catch (error) {
      setCreationError(error instanceof Error ? error.message : t('projects.createFailed'));
    }
  };

  const updateFile = (uid: string, update: Partial<UploadFile>) => {
    setFileList((current) =>
      current.map((file) => (file.uid === uid ? { ...file, ...update } : file)),
    );
  };

  const uploadQueuedFiles = async () => {
    if (!project || isUploading) {
      return;
    }

    const pendingFiles = fileList.filter((file) => file.status !== 'done' && file.originFileObj);
    if (pendingFiles.length === 0) {
      return;
    }

    setIsUploading(true);
    setUploadError(undefined);
    setThumbnailError(undefined);

    for (const file of pendingFiles) {
      const rawFile = file.originFileObj;
      if (!rawFile) {
        continue;
      }

      let uploadSession: Awaited<ReturnType<typeof createUploadSession>> | undefined;
      updateFile(file.uid, { status: 'uploading', percent: 0, response: undefined });

      try {
        const assetType = rawFile.type.startsWith('video/') ? 'video' : 'image';
        uploadSession = await createUploadSession(
          {
            assetType,
            originalFilename: rawFile.name,
            mimeType: rawFile.type || 'application/octet-stream',
            fileSizeBytes: rawFile.size,
          },
          globalThis.crypto.randomUUID(),
        );
        await uploadAssetContent(uploadSession, rawFile, (percent) =>
          updateFile(file.uid, { percent }),
        );
        const completedAsset = await completeUpload(
          uploadSession.assetId,
          uploadSession.uploadSessionId,
        );
        const attachedMedia = await attachProjectMedia(project.id, {
          assetId: completedAsset.id,
        });
        updateFile(file.uid, { status: 'done', percent: 100 });

        if (file.uid === thumbnailUid) {
          try {
            await setProjectThumbnail(project.id, attachedMedia.id);
          } catch (error) {
            setThumbnailError(
              error instanceof Error ? error.message : t('projects.thumbnailFailed'),
            );
          }
        }
      } catch (error) {
        if (uploadSession) {
          await abortUpload(uploadSession.assetId, uploadSession.uploadSessionId).catch(
            () => undefined,
          );
        }
        const errorMessage = error instanceof Error ? error.message : t('projects.uploadFailed');
        updateFile(file.uid, { status: 'error', response: errorMessage });
        setUploadError(errorMessage);
      }
    }

    setIsUploading(false);
  };

  const handleThumbnailChange: UploadProps['onChange'] = ({ fileList: nextFileList }) => {
    setThumbnailFile(nextFileList.at(-1));
  };

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      void message.error(t('projects.unsupportedMedia'));
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const handleQueueRemove: UploadProps['onRemove'] = (file) => {
    if (file.status === 'uploading' || file.status === 'done') {
      return false;
    }

    setFileList((current) => current.filter((item) => item.uid !== file.uid));
    if (file.uid === thumbnailUid) {
      setThumbnailUid(undefined);
    }
    return true;
  };

  const footer =
    step === 0 ? (
      <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={close}>{t('common.cancel')}</Button>
        <Button
          type="primary"
          loading={create.isPending}
          disabled={folders.isPending || folders.isError || folderOptions.length === 0}
          onClick={() => form.submit()}
        >
          {t('projects.create')}
        </Button>
      </Space>
    ) : (
      <Space style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button disabled={isUploading} onClick={() => project && finish(project)}>
          {t('projects.skipUpload')}
        </Button>
        <Space>
          <Button
            loading={isUploading}
            disabled={!fileList.some((file) => file.status !== 'done')}
            onClick={() => void uploadQueuedFiles()}
          >
            {t('projects.uploadMedia')}
          </Button>
          <Button type="primary" disabled={isUploading} onClick={() => project && finish(project)}>
            {t('projects.openMedia')}
          </Button>
        </Space>
      </Space>
    );

  return (
    <Drawer
      open={open}
      title={t('projects.create')}
      placement="right"
      width="100vw"
      closable={!project}
      maskClosable={!project}
      keyboard={!project}
      onClose={close}
      footer={footer}
      styles={{ body: { padding: 24 } }}
    >
      <Steps
        current={step}
        items={[{ title: t('projects.detailsStep') }, { title: t('projects.mediaStep') }]}
        style={{ maxWidth: 720, margin: '0 auto 32px' }}
      />

      {step === 0 ? (
        <Form<ProjectFormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => void createProject(values)}
          style={{ maxWidth: 920, margin: '0 auto' }}
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
                : folderOptions.length === 0
                  ? t('projects.noFolders')
                  : undefined
            }
          >
            <Cascader
              options={folderOptions}
              showSearch
              changeOnSelect
              placeholder={t('projects.folderPlaceholder')}
            />
          </Form.Item>

          <Form.Item name="categoryId" label={t('projects.category')}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              loading={categories.isPending}
              options={categories.data?.map((category) => ({
                value: category.id,
                label: category.name,
              }))}
              placeholder={t('projects.categoryPlaceholder')}
            />
          </Form.Item>

          <Form.Item name="countryId" label={t('projects.country')}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              loading={countries.isPending}
              options={countries.data?.map((country) => ({
                value: country.id,
                label: country.name,
              }))}
              placeholder={t('projects.countryPlaceholder')}
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
              beforeUpload={() => false}
              onChange={handleThumbnailChange}
            >
              <Button icon={<PictureOutlined />}>{t('projects.selectThumbnail')}</Button>
            </Upload>
            <Typography.Text type="secondary">{t('projects.thumbnailHint')}</Typography.Text>
          </Form.Item>

          {creationError ? <Alert type="error" showIcon message={creationError} /> : null}
        </Form>
      ) : (
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <Typography.Title level={4}>{t('projects.mediaStepTitle')}</Typography.Title>
          <Typography.Paragraph type="secondary">
            {t('projects.mediaStepDescription', { name: project?.name })}
          </Typography.Paragraph>
          <Upload.Dragger
            accept="image/*,video/*"
            multiple
            fileList={fileList}
            beforeUpload={beforeUpload}
            onChange={({ fileList: nextFileList }) => setFileList(nextFileList)}
            onRemove={handleQueueRemove}
            progress={{ strokeWidth: 2, showInfo: true }}
            disabled={isUploading}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">{t('projects.dropMedia')}</p>
            <p className="ant-upload-hint">{t('projects.mediaTypesHint')}</p>
          </Upload.Dragger>
          {uploadError ? (
            <Alert
              type="error"
              showIcon
              message={t('projects.someUploadsFailed')}
              description={uploadError}
              style={{ marginTop: 16 }}
            />
          ) : null}
          {thumbnailError ? (
            <Alert
              type="warning"
              showIcon
              message={t('projects.thumbnailFailed')}
              description={thumbnailError}
              style={{ marginTop: 16 }}
            />
          ) : null}
        </div>
      )}
    </Drawer>
  );
}
