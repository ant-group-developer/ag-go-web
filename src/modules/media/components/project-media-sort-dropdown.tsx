import type { ButtonProps } from 'antd';
import { useTranslation } from 'react-i18next';
import { SortDropdown } from '../../../shared/components/sort-dropdown';
import {
  PROJECT_MEDIA_SORT_FIELDS,
  type ProjectMediaSort,
  type ProjectMediaSortField,
} from '../utils/sort-project-media';

type ProjectMediaSortDropdownProps = {
  value: ProjectMediaSort;
  onChange: (value: ProjectMediaSort) => void;
  size?: ButtonProps['size'];
};

/** Sort button of a project file list (table or list view): name, created or modified date. */
export function ProjectMediaSortDropdown({ value, onChange, size }: ProjectMediaSortDropdownProps) {
  const { t } = useTranslation();
  const labels: Record<ProjectMediaSortField, string> = {
    name: t('media.filename'),
    createdAt: t('media.createdAt'),
    modifiedAt: t('media.modifiedAt'),
  };
  return (
    <SortDropdown<ProjectMediaSortField>
      size={size}
      fields={PROJECT_MEDIA_SORT_FIELDS.map((field) => ({ value: field, label: labels[field] }))}
      sortBy={value.sortBy}
      sortOrder={value.sortOrder}
      onChange={(change) => onChange({ ...value, ...change })}
    />
  );
}
