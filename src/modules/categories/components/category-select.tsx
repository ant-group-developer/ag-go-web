import type { SelectProps } from 'antd';
import { Button, Divider } from 'antd';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GO_PERMISSIONS } from '../../../shared/auth/permissions';
import { Select } from '../../../shared/components/select';
import { usePermissions } from '../../account/hooks/use-current-account';
import { useCategories } from '../hooks/use-categories';
import { CategoryFormModal } from './category-form-modal';

export interface CategorySelectProps extends Omit<SelectProps<string>, 'options' | 'mode'> {
  /** Whether the query to fetch categories is enabled. Defaults to true. */
  enabled?: boolean;
  /** Show a "create new" action in the dropdown (only for users with catalog permission). Defaults to true. */
  allowCreate?: boolean;
}

export function CategorySelect({
  enabled = true,
  allowCreate = true,
  allowClear = true,
  showSearch = true,
  placeholder,
  loading,
  onChange,
  onSearch,
  onOpenChange,
  ...selectProps
}: CategorySelectProps) {
  const { t } = useTranslation();
  const categories = useCategories(enabled);
  const { can } = usePermissions();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const canCreate = allowCreate && can(GO_PERMISSIONS.CATEGORY_CREATE);

  const options = useMemo(
    () =>
      (categories.data ?? []).map((category) => ({
        value: category.id,
        label: category.name,
      })),
    [categories.data],
  );

  const openCreate = () => {
    setOpen(false);
    setCreateOpen(true);
  };

  return (
    <>
      <Select<string>
        allowClear={allowClear}
        showSearch={showSearch}
        loading={loading ?? categories.isPending}
        placeholder={placeholder ?? t('projects.categoryPlaceholder')}
        options={options}
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          onOpenChange?.(nextOpen);
        }}
        onSearch={(value) => {
          setSearchValue(value);
          onSearch?.(value);
        }}
        onChange={onChange}
        popupRender={
          canCreate
            ? (menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '4px 0' }} />
                  <Button
                    type="text"
                    block
                    icon={<Plus size={14} />}
                    style={{ justifyContent: 'flex-start' }}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={openCreate}
                  >
                    {t('catalogs.createNewCategory')}
                  </Button>
                </>
              )
            : undefined
        }
        {...selectProps}
      />
      {canCreate ? (
        <CategoryFormModal
          open={createOpen}
          defaultName={searchValue}
          onClose={() => {
            setCreateOpen(false);
            setSearchValue('');
          }}
          onCreated={(category) =>
            onChange?.(category.id, { value: category.id, label: category.name })
          }
        />
      ) : null}
    </>
  );
}
