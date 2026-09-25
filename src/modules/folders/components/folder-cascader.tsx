import type { CascaderProps } from 'antd';
import { Button, Cascader, Divider } from 'antd';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GO_PERMISSIONS } from '../../../shared/auth/permissions';
import { cascaderSearchFilter } from '../../../shared/lib/select-search';
import { usePermissions } from '../../account/hooks/use-current-account';
import { useFolders } from '../hooks/use-folders';
import type { FolderCascaderOption } from '../types/folder-cascader-option.type';
import type { Folder } from '../types/folder.type';
import { buildFolderCascaderOptions } from '../utils/build-folder-cascader-options';
import { CreateFolderModal } from './create-folder-modal';

export interface FolderCascaderProps extends Omit<
  CascaderProps<FolderCascaderOption, 'value', false>,
  'options' | 'multiple' | 'value' | 'onChange'
> {
  /** Folder path ids, from root to the selected folder. */
  value?: string[];
  onChange?: (value: string[] | undefined) => void;
  /** Whether the query to fetch folders is enabled. Defaults to true. */
  enabled?: boolean;
  /** Show a "create new" action in the dropdown (only for users with folder permission). Defaults to true. */
  allowCreate?: boolean;
  /** Only folders matching this predicate are selectable. */
  filterFolders?: (folder: Folder) => boolean;
}

export function FolderCascader({
  value,
  onChange,
  enabled = true,
  allowCreate = true,
  filterFolders,
  showSearch = true,
  placeholder,
  onOpenChange,
  ...cascaderProps
}: FolderCascaderProps) {
  const { t } = useTranslation();
  const folders = useFolders(enabled);
  const { can } = usePermissions();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const canCreate = allowCreate && can(GO_PERMISSIONS.FOLDER_MANAGE);

  const options = useMemo(() => {
    const items = folders.data ?? [];
    return buildFolderCascaderOptions(filterFolders ? items.filter(filterFolders) : items);
  }, [folders.data, filterFolders]);

  const openCreate = () => {
    setOpen(false);
    setCreateOpen(true);
  };

  return (
    <>
      <Cascader<FolderCascaderOption, 'value'>
        options={options}
        value={value}
        onChange={(nextValue) => onChange?.(nextValue as string[] | undefined)}
        showSearch={
          showSearch
            ? {
                filter: cascaderSearchFilter,
                ...(typeof showSearch === 'object' ? showSearch : {}),
              }
            : false
        }
        placeholder={placeholder ?? t('projects.folderPlaceholder')}
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          onOpenChange?.(nextOpen);
        }}
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
                    {t('folders.createNew')}
                  </Button>
                </>
              )
            : undefined
        }
        {...cascaderProps}
      />
      {canCreate ? (
        <CreateFolderModal
          open={createOpen}
          defaultParentPath={value}
          onClose={() => setCreateOpen(false)}
          onCreated={(folder) => onChange?.(folder.pathIds ?? [folder.id])}
        />
      ) : null}
    </>
  );
}
