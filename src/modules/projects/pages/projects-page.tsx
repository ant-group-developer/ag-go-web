import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App as AntApp,
  Avatar,
  Button,
  Col,
  Flex,
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
import { BadgeCheck, ClipboardCheck, LayoutGrid, List, Pencil, Trash2 } from 'lucide-react';

import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
  useQueryStates,
} from 'nuqs';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { GO_PERMISSIONS } from '../../../shared/auth/permissions';
import { SortDropdown } from '../../../shared/components/sort-dropdown';
import { lazyWithReload } from '../../../shared/lib/app-update';
import { PAGE_TABLE_STICKY } from '../../../shared/lib/sticky-table-header';
import { usePermissions } from '../../account/hooks/use-current-account';
import { CountryFlag } from '../../countries/components';
import { useAssetPreviewUrl } from '../../media/hooks/use-asset-preview-url';
import { getProjects } from '../api/projects';
import { BulkApproveModal, type BulkApproveTarget } from '../components/bulk-approve-modal';
import { CreateProjectModal } from '../components/create-project-modal';
import type { ProjectFilterValues } from '../components/project-filter-popover';
import { ProjectFilterPopover } from '../components/project-filter-popover';

import { formatDate } from '../../../shared/lib/format-date';
import { ProjectReviewDrawer, type ProjectDrawerMode } from '../components/project-review-drawer';
import { useDeleteProject } from '../hooks/use-projects';
import { projectQueryKeys } from '../queries/project-query-keys';
import {
  PROJECT_EVALUATION_STATUSES,
  type ProjectEvaluationStatus,
  type ProjectListParams,
  type ProjectSortField,
  type ProjectSortOrder,
} from '../types/project-list-params.type';
import type { Project } from '../types/project.type';
import { getProjectStatus } from '../utils/project-status.util';

const ProjectGridView = lazyWithReload(() =>
  import('../components/project-grid-view').then((m) => ({ default: m.ProjectGridView })),
);

/** Projects with files still to approve; drafts have none and completed ones are all approved. */
function canQuickApprove(project: Pick<Project, 'evaluationStatus'>): boolean {
  return project.evaluationStatus !== 'draft' && project.evaluationStatus !== 'completed';
}

const PROJECT_SORT_FIELDS = [
  'name',
  'folder',
  'createdAt',
  'updatedAt',
] as const satisfies readonly ProjectSortField[];
const PROJECT_SORT_ORDERS = ['asc', 'desc'] as const satisfies readonly ProjectSortOrder[];

const projectUrlParams = {
  keyword: parseAsString,
  /** Legacy single-folder link (e.g. from statistics); merged into `folderIds`. */
  folderId: parseAsString,
  folderIds: parseAsArrayOf(parseAsString).withDefault([]),
  tagIds: parseAsArrayOf(parseAsString).withDefault([]),
  countryId: parseAsString,
  provinceId: parseAsString,
  categoryIds: parseAsArrayOf(parseAsString).withDefault([]),
  evaluationStatuses: parseAsArrayOf(parseAsStringLiteral(PROJECT_EVALUATION_STATUSES)).withDefault(
    [],
  ),
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(20),
  sortBy: parseAsStringLiteral(PROJECT_SORT_FIELDS).withDefault('updatedAt'),
  sortOrder: parseAsStringLiteral(PROJECT_SORT_ORDERS).withDefault('desc'),
};

const PROJECTS_VIEW_MODE_STORAGE_KEY = 'ag-go.projects.viewMode';

export type ProjectListScope = 'all' | 'evaluated' | 'evaluation' | 'mine';

type ProjectListScopeConfig = {
  basePath: string;
  titleKey: string;
  subTitleKey: string;
  emptyKey: string;
  /** Fixed filters sent with every list request of this page. */
  filters: Pick<ProjectListParams, 'evaluationStatuses' | 'mine'>;
  /** Drawer mode used when a project name/card is opened. */
  openMode: ProjectDrawerMode;
  canCreate: boolean;
};

const PROJECT_LIST_SCOPES: Record<ProjectListScope, ProjectListScopeConfig> = {
  // Admin-only: every status including drafts (API enforces the draft visibility rule).
  all: {
    basePath: '/all-projects',
    titleKey: 'menu.allProjects',
    subTitleKey: 'projects.scopeAllDescription',
    emptyKey: 'projects.empty',
    filters: {},
    openMode: 'view',
    canCreate: true,
  },
  evaluated: {
    basePath: '/projects',
    titleKey: 'projects.title',
    subTitleKey: 'projects.scopeEvaluatedDescription',
    emptyKey: 'projects.empty',
    filters: { evaluationStatuses: ['completed', 'partially_completed'] },
    openMode: 'view',
    canCreate: true,
  },
  evaluation: {
    basePath: '/project-evaluations',
    titleKey: 'menu.projectEvaluations',
    subTitleKey: 'projects.scopeEvaluationDescription',
    emptyKey: 'projects.emptyEvaluation',
    filters: { evaluationStatuses: ['pending', 'failed'] },
    openMode: 'evaluate',
    canCreate: false,
  },
  mine: {
    basePath: '/my-projects',
    titleKey: 'menu.myProjects',
    subTitleKey: 'projects.scopeMineDescription',
    emptyKey: 'projects.emptyMine',
    filters: { mine: true },
    openMode: 'view',
    canCreate: true,
  },
};

/** New projects start as drafts, so they are only listed on "My projects". */
const NEW_PROJECT_LIST_PATH = PROJECT_LIST_SCOPES.mine.basePath;

function ProjectThumbnailCell({ assetId }: { assetId?: string | null }) {
  const { t } = useTranslation();
  const previewUrl = useAssetPreviewUrl(assetId);

  // Fixed box that never shrinks, so long names can't squeeze the thumbnail.
  return (
    <div style={{ flex: '0 0 auto', width: 72, height: 54 }}>
      <Image
        alt={previewUrl ? '' : t('projects.noThumbnail')}
        fallback="/images/error-image.png"
        height={54}
        preview={Boolean(previewUrl)}
        src={previewUrl || '/images/error-image.png'}
        style={{ borderRadius: 6, objectFit: 'cover' }}
        width={72}
      />
    </div>
  );
}

export function ProjectsPage({ scope = 'evaluated' }: { scope?: ProjectListScope }) {
  const { t } = useTranslation();
  const scopeConfig = PROJECT_LIST_SCOPES[scope];
  // The status filter can only narrow the scope's fixed statuses, never widen them.
  const statusOptions: readonly ProjectEvaluationStatus[] =
    scopeConfig.filters.evaluationStatuses ?? PROJECT_EVALUATION_STATUSES;
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
  const [reviewProjectId, setReviewProjectId] = useState<string>();
  const [reviewMode, setReviewMode] = useState<ProjectDrawerMode>('view');
  const { can } = usePermissions();
  const canEvaluate = can(GO_PERMISSIONS.PROJECT_EVALUATE);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [approveTarget, setApproveTarget] = useState<BulkApproveTarget>();
  const quickApprove = (projects: Array<Pick<Project, 'id' | 'name'>>) =>
    setApproveTarget({
      kind: 'projects',
      projects: projects.map((project) => ({ id: project.id, name: project.name })),
    });
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
      setCreateOpen(scopeConfig.canCreate);
      void setCreateParam(null);
    }
  }, [createParam, scopeConfig.canCreate, setCreateParam]);

  useEffect(() => {
    if (routeProjectId) {
      setReviewMode('view');
      setReviewProjectId(routeProjectId);
    }
  }, [routeProjectId]);

  const openEditPage = (projectId: string) =>
    navigate(`/projects/${projectId}/edit`, { state: { from: scopeConfig.basePath } });
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
    folderIds: urlState.folderIds.length
      ? urlState.folderIds
      : urlState.folderId
        ? [urlState.folderId]
        : undefined,
    countryId: urlState.countryId ?? undefined,
    provinceId: urlState.provinceId ?? undefined,
    categoryIds: urlState.categoryIds.length ? urlState.categoryIds : undefined,
    tagIds: urlState.tagIds?.length ? urlState.tagIds : undefined,
    evaluationStatuses: urlState.evaluationStatuses.length
      ? urlState.evaluationStatuses
      : undefined,
  });

  const [keywordInput, setKeywordInput] = useState(urlState.keyword ?? '');

  const projectsDelete = useDeleteProject();

  const activeFilterCount = useMemo(
    () =>
      [
        filterValues.keyword?.trim(),
        filterValues.evaluationStatuses?.length,
        filterValues.folderIds?.length,
        filterValues.countryId || filterValues.provinceId,
        filterValues.categoryIds?.length,
        filterValues.tagIds?.length,
      ].filter(Boolean).length,
    [filterValues],
  );

  const applyFilter = async (values: ProjectFilterValues) => {
    await setUrlState({
      keyword: values.keyword?.trim() || null,
      folderId: null,
      folderIds: values.folderIds?.length ? values.folderIds : null,
      tagIds: values.tagIds?.length ? values.tagIds : null,
      countryId: values.countryId ?? null,
      provinceId: values.provinceId ?? null,
      categoryIds: values.categoryIds?.length ? values.categoryIds : null,
      evaluationStatuses: values.evaluationStatuses?.length ? values.evaluationStatuses : null,
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
      folderIds: null,
      tagIds: null,
      countryId: null,
      provinceId: null,
      categoryIds: null,
      evaluationStatuses: null,
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
    folder: t('projects.folder'),
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
        <Flex align="start" gap={8} style={{ minWidth: 0 }}>
          <ProjectThumbnailCell assetId={project.thumbnailAssetId} />
          <Flex vertical gap={2} style={{ minWidth: 0 }}>
            <Typography.Link
              ellipsis
              title={project.name}
              onClick={() => openProject(project.id, scopeConfig.openMode)}
            >
              {project.name}
            </Typography.Link>
            <Flex align="center" gap={6} style={{ minWidth: 0 }}>
              <Avatar size={18} src={project.ownerUser?.avatar} style={{ flexShrink: 0 }}>
                {project.ownerUser?.name?.charAt(0)?.toUpperCase()}
              </Avatar>
              <Typography.Text
                type="secondary"
                ellipsis={{ tooltip: project.ownerUser?.name || project.ownerUser?.email }}
              >
                {project.ownerUser?.name || project.ownerUser?.email || t('common.unknown')}
              </Typography.Text>
            </Flex>
          </Flex>
        </Flex>
      ),
    },
    {
      title: t('projects.location'),
      dataIndex: 'countryName',
      key: 'location',
      width: 200,
      ellipsis: true,
      render: (_, project) => (
        <Flex vertical style={{ minWidth: 0 }}>
          <Flex align="center" gap={6} style={{ minWidth: 0 }}>
            <CountryFlag
              flagUrl={project.countryFlagUrl || undefined}
              name={project.countryName || undefined}
              height={14}
            />
            <Typography.Text ellipsis={{ tooltip: project.countryName }}>
              {project.countryName || '-'}
            </Typography.Text>
          </Flex>
          {project.provinceName ? (
            <Typography.Text type="secondary" ellipsis={{ tooltip: project.provinceName }}>
              {project.provinceName}
            </Typography.Text>
          ) : null}
        </Flex>
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
      width: canEvaluate ? 176 : 140,
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
          {canEvaluate && canQuickApprove(project) ? (
            <Tooltip title={t('projects.markApproved')}>
              <Button
                aria-label={t('projects.markApproved')}
                icon={<BadgeCheck size={16} color={token.colorSuccess} />}
                type="text"
                onClick={() => quickApprove([project])}
              />
            </Tooltip>
          ) : null}
          <Tooltip title={t('projects.edit')}>
            <Button
              aria-label={t('projects.edit')}
              icon={<Pencil size={16} />}
              type="text"
              onClick={() => openEditPage(project.id)}
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
        title={t(scopeConfig.titleKey)}
        subTitle={t(scopeConfig.subTitleKey)}
        style={{
          background: token.colorBgContainer,
          paddingBlock: 16,
          paddingInline: 16,
          borderRadius: 6,
        }}
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
                statusOptions={statusOptions}
              />
              <Input.Search
                allowClear
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
            const selectedStatuses = urlState.evaluationStatuses.filter((status) =>
              statusOptions.includes(status),
            );
            const params: ProjectListParams = {
              ...(urlState.keyword ? { keyword: urlState.keyword } : {}),
              ...(urlState.folderIds.length
                ? { folderIds: urlState.folderIds }
                : urlState.folderId
                  ? { folderId: urlState.folderId }
                  : {}),
              ...(urlState.tagIds.length ? { tagIds: urlState.tagIds } : {}),
              ...(urlState.countryId ? { countryId: urlState.countryId } : {}),
              ...(urlState.provinceId ? { provinceId: urlState.provinceId } : {}),
              ...(urlState.categoryIds.length ? { categoryIds: urlState.categoryIds } : {}),
              ...scopeConfig.filters,
              ...(selectedStatuses.length ? { evaluationStatuses: selectedStatuses } : {}),
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
              // Selection only spans the page being shown.
              setSelectedProjectIds((current) =>
                current.filter((id) => result.items.some((item) => item.id === id)),
              );
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
          rowSelection={
            canEvaluate
              ? {
                  selectedRowKeys: selectedProjectIds,
                  getCheckboxProps: (project) => ({ disabled: !canQuickApprove(project) }),
                  onChange: (keys) => setSelectedProjectIds(keys.map(String)),
                }
              : false
          }
          tableAlertRender={false}
          locale={{ emptyText: t(scopeConfig.emptyKey) }}
          search={false}
          scroll={{ x: 1680 }}
          sticky={PAGE_TABLE_STICKY}
          tableRender={(_props, _defaultDom, domList) => (
            <>
              {domList.toolbar}
              {selectedProjectIds.length > 0 ? (
                <Alert
                  showIcon
                  type="info"
                  style={{ marginBottom: 16 }}
                  message={t('projects.bulkApproveSelectedProjects', {
                    count: selectedProjectIds.length,
                  })}
                  action={
                    <Space>
                      <Button size="small" type="link" onClick={() => setSelectedProjectIds([])}>
                        {t('projects.clearSelection')}
                      </Button>
                      <Button
                        size="small"
                        type="primary"
                        icon={<BadgeCheck size={14} />}
                        onClick={() =>
                          quickApprove(
                            gridData.filter((project) => selectedProjectIds.includes(project.id)),
                          )
                        }
                      >
                        {t('projects.bulkApprove')} ({selectedProjectIds.length})
                      </Button>
                    </Space>
                  }
                />
              ) : null}
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
                      emptyText={t(scopeConfig.emptyKey)}
                      onView={(id) => openProject(id, scopeConfig.openMode)}
                      onEdit={openEditPage}
                      onDelete={(item) => void handleDelete(item.id)}
                      onEvaluate={(item) => openProject(item.id, 'evaluate')}
                      canEvaluate
                      selectable={canEvaluate}
                      canSelect={(item) =>
                        canQuickApprove({ evaluationStatus: item.evaluation_status ?? '' })
                      }
                      selectedIds={selectedProjectIds}
                      onSelectChange={(id, selected) =>
                        setSelectedProjectIds((current) =>
                          selected
                            ? [...new Set([...current, id])]
                            : current.filter((value) => value !== id),
                        )
                      }
                      onApprove={
                        canEvaluate
                          ? (item) => quickApprove([{ id: item.id, name: item.title }])
                          : undefined
                      }
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
            <SortDropdown<ProjectSortField>
              key="sort"
              fields={PROJECT_SORT_FIELDS.map((field) => ({
                value: field,
                label: sortFieldLabels[field],
              }))}
              sortBy={urlState.sortBy}
              sortOrder={urlState.sortOrder}
              onChange={handleSortChange}
            />,
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
          navigate(`/projects/${project.id}/edit`, { state: { from: NEW_PROJECT_LIST_PATH } });
        }}
      />
      <BulkApproveModal
        target={approveTarget}
        onClose={() => setApproveTarget(undefined)}
        onApproved={() => {
          setSelectedProjectIds([]);
          // Approved projects can leave this list (e.g. the evaluation queue).
          void actionRef.current?.reload();
        }}
      />
      <ProjectReviewDrawer
        open={Boolean(reviewProjectId)}
        projectId={reviewProjectId}
        mode={reviewMode}
        onClose={() => {
          setReviewProjectId(undefined);
          // Evaluating can move the project in or out of this list.
          if (reviewMode === 'evaluate') {
            void actionRef.current?.reload();
          }
          if (routeProjectId) {
            navigate(scopeConfig.basePath, { replace: true });
          }
        }}
      />
    </>
  );
}

export { ProjectThumbnailCell };
