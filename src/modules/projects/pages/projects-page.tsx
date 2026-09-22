import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App as AntApp,
  Button,
  Cascader,
  Col,
  Form,
  Image,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { ClipboardCheck, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { parseAsArrayOf, parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../../categories/hooks/use-categories';
import { useCountries } from '../../countries/hooks/use-countries';
import { useFolders } from '../../folders/hooks/use-folders';
import { buildFolderCascaderOptions } from '../../folders/utils/build-folder-cascader-options';
import { getAssetPreviewUrl } from '../../media/api/media';
import { useProvinces } from '../../provinces/hooks/use-provinces';
import { useTags } from '../../tags/hooks/use-tags';
import { getProjects } from '../api/projects';
import { CreateProjectModal } from '../components/create-project-modal';
import { ProjectReviewDrawer } from '../components/project-review-drawer';
import { useDeleteProject } from '../hooks/use-projects';
import { projectQueryKeys } from '../queries/project-query-keys';
import type { ProjectListParams } from '../types/project-list-params.type';
import type { Project } from '../types/project.type';

type ProjectFilterValues = {
  keyword?: string;
  folderPath?: string[];
  countryId?: string;
  provinceId?: string;
  categoryId?: string;
  tagIds?: string[];
};

const projectUrlParams = {
  keyword: parseAsString,
  folderId: parseAsString,
  tagIds: parseAsArrayOf(parseAsString).withDefault([]),
  countryId: parseAsString,
  provinceId: parseAsString,
  categoryId: parseAsString,
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(20),
};

function formatDateTime(value: string | undefined): string {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function ProjectThumbnailCell({ assetId }: { assetId?: string | null }) {
  const [previewUrl, setPreviewUrl] = useState<string>();

  useEffect(() => {
    if (!assetId) {
      setPreviewUrl(undefined);
      return undefined;
    }

    let disposed = false;
    void getAssetPreviewUrl(assetId)
      .then((url) => {
        if (disposed) {
          return;
        }
        setPreviewUrl(url);
      })
      .catch(() => setPreviewUrl(undefined));

    return () => {
      disposed = true;
    };
  }, [assetId]);

  if (!previewUrl) {
    return (
      <div
        aria-label="Chưa có thumbnail"
        style={{
          alignItems: 'center',
          background: '#f5f5f5',
          borderRadius: 6,
          color: '#bfbfbf',
          display: 'flex',
          height: 48,
          justifyContent: 'center',
          width: 64,
        }}
      >
        <span>—</span>
      </div>
    );
  }

  return (
    <Image
      alt=""
      height={48}
      src={previewUrl}
      style={{ borderRadius: 6, objectFit: 'cover' }}
      width={64}
      preview
    />
  );
}

function getProjectStatus(status: string, t: (key: string) => string) {
  switch (status) {
    case 'draft':
      return { color: 'default', label: t('projects.statusDraft') };
    case 'pending':
      return { color: 'processing', label: t('projects.statusPending') };
    case 'completed':
      return { color: 'success', label: t('projects.statusCompleted') };
    case 'partially_completed':
      return { color: 'warning', label: t('projects.statusPartiallyCompleted') };
    case 'failed':
      return { color: 'error', label: t('projects.statusFailed') };
    default:
      return { color: 'default', label: status };
  }
}

export function ProjectsPage() {
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [filterForm] = Form.useForm<ProjectFilterValues>();
  const [urlState, setUrlState] = useQueryStates(projectUrlParams, {
    history: 'replace',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [reviewProjectId, setReviewProjectId] = useState<string>();
  const [listError, setListError] = useState<string>();
  const countryId = Form.useWatch('countryId', filterForm);
  const projectsDelete = useDeleteProject();
  const folders = useFolders();
  const categories = useCategories();
  const countries = useCountries();
  const tags = useTags();
  const provinces = useProvinces({ page: 1, pageSize: 100, countryId }, Boolean(countryId));
  const folderOptions = useMemo(
    () => buildFolderCascaderOptions(folders.data ?? []),
    [folders.data],
  );

  useEffect(() => {
    const selectedFolder = folders.data?.find((folder) => folder.id === urlState.folderId);
    filterForm.setFieldsValue({
      keyword: urlState.keyword ?? undefined,
      folderPath: selectedFolder?.pathIds ?? (urlState.folderId ? [urlState.folderId] : undefined),
      tagIds: urlState.tagIds,
      countryId: urlState.countryId ?? undefined,
      provinceId: urlState.provinceId ?? undefined,
      categoryId: urlState.categoryId ?? undefined,
    });
  }, [filterForm, folders.data, urlState]);

  const applyFilters = async (values: ProjectFilterValues) => {
    await setUrlState({
      keyword: values.keyword?.trim() || null,
      folderId: values.folderPath?.at(-1) ?? null,
      tagIds: values.tagIds?.length ? values.tagIds : null,
      countryId: values.countryId ?? null,
      provinceId: values.provinceId ?? null,
      categoryId: values.categoryId ?? null,
      page: 1,
    });
  };

  const handleDelete = async (projectId: string) => {
    try {
      await projectsDelete.mutateAsync(projectId);
      void message.success(t('projects.deleteSuccess'));
      void actionRef.current?.reload();
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('projects.deleteFailed'));
    }
  };

  const columns: ProColumns<Project>[] = [
    {
      title: t('projects.name'),
      dataIndex: 'name',
      key: 'name',
      width: 260,
      fixed: 'left',
      ellipsis: true,
      render: (_, project) => (
        <Typography.Link onClick={() => navigate(`/projects/${project.id}`)}>
          {project.name}
        </Typography.Link>
      ),
    },
    {
      title: t('projects.thumbnail'),
      dataIndex: 'thumbnailAssetId',
      key: 'thumbnail',
      width: 100,
      align: 'center',
      render: (_, project) => <ProjectThumbnailCell assetId={project.thumbnailAssetId} />,
    },
    {
      title: t('projects.location'),
      dataIndex: 'countryName',
      key: 'location',
      width: 200,
      render: (_, project) => (
        <Space direction="vertical" size={0}>
          <Space size={6}>
            {project.countryFlagUrl ? (
              <Image
                alt=""
                height={14}
                src={project.countryFlagUrl}
                style={{ objectFit: 'cover' }}
                width={20}
                preview={false}
              />
            ) : null}
            <Typography.Text>{project.countryName || '—'}</Typography.Text>
          </Space>
          {project.provinceName ? (
            <Typography.Text type="secondary">{project.provinceName}</Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: t('projects.folder'),
      dataIndex: 'folderPath',
      key: 'folderPath',
      width: 280,
      ellipsis: true,
      render: (_, project) => (
        <Tooltip title={project.folderPath || t('projects.folderUnavailable')}>
          <Typography.Text ellipsis>{project.folderPath || '—'}</Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: t('projects.fileCounts'),
      dataIndex: 'mediaCount',
      key: 'mediaCount',
      width: 180,
      render: (_, project) => (
        <Space size={4} wrap>
          <Tag color="blue">
            {project.imageCount} {t('media.image')}
          </Tag>
          <Tag color="purple">
            {project.videoCount} {t('media.video')}
          </Tag>
        </Space>
      ),
    },
    {
      title: t('projects.status'),
      dataIndex: 'evaluationStatus',
      key: 'evaluationStatus',
      width: 160,
      render: (_, project) => {
        const status = getProjectStatus(project.evaluationStatus, t);
        return <Tag color={status.color}>{status.label}</Tag>;
      },
    },
    {
      title: t('projects.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (_, project) => formatDateTime(project.createdAt),
    },
    {
      title: t('projects.updatedAt'),
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 170,
      render: (_, project) => formatDateTime(project.updatedAt),
    },
    {
      title: t('projects.actions'),
      key: 'actions',
      width: 140,
      fixed: 'right',
      hideInSetting: true,
      render: (_, project) => (
        <Space size={0}>
          <Tooltip title={t('projects.review')}>
            <Button
              aria-label={t('projects.review')}
              icon={<ClipboardCheck size={16} />}
              type="text"
              onClick={() => setReviewProjectId(project.id)}
            />
          </Tooltip>
          <Tooltip title={t('projects.edit')}>
            <Button
              aria-label={t('projects.edit')}
              icon={<Pencil size={16} />}
              type="text"
              onClick={() => navigate(`/projects/${project.id}`)}
            />
          </Tooltip>
          <Popconfirm
            title={t('projects.deleteConfirm', { name: project.name })}
            okText={t('common.delete')}
            cancelText={t('common.cancel')}
            okButtonProps={{ danger: true, loading: projectsDelete.isPending }}
            onConfirm={() => void handleDelete(project.id)}
          >
            <Tooltip title={t('projects.delete')}>
              <Button
                aria-label={t('projects.delete')}
                danger
                icon={<Trash2 size={16} />}
                loading={projectsDelete.isPending && projectsDelete.variables === project.id}
                type="text"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageContainer
        title={t('projects.title')}
        extra={[
          <Button
            key="create"
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => setCreateOpen(true)}
          >
            {t('projects.create')}
          </Button>,
        ]}
      >
        <Form<ProjectFilterValues>
          form={filterForm}
          layout="vertical"
          onFinish={applyFilters}
          style={{ marginBottom: 16 }}
        >
          <Row gutter={[12, 0]} align="bottom">
            <Col xs={24} sm={12} lg={8} xxl={4}>
              <Form.Item name="keyword" label={t('projects.keyword')}>
                <Input allowClear placeholder={t('projects.keywordPlaceholder')} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8} xxl={4}>
              <Form.Item name="folderPath" label={t('projects.folder')}>
                <Cascader
                  allowClear
                  changeOnSelect
                  options={folderOptions}
                  placeholder={t('projects.folderFilterPlaceholder')}
                  showSearch
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8} xxl={4}>
              <Form.Item name="tagIds" label={t('projects.tags')}>
                <Select
                  allowClear
                  mode="multiple"
                  optionFilterProp="label"
                  options={tags.data?.map((tag) => ({ value: tag.id, label: tag.name }))}
                  placeholder={t('projects.tagsFilterPlaceholder')}
                  showSearch
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8} xxl={4}>
              <Form.Item name="countryId" label={t('projects.country')}>
                <Select
                  allowClear
                  optionFilterProp="label"
                  options={countries.data?.map((country) => ({
                    value: country.id,
                    label: country.name,
                  }))}
                  placeholder={t('projects.countryPlaceholder')}
                  showSearch
                  onChange={() => filterForm.setFieldValue('provinceId', undefined)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8} xxl={4}>
              <Form.Item name="provinceId" label={t('projects.province')}>
                <Select
                  allowClear
                  disabled={!countryId}
                  loading={provinces.isPending}
                  optionFilterProp="label"
                  options={provinces.data?.items.map((province) => ({
                    value: province.id,
                    label: province.name,
                  }))}
                  placeholder={t('projects.provincePlaceholder')}
                  showSearch
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8} xxl={4}>
              <Form.Item name="categoryId" label={t('projects.category')}>
                <Select
                  allowClear
                  optionFilterProp="label"
                  options={categories.data?.map((category) => ({
                    value: category.id,
                    label: category.name,
                  }))}
                  placeholder={t('projects.categoryPlaceholder')}
                  showSearch
                />
              </Form.Item>
            </Col>
          </Row>
          <Space>
            <Button htmlType="submit" icon={<Search size={16} />} type="primary">
              {t('common.search')}
            </Button>
            <Button
              onClick={() => {
                filterForm.resetFields();
                void setUrlState({
                  keyword: null,
                  folderId: null,
                  tagIds: null,
                  countryId: null,
                  provinceId: null,
                  categoryId: null,
                  page: 1,
                });
              }}
            >
              {t('common.reset')}
            </Button>
          </Space>
        </Form>

        {listError ? (
          <Alert
            closable
            message={listError}
            onClose={() => setListError(undefined)}
            showIcon
            style={{ marginBottom: 16 }}
            type="error"
          />
        ) : null}

        <ProTable<Project>
          actionRef={actionRef}
          columns={columns}
          columnsState={{
            persistenceKey: 'ag-go.projects.columns.v1',
            persistenceType: 'localStorage',
          }}
          options={{ reload: true, density: false, setting: true, fullScreen: false }}
          pagination={{
            current: urlState.page,
            defaultPageSize: 20,
            pageSize: urlState.pageSize,
            pageSizeOptions: [10, 20, 50, 100],
            showSizeChanger: true,
            showTotal: (total, range) =>
              t('common.paginationTotal', {
                start: range[0],
                end: range[1],
                total,
              }),
          }}
          params={urlState}
          request={async ({ current, pageSize }) => {
            const params: ProjectListParams = {
              ...(urlState.keyword ? { keyword: urlState.keyword } : {}),
              ...(urlState.folderId ? { folderId: urlState.folderId } : {}),
              ...(urlState.tagIds.length ? { tagIds: urlState.tagIds } : {}),
              ...(urlState.countryId ? { countryId: urlState.countryId } : {}),
              ...(urlState.provinceId ? { provinceId: urlState.provinceId } : {}),
              ...(urlState.categoryId ? { categoryId: urlState.categoryId } : {}),
              page: current ?? 1,
              pageSize: pageSize ?? 20,
            };
            try {
              const result = await queryClient.fetchQuery({
                queryKey: projectQueryKeys.list(params),
                queryFn: () => getProjects(params),
              });
              setListError(undefined);
              return { data: result.items, success: true, total: result.total };
            } catch (error) {
              setListError(error instanceof Error ? error.message : t('projects.loadFailed'));
              return { data: [], success: false, total: 0 };
            }
          }}
          rowKey="id"
          search={false}
          scroll={{ x: 1680 }}
          sticky={{ offsetHeader: 56 }}
          onChange={(pagination) => {
            void setUrlState({
              page: pagination.current ?? 1,
              pageSize: pagination.pageSize ?? 20,
            });
          }}
        />
      </PageContainer>
      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onComplete={(project) => {
          setCreateOpen(false);
          navigate(`/projects/${project.id}`);
        }}
      />
      <ProjectReviewDrawer
        open={Boolean(reviewProjectId)}
        projectId={reviewProjectId}
        onClose={() => setReviewProjectId(undefined)}
      />
    </>
  );
}

export { ProjectThumbnailCell };
