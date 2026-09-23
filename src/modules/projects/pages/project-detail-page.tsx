import { PictureOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UploadFile } from 'antd';
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Cascader,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Upload,
} from 'antd';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useCategories } from '../../categories/hooks/use-categories';
import { useCountries } from '../../countries/hooks/use-countries';
import { useFolders } from '../../folders/hooks/use-folders';
import { buildFolderCascaderOptions } from '../../folders/utils/build-folder-cascader-options';
import { ProjectGoogleDriveImportPanel } from '../../google-drive/components/project-google-drive-import-panel';
import {
  abortUpload,
  attachProjectMedia,
  completeUpload,
  createUploadSession,
  getAssetPreviewUrl,
  getProjectMedia,
  setProjectThumbnail,
  uploadAssetContent,
} from '../../media/api/media';
import { ProjectMediaPanel } from '../../media/components/project-media-panel';
import { mediaQueryKeys } from '../../media/queries/media-query-keys';
import { useProvinces } from '../../provinces/hooks/use-provinces';
import { useTags } from '../../tags/hooks/use-tags';
import { useProject, useUpdateProject } from '../hooks/use-projects';
import { projectQueryKeys } from '../queries/project-query-keys';
import type { ProjectDetailFormValues } from '../types/project-detail-form-values.type';

export function ProjectDetailPage() {
  const { projectId = '' } = useParams();
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form] = Form.useForm<ProjectDetailFormValues>();
  const initializedProjectId = useRef<string | undefined>(undefined);
  const initializedThumbnailProjectId = useRef<string | undefined>(undefined);
  const uploadedThumbnailRef = useRef<{ uid: string; projectMediaId: string } | undefined>(
    undefined,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [thumbnailError, setThumbnailError] = useState<string>();
  const project = useProject(projectId);
  const update = useUpdateProject(projectId);
  const projectMedia = useQuery({
    queryKey: mediaQueryKeys.project(projectId),
    queryFn: () => getProjectMedia(projectId),
    enabled: Boolean(projectId),
  });
  const folders = useFolders();
  const categories = useCategories();
  const countries = useCountries();
  const tags = useTags();
  const folderOptions = buildFolderCascaderOptions(folders.data ?? []);
  const countryId = Form.useWatch('countryId', form);
  const provinces = useProvinces(
    { page: 1, pageSize: 100, countryId: countryId || undefined },
    Boolean(countryId),
  );

  useEffect(() => {
    initializedProjectId.current = undefined;
    initializedThumbnailProjectId.current = undefined;
    uploadedThumbnailRef.current = undefined;
    form.resetFields();
  }, [form, projectId]);

  useEffect(() => {
    if (
      !project.data ||
      project.data.id !== projectId ||
      (!folders.data && !folders.isError) ||
      initializedProjectId.current === projectId
    ) {
      return;
    }

    const projectFolder = folders.data?.find((folder) => folder.id === project.data.folderId);
    form.setFieldsValue({
      folderPath: projectFolder?.pathIds ?? [project.data.folderId],
      name: project.data.name,
      categoryId: project.data.categoryId ?? undefined,
      countryId: project.data.countryId ?? undefined,
      provinceId: project.data.provinceId ?? undefined,
      description: project.data.description ?? '',
      tags: project.data.tags ?? [],
    });
    initializedProjectId.current = projectId;
  }, [folders.data, folders.isError, form, project.data, projectId]);

  useEffect(() => {
    if (
      !project.data ||
      project.data.id !== projectId ||
      initializedThumbnailProjectId.current === projectId ||
      (project.data.thumbnailProjectMediaId && projectMedia.isPending)
    ) {
      return;
    }

    const thumbnailMedia = projectMedia.data?.items.find(
      (item) => item.id === project.data?.thumbnailProjectMediaId,
    );
    initializedThumbnailProjectId.current = projectId;
    if (!thumbnailMedia || form.isFieldTouched('thumbnail')) {
      return;
    }

    const initialFile: UploadFile = {
      uid: thumbnailMedia.id,
      name: thumbnailMedia.asset.originalFilename,
      status: 'done',
    };
    form.setFieldValue('thumbnail', [initialFile]);

    let disposed = false;
    void getAssetPreviewUrl(thumbnailMedia.assetId)
      .then((url) => {
        if (disposed) {
          return;
        }
        const currentFiles: UploadFile[] = form.getFieldValue('thumbnail') ?? [];
        if (currentFiles.some((file) => file.uid === thumbnailMedia.id)) {
          form.setFieldValue('thumbnail', [
            ...currentFiles.map((file) =>
              file.uid === thumbnailMedia.id ? { ...file, thumbUrl: url, url } : file,
            ),
          ]);
        }
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
    };
  }, [form, project.data, projectId, projectMedia.data, projectMedia.isPending]);

  const handleSubmit = async (values: ProjectDetailFormValues) => {
    const folderId = values.folderPath.at(-1);
    if (!folderId || !project.data || project.data.id !== projectId) {
      return;
    }

    setIsSaving(true);
    setThumbnailError(undefined);
    try {
      try {
        await update.mutateAsync({
          folderId,
          name: values.name.trim(),
          description: values.description?.trim() || null,
          categoryId: values.categoryId ?? null,
          countryId: values.countryId ?? null,
          provinceId: values.provinceId ?? null,
          tags: values.tags ?? [],
        });
      } catch {
        return;
      }

      try {
        const selectedThumbnail = (values.thumbnail ?? []).find((file) => file.originFileObj);
        if (selectedThumbnail?.originFileObj) {
          let projectMediaId =
            uploadedThumbnailRef.current?.uid === selectedThumbnail.uid
              ? uploadedThumbnailRef.current.projectMediaId
              : undefined;

          if (!projectMediaId) {
            const file = selectedThumbnail.originFileObj;
            let session: Awaited<ReturnType<typeof createUploadSession>> | undefined;
            let uploadCompleted = false;

            try {
              session = await createUploadSession(
                {
                  assetType: 'image',
                  originalFilename: file.name,
                  mimeType: file.type || 'application/octet-stream',
                  fileSizeBytes: file.size,
                },
                globalThis.crypto.randomUUID(),
              );
              await uploadAssetContent(session, file, () => undefined);
              const asset = await completeUpload(session.assetId, session.uploadSessionId);
              uploadCompleted = true;
              const attachedMedia = await attachProjectMedia(projectId, { assetId: asset.id });
              projectMediaId = attachedMedia.id;
              uploadedThumbnailRef.current = { uid: selectedThumbnail.uid, projectMediaId };
            } catch (error) {
              if (session && !uploadCompleted) {
                await abortUpload(session.assetId, session.uploadSessionId).catch(() => undefined);
              }
              throw error;
            }
          }

          await setProjectThumbnail(projectId, projectMediaId!);
          form.setFieldValue('thumbnail', [
            { ...selectedThumbnail, uid: projectMediaId!, status: 'done', percent: 100 },
          ]);
          void queryClient.invalidateQueries({ queryKey: mediaQueryKeys.project(projectId) });
        } else if (
          form.isFieldTouched('thumbnail') &&
          (values.thumbnail ?? []).length === 0 &&
          project.data.thumbnailProjectMediaId
        ) {
          await setProjectThumbnail(projectId, null);
        }

        void queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(projectId) });
        void queryClient.invalidateQueries({ queryKey: projectQueryKeys.list() });
        void message.success(t('projects.updateSuccess'));
      } catch (error) {
        setThumbnailError(error instanceof Error ? error.message : t('projects.thumbnailFailed'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (project.isError) {
    return (
      <PageContainer title={t('projects.projectDetails')}>
        <Alert type="error" showIcon message={project.error.message} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={project.data?.name ?? t('projects.projectDetails')}
      loading={project.isPending}
      extra={[
        <Button key="projects" icon={<ArrowLeft size={16} />} onClick={() => navigate('/projects')}>
          {t('media.backToProjects')}
        </Button>,
      ]}
    >
      {project.data ? (
        <Row gutter={[16, 16]} align="top">
          <Col xs={24} lg={10}>
            <Card title={t('projects.updateDetails')}>
              <Form<ProjectDetailFormValues>
                form={form}
                layout="vertical"
                onFinish={(values) => void handleSubmit(values)}
              >
                <Form.Item
                  name="name"
                  label={t('projects.name')}
                  rules={[
                    { required: true, whitespace: true, message: t('projects.nameRequired') },
                    { max: 200, message: t('projects.nameTooLong') },
                  ]}
                >
                  <Input maxLength={200} showCount />
                </Form.Item>

                <Form.Item
                  name="folderPath"
                  label={t('projects.folder')}
                  rules={[{ required: true, message: t('projects.folderRequired') }]}
                  extra={folders.isError ? folders.error.message : undefined}
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
                  <Input.TextArea rows={5} placeholder={t('projects.descriptionPlaceholder')} />
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

                <Form.Item
                  name="thumbnail"
                  label={t('projects.thumbnail')}
                  valuePropName="fileList"
                  getValueFromEvent={(event) => event?.fileList}
                >
                  <Upload
                    accept="image/*"
                    listType="picture"
                    maxCount={1}
                    beforeUpload={(file) => {
                      if (!file.type.startsWith('image/')) {
                        void message.error(t('projects.thumbnailImageOnly'));
                        return Upload.LIST_IGNORE;
                      }
                      return false;
                    }}
                  >
                    <Button icon={<PictureOutlined />}>{t('projects.selectThumbnail')}</Button>
                  </Upload>
                </Form.Item>

                {thumbnailError ? (
                  <Alert
                    type="error"
                    showIcon
                    message={t('projects.thumbnailFailed')}
                    description={thumbnailError}
                    style={{ marginBottom: 16 }}
                  />
                ) : null}

                {update.isError ? (
                  <Alert
                    type="error"
                    showIcon
                    message={update.error.message}
                    style={{ marginBottom: 16 }}
                  />
                ) : null}

                <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="primary"
                    loading={isSaving || update.isPending}
                    disabled={folders.isPending || folders.isError}
                    onClick={() => form.submit()}
                  >
                    {t('projects.saveChanges')}
                  </Button>
                </Space>
              </Form>
            </Card>
          </Col>
          <Col xs={24} lg={14}>
            <ProjectGoogleDriveImportPanel projectId={project.data.id} />
            <div style={{ height: 16 }} />
            <ProjectMediaPanel projectId={project.data.id} />
          </Col>
        </Row>
      ) : null}
    </PageContainer>
  );
}
