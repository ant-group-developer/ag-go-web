import { Button, Cascader, Input, Popover, Select, Typography } from 'antd';
import { Filter, Folder, MapPin, Search, Tag as TagIcon, ToggleLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCategories } from '../../categories/hooks/use-categories';
import { useCountries } from '../../countries/hooks/use-countries';
import { useFolders } from '../../folders/hooks/use-folders';
import { buildFolderCascaderOptions } from '../../folders/utils/build-folder-cascader-options';
import { useProvinces } from '../../provinces/hooks/use-provinces';
import { useTags } from '../../tags/hooks/use-tags';

export type ProjectFilterValues = {
  keyword?: string;
  folderPath?: string[];
  countryId?: string;
  provinceId?: string;
  categoryId?: string;
  tagIds?: string[];
};

type FilterCategory = 'keyword' | 'folder' | 'status' | 'location' | 'tags';

interface ProjectFilterPopoverProps {
  value: ProjectFilterValues;
  onChange: (values: ProjectFilterValues) => void;
  onClear: () => void;
  activeCount?: number;
}

const filterCategories: Array<{
  key: FilterCategory;
  icon: React.ReactNode;
  label: string;
}> = [
  { key: 'keyword', icon: <Search size={15} />, label: 'Từ khóa' },
  { key: 'folder', icon: <Folder size={15} />, label: 'Thư mục' },
  { key: 'status', icon: <ToggleLeft size={15} />, label: 'Danh mục' },
  { key: 'tags', icon: <TagIcon size={15} />, label: 'Tags' },
  { key: 'location', icon: <MapPin size={15} />, label: 'Địa điểm' },
];

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
  const [searchSidebar, setSearchSidebar] = useState('');
  const countryId = value.countryId;

  const folders = useFolders();
  const countries = useCountries();
  const tags = useTags();
  const provinces = useProvinces({ page: 1, pageSize: 100, countryId }, Boolean(countryId));
  const categories = useCategories();

  const folderOptions = buildFolderCascaderOptions(folders.data ?? []);

  const activeCount = [
    value.keyword,
    value.folderPath?.length,
    value.countryId || value.provinceId,
    value.categoryId,
    value.tagIds?.length,
  ].filter(Boolean).length;

  const visibleCategories = filterCategories.filter((c) =>
    c.label.toLowerCase().includes(searchSidebar.toLowerCase()),
  );

  const renderPanel = () => {
    switch (activeCategory) {
      case 'keyword':
        return (
          <div>
            <Typography.Text strong style={{ display: 'block', marginBottom: 12 }}>
              Từ khóa
            </Typography.Text>
            <Input
              allowClear
              placeholder="Nhập từ khóa tìm kiếm..."
              prefix={<Search size={14} style={{ color: '#bfbfbf' }} />}
              value={value.keyword ?? ''}
              onChange={(e) => onChange({ ...value, keyword: e.target.value || undefined })}
              style={{ borderRadius: 8 }}
            />
          </div>
        );

      case 'folder':
        return (
          <div>
            <Typography.Text strong style={{ display: 'block', marginBottom: 12 }}>
              Thư mục
            </Typography.Text>
            <Cascader
              allowClear
              changeOnSelect
              options={folderOptions}
              placeholder={t('projects.folderFilterPlaceholder')}
              showSearch
              value={value.folderPath}
              onChange={(v) => onChange({ ...value, folderPath: v as string[] | undefined })}
              style={{ width: '100%' }}
            />
          </div>
        );

      case 'status':
        return (
          <div>
            <Typography.Text strong style={{ display: 'block', marginBottom: 12 }}>
              Hiển thị
            </Typography.Text>
            <Select
              allowClear
              optionFilterProp="label"
              options={categories.data?.map((cat) => ({ value: cat.id, label: cat.name }))}
              placeholder={t('projects.categoryPlaceholder')}
              showSearch
              value={value.categoryId}
              onChange={(v) => onChange({ ...value, categoryId: v })}
              style={{ width: '100%' }}
            />
          </div>
        );

      case 'tags':
        return (
          <div>
            <Typography.Text strong style={{ display: 'block', marginBottom: 12 }}>
              Trạng thái
            </Typography.Text>
            <Select
              allowClear
              mode="multiple"
              optionFilterProp="label"
              options={tags.data?.map((tag) => ({ value: tag.id, label: tag.name }))}
              placeholder={t('projects.tagsFilterPlaceholder')}
              showSearch
              value={value.tagIds}
              onChange={(v) => onChange({ ...value, tagIds: v?.length ? v : undefined })}
              style={{ width: '100%' }}
            />
          </div>
        );

      case 'location':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Typography.Text strong style={{ display: 'block' }}>
              Địa điểm
            </Typography.Text>
            <div>
              <Typography.Text
                type="secondary"
                style={{ fontSize: 12, display: 'block', marginBottom: 6 }}
              >
                Quốc gia
              </Typography.Text>
              <Select
                allowClear
                optionFilterProp="label"
                options={countries.data?.map((c) => ({ value: c.id, label: c.name }))}
                placeholder={t('projects.countryPlaceholder')}
                showSearch
                value={value.countryId}
                onChange={(v) => onChange({ ...value, countryId: v, provinceId: undefined })}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <Typography.Text
                type="secondary"
                style={{ fontSize: 12, display: 'block', marginBottom: 6 }}
              >
                Tỉnh/Thành phố
              </Typography.Text>
              <Select
                allowClear
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
    <div style={{ display: 'flex', flexDirection: 'column', width: 480, height: 320 }}>
      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div
          style={{
            width: 140,
            borderRight: '1px solid #f0f0f0',
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            padding: '8px 0',
            flexShrink: 0,
          }}
        >
          <div style={{ padding: '0 8px 8px' }}>
            <Input
              placeholder="Tìm kiếm..."
              prefix={<Search size={13} style={{ color: '#bfbfbf' }} />}
              size="small"
              value={searchSidebar}
              onChange={(e) => setSearchSidebar(e.target.value)}
              style={{ borderRadius: 6, fontSize: 12 }}
            />
          </div>
          {visibleCategories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                fontSize: 13,
                fontWeight: activeCategory === cat.key ? 600 : 400,
                color: activeCategory === cat.key ? '#1677ff' : '#333',
                background: activeCategory === cat.key ? '#e6f4ff' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                transition: 'background 0.15s',
                borderRadius: 0,
              }}
            >
              <span style={{ opacity: 0.7, display: 'flex', alignItems: 'center' }}>
                {cat.icon}
              </span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div style={{ flex: 1, padding: '16px', overflow: 'auto' }}>{renderPanel()}</div>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: '1px solid #f0f0f0',
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Button type="link" danger size="small" onClick={onClear} style={{ padding: 0 }}>
          Xóa bộ lọc
        </Button>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {activeCount > 0 ? `${activeCount} bộ lọc đang áp dụng` : 'Chưa áp dụng bộ lọc nào'}
        </Typography.Text>
      </div>
    </div>
  );
}

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
      styles={{ body: { padding: 0, borderRadius: 12, overflow: 'hidden' } }}
      content={<FilterContent value={value} onChange={onChange} onClear={onClear} />}
    >
      <Button
        icon={<Filter size={14} />}
        style={{
          borderRadius: 8,
          fontWeight: 500,
          borderColor: activeCount > 0 ? '#1677ff' : undefined,
          color: activeCount > 0 ? '#1677ff' : undefined,
        }}
      >
        Bộ lọc{activeCount > 0 ? ` (${activeCount})` : ''}
      </Button>
    </Popover>
  );
}
