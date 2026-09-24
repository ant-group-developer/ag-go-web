import { AppstoreOutlined, BarsOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App as AntApp,
  Avatar,
  Button,
  Image,
  Input,
  Pagination,
  Popconfirm,
  Radio,
  Space,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import { ClipboardCheck, Pencil, Plus, Trash2 } from 'lucide-react';

import { parseAsArrayOf, parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { getAssetPreviewUrl } from '../../media/api/media';
import { getProjects } from '../api/projects';
import { CreateProjectModal } from '../components/create-project-modal';
import type { ProjectFilterValues } from '../components/project-filter-popover';
import { ProjectFilterPopover } from '../components/project-filter-popover';
import { ProjectGridView } from '../components/project-grid-view';
import { ProjectReviewDrawer } from '../components/project-review-drawer';
import { useDeleteProject } from '../hooks/use-projects';
import { projectQueryKeys } from '../queries/project-query-keys';
import type { ProjectListParams } from '../types/project-list-params.type';
import type { Project } from '../types/project.type';
import { formatDate } from '../utils/date.util';
import { getProjectStatus } from '../utils/project-status.util';

const projectUrlParams = {
  keyword: parseAsString,
  folderId: parseAsString,
  folderIds: parseAsArrayOf(parseAsString).withDefault([]),
  tagIds: parseAsArrayOf(parseAsString).withDefault([]),
  countryId: parseAsString,
  provinceId: parseAsString,
  categoryId: parseAsString,
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(20),
};

function ProjectThumbnailCell({ assetId }: { assetId?: string | null }) {
  const { t } = useTranslation();
  const [previewUrl, setPreviewUrl] = useState<string>();

  useEffect(() => {
    if (!assetId) {
      setPreviewUrl(undefined);
      return undefined;
    }

    let disposed = false;
    let createdUrl: string | undefined;
    void getAssetPreviewUrl(assetId)
      .then((url) => {
        if (disposed) {
          URL.revokeObjectURL(url);
          return;
        }
        createdUrl = url;
        setPreviewUrl(url);
      })
      .catch(() => setPreviewUrl(undefined));

    return () => {
      disposed = true;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [assetId]);

  if (!previewUrl) {
    return (
      <div
        aria-label={t('projects.noThumbnail')}
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
        <span>-</span>
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

export function ProjectsPage() {
  const { t } = useTranslation();
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [urlState, setUrlState] = useQueryStates(projectUrlParams, {
    history: 'replace',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [reviewProjectId, setReviewProjectId] = useState<string>();

  useEffect(() => {
    if (routeProjectId) {
      setReviewProjectId(routeProjectId);
    }
  }, [routeProjectId]);
  const [listError, setListError] = useState<string>();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [gridData, setGridData] = useState<Project[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const { token } = theme.useToken();

  const [filterValues, setFilterValues] = useState<ProjectFilterValues>({
    keyword: urlState.keyword ?? undefined,
    countryId: urlState.countryId ?? undefined,
    provinceId: urlState.provinceId ?? undefined,
    categoryId: urlState.categoryId ?? undefined,
    tagIds: urlState.tagIds?.length ? urlState.tagIds : undefined,
  });

  const [keywordInput, setKeywordInput] = useState(urlState.keyword ?? '');

  const projectsDelete = useDeleteProject();

  const activeFilterCount = useMemo(
    () =>
      [
        filterValues.keyword?.trim(),
        filterValues.folderId,
        filterValues.countryId || filterValues.provinceId,
        filterValues.categoryId,
        filterValues.tagIds?.length,
      ].filter(Boolean).length,
    [filterValues],
  );

  const applyFilter = async (values: ProjectFilterValues) => {
    await setUrlState({
      keyword: values.keyword?.trim() || null,
      folderId: values.folderId ?? null,
      tagIds: values.tagIds?.length ? values.tagIds : null,
      countryId: values.countryId ?? null,
      provinceId: values.provinceId ?? null,
      categoryId: values.categoryId ?? null,
      page: 1,
    });
    void actionRef.current?.reload();
  };

  const handleFilterChange = (values: ProjectFilterValues) => {
    setFilterValues(values);
    if (values.keyword !== undefined && values.keyword !== keywordInput) {
      setKeywordInput(values.keyword);
    }
    void applyFilter(values);
  };

  const handleClearFilter = () => {
    setFilterValues({});
    setKeywordInput('');
    void setUrlState({
      keyword: null,
      folderId: null,
      // folderIds: null,
      tagIds: null,
      countryId: null,
      provinceId: null,
      categoryId: null,
      page: 1,
    });
    void actionRef.current?.reload();
  };

  const handleKeywordSearch = () => {
    const newValues = { ...filterValues, keyword: keywordInput.trim() || undefined };
    setFilterValues(newValues);
    void applyFilter(newValues);
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
      width: 340,
      fixed: 'left',
      ellipsis: true,
      render: (_, project) => (
        <Space align="start">
          <ProjectThumbnailCell assetId={project.thumbnailAssetId} />
          <Space direction="vertical" size={2}>
            <Typography.Link onClick={() => setReviewProjectId(project.id)}>
              {project.name}
            </Typography.Link>
            <Space size={6}>
              <Avatar size={18} src={project.ownerUser?.avatar}>
                {project.ownerUser?.name?.charAt(0)?.toUpperCase()}
              </Avatar>
              <Typography.Text type="secondary" ellipsis>
                {project.ownerUser?.name || project.ownerUser?.email || t('common.unknown')}
              </Typography.Text>
            </Space>
          </Space>
        </Space>
      ),
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
            <Typography.Text>{project.countryName || '-'}</Typography.Text>
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
          <Typography.Text ellipsis>{project.folderPath || '-'}</Typography.Text>
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
        const status = getProjectStatus(project.evaluationStatus);
        return <Tag color={status.color}>{t(status.label)}</Tag>;
      },
    },
    {
      title: t('projects.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (_, project) => formatDate(project.createdAt),
    },
    {
      title: t('projects.updatedAt'),
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 170,
      render: (_, project) => formatDate(project.updatedAt),
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
              onClick={() => navigate(`/projects/${project.id}/edit`)}
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
        style={{
          background: token.colorBgContainer,
          paddingBlock: 16,
          paddingInline: 16,
          borderRadius: 6,
        }}
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
            persistenceKey: 'ag-go.projects.columns.v2',
            persistenceType: 'localStorage',
          }}
          headerTitle={
            <Space size={12}>
              <ProjectFilterPopover
                value={filterValues}
                onChange={handleFilterChange}
                onClear={handleClearFilter}
                activeCount={activeFilterCount}
              />
              <Input.Search
                allowClear
                size="large"
                placeholder={t('projects.keywordPlaceholder')}
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onSearch={handleKeywordSearch}
                onPressEnter={handleKeywordSearch}
                style={{ width: 350 }}
              />
            </Space>
          }
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
              ...(urlState.folderIds?.length
                ? { folderIds: urlState.folderIds }
                : urlState.folderId
                  ? { folderId: urlState.folderId }
                  : {}),
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
              setGridData(result.items);
              setTotalCount(result.total);
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
          tableRender={(_props, _defaultDom, domList) => (
            <>
              {domList.toolbar}
              {viewMode === 'grid' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <ProjectGridView
                    items={gridData.map((p) => ({
                      id: p.id,
                      title: p.name,
                      slug: p.id,
                      visibility: 'public',
                      evaluation_status: p.evaluationStatus,
                      createdAt: p.createdAt,
                      updatedAt: p.updatedAt,
                      cover: null,
                      stats: { views: 0, likes: 0, comments: 0 },
                      folder: p.folderPath ? { id: p.folderId, name: p.folderPath } : undefined,
                      province: p.provinceName
                        ? { id: p.provinceId ?? '', name: p.provinceName }
                        : undefined,
                      country: p.countryName
                        ? { id: p.countryId ?? '', name: p.countryName }
                        : undefined,
                      imageCount: p.imageCount,
                      videoCount: p.videoCount,
                      author: p.ownerUser
                        ? {
                            id: p.ownerUser.id,
                            name: p.ownerUser.name ?? p.ownerUser.email ?? t('common.unknown'),
                            email: p.ownerUser.email,
                            avatar: p.ownerUser.avatar,
                          }
                        : null,
                    }))}
                    isLoading={false}
                    onView={(id) => setReviewProjectId(id)}
                    onEdit={(id) => navigate(`/projects/${id}/edit`)}
                    onDelete={(item) => void handleDelete(item.id)}
                    onEvaluate={(item) => setReviewProjectId(item.id)}
                    canEvaluate
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      marginTop: 12,
                      paddingBottom: 16,
                    }}
                  >
                    <Pagination
                      current={urlState.page}
                      pageSize={urlState.pageSize}
                      total={totalCount}
                      showSizeChanger
                      pageSizeOptions={[10, 20, 50, 100]}
                      showTotal={(total, range) =>
                        t('common.paginationTotal', {
                          start: range[0],
                          end: range[1],
                          total,
                        })
                      }
                      onChange={(page, pageSize) => {
                        void setUrlState({ page, pageSize });
                      }}
                    />
                  </div>
                </div>
              ) : (
                domList.table
              )}
            </>
          )}
          toolBarRender={() => [
            <Radio.Group
              key="view-mode"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button
                value="list"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BarsOutlined />
              </Radio.Button>

              <Radio.Button
                value="grid"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppstoreOutlined />
              </Radio.Button>
            </Radio.Group>,
          ]}
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
          void message.success(t('projects.createSuccess'));
          navigate(`/projects/${project.id}/edit`);
        }}
      />
      <ProjectReviewDrawer
        open={Boolean(reviewProjectId)}
        projectId={reviewProjectId}
        onClose={() => {
          setReviewProjectId(undefined);
          if (routeProjectId) {
            navigate('/projects', { replace: true });
          }
        }}
      />
    </>
  );
}

export { ProjectThumbnailCell };
