import { Button, Empty, Input, Popover, Select, Spin, Tree, Typography } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { t } from 'i18next';
import {
  Filter as FilterIcon,
  Folder as FolderIcon,
  Layers,
  MapPin,
  Search,
  Tag as TagIcon,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCategories } from '../../categories/hooks/use-categories';
import { useCountries } from '../../countries/hooks/use-countries';
import { useFolders } from '../../folders/hooks/use-folders';
import type { Folder as FolderType } from '../../folders/types/folder.type';
import { useProvinces } from '../../provinces/hooks/use-provinces';
import { useTags } from '../../tags/hooks/use-tags';

export type ProjectFilterValues = {
  keyword?: string;
  folderId?: string;
  countryId?: string;
  provinceId?: string;
  categoryId?: string;
  tagIds?: string[];
};

type FilterCategory = 'keyword' | 'folder' | 'category' | 'tags' | 'location';

interface ProjectFilterPopoverProps {
  value: ProjectFilterValues;
  onChange: (values: ProjectFilterValues) => void;
  onClear: () => void;
  activeCount?: number;
}

// ─── Helper to highlight search matches in node titles ──────────────────────
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

// ─── Build Tree Nodes from Flat Folder List ──────────────────────────────────
function buildFolderTree(
  folders: FolderType[],
  searchText: string,
): { treeData: DataNode[]; matchingKeySet: Set<string> } {
  const lc = searchText.trim().toLowerCase();
  const matchingKeySet = new Set<string>();

  if (lc) {
    const folderById = new Map<string, FolderType>();
    for (const f of folders) {
      folderById.set(f.id, f);
    }

    for (const f of folders) {
      if (f.name.toLowerCase().includes(lc)) {
        matchingKeySet.add(f.id);
        let currentParentId = f.parentId;
        while (currentParentId) {
          matchingKeySet.add(currentParentId);
          const parent = folderById.get(currentParentId);
          currentParentId = parent?.parentId ?? null;
        }
      }
    }
  }

  const filteredFolders = lc ? folders.filter((f) => matchingKeySet.has(f.id)) : folders;

  const nodeMap = new Map<string, DataNode>();
  for (const f of filteredFolders) {
    nodeMap.set(f.id, {
      key: f.id,
      title: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}>
          <FolderIcon size={15} style={{ color: '#1677ff', flexShrink: 0 }} />
          <span>{highlightText(f.name, searchText)}</span>
        </span>
      ),
      children: [],
    });
  }

  const roots: DataNode[] = [];
  for (const f of filteredFolders) {
    const node = nodeMap.get(f.id)!;
    if (f.parentId && nodeMap.has(f.parentId)) {
      (nodeMap.get(f.parentId)!.children as DataNode[]).push(node);
    } else {
      roots.push(node);
    }
  }

  function cleanEmptyChildren(nodes: DataNode[]): DataNode[] {
    return nodes.map((n) => ({
      ...n,
      children:
        n.children && (n.children as DataNode[]).length > 0
          ? cleanEmptyChildren(n.children as DataNode[])
          : undefined,
    }));
  }

  return {
    treeData: cleanEmptyChildren(roots),
    matchingKeySet,
  };
}

// ─── Sidebar Category Definitions ────────────────────────────────────────────
const filterCategories: Array<{
  key: FilterCategory;
  icon: React.ReactNode;
  label: string;
}> = [
  { key: 'keyword', icon: <Search size={16} />, label: 'Từ khóa' },
  { key: 'folder', icon: <FolderIcon size={16} />, label: 'Thư mục' },
  { key: 'category', icon: <Layers size={16} />, label: 'Danh mục' },
  { key: 'tags', icon: <TagIcon size={16} />, label: 'Tags' },
  { key: 'location', icon: <MapPin size={16} />, label: 'Địa điểm' },
];

function getCategoryFilterCount(key: FilterCategory, value: ProjectFilterValues): number {
  switch (key) {
    case 'keyword':
      return value.keyword?.trim() ? 1 : 0;
    case 'folder':
      return value.folderId?.trim() ? 1 : 0;
    case 'category':
      return value.categoryId ? 1 : 0;
    case 'tags':
      return value.tagIds?.length ?? 0;
    case 'location': {
      let count = 0;
      if (value.countryId) count += 1;
      if (value.provinceId) count += 1;
      return count;
    }
    default:
      return 0;
  }
}

// ─── Popover Content Component ───────────────────────────────────────────────
function FilterContent({
  value,
  onChange,
  onClear,
}: {
  value: ProjectFilterValues;
  onChange: (values: ProjectFilterValues) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('keyword');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [folderSearch, setFolderSearch] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  const folders = useFolders();
  const countries = useCountries();
  const tags = useTags();
  const countryId = value.countryId;
  const provinces = useProvinces({ page: 1, pageSize: 100, countryId }, Boolean(countryId));
  const categories = useCategories();

  const { treeData: folderTree, matchingKeySet } = useMemo(
    () => buildFolderTree(folders.data ?? [], folderSearch),
    [folders.data, folderSearch],
  );

  // Keep tree expanded when folders load or search changes
  useEffect(() => {
    if (folderSearch.trim()) {
      setExpandedKeys(Array.from(matchingKeySet));
      setAutoExpandParent(true);
    } else if (folders.data?.length) {
      setExpandedKeys(folders.data.map((f) => f.id));
    }
  }, [folders.data, folderSearch, matchingKeySet]);

  const totalActiveFilters = useMemo(
    () =>
      [
        value.keyword?.trim(),
        value.folderId?.trim(),
        value.countryId || value.provinceId,
        value.categoryId,
        value.tagIds?.length,
      ].filter(Boolean).length,
    [value],
  );

  const visibleCategories = filterCategories.filter((c) =>
    c.label.toLowerCase().includes(sidebarSearch.trim().toLowerCase()),
  );

  const renderPanel = () => {
    switch (activeCategory) {
      case 'keyword':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Search size={18} style={{ color: '#1677ff' }} />
              <Typography.Text strong style={{ fontSize: 16 }}>
                {t('projects.keyword')}
              </Typography.Text>
            </div>
            <Input
              allowClear
              size="large"
              placeholder="Nhập từ khóa tìm kiếm..."
              prefix={<Search size={16} style={{ color: '#9ca3af' }} />}
              value={value.keyword ?? ''}
              onChange={(e) => onChange({ ...value, keyword: e.target.value || undefined })}
              style={{ borderRadius: 8, fontSize: 14 }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {t('projects.keywordPlaceholder')}
            </Typography.Text>
          </div>
        );

      case 'folder':
        return (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              height: '100%',
              minHeight: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FolderIcon size={18} style={{ color: '#1677ff' }} />
                <Typography.Text strong style={{ fontSize: 16 }}>
                  {t('projects.folder')}
                </Typography.Text>
              </div>
              {value.folderId?.trim() && (
                <Button
                  type="link"
                  size="small"
                  onClick={() => onChange({ ...value, folderId: undefined })}
                  style={{ padding: 0, fontSize: 12 }}
                >
                  {t('projects.clearFolder')}
                </Button>
              )}
            </div>

            <Input
              allowClear
              size="large"
              placeholder={t('projects.searchFolderPlaceholder')}
              prefix={<Search size={16} style={{ color: '#9ca3af' }} />}
              value={folderSearch}
              onChange={(e) => setFolderSearch(e.target.value)}
              style={{ borderRadius: 8, fontSize: 14 }}
            />

            <div
              style={{
                flex: 1,
                minHeight: 260,
                maxHeight: 300,
                overflowY: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: '8px 10px',
                background: '#fafafa',
              }}
            >
              {folders.isPending ? (
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
                  <span style={{ fontSize: 13 }}>{t('projects.loadingFolder')}</span>
                </div>
              ) : folderTree.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center' }}>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span style={{ color: '#6b7280', fontSize: 13 }}>
                        {folderSearch ? t('projects.noFolderFound') : t('projects.emptyFolder')}
                      </span>
                    }
                  />
                </div>
              ) : (
                <Tree
                  checkable
                  checkStrictly={false}
                  selectable={false}
                  treeData={folderTree}
                  checkedKeys={value.folderId ? [value.folderId] : []}
                  expandedKeys={expandedKeys}
                  autoExpandParent={autoExpandParent}
                  onExpand={(keys) => {
                    setExpandedKeys(keys);
                    setAutoExpandParent(false);
                  }}
                  onCheck={(checked) => {
                    const keys = Array.isArray(checked) ? checked : checked.checked;
                    const ids = (keys as string[]).map(String);
                    onChange({
                      ...value,
                      // folderIds: ids.length > 0 ? ids : undefined,
                      folderId: ids.length > 0 ? ids[0] : undefined,
                    });
                  }}
                  style={{ background: 'transparent', fontSize: 13.5 }}
                />
              )}
            </div>

            {/* <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography.Text type="secondary" style={{ fontSize: 12.5 }}>
                {(value.folderIds?.length ?? 0) > 0
                  ? `Đã chọn ${value.folderIds!.length} thư mục`
                  : 'Chọn các thư mục để lọc dự án'}
              </Typography.Text>
            </div> */}
          </div>
        );

      case 'category':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={18} style={{ color: '#1677ff' }} />
              <Typography.Text strong style={{ fontSize: 16 }}>
                {t('projects.category')}
              </Typography.Text>
            </div>
            <Select
              allowClear
              size="large"
              optionFilterProp="label"
              options={categories.data?.map((cat) => ({ value: cat.id, label: cat.name }))}
              placeholder={t('projects.categoryPlaceholder')}
              showSearch
              value={value.categoryId}
              onChange={(v) => onChange({ ...value, categoryId: v })}
              style={{ width: '100%', fontSize: 14 }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {t('projects.categoryDescription')}
            </Typography.Text>
          </div>
        );

      case 'tags':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TagIcon size={18} style={{ color: '#1677ff' }} />
              <Typography.Text strong style={{ fontSize: 16 }}>
                {t('projects.tags')}
              </Typography.Text>
            </div>
            <Select
              allowClear
              mode="multiple"
              size="large"
              optionFilterProp="label"
              options={tags.data?.map((tag) => ({ value: tag.id, label: tag.name }))}
              placeholder={t('projects.tagsFilterPlaceholder')}
              showSearch
              value={value.tagIds}
              onChange={(v) => onChange({ ...value, tagIds: v?.length ? v : undefined })}
              style={{ width: '100%' }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {t('projects.tagDescription')}
            </Typography.Text>
          </div>
        );

      case 'location':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={18} style={{ color: '#1677ff' }} />
              <Typography.Text strong style={{ fontSize: 16 }}>
                {t('projects.location')}
              </Typography.Text>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Typography.Text style={{ fontSize: 13.5, fontWeight: 500, color: '#374151' }}>
                {t('projects.country')}
              </Typography.Text>
              <Select
                allowClear
                size="large"
                optionFilterProp="label"
                options={countries.data?.map((c) => ({ value: c.id, label: c.name }))}
                placeholder={t('projects.countryPlaceholder')}
                showSearch
                value={value.countryId}
                onChange={(v) => onChange({ ...value, countryId: v, provinceId: undefined })}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Typography.Text style={{ fontSize: 13.5, fontWeight: 500, color: '#374151' }}>
                {t('projects.province')}
              </Typography.Text>
              <Select
                allowClear
                size="large"
                disabled={!countryId}
                loading={provinces.isPending}
                optionFilterProp="label"
                options={provinces.data?.items.map((p) => ({ value: p.id, label: p.name }))}
                placeholder={t('projects.provincePlaceholder')}
                showSearch
                value={value.provinceId}
                onChange={(v) => onChange({ ...value, provinceId: v })}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: 700, height: 480 }}>
      {/* Popover Main Body */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left Sidebar */}
        <div
          style={{
            width: 190,
            borderRight: '1px solid #f0f0f0',
            display: 'flex',
            flexDirection: 'column',
            padding: '12px 0',
            flexShrink: 0,
            background: '#fafafa',
          }}
        >
          {/* Sidebar Search */}
          <div style={{ padding: '0 12px 10px' }}>
            <Input
              allowClear
              placeholder={t('projects.searchPlaceholder')}
              prefix={<Search size={14} style={{ color: '#9ca3af' }} />}
              size="middle"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              style={{ borderRadius: 6, fontSize: 13 }}
            />
          </div>

          {/* Sidebar Category List */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
            {visibleCategories.map((cat) => {
              const isActive = activeCategory === cat.key;
              const filterCount = getCategoryFilterCount(cat.key, value);
              const hasFilter = filterCount > 0;

              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '11px 16px',
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

                  {/* Active indicator badge */}
                  {hasFilter && (
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
                        boxShadow: '0 1px 3px rgba(22, 119, 255, 0.3)',
                      }}
                    >
                      {filterCount > 1 ? filterCount : '✓'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content Panel */}
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

      {/* Footer Actions */}
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
          {t('projects.clearFilters')}
        </Button>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          {totalActiveFilters > 0
            ? t('projects.activeFiltersCount', { count: totalActiveFilters })
            : t('projects.noActiveFilters')}
        </Typography.Text>
      </div>
    </div>
  );
}

// ─── Public Component ────────────────────────────────────────────────────────
export function ProjectFilterPopover({
  value,
  onChange,
  onClear,
  activeCount = 0,
}: ProjectFilterPopoverProps) {
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
      content={<FilterContent value={value} onChange={onChange} onClear={onClear} />}
    >
      <Button
        icon={<FilterIcon size={15} />}
        style={{
          borderRadius: 8,
          fontWeight: 500,
          borderColor: activeCount > 0 ? '#1677ff' : undefined,
          color: activeCount > 0 ? '#1677ff' : undefined,
          background: activeCount > 0 ? '#e6f4ff' : undefined,
          height: 38,
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
