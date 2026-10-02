import { PageContainer } from '@ant-design/pro-components';
import { Alert, Col, Empty, Pagination, Radio, Row, Spin, theme, Tooltip, Typography } from 'antd';
import { LayoutGrid, List, Search, VideoIcon } from 'lucide-react';
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SortDropdown } from '../../../shared/components/sort-dropdown';
import {
  FOOTAGE_SORT_FIELDS,
  FOOTAGE_USABILITIES,
  RESOLUTIONS,
  type FootageSearchParams,
  type FootageSortField,
  type FootageVideo,
  type Orientation,
  type TimeOfDay,
} from '../api/footage';
import { FootageCard } from '../components/footage-card';
import type { FootageFilterValues } from '../components/footage-filter-popover';
import { FootageFilterPopover } from '../components/footage-filter-popover';
import { FootageTable } from '../components/footage-table';
import { FootageVideoDrawer } from '../components/footage-video-drawer';
import { useFootageFacets, useFootageFolders, useFootageSearch } from '../hooks/use-footage';

/** Multiples of 20 so full rows fill a page at 4 or 5 cards per row (60 also at 3). */
const PAGE_SIZES = [20, 40, 60, 100];
const DEFAULT_PAGE_SIZE = 20;

type ViewMode = 'grid' | 'table';
const VIEW_MODE_STORAGE_KEY = 'ag-go.footage.viewMode';

/** Label keys of the sort fields, in menu order (as on the project list). */
const SORT_FIELD_LABELS: Record<FootageSortField, string> = {
  relevance: 'footage.sortRelevance',
  analyzedAt: 'footage.analyzedAt',
  quality: 'footage.quality',
  resolution: 'footage.resolution',
  duration: 'footage.duration',
  name: 'footage.assetName',
  folder: 'footage.filterFolder',
  project: 'footage.filterProject',
};

// ─── URL params ───────────────────────────────────────────────────────────────

const footageUrlParams = {
  q: parseAsString,
  folderIds: parseAsArrayOf(parseAsString).withDefault([]),
  projectIds: parseAsArrayOf(parseAsString).withDefault([]),
  ownerUserIds: parseAsArrayOf(parseAsString).withDefault([]),
  categoryIds: parseAsArrayOf(parseAsString).withDefault([]),
  tags: parseAsArrayOf(parseAsString).withDefault([]),
  genres: parseAsArrayOf(parseAsString).withDefault([]),
  timesOfDay: parseAsArrayOf(parseAsString).withDefault([]),
  orientations: parseAsArrayOf(parseAsString).withDefault([]),
  resolutions: parseAsArrayOf(parseAsStringLiteral(RESOLUTIONS)).withDefault([]),
  minDurationMs: parseAsInteger,
  maxDurationMs: parseAsInteger,
  usability: parseAsStringLiteral(FOOTAGE_USABILITIES).withDefault('usable'),
  sortBy: parseAsStringLiteral(FOOTAGE_SORT_FIELDS).withDefault('relevance'),
  sortOrder: parseAsStringLiteral(['asc', 'desc'] as const).withDefault('desc'),
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(DEFAULT_PAGE_SIZE),
};

/** Filter values as URL state (`null` clears a param). */
function filterUrlState(values: FootageFilterValues) {
  const list = <T,>(items: T[] | undefined) => (items?.length ? items : null);
  return {
    folderIds: list(values.folderIds),
    projectIds: list(values.projectIds),
    ownerUserIds: list(values.ownerUserIds),
    categoryIds: list(values.categoryIds),
    tags: list(values.tags),
    genres: list(values.genres),
    timesOfDay: list(values.timesOfDay),
    orientations: list(values.orientations),
    resolutions: list(values.resolutions),
    minDurationMs: values.minDurationMs ?? null,
    maxDurationMs: values.maxDurationMs ?? null,
    usability: values.usability && values.usability !== 'usable' ? values.usability : null,
  };
}

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Grid or table, remembered per browser (as on the project list). */
function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (saved === 'grid' || saved === 'table') return saved;
    } catch {
      // ignore storage access errors
    }
    return 'grid';
  });
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch {
      // ignore storage access errors
    }
  }, [viewMode]);
  return [viewMode, setViewMode];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function FootagePage() {
  const { t } = useTranslation();
  const { token } = theme.useToken();

  const [urlState, setUrlState] = useQueryStates(footageUrlParams, { history: 'replace' });
  const [viewMode, setViewMode] = useViewMode();

  // Local keyword state with debounce
  const [keywordInput, setKeywordInput] = useState(urlState.q ?? '');
  const debouncedKeyword = useDebounce(keywordInput, 400);

  // Sync debounced keyword to URL; a new search starts from the first page.
  useEffect(() => {
    const q = debouncedKeyword.trim() || null;
    void setUrlState((current) => (current.q === q ? {} : { q, page: null }));
  }, [debouncedKeyword, setUrlState]);

  // Build filter values from URL state
  const filterValues: FootageFilterValues = useMemo(() => {
    const list = <T,>(items: T[]) => (items.length ? items : undefined);
    return {
      folderIds: list(urlState.folderIds),
      projectIds: list(urlState.projectIds),
      ownerUserIds: list(urlState.ownerUserIds),
      categoryIds: list(urlState.categoryIds),
      tags: list(urlState.tags),
      genres: list(urlState.genres),
      timesOfDay: list(urlState.timesOfDay as TimeOfDay[]),
      orientations: list(urlState.orientations as Orientation[]),
      resolutions: list(urlState.resolutions),
      minDurationMs: urlState.minDurationMs ?? undefined,
      maxDurationMs: urlState.maxDurationMs ?? undefined,
      usability: urlState.usability,
    };
  }, [urlState]);

  const pageSize = PAGE_SIZES.includes(urlState.pageSize) ? urlState.pageSize : DEFAULT_PAGE_SIZE;
  const searchParams: FootageSearchParams = {
    q: urlState.q ?? undefined,
    ...filterValues,
    sortBy: urlState.sortBy,
    sortOrder: urlState.sortOrder,
    page: urlState.page,
    limit: pageSize,
  };

  const { data, isPending, isFetching, error } = useFootageSearch(searchParams, true);

  const foldersQuery = useFootageFolders();
  const folderPaths = useMemo(
    () => new Map((foldersQuery.data?.folders ?? []).map((folder) => [folder.id, folder.path])),
    [foldersQuery.data],
  );
  const facetsQuery = useFootageFacets({ q: urlState.q ?? undefined, ...filterValues });

  const items = useMemo<FootageVideo[]>(() => data?.items ?? [], [data]);
  const total = data?.total ?? 0;

  // A page past the end (e.g. after narrowing the filters) goes back to the last page.
  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    if (data && urlState.page > lastPage) {
      void setUrlState({ page: lastPage === 1 ? null : lastPage });
    }
  }, [data, pageSize, setUrlState, total, urlState.page]);

  // Active filter count (usable-only is the default, so it does not count)
  const activeFilterCount = useMemo(
    () =>
      [
        urlState.q,
        filterValues.folderIds?.length,
        filterValues.projectIds?.length,
        filterValues.ownerUserIds?.length,
        filterValues.categoryIds?.length,
        filterValues.tags?.length,
        filterValues.genres?.length,
        filterValues.timesOfDay?.length,
        filterValues.orientations?.length,
        filterValues.resolutions?.length,
        filterValues.minDurationMs !== undefined || filterValues.maxDurationMs !== undefined
          ? 1
          : undefined,
        filterValues.usability !== 'usable',
      ].filter(Boolean).length,
    [filterValues, urlState.q],
  );

  const handleFilterChange = useCallback(
    (values: FootageFilterValues) => {
      void setUrlState({ ...filterUrlState(values), page: null });
    },
    [setUrlState],
  );

  const handleClearFilters = useCallback(() => {
    setKeywordInput('');
    void setUrlState({ q: null, ...filterUrlState({}), page: null });
  }, [setUrlState]);

  // Drawer state
  const [drawerItem, setDrawerItem] = useState<FootageVideo | null>(null);

  return (
    <>
      <PageContainer
        title={t('menu.footage')}
        subTitle={t('footage.pageSubtitle')}
        style={{
          background: token.colorBgContainer,
          paddingBlock: 16,
          paddingInline: 16,
          borderRadius: 6,
        }}
      >
        {/* Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >
          {/* Filter popover */}
          <FootageFilterPopover
            value={filterValues}
            onChange={handleFilterChange}
            onClear={handleClearFilters}
            keyword={keywordInput}
            onKeywordChange={setKeywordInput}
            activeCount={activeFilterCount}
            folders={foldersQuery.data?.folders ?? []}
            foldersLoading={foldersQuery.isPending}
            facets={facetsQuery.data}
            facetsLoading={facetsQuery.isPending}
          />

          {/* Search box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '6px 12px',
              flex: '1 1 280px',
              maxWidth: 480,
            }}
          >
            <Search size={16} style={{ color: '#9ca3af', flexShrink: 0 }} />
            <input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder={t('footage.searchPlaceholder')}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                width: '100%',
                fontSize: 14,
                color: '#374151',
              }}
            />
            {keywordInput && (
              <button
                type="button"
                onClick={() => setKeywordInput('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  padding: 0,
                  lineHeight: 1,
                }}
                aria-label={t('common.search')}
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort + view mode */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <SortDropdown<FootageSortField>
              fields={FOOTAGE_SORT_FIELDS.map((field) => ({
                value: field,
                label: t(SORT_FIELD_LABELS[field]),
              }))}
              sortBy={urlState.sortBy}
              sortOrder={urlState.sortOrder}
              onChange={(sort) => void setUrlState({ ...sort, page: null })}
            />
            <Radio.Group
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              buttonStyle="solid"
            >
              <Tooltip title={t('footage.viewTable')}>
                <Radio.Button
                  value="table"
                  className="icon-radio-button"
                  aria-label={t('footage.viewTable')}
                >
                  <List size={16} />
                </Radio.Button>
              </Tooltip>
              <Tooltip title={t('footage.viewGrid')}>
                <Radio.Button
                  value="grid"
                  className="icon-radio-button"
                  aria-label={t('footage.viewGrid')}
                >
                  <LayoutGrid size={16} />
                </Radio.Button>
              </Tooltip>
            </Radio.Group>
          </div>
        </div>

        {/* Error state */}
        {error ? (
          <Alert
            type="error"
            showIcon
            message={error instanceof Error ? error.message : t('footage.loadError')}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        {/* Loading state (first page) */}
        {isPending ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Spin size="large" />
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <Empty
              image={<VideoIcon size={48} style={{ color: '#d1d5db' }} />}
              description={<Typography.Text type="secondary">{t('footage.empty')}</Typography.Text>}
            />
          </div>
        ) : (
          <Spin spinning={isFetching} delay={200}>
            {viewMode === 'table' ? (
              <FootageTable items={items} folderPaths={folderPaths} onOpen={setDrawerItem} />
            ) : (
              // 5 per row from 1600px (Full HD); 24 grid columns do not split by 5, hence flex.
              <Row gutter={[16, 16]}>
                {items.map((item) => (
                  <Col
                    key={item.assetId}
                    xs={24}
                    sm={12}
                    md={8}
                    lg={6}
                    xl={6}
                    xxl={{ flex: '20%' }}
                  >
                    <FootageCard item={item} onClick={() => setDrawerItem(item)} />
                  </Col>
                ))}
              </Row>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <Pagination
                current={urlState.page}
                pageSize={pageSize}
                total={total}
                pageSizeOptions={PAGE_SIZES}
                showSizeChanger
                showTotal={(count, range) =>
                  t('common.paginationTotal', { start: range[0], end: range[1], total: count })
                }
                onChange={(page, size) => {
                  void setUrlState({
                    page: size !== pageSize || page === 1 ? null : page,
                    pageSize: size === DEFAULT_PAGE_SIZE ? null : size,
                  });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          </Spin>
        )}
      </PageContainer>

      {/* Detail drawer */}
      <FootageVideoDrawer
        open={Boolean(drawerItem)}
        item={drawerItem}
        onClose={() => setDrawerItem(null)}
      />
    </>
  );
}
