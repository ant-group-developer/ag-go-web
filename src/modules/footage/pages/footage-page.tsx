import { PageContainer } from '@ant-design/pro-components';
import { Alert, Button, Col, Empty, Row, Spin, theme, Typography } from 'antd';
import { Search, VideoIcon } from 'lucide-react';
import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from 'nuqs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FootageSearchParams, FootageVideo, Orientation, TimeOfDay } from '../api/footage';
import { FootageCard } from '../components/footage-card';
import type { FootageFilterValues } from '../components/footage-filter-popover';
import { FootageFilterPopover, UsableOnlySwitch } from '../components/footage-filter-popover';
import { FootageVideoDrawer } from '../components/footage-video-drawer';
import { useFootageFacets, useFootageFolders, useFootageSearch } from '../hooks/use-footage';

// ─── URL params ───────────────────────────────────────────────────────────────

const footageUrlParams = {
  q: parseAsString,
  folderIds: parseAsArrayOf(parseAsString).withDefault([]),
  genres: parseAsArrayOf(parseAsString).withDefault([]),
  timesOfDay: parseAsArrayOf(parseAsString).withDefault([]),
  orientations: parseAsArrayOf(parseAsString).withDefault([]),
  minDurationMs: parseAsInteger,
  maxDurationMs: parseAsInteger,
  usableOnly: parseAsBoolean.withDefault(true),
};

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function FootagePage() {
  const { t } = useTranslation();
  const { token } = theme.useToken();

  const [urlState, setUrlState] = useQueryStates(footageUrlParams, { history: 'replace' });

  // Local keyword state with debounce
  const [keywordInput, setKeywordInput] = useState(urlState.q ?? '');
  const debouncedKeyword = useDebounce(keywordInput, 400);

  // Sync debounced keyword to URL
  useEffect(() => {
    void setUrlState({ q: debouncedKeyword.trim() || null });
  }, [debouncedKeyword, setUrlState]);

  // Build filter values from URL state
  const filterValues: FootageFilterValues = useMemo(
    () => ({
      folderIds: urlState.folderIds.length ? urlState.folderIds : undefined,
      genres: urlState.genres.length ? urlState.genres : undefined,
      timesOfDay: urlState.timesOfDay.length ? (urlState.timesOfDay as TimeOfDay[]) : undefined,
      orientations: urlState.orientations.length
        ? (urlState.orientations as Orientation[])
        : undefined,
      minDurationMs: urlState.minDurationMs ?? undefined,
      maxDurationMs: urlState.maxDurationMs ?? undefined,
      usableOnly: urlState.usableOnly,
    }),
    [urlState],
  );

  const searchParams: FootageSearchParams = {
    q: urlState.q ?? undefined,
    ...filterValues,
    limit: 40,
  };

  const { data, isPending, isFetchingNextPage, hasNextPage, fetchNextPage, error } =
    useFootageSearch(searchParams, true);

  const foldersQuery = useFootageFolders();
  const facetsQuery = useFootageFacets({ q: urlState.q ?? undefined, ...filterValues });

  // Flatten all pages
  const items = useMemo<FootageVideo[]>(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  // Active filter count (excludes usableOnly which has its own switch)
  const activeFilterCount = useMemo(
    () =>
      [
        filterValues.folderIds?.length,
        filterValues.genres?.length,
        filterValues.timesOfDay?.length,
        filterValues.orientations?.length,
        filterValues.minDurationMs !== undefined || filterValues.maxDurationMs !== undefined
          ? 1
          : undefined,
      ].filter(Boolean).length,
    [filterValues],
  );

  const handleFilterChange = useCallback(
    (values: FootageFilterValues) => {
      void setUrlState({
        folderIds: values.folderIds?.length ? values.folderIds : null,
        genres: values.genres?.length ? values.genres : null,
        timesOfDay: values.timesOfDay?.length ? values.timesOfDay : null,
        orientations: values.orientations?.length ? values.orientations : null,
        minDurationMs: values.minDurationMs ?? null,
        maxDurationMs: values.maxDurationMs ?? null,
        usableOnly: values.usableOnly ?? true,
      });
    },
    [setUrlState],
  );

  const handleClearFilters = useCallback(() => {
    setKeywordInput('');
    void setUrlState({
      q: null,
      folderIds: null,
      genres: null,
      timesOfDay: null,
      orientations: null,
      minDurationMs: null,
      maxDurationMs: null,
      usableOnly: true,
    });
  }, [setUrlState]);

  // Drawer state
  const [drawerItem, setDrawerItem] = useState<FootageVideo | null>(null);

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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

          {/* Filter popover */}
          <FootageFilterPopover
            value={filterValues}
            onChange={handleFilterChange}
            onClear={handleClearFilters}
            activeCount={activeFilterCount}
            folders={foldersQuery.data?.folders ?? []}
            foldersLoading={foldersQuery.isPending}
            facets={facetsQuery.data}
            facetsLoading={facetsQuery.isPending}
          />

          {/* Usable-only switch */}
          <UsableOnlySwitch
            value={urlState.usableOnly}
            onChange={(v) => void setUrlState({ usableOnly: v })}
          />
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
          <>
            {/* Result count */}
            <Typography.Text
              type="secondary"
              style={{ fontSize: 12, display: 'block', marginBottom: 12 }}
            >
              {t('footage.resultCount', { count: items.length })}
              {hasNextPage ? ` ${t('footage.moreAvailable')}` : ''}
            </Typography.Text>

            {/* Responsive grid */}
            <Row gutter={[16, 16]}>
              {items.map((item) => (
                <Col key={item.assetId} xs={24} sm={12} md={8} lg={6} xl={6} xxl={4}>
                  <FootageCard item={item} onClick={() => setDrawerItem(item)} />
                </Col>
              ))}
            </Row>

            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} style={{ height: 1 }} />

            {/* "Load more" button / spinner */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: 24,
                paddingBottom: 16,
              }}
            >
              {isFetchingNextPage ? (
                <Spin />
              ) : hasNextPage ? (
                <Button onClick={() => void fetchNextPage()}>{t('footage.loadMore')}</Button>
              ) : null}
            </div>
          </>
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
