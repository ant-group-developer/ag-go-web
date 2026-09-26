import { PictureOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useQueryClient } from '@tanstack/react-query';
import type { UploadFile } from 'antd';
import {
  Affix,
  Alert,
  Anchor,
  App as AntApp,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  Row,
  Space,
  Typography,
  Upload,
} from 'antd';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Select } from '../../../shared/components/select';
import { CategorySelect } from '../../categories/components/category-select';
import { CountrySelect } from '../../countries/components/country-select';
import { FolderCascader } from '../../folders/components/folder-cascader';
import { useFolders } from '../../folders/hooks/use-folders';
import { ProjectGoogleDriveImportPanel } from '../../google-drive/components/project-google-drive-import-panel';
import {
  abortUpload,
  completeUpload,
  createUploadSession,
  getAssetPreviewUrl,
  setProjectThumbnail,
  uploadAssetContent,
} from '../../media/api/media';
import { ProjectMediaPanel } from '../../media/components/project-media-panel';
import { mediaQueryKeys } from '../../media/queries/media-query-keys';
import { useProvinces } from '../../provinces/hooks/use-provinces';
import {
  ProjectAutoRenderJobsCard,
  ProjectImportHistoryCard,
  ProjectRenderBatchesCard,
} from '../../render/components/project-processing-history-cards';
import { useTags } from '../../tags/hooks/use-tags';
import { useProject, useUpdateProject } from '../hooks/use-projects';
import { projectQueryKeys } from '../queries/project-query-keys';
import type { ProjectDetailFormValues } from '../types/project-detail-form-values.type';

const SECTION_IDS = {
  details: 'project-details',
  driveImport: 'project-drive-import',
  media: 'project-media',
  importHistory: 'project-import-history',
  autoRenders: 'project-auto-renders',
  renderBatches: 'project-render-batches',
} as const;

/** Fixed header (56px) plus breathing room, so anchored sections are not hidden under it. */
const ANCHOR_OFFSET = 72;
const TABLE_SCROLL_Y = 400;

export function ProjectDetailPage() {
  const { projectId = '' } = useParams();
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  // The project list this page was opened from (projects, evaluations or my projects).
  const backPath = (location.state as { from?: string } | null)?.from ?? '/projects';
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
  const folders = useFolders();
  const tags = useTags();
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
      initializedThumbnailProjectId.current === projectId
    ) {
      return;
    }

    initializedThumbnailProjectId.current = projectId;
    const { thumbnailProjectMediaId, thumbnailAssetId, thumbnailSource } = project.data;
    if (
      !thumbnailProjectMediaId ||
      !thumbnailAssetId ||
      thumbnailSource !== 'manual' ||
      form.isFieldTouched('thumbnail')
    ) {
      return;
    }

    const initialFile: UploadFile = {
      uid: thumbnailProjectMediaId,
      name: t('projects.projectThumbnail'),
      status: 'done',
    };
    form.setFieldValue('thumbnail', [initialFile]);

    let disposed = false;
    void getAssetPreviewUrl(thumbnailAssetId)
      .then((url) => {
        if (disposed) {
          return;
        }
        const currentFiles: UploadFile[] = form.getFieldValue('thumbnail') ?? [];
        if (currentFiles.some((file) => file.uid === thumbnailProjectMediaId)) {
          form.setFieldValue('thumbnail', [
            ...currentFiles.map((file) =>
              file.uid === thumbnailProjectMediaId ? { ...file, thumbUrl: url, url } : file,
            ),
          ]);
        }
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
    };
  }, [form, project.data, projectId, t]);

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
                  targetProjectId: projectId,
                },
                globalThis.crypto.randomUUID(),
              );
              await uploadAssetContent(session, file, () => undefined);
              const completed = await completeUpload(session.assetId, session.uploadSessionId);
              uploadCompleted = true;
              if (!completed.projectMediaId) {
                throw new Error(t('projects.thumbnailFailed'));
              }
              projectMediaId = completed.projectMediaId;
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
        <Button key="projects" icon={<ArrowLeft size={16} />} onClick={() => navigate(backPath)}>
          {t('media.backToProjects')}
        </Button>,
      ]}
    >
      {project.data ? (
        <Row gutter={[16, 16]} align="top" wrap={false}>
          <Col flex="auto" style={{ minWidth: 0 }}>
            <Flex vertical gap={16}>
              <Card id={SECTION_IDS.details} title={t('projects.updateDetails')}>
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
                    <FolderCascader changeOnSelect />
                  </Form.Item>

                  <Form.Item
                    name="categoryId"
                    label={t('projects.category')}
                    rules={[{ required: true, message: t('projects.categoryRequired') }]}
                  >
                    <CategorySelect />
                  </Form.Item>

                  <Form.Item name="countryId" label={t('projects.country')}>
                    <CountrySelect onChange={() => form.setFieldValue('provinceId', undefined)} />
                  </Form.Item>

                  <Form.Item name="provinceId" label={t('projects.province')}>
                    <Select
                      allowClear
                      showSearch
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
                    extra={
                      project.data?.thumbnailSource === 'auto'
                        ? t('projects.thumbnailAutoHint')
                        : undefined
                    }
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
              <div id={SECTION_IDS.driveImport}>
                <ProjectGoogleDriveImportPanel projectId={project.data.id} />
              </div>
              <div id={SECTION_IDS.media}>
                <ProjectMediaPanel projectId={project.data.id} />
              </div>
              <ProjectImportHistoryCard
                id={SECTION_IDS.importHistory}
                projectId={project.data.id}
                scrollY={TABLE_SCROLL_Y}
              />
              <ProjectAutoRenderJobsCard
                id={SECTION_IDS.autoRenders}
                projectId={project.data.id}
                scrollY={TABLE_SCROLL_Y}
              />
              <ProjectRenderBatchesCard
                id={SECTION_IDS.renderBatches}
                projectId={project.data.id}
                scrollY={TABLE_SCROLL_Y}
              />
            </Flex>
          </Col>
          <Col xs={0} lg={5} xxl={4}>
            <Affix offsetTop={ANCHOR_OFFSET}>
              <div>
                <Typography.Text type="secondary" strong>
                  {t('projects.pageSections')}
                </Typography.Text>
                <Anchor
                  affix={false}
                  targetOffset={ANCHOR_OFFSET}
                  style={{ marginTop: 8 }}
                  items={[
                    {
                      key: 'details',
                      href: `#${SECTION_IDS.details}`,
                      title: t('projects.updateDetails'),
                    },
                    {
                      key: 'driveImport',
                      href: `#${SECTION_IDS.driveImport}`,
                      title: t('googleDrive.importTitle'),
                    },
                    { key: 'media', href: `#${SECTION_IDS.media}`, title: t('media.projectMedia') },
                    {
                      key: 'history',
                      href: `#${SECTION_IDS.importHistory}`,
                      title: t('render.projectProcessingHistory'),
                      children: [
                        {
                          key: 'importHistory',
                          href: `#${SECTION_IDS.importHistory}`,
                          title: t('render.importFilesTitle'),
                        },
                        {
                          key: 'autoRenders',
                          href: `#${SECTION_IDS.autoRenders}`,
                          title: t('render.autoJobsTab'),
                        },
                        {
                          key: 'renderBatches',
                          href: `#${SECTION_IDS.renderBatches}`,
                          title: t('render.batchesTab'),
                        },
                      ],
                    },
                  ]}
                />
              </div>
            </Affix>
          </Col>
        </Row>
      ) : null}
    </PageContainer>
  );
}
