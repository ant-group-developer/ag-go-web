import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App as AntApp,
  Avatar,
  Button,
  Col,
  Dropdown,
  Image,
  Input,
  Pagination,
  Popconfirm,
  Radio,
  Row,
  Skeleton,
  Space,
  Tag,
  theme,
  Tooltip,
  Typography,
} from 'antd';
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Check,
  ClipboardCheck,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';

import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
  useQueryStates,
} from 'nuqs';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { CountryFlag } from '../../countries/components';
import { useAssetPreviewUrl } from '../../media/hooks/use-asset-preview-url';
import { getProjects } from '../api/projects';
import { CreateProjectModal } from '../components/create-project-modal';
import type { ProjectFilterValues } from '../components/project-filter-popover';
import { ProjectFilterPopover } from '../components/project-filter-popover';

import { ProjectReviewDrawer, type ProjectDrawerMode } from '../components/project-review-drawer';
import { useDeleteProject } from '../hooks/use-projects';
import { projectQueryKeys } from '../queries/project-query-keys';
import type {
  ProjectListParams,
  ProjectSortField,
  ProjectSortOrder,
} from '../types/project-list-params.type';
import type { Project } from '../types/project.type';
import { formatDate } from '../utils/date.util';
import { getProjectStatus } from '../utils/project-status.util';

const ProjectGridView = lazy(() =>
  import('../components/project-grid-view').then((m) => ({ default: m.ProjectGridView })),
);

const PROJECT_SORT_FIELDS = [
  'name',
  'createdAt',
  'updatedAt',
] as const satisfies readonly ProjectSortField[];
const PROJECT_SORT_ORDERS = ['asc', 'desc'] as const satisfies readonly ProjectSortOrder[];

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
  sortBy: parseAsStringLiteral(PROJECT_SORT_FIELDS).withDefault('updatedAt'),
  sortOrder: parseAsStringLiteral(PROJECT_SORT_ORDERS).withDefault('desc'),
};

const PROJECTS_VIEW_MODE_STORAGE_KEY = 'ag-go.projects.viewMode';

function ProjectThumbnailCell({ assetId }: { assetId?: string | null }) {
  const { t } = useTranslation();
  const previewUrl = useAssetPreviewUrl(assetId);

  return (
    <Image
      alt={previewUrl ? '' : t('projects.noThumbnail')}
      fallback="/images/error-image.png"
      height={48}
      preview={Boolean(previewUrl)}
      src={previewUrl || '/images/error-image.png'}
      style={{ borderRadius: 6, objectFit: 'cover' }}
      width={64}
    />
  );
}

export function ProjectsPage() {
  const { t } = useTranslation();
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey: projectQueryKeys.all() }) > 0;
  const [isLoading, setIsLoading] = useState(true);
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [urlState, setUrlState] = useQueryStates(projectUrlParams, {
    history: 'replace',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [reviewProjectId, setReviewProjectId] = useState<string>();
  const [reviewMode, setReviewMode] = useState<ProjectDrawerMode>('view');
  const openProject = (projectId: string, mode: ProjectDrawerMode) => {
    setReviewMode(mode);
    setReviewProjectId(projectId);
  };
  // `?create=true` (e.g. from the dashboard quick action) opens the create drawer once.
  const [createParam, setCreateParam] = useQueryState(
    'create',
    parseAsBoolean.withOptions({ history: 'replace' }),
  );

  useEffect(() => {
    if (createParam) {
      setCreateOpen(true);
      void setCreateParam(null);
    }
  }, [createParam, setCreateParam]);

  useEffect(() => {
    if (routeProjectId) {
      setReviewMode('view');
      setReviewProjectId(routeProjectId);
    }
  }, [routeProjectId]);
  const [listError, setListError] = useState<string>();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    try {
      const saved = localStorage.getItem(PROJECTS_VIEW_MODE_STORAGE_KEY);
      if (saved === 'list' || saved === 'grid') {
        return saved;
      }
    } catch {
      // ignore storage access errors
    }
    return 'grid';
  });

  useEffect(() => {
    try {
      localStorage.setItem(PROJECTS_VIEW_MODE_STORAGE_KEY, viewMode);
    } catch {
      // ignore storage access errors
    }
  }, [viewMode]);

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

  const sortFieldLabels: Record<ProjectSortField, string> = {
    name: t('projects.sortName'),
    createdAt: t('projects.createdAt'),
    updatedAt: t('projects.updatedAt'),
  };

  const handleSortChange = (sort: { sortBy?: ProjectSortField; sortOrder?: ProjectSortOrder }) => {
    void setUrlState({ ...sort, page: 1 });
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
            <Typography.Link onClick={() => openProject(project.id, 'view')}>
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
          <Space size={6} align="center">
            <CountryFlag
              flagUrl={project.countryFlagUrl || undefined}
              name={project.countryName || undefined}
              height={14}
            />
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
              onClick={() => openProject(project.id, 'evaluate')}
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
            <Space size={16}>
              <ProjectFilterPopover
                value={filterValues}
                onChange={handleFilterChange}
                onClear={handleClearFilter}
                activeCount={activeFilterCount}
              />
              <Input.Search
                allowClear
                size="middle"
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
            setIsLoading(true);
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
              sortBy: urlState.sortBy,
              sortOrder: urlState.sortOrder,
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
            } finally {
              setIsLoading(false);
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
                  <Suspense
                    fallback={
                      <Row gutter={[24, 24]}>
                        {Array.from({ length: 8 }).map((_, i) => (
                          <Col xs={24} sm={12} md={8} lg={6} xl={4} key={`lazy-grid-skeleton-${i}`}>
                            <div
                              style={{
                                aspectRatio: '1 / 1',
                                borderRadius: 16,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                padding: 12,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                              }}
                            >
                              <Skeleton.Button
                                active
                                size="small"
                                style={{ width: 80, borderRadius: 100 }}
                              />
                              <Skeleton active paragraph={{ rows: 2 }} />
                            </div>
                          </Col>
                        ))}
                      </Row>
                    }
                  >
                    <ProjectGridView
                      items={gridData.map((p) => ({
                        id: p.id,
                        title: p.name,
                        slug: p.id,
                        visibility: 'public',
                        evaluation_status: p.evaluationStatus,
                        createdAt: p.createdAt,
                        updatedAt: p.updatedAt,
                        thumbnailAssetId: p.thumbnailAssetId ?? null,
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
                      isLoading={isLoading || isFetching}
                      onView={(id) => openProject(id, 'view')}
                      onEdit={(id) => navigate(`/projects/${id}/edit`)}
                      onDelete={(item) => void handleDelete(item.id)}
                      onEvaluate={(item) => openProject(item.id, 'evaluate')}
                      canEvaluate
                    />
                  </Suspense>
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
            <Dropdown
              key="sort"
              trigger={['click']}
              open={sortOpen}
              // Keep the menu open while picking field/order; close only via trigger or outside click.
              onOpenChange={(nextOpen, info) => {
                if (info.source === 'trigger') {
                  setSortOpen(nextOpen);
                }
              }}
              menu={{
                items: [
                  {
                    type: 'group',
                    label: t('projects.sort'),
                    children: PROJECT_SORT_FIELDS.map((field) => ({
                      key: `sortBy:${field}`,
                      label: sortFieldLabels[field],
                      extra: urlState.sortBy === field ? <Check size={14} /> : null,
                      onClick: () => handleSortChange({ sortBy: field }),
                    })),
                  },
                  { type: 'divider' },
                  ...PROJECT_SORT_ORDERS.map((order) => ({
                    key: `sortOrder:${order}`,
                    icon:
                      order === 'asc' ? (
                        <ArrowUpNarrowWide size={14} />
                      ) : (
                        <ArrowDownWideNarrow size={14} />
                      ),
                    label: t(order === 'asc' ? 'projects.sortAsc' : 'projects.sortDesc'),
                    extra: urlState.sortOrder === order ? <Check size={14} /> : null,
                    onClick: () => handleSortChange({ sortOrder: order }),
                  })),
                ],
              }}
            >
              <Button
                icon={
                  urlState.sortOrder === 'asc' ? (
                    <ArrowUpNarrowWide size={16} />
                  ) : (
                    <ArrowDownWideNarrow size={16} />
                  )
                }
              >
                {sortFieldLabels[urlState.sortBy]}
              </Button>
            </Dropdown>,
            <Radio.Group
              key="view-mode"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="list" className="icon-radio-button">
                <List size={16} />
              </Radio.Button>

              <Radio.Button value="grid" className="icon-radio-button">
                <LayoutGrid size={16} />
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
        mode={reviewMode}
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
