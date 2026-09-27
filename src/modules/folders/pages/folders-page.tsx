import { PageContainer, ProTable, type ProColumns } from '@ant-design/pro-components';
import {
  Alert,
  App as AntApp,
  Avatar,
  Breadcrumb,
  Button,
  Empty,
  Flex,
  Popconfirm,
  Space,
  Tooltip,
  Typography,
} from 'antd';
import { Folder as FolderIcon, FolderPlus, Pencil, Shield, Trash2 } from 'lucide-react';
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SortDropdown } from '../../../shared/components/sort-dropdown';
import { sortRows, toTimestamp, type SortValue } from '../../../shared/lib/compare-sort-values';
import { formatDate } from '../../../shared/lib/format-date';
import { PAGE_TABLE_STICKY } from '../../../shared/lib/sticky-table-header';
import { FolderAccessDrawer } from '../../folder-access/components/folder-access-drawer';
import { CreateFolderModal } from '../components/create-folder-modal';
import { EditFolderModal } from '../components/edit-folder-modal';
import { useDeleteFolder, useFolders } from '../hooks/use-folders';
import type { Folder } from '../types/folder.type';

const sortFields = [
  'name',
  'childCount',
  'projectCount',
  'owner',
  'createdAt',
  'updatedAt',
] as const;
type FolderSortField = (typeof sortFields)[number];

const folderUrlParams = {
  parentId: parseAsString.withOptions({ history: 'push' }),
  sortBy: parseAsStringLiteral(sortFields).withDefault('name'),
  sortOrder: parseAsStringLiteral(['asc', 'desc'] as const).withDefault('asc'),
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(20),
};

const ownerName = (folder: Folder) =>
  folder.createdByUser?.name || folder.createdByUser?.email || '';

const sortValue = (folder: Folder, field: FolderSortField): SortValue => {
  switch (field) {
    case 'name':
      return folder.name;
    case 'owner':
      return ownerName(folder);
    case 'childCount':
      return folder.childCount ?? 0;
    case 'projectCount':
      return folder.projectCount ?? 0;
    case 'createdAt':
    case 'updatedAt':
      return toTimestamp(folder[field]);
  }
};

export function FoldersPage() {
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder>();
  const [accessFolderId, setAccessFolderId] = useState<string>();
  const deleteMutation = useDeleteFolder();
  const [urlState, setUrlState] = useQueryStates(folderUrlParams, { history: 'replace' });
  const folders = useFolders();

  const folderById = useMemo(
    () => new Map((folders.data ?? []).map((folder) => [folder.id, folder])),
    [folders.data],
  );
  const currentFolder = folderById.get(urlState.parentId ?? '');

  const { sortBy, sortOrder } = urlState;
  const rows = useMemo(() => {
    const levelFolders = (folders.data ?? []).filter((folder) =>
      currentFolder
        ? folder.parentId === currentFolder.id
        : !folder.parentId || !folderById.has(folder.parentId),
    );
    return sortRows(levelFolders, (folder) => sortValue(folder, sortBy), sortOrder);
  }, [folders.data, folderById, currentFolder, sortBy, sortOrder]);

  const sortFieldLabels: Record<FolderSortField, string> = {
    name: t('folders.name'),
    childCount: t('folders.childCount'),
    projectCount: t('folders.projectCount'),
    owner: t('folders.owner'),
    createdAt: t('folders.createdAt'),
    updatedAt: t('folders.updatedAt'),
  };

  const handleDelete = async (folder: Folder) => {
    try {
      await deleteMutation.mutateAsync(folder.id);
      void message.success(t('folders.deleteSuccess'));
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('folders.deleteFailed'));
    }
  };

  const currentPath = useMemo(
    () =>
      currentFolder
        ? (currentFolder.pathIds ?? [currentFolder.id]).filter((id) => folderById.has(id))
        : undefined,
    [currentFolder, folderById],
  );

  const openFolder = (folderId?: string) => {
    void setUrlState({ parentId: folderId ?? null, page: null });
  };

  const columns: ProColumns<Folder>[] = [
    {
      title: t('folders.name'),
      dataIndex: 'name',
      ellipsis: true,
      render: (_, folder) => (
        <Button
          type="link"
          icon={<FolderIcon size={16} />}
          style={{ padding: 0, maxWidth: '100%' }}
          title={folder.name}
          onClick={() => openFolder(folder.id)}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{folder.name}</span>
        </Button>
      ),
    },
    { title: t('folders.childCount'), width: 160, dataIndex: 'childCount' },
    { title: t('folders.projectCount'), width: 160, dataIndex: 'projectCount' },
    {
      title: t('folders.owner'),
      key: 'owner',
      width: 220,
      ellipsis: true,
      render: (_, folder) => (
        <Flex align="center" gap={6} style={{ minWidth: 0 }}>
          <Avatar size={18} src={folder.createdByUser?.avatar} style={{ flexShrink: 0 }}>
            {folder.createdByUser?.name?.charAt(0)?.toUpperCase()}
          </Avatar>
          <Typography.Text ellipsis={{ tooltip: ownerName(folder) }}>
            {ownerName(folder) || t('common.unknown')}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: t('folders.createdAt'),
      dataIndex: 'createdAt',
      width: 170,
      render: (_, folder) => formatDate(folder.createdAt),
    },
    {
      title: t('folders.updatedAt'),
      dataIndex: 'updatedAt',
      width: 170,
      render: (_, folder) => formatDate(folder.updatedAt),
    },
    {
      title: t('folders.actions'),
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, folder) => {
        const isEmpty = !folder.childCount && !folder.projectCount;
        const level = folder.myAccessLevel ?? 'viewer';
        const isManager = level === 'manager';
        return (
          <Space size={0}>
            {isManager ? (
              <Tooltip title={t('folderAccess.manage')}>
                <Button
                  aria-label={t('folderAccess.manage')}
                  icon={<Shield size={16} />}
                  type="text"
                  onClick={() => setAccessFolderId(folder.id)}
                />
              </Tooltip>
            ) : null}
            {level !== 'viewer' ? (
              <Tooltip title={t('folders.edit')}>
                <Button
                  aria-label={t('folders.edit')}
                  icon={<Pencil size={16} />}
                  type="text"
                  onClick={() => setEditingFolder(folder)}
                />
              </Tooltip>
            ) : null}
            {isManager ? (
              <Popconfirm
                title={t('folders.deleteConfirm', { name: folder.name })}
                okText={t('common.delete')}
                cancelText={t('common.cancel')}
                okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
                disabled={!isEmpty}
                onConfirm={() => handleDelete(folder)}
              >
                <Tooltip title={isEmpty ? t('folders.delete') : t('folders.deleteNotEmpty')}>
                  <Button
                    aria-label={t('folders.delete')}
                    danger
                    disabled={!isEmpty}
                    icon={<Trash2 size={16} />}
                    loading={deleteMutation.isPending && deleteMutation.variables === folder.id}
                    type="text"
                  />
                </Tooltip>
              </Popconfirm>
            ) : null}
          </Space>
        );
      },
    },
  ];

  if (folders.isError) {
    return (
      <PageContainer title={t('folders.title')}>
        <Alert type="error" message={folders.error.message} />
      </PageContainer>
    );
  }

  return (
    <>
      <PageContainer
        title={t('folders.title')}
        extra={[
          <Button
            key="create"
            type="primary"
            icon={<FolderPlus size={16} />}
            onClick={() => setCreateOpen(true)}
          >
            {t('folders.create')}
          </Button>,
        ]}
      >
        <ProTable<Folder>
          rowKey="id"
          headerTitle={
            <Breadcrumb
              items={[
                {
                  title: currentFolder ? <a>{t('folders.root')}</a> : t('folders.root'),
                  onClick: currentFolder ? () => openFolder() : undefined,
                },
                ...(currentPath ?? []).map((id) => {
                  const isCurrent = id === currentFolder?.id;
                  const name = folderById.get(id)?.name;
                  return {
                    key: id,
                    title: isCurrent ? name : <a>{name}</a>,
                    onClick: isCurrent ? undefined : () => openFolder(id),
                  };
                }),
              ]}
            />
          }
          dataSource={rows}
          loading={folders.isFetching}
          search={false}
          options={{
            reload: () => void folders.refetch(),
            density: false,
            setting: false,
            fullScreen: false,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={currentFolder ? t('folders.emptyChildren') : t('folders.empty')}
              />
            ),
          }}
          pagination={{
            current: urlState.page,
            pageSize: urlState.pageSize,
            showTotal: (total, range) =>
              t('common.paginationTotal', {
                start: range[0],
                end: range[1],
                total,
              }),
          }}
          columns={columns}
          sticky={PAGE_TABLE_STICKY}
          toolBarRender={() => [
            <SortDropdown<FolderSortField>
              key="sort"
              fields={sortFields.map((field) => ({ value: field, label: sortFieldLabels[field] }))}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onChange={(change) => void setUrlState({ ...change, page: null })}
            />,
          ]}
          onChange={(pagination) => {
            void setUrlState({
              page: pagination.current ?? 1,
              pageSize: pagination.pageSize ?? 20,
            });
          }}
        />
      </PageContainer>
      <CreateFolderModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultParentPath={currentPath}
      />
      <EditFolderModal folder={editingFolder} onClose={() => setEditingFolder(undefined)} />
      <FolderAccessDrawer
        folderId={accessFolderId}
        onClose={() => setAccessFolderId(undefined)}
        onOpenFolder={setAccessFolderId}
      />
    </>
  );
}
