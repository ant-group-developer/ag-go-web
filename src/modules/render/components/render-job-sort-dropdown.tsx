import { useTranslation } from 'react-i18next';
import { SortDropdown } from '../../../shared/components/sort-dropdown';
import type { RenderJobSort, RenderJobSortField } from '../api/render';
import { RENDER_JOB_SORT_FIELDS } from '../utils/render-job-sort';

type RenderJobSortDropdownProps = {
  value: RenderJobSort;
  onChange: (value: RenderJobSort) => void;
};

/** Sort button of a render job table: queued time, processing start or processing duration. */
export function RenderJobSortDropdown({ value, onChange }: RenderJobSortDropdownProps) {
  const { t } = useTranslation();
  const labels: Record<RenderJobSortField, string> = {
    createdAt: t('render.createdAt'),
    startedAt: t('render.processedAt'),
    elapsed: t('render.elapsed'),
  };
  return (
    <SortDropdown<RenderJobSortField>
      fields={RENDER_JOB_SORT_FIELDS.map((field) => ({ value: field, label: labels[field] }))}
      sortBy={value.sortBy}
      sortOrder={value.sortOrder}
      onChange={(change) => onChange({ ...value, ...change })}
    />
  );
}
