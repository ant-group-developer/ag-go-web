import {
  Button,
  Checkbox,
  Empty,
  Input,
  Popover,
  Slider,
  Spin,
  Switch,
  Tree,
  Typography,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import { t } from 'i18next';
import {
  Briefcase,
  Clapperboard,
  Filter as FilterIcon,
  Folder as FolderIcon,
  Layers,
  Layout,
  Maximize2,
  MonitorPlay,
  Search,
  Sun,
  UserRound,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ORIENTATIONS,
  ORIENTATION_LABELS_VI,
  RESOLUTIONS,
  RESOLUTION_LABELS,
  TIMES_OF_DAY,
  TIME_OF_DAY_LABELS_VI,
  type FacetItem,
  type FootageFacetsResult,
  type FootageFolder,
  type FootageSearchParams,
  type Orientation,
  type Resolution,
  type TimeOfDay,
} from '../api/footage';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FootageFilterValues = Pick<
  FootageSearchParams,
  | 'folderIds'
  | 'projectIds'
  | 'ownerUserIds'
  | 'categoryIds'
  | 'tags'
  | 'provinceIds'
  | 'genres'
  | 'timesOfDay'
  | 'orientations'
  | 'resolutions'
  | 'minDurationMs'
  | 'maxDurationMs'
  | 'usableOnly'
>;

type FilterCategory =
  | 'keyword'
  | 'folder'
  | 'project'
  | 'category'
  | 'author'
  | 'genre'
  | 'timeOfDay'
  | 'orientation'
  | 'resolution'
  | 'duration';

interface FootageFilterPopoverProps {
  value: FootageFilterValues;
  onChange: (values: FootageFilterValues) => void;
  onClear: () => void;
  /** Free-text search, shared with the search box of the page. */
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  activeCount?: number;
  folders: FootageFolder[];
  foldersLoading: boolean;
  facets?: FootageFacetsResult;
  facetsLoading?: boolean;
}

// ─── Helper to highlight search matches ──────────────────────────────────────

function highlightText(text: string, search: string): React.ReactNode {
  if (!search.trim()) return text;
  const index = text.toLowerCase().indexOf(search.toLowerCase());
  if (index === -1) return text;
  const before = text.slice(0, index);
  const match = text.slice(index, index + search.length);
  const after = text.slice(index + search.length);
  return (
    <span>
      {before}
      <span
        style={{
          color: '#1677ff',
          fontWeight: 700,
          background: '#e6f4ff',
          borderRadius: 2,
          padding: '0 2px',
        }}
      >
        {match}
      </span>
      {after}
    </span>
  );
}

// ─── Build antd Tree from flat folder list ────────────────────────────────────

/** The API lists parents first, siblings in folder-tree order; children keep that order. */
function buildAntdFolderTree(
  folders: FootageFolder[],
  searchText: string,
): { treeData: DataNode[]; matchingKeySet: Set<string> } {
  const lc = searchText.trim().toLowerCase();
  const matchingKeySet = new Set<string>();

  if (lc) {
    const byId = new Map<string, FootageFolder>();
    for (const f of folders) byId.set(f.id, f);
    for (const f of folders) {
      if (f.name.toLowerCase().includes(lc)) {
        matchingKeySet.add(f.id);
        let parentId = f.parentId;
        while (parentId) {
          matchingKeySet.add(parentId);
          parentId = byId.get(parentId)?.parentId ?? null;
        }
      }
    }
  }

  const filtered = lc ? folders.filter((f) => matchingKeySet.has(f.id)) : folders;

  const nodeMap = new Map<string, DataNode & { _children: DataNode[] }>();
  for (const f of filtered) {
    nodeMap.set(f.id, {
      key: f.id,
      title: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}>
          <FolderIcon size={15} style={{ color: '#1677ff', flexShrink: 0 }} />
          <span>{highlightText(f.name, searchText)}</span>
          {f.usableVideos > 0 && (
            <span style={{ color: '#9ca3af', fontSize: 12 }}>({f.usableVideos})</span>
          )}
        </span>
      ),
      _children: [],
      children: [],
    });
  }

  const roots: DataNode[] = [];
  for (const f of filtered) {
    const node = nodeMap.get(f.id)!;
    if (f.parentId && nodeMap.has(f.parentId)) {
      const parent = nodeMap.get(f.parentId)!;
      parent._children.push(node);
      parent.children = parent._children;
    } else {
      roots.push(node);
    }
  }

  // Prune empty children arrays.
  function clean(nodes: DataNode[]): DataNode[] {
    return nodes.map((n) => ({
      ...n,
      children: (n.children as DataNode[]).length > 0 ? clean(n.children as DataNode[]) : undefined,
    }));
  }

  return { treeData: clean(roots), matchingKeySet };
}

// ─── Checkbox list (facet-aware) ──────────────────────────────────────────────

type CheckboxOption = { value: string; label: string; count?: number };

/** Options of a facet; picked values the facet no longer counts stay listed so they can be unpicked. */
function facetOptions(
  facet: FacetItem[] | undefined,
  selected: string[] | undefined,
  labelOf: (item: FacetItem) => string = (item) => item.label ?? item.value,
): CheckboxOption[] {
  const options = (facet ?? []).map((item) => ({
    value: item.value,
    label: labelOf(item),
    count: item.count,
  }));
  const listed = new Set(options.map((o) => o.value));
  const missing = (selected ?? [])
    .filter((value) => !listed.has(value))
    .map((value) => ({ value, label: labelOf({ value, count: 0 }), count: 0 }));
  return [...missing, ...options];
}

function CheckboxFacetFilter({
  options,
  loading,
  value,
  onChange,
  searchPlaceholder,
  emptyText,
}: {
  options: CheckboxOption[];
  loading?: boolean;
  value?: string[];
  onChange: (ids: string[] | undefined) => void;
  searchPlaceholder: string;
  emptyText: string;
}) {
  const [search, setSearch] = useState('');
  const visible = useMemo(() => {
    const lc = search.trim().toLowerCase();
    return lc ? options.filter((o) => o.label.toLowerCase().includes(lc)) : options;
  }, [options, search]);

  return (
    <>
      <Input
        allowClear
        placeholder={searchPlaceholder}
        prefix={<Search size={16} style={{ color: '#9ca3af' }} />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          maxHeight: 280,
          overflowY: 'auto',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: '8px 12px',
          background: '#fafafa',
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <Spin size="small" />
          </div>
        ) : visible.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: '#6b7280', fontSize: 13 }}>{emptyText}</span>}
          />
        ) : (
          <Checkbox.Group
            value={value ?? []}
            onChange={(checked) => {
              const visibleSet = new Set(visible.map((o) => o.value));
              const hidden = (value ?? []).filter((id) => !visibleSet.has(id));
              const next = [...hidden, ...(checked as string[])];
              onChange(next.length ? next : undefined);
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {visible.map((o) => (
              <Checkbox key={o.value} value={o.value}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {highlightText(o.label, search)}
                  {o.count !== undefined && (
                    <span style={{ color: '#9ca3af', fontSize: 12 }}>({o.count})</span>
                  )}
                </span>
              </Checkbox>
            ))}
          </Checkbox.Group>
        )}
      </div>
    </>
  );
}

function PanelHeader({
  icon,
  title,
  onClear,
}: {
  icon: React.ReactNode;
  title: string;
  /** Shown as a "clear" link when the filter has a value. */
  onClear?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1677ff' }}>
        {icon}
        <Typography.Text strong style={{ fontSize: 16 }}>
          {title}
        </Typography.Text>
      </div>
      {onClear && (
        <Button type="link" size="small" onClick={onClear} style={{ padding: 0, fontSize: 12 }}>
          {t('footage.clearFolder')}
        </Button>
      )}
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  minHeight: 0,
};

// ─── Filter content ───────────────────────────────────────────────────────────

function FilterContent({
  value,
  onChange,
  onClear,
  keyword,
  onKeywordChange,
  folders,
  foldersLoading,
  facets,
  facetsLoading,
}: Omit<FootageFilterPopoverProps, 'activeCount'>) {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('keyword');
  const [folderSearch, setFolderSearch] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  const { treeData, matchingKeySet } = useMemo(
    () => buildAntdFolderTree(folders, folderSearch),
    [folders, folderSearch],
  );

  const visibleFolderKeys = useMemo(() => {
    const keys = new Set<string>();
    const collect = (nodes: DataNode[]) =>
      nodes.forEach((n) => {
        keys.add(String(n.key));
        if (n.children) collect(n.children as DataNode[]);
      });
    collect(treeData);
    return keys;
  }, [treeData]);

  useEffect(() => {
    if (folderSearch.trim()) {
      setExpandedKeys(Array.from(matchingKeySet));
      setAutoExpandParent(true);
    } else if (folders.length) {
      setExpandedKeys(folders.map((f) => f.id));
    }
  }, [folders, folderSearch, matchingKeySet]);

  const counts = (facet: FacetItem[] | undefined) =>
    new Map((facet ?? []).map((f) => [f.value, f.count]));

  const filterCategories: Array<{ key: FilterCategory; icon: React.ReactNode; label: string }> = [
    { key: 'keyword', icon: <Search size={16} />, label: t('footage.filterKeyword') },
    { key: 'folder', icon: <FolderIcon size={16} />, label: t('footage.filterFolder') },
    { key: 'project', icon: <Briefcase size={16} />, label: t('footage.filterProject') },
    { key: 'category', icon: <Layers size={16} />, label: t('footage.filterCategory') },
    { key: 'author', icon: <UserRound size={16} />, label: t('footage.filterAuthor') },
    { key: 'resolution', icon: <MonitorPlay size={16} />, label: t('footage.filterResolution') },
    { key: 'genre', icon: <Clapperboard size={16} />, label: t('footage.filterGenre') },
    { key: 'timeOfDay', icon: <Sun size={16} />, label: t('footage.filterTimeOfDay') },
    { key: 'orientation', icon: <Layout size={16} />, label: t('footage.filterOrientation') },
    { key: 'duration', icon: <Maximize2 size={16} />, label: t('footage.filterDuration') },
  ];

  const getCount = (key: FilterCategory): number => {
    switch (key) {
      case 'keyword':
        return (keyword.trim() ? 1 : 0) + (value.tags?.length ?? 0);
      case 'folder':
        return value.folderIds?.length ?? 0;
      case 'project':
        return value.projectIds?.length ?? 0;
      case 'category':
        return value.categoryIds?.length ?? 0;
      case 'author':
        return value.ownerUserIds?.length ?? 0;
      case 'resolution':
        return value.resolutions?.length ?? 0;
      case 'genre':
        return value.genres?.length ?? 0;
      case 'timeOfDay':
        return value.timesOfDay?.length ?? 0;
      case 'orientation':
        return value.orientations?.length ?? 0;
      case 'duration':
        return value.minDurationMs !== undefined || value.maxDurationMs !== undefined ? 1 : 0;
      default:
        return 0;
    }
  };

  const totalActiveFilters = filterCategories.reduce(
    (sum, c) => sum + (getCount(c.key) > 0 ? 1 : 0),
    0,
  );

  /** Checkbox panel of one facet-backed filter. */
  const facetPanel = (
    icon: React.ReactNode,
    title: string,
    field: 'projectIds' | 'categoryIds' | 'ownerUserIds' | 'genres',
    options: CheckboxOption[],
    searchPlaceholder: string,
  ) => (
    <div style={panelStyle}>
      <PanelHeader
        icon={icon}
        title={title}
        onClear={
          value[field]?.length ? () => onChange({ ...value, [field]: undefined }) : undefined
        }
      />
      <CheckboxFacetFilter
        options={options}
        loading={facetsLoading}
        value={value[field]}
        onChange={(ids) => onChange({ ...value, [field]: ids })}
        searchPlaceholder={searchPlaceholder}
        emptyText={t('footage.emptyOptions')}
      />
    </div>
  );

  const renderPanel = () => {
    switch (activeCategory) {
      case 'keyword':
        return (
          <div style={panelStyle}>
            <PanelHeader icon={<Search size={18} />} title={t('footage.filterKeyword')} />
            <Input
              allowClear
              placeholder={t('footage.searchPlaceholder')}
              prefix={<Search size={16} style={{ color: '#9ca3af' }} />}
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
            />
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {t('footage.keywordHint')}
            </Typography.Text>
            <Typography.Text strong style={{ fontSize: 13 }}>
              {t('footage.aiTags')}
            </Typography.Text>
            <CheckboxFacetFilter
              options={facetOptions(facets?.tags, value.tags)}
              loading={facetsLoading}
              value={value.tags}
              onChange={(ids) => onChange({ ...value, tags: ids })}
              searchPlaceholder={t('footage.searchTagPlaceholder')}
              emptyText={t('footage.emptyOptions')}
            />
          </div>
        );

      case 'folder':
        return (
          <div style={{ ...panelStyle, height: '100%' }}>
            <PanelHeader
              icon={<FolderIcon size={18} />}
              title={t('footage.filterFolder')}
              onClear={
                value.folderIds?.length
                  ? () => onChange({ ...value, folderIds: undefined })
                  : undefined
              }
            />
            <Input
              allowClear
              placeholder={t('footage.searchFolderPlaceholder')}
              prefix={<Search size={16} style={{ color: '#9ca3af' }} />}
              value={folderSearch}
              onChange={(e) => setFolderSearch(e.target.value)}
            />
            <div
              style={{
                flex: 1,
                minHeight: 260,
                maxHeight: 320,
                overflowY: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: '8px 10px',
                background: '#fafafa',
              }}
            >
              {foldersLoading ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    gap: 8,
                    color: '#9ca3af',
                  }}
                >
                  <Spin size="small" />
                  <span style={{ fontSize: 13 }}>{t('footage.loadingFolders')}</span>
                </div>
              ) : treeData.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center' }}>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span style={{ color: '#6b7280', fontSize: 13 }}>
                        {folderSearch ? t('footage.noFolderFound') : t('footage.emptyFolders')}
                      </span>
                    }
                  />
                </div>
              ) : (
                <Tree
                  checkable
                  checkStrictly={Boolean(folderSearch.trim())}
                  selectable={false}
                  treeData={treeData}
                  checkedKeys={(value.folderIds ?? []).filter((id) => visibleFolderKeys.has(id))}
                  expandedKeys={expandedKeys}
                  autoExpandParent={autoExpandParent}
                  onExpand={(keys) => {
                    setExpandedKeys(keys);
                    setAutoExpandParent(false);
                  }}
                  onCheck={(checked) => {
                    const keys = Array.isArray(checked) ? checked : checked.checked;
                    const hidden = (value.folderIds ?? []).filter(
                      (id) => !visibleFolderKeys.has(id),
                    );
                    const ids = [...hidden, ...keys.map(String)];
                    onChange({ ...value, folderIds: ids.length > 0 ? ids : undefined });
                  }}
                  style={{ background: 'transparent', fontSize: 13.5 }}
                />
              )}
            </div>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {value.folderIds?.length
                ? t('footage.selectedFoldersCount', { count: value.folderIds.length })
                : t('footage.selectFoldersHint')}
            </Typography.Text>
          </div>
        );

      case 'project':
        return facetPanel(
          <Briefcase size={18} />,
          t('footage.filterProject'),
          'projectIds',
          facetOptions(facets?.projects, value.projectIds),
          t('footage.searchProjectPlaceholder'),
        );

      case 'category':
        return facetPanel(
          <Layers size={18} />,
          t('footage.filterCategory'),
          'categoryIds',
          facetOptions(facets?.categories, value.categoryIds),
          t('footage.searchCategoryPlaceholder'),
        );

      case 'author':
        return facetPanel(
          <UserRound size={18} />,
          t('footage.filterAuthor'),
          'ownerUserIds',
          facetOptions(facets?.authors, value.ownerUserIds),
          t('footage.searchAuthorPlaceholder'),
        );

      case 'genre':
        return facetPanel(
          <Clapperboard size={18} />,
          t('footage.filterGenre'),
          'genres',
          facetOptions(facets?.genres, value.genres),
          t('footage.searchPlaceholder'),
        );

      case 'resolution': {
        const resolutionCounts = counts(facets?.resolutions);
        return (
          <div style={panelStyle}>
            <PanelHeader
              icon={<MonitorPlay size={18} />}
              title={t('footage.filterResolution')}
              onClear={
                value.resolutions?.length
                  ? () => onChange({ ...value, resolutions: undefined })
                  : undefined
              }
            />
            <CheckboxFacetFilter
              options={RESOLUTIONS.map((v) => ({
                value: v,
                label: RESOLUTION_LABELS[v],
                count: resolutionCounts.get(v) ?? 0,
              }))}
              loading={facetsLoading}
              value={value.resolutions}
              onChange={(ids) => onChange({ ...value, resolutions: ids as Resolution[] })}
              searchPlaceholder={t('footage.searchPlaceholder')}
              emptyText={t('footage.emptyOptions')}
            />
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {t('footage.resolutionHint')}
            </Typography.Text>
          </div>
        );
      }

      case 'timeOfDay': {
        const timeOfDayCounts = counts(facets?.timesOfDay);
        return (
          <div style={panelStyle}>
            <PanelHeader icon={<Sun size={18} />} title={t('footage.filterTimeOfDay')} />
            <CheckboxFacetFilter
              options={TIMES_OF_DAY.map((v) => ({
                value: v,
                label: TIME_OF_DAY_LABELS_VI[v],
                count: timeOfDayCounts.get(v),
              }))}
              loading={facetsLoading}
              value={value.timesOfDay}
              onChange={(ids) => onChange({ ...value, timesOfDay: ids as TimeOfDay[] | undefined })}
              searchPlaceholder={t('footage.searchPlaceholder')}
              emptyText={t('footage.emptyOptions')}
            />
          </div>
        );
      }

      case 'orientation': {
        const orientationCounts = counts(facets?.orientations);
        return (
          <div style={panelStyle}>
            <PanelHeader icon={<Layout size={18} />} title={t('footage.filterOrientation')} />
            <CheckboxFacetFilter
              options={ORIENTATIONS.map((v) => ({
                value: v,
                label: ORIENTATION_LABELS_VI[v],
                count: orientationCounts.get(v),
              }))}
              loading={facetsLoading}
              value={value.orientations}
              onChange={(ids) =>
                onChange({ ...value, orientations: ids as Orientation[] | undefined })
              }
              searchPlaceholder={t('footage.searchPlaceholder')}
              emptyText={t('footage.emptyOptions')}
            />
          </div>
        );
      }

      case 'duration': {
        // Duration slider: 0–30 min (0–1800 s), steps of 30 s
        const MAX_DURATION_S = 1800;
        const minS = Math.round((value.minDurationMs ?? 0) / 1000);
        const maxS = Math.round((value.maxDurationMs ?? MAX_DURATION_S * 1000) / 1000);
        const fmtMin = (s: number) => {
          const m = Math.floor(s / 60);
          const sec = s % 60;
          return sec === 0 ? `${m}p` : `${m}p${sec}s`;
        };
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <PanelHeader
              icon={<Maximize2 size={18} />}
              title={t('footage.filterDuration')}
              onClear={
                value.minDurationMs !== undefined || value.maxDurationMs !== undefined
                  ? () => onChange({ ...value, minDurationMs: undefined, maxDurationMs: undefined })
                  : undefined
              }
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Typography.Text style={{ fontSize: 13 }}>
                {t('footage.durationRangeLabel')}
              </Typography.Text>
              <Slider
                range
                min={0}
                max={MAX_DURATION_S}
                step={30}
                value={[minS, maxS]}
                marks={{ 0: '0', 300: '5p', 600: '10p', 900: '15p', 1800: '30p' }}
                tooltip={{ formatter: (v) => fmtMin(v ?? 0) }}
                onChange={([min, max]) => {
                  onChange({
                    ...value,
                    minDurationMs: min > 0 ? min * 1000 : undefined,
                    maxDurationMs: max < MAX_DURATION_S ? max * 1000 : undefined,
                  });
                }}
              />
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: 720, height: 520 }}>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <div
          style={{
            width: 190,
            borderRight: '1px solid #f0f0f0',
            display: 'flex',
            flexDirection: 'column',
            padding: '8px 0',
            flexShrink: 0,
            background: '#fafafa',
            overflowY: 'auto',
          }}
        >
          {filterCategories.map((cat) => {
            const isActive = activeCategory === cat.key;
            const filterCount = getCount(cat.key);
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  fontSize: 13.5,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#1677ff' : '#374151',
                  background: isActive ? '#e6f4ff' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  borderLeft: isActive ? '3px solid #1677ff' : '3px solid transparent',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: isActive ? '#1677ff' : '#6b7280',
                    }}
                  >
                    {cat.icon}
                  </span>
                  {cat.label}
                </span>
                {filterCount > 0 && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 18,
                      height: 18,
                      padding: filterCount > 1 ? '0 5px' : '0 4px',
                      borderRadius: 9,
                      fontSize: 11,
                      fontWeight: 700,
                      background: '#1677ff',
                      color: '#ffffff',
                    }}
                  >
                    {filterCount > 1 ? filterCount : '✓'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right content */}
        <div
          style={{
            flex: 1,
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          {renderPanel()}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: '1px solid #f0f0f0',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#fafafa',
        }}
      >
        <Button
          type="link"
          danger
          onClick={onClear}
          style={{ padding: 0, fontSize: 13, fontWeight: 500 }}
        >
          {t('footage.clearAllFilters')}
        </Button>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          {totalActiveFilters > 0
            ? t('footage.activeFiltersCount', { count: totalActiveFilters })
            : t('footage.noActiveFilters')}
        </Typography.Text>
      </div>
    </div>
  );
}

// ─── Usable-only switch ───────────────────────────────────────────────────────

export function UsableOnlySwitch({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <Switch size="small" checked={value} onChange={onChange} />
      <span style={{ fontSize: 13, fontWeight: 500 }}>{t('footage.usableOnly')}</span>
    </span>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export function FootageFilterPopover({
  activeCount = 0,
  ...contentProps
}: FootageFilterPopoverProps) {
  return (
    <Popover
      trigger="click"
      placement="bottomLeft"
      arrow={false}
      styles={{
        body: {
          padding: 0,
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 10px 36px rgba(0, 0, 0, 0.14)',
        },
      }}
      content={<FilterContent {...contentProps} />}
    >
      <Button
        icon={<FilterIcon size={15} />}
        style={{
          borderRadius: 8,
          fontWeight: 500,
          borderColor: activeCount > 0 ? '#1677ff' : undefined,
          color: activeCount > 0 ? '#1677ff' : undefined,
          background: activeCount > 0 ? '#e6f4ff' : undefined,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {t('common.filters')}
        {activeCount > 0 && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#1677ff',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 10,
              minWidth: 18,
              height: 18,
              padding: '0 5px',
            }}
          >
            {activeCount}
          </span>
        )}
      </Button>
    </Popover>
  );
}
