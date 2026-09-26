import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  ExportOutlined,
  FolderFilled,
  FolderOpenFilled,
  FolderOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  PlayCircleFilled,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App as AntApp,
  Avatar,
  Breadcrumb,
  Button,
  Card,
  Empty,
  Flex,
  Input,
  Modal,
  Segmented,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  theme,
  Tooltip,
  Typography,
  type TableColumnsType,
} from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from '../../../shared/hooks/use-debounced-value';
import { formatDate } from '../../../shared/lib/format-date';
import { formatFileSize } from '../../../shared/lib/format-file-size';
import {
  DRIVE_FOLDER_MIME_TYPE,
  DriveApiError,
  driveFolderUrl,
  type DriveBrowserFolder,
  type DriveFolderContents,
  type DriveFolderSort,
  type DriveMediaPreview,
  type DriveUser,
} from '../api/drive-browser';
import {
  driveBrowserKeys,
  useDriveFolder,
  useDriveFolderContents,
  useDriveFolderList,
  type DriveBrowserListInput,
} from '../hooks/use-drive-browser';

export type DriveFolderSelection = {
  fileId: string;
  driveId?: string;
  name: string;
  mimeType: string;
  /** Known ancestor folder ids, used to avoid selecting a folder together with its subfolders. */
  ancestorIds?: string[];
  /** Human readable path of the parent, e.g. "My Drive / Events". */
  location?: string;
};

type DriveRoot = 'my-drive' | 'shared-with-me' | 'shared-drives';

type DriveFolderBrowserProps = {
  token?: string;
  /** Folders already chosen; they stay selected until the user removes them. */
  initialSelection: DriveFolderSelection[];
  onCancel: () => void;
  onConfirm: (folders: DriveFolderSelection[]) => void;
  /** Fetches a fresh access token after Google rejected the current one. */
  onTokenExpired: () => Promise<unknown>;
};

const SEARCH_DEBOUNCE_MS = 400;

export function DriveFolderBrowser({
  token,
  initialSelection,
  onCancel,
  onConfirm,
  onTokenExpired,
}: DriveFolderBrowserProps) {
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const { token: themeToken } = theme.useToken();
  const queryClient = useQueryClient();
  const [root, setRoot] = useState<DriveRoot>('shared-drives');
  const [sort, setSort] = useState<DriveFolderSort>('name');
  const [searchInput, setSearchInput] = useState('');
  const searchText = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS);
  const searching = searchText !== '';
  // The opened path belongs to one root/search; switching either starts again from the top.
  const viewKey = `${root}|${searchText}`;
  const [pathState, setPathState] = useState<{ key: string; path: DriveBrowserFolder[] }>({
    key: viewKey,
    path: [],
  });
  const path = pathState.key === viewKey ? pathState.path : [];
  const setPath = (next: DriveBrowserFolder[]) => setPathState({ key: viewKey, path: next });
  const [selection, setSelection] = useState(
    () => new Map(initialSelection.map((folder) => [folder.fileId, folder])),
  );

  const atMyDriveRoot = root === 'my-drive' && !searching && path.length === 0;
  const myDriveRoot = useDriveFolder(token, root === 'my-drive' ? 'root' : undefined);
  const openedFolder = path.at(-1);
  const currentFolder = openedFolder ?? (atMyDriveRoot ? myDriveRoot.data : undefined);
  const listInput: DriveBrowserListInput = openedFolder
    ? { kind: 'children', parentId: openedFolder.id, driveId: openedFolder.driveId, sort }
    : searching
      ? { kind: 'search', text: searchText, sort }
      : root === 'my-drive'
        ? { kind: 'children', parentId: 'root', sort }
        : root === 'shared-with-me'
          ? { kind: 'shared-with-me', sort }
          : { kind: 'shared-drives' };
  const list = useDriveFolderList(token, listInput);
  const folders = list.data?.pages.flatMap((page) => page.folders) ?? [];

  const error = list.error ?? (atMyDriveRoot ? myDriveRoot.error : null);
  const tokenRejected = error instanceof DriveApiError && error.status === 401;
  const retry = async () => {
    if (tokenRejected) {
      await onTokenExpired();
    }
    await queryClient.invalidateQueries({ queryKey: driveBrowserKeys.all });
  };

  const rootLabels: Record<DriveRoot, string> = {
    'my-drive': t('googleDrive.browser.myDrive'),
    'shared-with-me': t('googleDrive.browser.sharedWithMe'),
    'shared-drives': t('googleDrive.browser.sharedDrives'),
  };
  const baseLabel = searching
    ? t('googleDrive.browser.searchResults', { text: searchText })
    : rootLabels[root];
  const parentName = (folder: DriveBrowserFolder) => {
    const parentId = folder.parents?.[0];
    return parentId
      ? queryClient.getQueryData<DriveBrowserFolder>(driveBrowserKeys.folder(token ?? '', parentId))
          ?.name
      : undefined;
  };
  /** Ancestors of the folders listed in the current view (not including the opened folder). */
  const viewAncestors = () => {
    if (searching) {
      const first = path[0];
      return {
        ids: first?.parents ?? [],
        names: first ? [parentName(first) ?? '…'] : [],
      };
    }
    const rootFolder = root === 'my-drive' ? myDriveRoot.data : undefined;
    return {
      ids: rootFolder ? [rootFolder.id] : [],
      names: [rootLabels[root]],
    };
  };

  /** Builds the selection entry for a folder that sits at `depth` inside the opened path. */
  const describe = (folder: DriveBrowserFolder, depth: number): DriveFolderSelection => {
    const base = viewAncestors();
    const openedAncestors = path.slice(0, depth);
    const isSearchResult = searching && depth === 0;
    return {
      fileId: folder.id,
      driveId: folder.driveId,
      name: folder.name,
      mimeType: DRIVE_FOLDER_MIME_TYPE,
      ancestorIds: isSearchResult
        ? (folder.parents ?? [])
        : [...base.ids, ...openedAncestors.map((ancestor) => ancestor.id)],
      location: isSearchResult
        ? (parentName(folder) ?? '')
        : [...base.names, ...openedAncestors.map((ancestor) => ancestor.name)].join(' / '),
    };
  };

  /** The selected folder that already includes the given one (selecting a parent imports all subfolders). */
  const coveringFolder = (ancestorIds: string[] = []) =>
    ancestorIds.map((id) => selection.get(id)).find(Boolean);

  const select = (entry: DriveFolderSelection) => {
    const next = new Map(selection);
    let removed = 0;
    for (const [id, existing] of selection) {
      if (existing.ancestorIds?.includes(entry.fileId)) {
        next.delete(id);
        removed += 1;
      }
    }
    if (removed) {
      void message.info(t('googleDrive.browser.removedSubfolders', { count: removed }));
    }
    next.set(entry.fileId, entry);
    setSelection(next);
  };
  const unselect = (fileId: string) =>
    setSelection((current) => {
      const next = new Map(current);
      next.delete(fileId);
      return next;
    });
  const toggle = (entry: DriveFolderSelection, checked: boolean) =>
    checked ? select(entry) : unselect(entry.fileId);

  const changeRoot = (next: DriveRoot) => {
    setRoot(next);
    setSearchInput('');
    setSort(next === 'shared-with-me' ? 'shared' : sort === 'shared' ? 'name' : sort);
  };
  const openFolder = (folder: DriveBrowserFolder) => setPath([...path, folder]);

  const currentEntry = currentFolder ? describe(currentFolder, Math.max(path.length - 1, 0)) : null;
  // At the My Drive root the entry above would list the root as its own ancestor.
  if (currentEntry && atMyDriveRoot) {
    currentEntry.ancestorIds = [];
    currentEntry.location = '';
  }
  const currentCoveredBy = currentEntry ? coveringFolder(currentEntry.ancestorIds) : undefined;
  const rowAncestorIds = (folder: DriveBrowserFolder) =>
    describe(folder, path.length).ancestorIds ?? [];
  const rowsCoveredBy = currentFolder && (selection.get(currentFolder.id) ?? currentCoveredBy);

  const pending = searchInput.trim() !== searchText;
  const sortOptions = [
    ...(listInput.kind === 'shared-with-me'
      ? [{ value: 'shared' as const, label: t('googleDrive.browser.sortShared') }]
      : []),
    { value: 'name' as const, label: t('googleDrive.browser.sortName') },
    { value: 'modified' as const, label: t('googleDrive.browser.sortModified') },
  ];

  const columns: TableColumnsType<DriveBrowserFolder> = [
    {
      title: t('googleDrive.browser.name'),
      key: 'name',
      render: (_, folder) => (
        <Flex align="center" gap={10} style={{ minWidth: 0 }}>
          <FolderFilled
            style={{
              fontSize: 20,
              flexShrink: 0,
              color: folder.isSharedDrive ? themeToken.colorPrimary : themeToken.colorWarning,
            }}
          />
          <Flex vertical style={{ minWidth: 0 }}>
            <Space size={6} style={{ minWidth: 0 }}>
              <Typography.Text strong ellipsis={{ tooltip: folder.name }}>
                {folder.name}
              </Typography.Text>
              {folder.shared ? (
                <Tooltip title={t('googleDrive.browser.shared')}>
                  <TeamOutlined style={{ color: themeToken.colorTextTertiary }} />
                </Tooltip>
              ) : null}
            </Space>
            {searching && path.length === 0 ? (
              <ParentLocation token={token} folder={folder} />
            ) : null}
          </Flex>
        </Flex>
      ),
    },
    {
      title: (
        <Tooltip title={t('googleDrive.browser.directContentsHint')}>
          <Space size={4}>
            {t('googleDrive.browser.contents')}
            <InfoCircleOutlined />
          </Space>
        </Tooltip>
      ),
      key: 'contents',
      width: 250,
      render: (_, folder) => <FolderContentsCell token={token} folder={folder} />,
    },
    {
      title: t('googleDrive.browser.ownerAndModified'),
      key: 'owner',
      width: 200,
      render: (_, folder) => <OwnerCell folder={folder} />,
    },
    {
      key: 'actions',
      width: 76,
      align: 'right',
      render: (_, folder) => (
        <Space size={0} onClick={(event) => event.stopPropagation()}>
          <Tooltip title={t('googleDrive.browser.openInDrive')}>
            <Button
              type="text"
              size="small"
              icon={<ExportOutlined />}
              href={driveFolderUrl(folder.id)}
              target="_blank"
              rel="noreferrer"
            />
          </Tooltip>
          <Tooltip title={t('googleDrive.browser.openFolder')}>
            <Button
              type="text"
              size="small"
              icon={<RightOutlined />}
              onClick={() => openFolder(folder)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const emptyText =
    searching && path.length === 0 ? (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={t('googleDrive.browser.noSearchResults')}
      />
    ) : currentEntry ? (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={t('googleDrive.browser.noSubfolders')}
      >
        {!selection.has(currentEntry.fileId) && !currentCoveredBy ? (
          <Button type="primary" icon={<CheckOutlined />} onClick={() => select(currentEntry)}>
            {t('googleDrive.browser.selectCurrent')}
          </Button>
        ) : null}
      </Empty>
    ) : (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={t('googleDrive.browser.noFolders')}
      />
    );

  return (
    <Modal
      open
      title={t('googleDrive.browser.title')}
      width={1200}
      onCancel={onCancel}
      styles={{ body: { paddingTop: 8 } }}
      footer={
        <Flex justify="space-between" align="center" gap={12} wrap>
          <Typography.Text type="secondary" style={{ textAlign: 'start' }}>
            {t('googleDrive.browser.openHint')}
          </Typography.Text>
          <Space>
            <Button onClick={onCancel}>{t('common.cancel')}</Button>
            <Button
              type="primary"
              disabled={!selection.size}
              onClick={() => onConfirm([...selection.values()])}
            >
              {t('googleDrive.browser.confirm', { count: selection.size })}
            </Button>
          </Space>
        </Flex>
      }
    >
      <Flex vertical gap={12}>
        <Flex justify="space-between" align="center" gap={12} wrap>
          <Segmented<DriveRoot>
            value={root}
            onChange={changeRoot}
            options={[
              {
                value: 'shared-drives',
                label: rootLabels['shared-drives'],
                icon: <DatabaseOutlined />,
              },
              { value: 'my-drive', label: rootLabels['my-drive'], icon: <CloudServerOutlined /> },
              {
                value: 'shared-with-me',
                label: rootLabels['shared-with-me'],
                icon: <TeamOutlined />,
              },
            ]}
          />
          <Space wrap>
            <Input
              allowClear
              value={searchInput}
              placeholder={t('googleDrive.browser.searchPlaceholder')}
              prefix={<SearchOutlined style={{ color: themeToken.colorTextTertiary }} />}
              suffix={
                pending || (searching && list.isFetching) ? (
                  <LoadingOutlined style={{ color: themeToken.colorTextTertiary }} />
                ) : (
                  <span />
                )
              }
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && searchInput) {
                  event.stopPropagation();
                  setSearchInput('');
                }
              }}
              style={{ width: 300, maxWidth: '100%' }}
            />
            {listInput.kind !== 'shared-drives' ? (
              <Select<DriveFolderSort>
                value={sort}
                onChange={setSort}
                options={sortOptions}
                style={{ width: 170 }}
              />
            ) : null}
          </Space>
        </Flex>

        <Flex align="center" gap={8} style={{ minHeight: 32 }}>
          <Tooltip title={t('googleDrive.browser.back')}>
            <Button
              size="small"
              icon={<ArrowLeftOutlined />}
              disabled={!path.length}
              onClick={() => setPath(path.slice(0, -1))}
            />
          </Tooltip>
          <Breadcrumb
            items={[
              {
                title: path.length ? (
                  <Typography.Link onClick={() => setPath([])}>{baseLabel}</Typography.Link>
                ) : (
                  baseLabel
                ),
              },
              ...path.map((folder, index) => ({
                title:
                  index === path.length - 1 ? (
                    folder.name
                  ) : (
                    <Typography.Link onClick={() => setPath(path.slice(0, index + 1))}>
                      {folder.name}
                    </Typography.Link>
                  ),
              })),
            ]}
          />
        </Flex>

        {error ? (
          <Alert
            type="error"
            showIcon
            message={
              tokenRejected
                ? t('googleDrive.browser.tokenExpired')
                : t('googleDrive.browser.loadError')
            }
            description={tokenRejected ? undefined : error.message}
            action={
              <Button size="small" icon={<ReloadOutlined />} onClick={() => void retry()}>
                {t('common.retry')}
              </Button>
            }
          />
        ) : null}

        <Flex gap={16} align="stretch" wrap>
          <Flex vertical gap={12} style={{ flex: '1 1 600px', minWidth: 0 }}>
            {currentFolder && currentEntry ? (
              <CurrentFolderCard
                token={token}
                folder={currentFolder}
                selected={selection.has(currentFolder.id)}
                coveredBy={currentCoveredBy?.name}
                onToggle={() => toggle(currentEntry, !selection.has(currentFolder.id))}
              />
            ) : null}
            {rowsCoveredBy && folders.length ? (
              <Alert
                type="success"
                showIcon
                message={t('googleDrive.browser.subfoldersIncluded', { name: rowsCoveredBy.name })}
              />
            ) : null}
            <Table<DriveBrowserFolder>
              rowKey="id"
              size="middle"
              columns={columns}
              dataSource={folders}
              loading={list.isLoading}
              pagination={false}
              tableLayout="fixed"
              scroll={{ y: currentFolder ? 340 : 440 }}
              rowSelection={{
                columnWidth: 44,
                hideSelectAll: true,
                selectedRowKeys: folders
                  .filter(
                    (folder) => selection.has(folder.id) || coveringFolder(rowAncestorIds(folder)),
                  )
                  .map((folder) => folder.id),
                getCheckboxProps: (folder) => ({
                  disabled: Boolean(coveringFolder(rowAncestorIds(folder))),
                }),
                onSelect: (folder, checked) => toggle(describe(folder, path.length), checked),
                renderCell: (_checked, _folder, _index, node) => (
                  <div onClick={(event) => event.stopPropagation()}>{node}</div>
                ),
              }}
              onRow={(folder) => ({
                onClick: () => openFolder(folder),
                style: { cursor: 'pointer' },
              })}
              locale={{ emptyText }}
            />
            {list.hasNextPage ? (
              <Button
                block
                loading={list.isFetchingNextPage}
                onClick={() => void list.fetchNextPage()}
              >
                {t('googleDrive.browser.loadMore')}
              </Button>
            ) : null}
          </Flex>
          <SelectedFoldersPanel
            folders={[...selection.values()]}
            onRemove={unselect}
            onClear={() => setSelection(new Map())}
          />
        </Flex>
      </Flex>
    </Modal>
  );
}

function SelectedFoldersPanel({
  folders,
  onRemove,
  onClear,
}: {
  folders: DriveFolderSelection[];
  onRemove: (fileId: string) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const { token: themeToken } = theme.useToken();
  return (
    <Card
      size="small"
      title={t('googleDrive.browser.selectedTitle', { count: folders.length })}
      extra={
        folders.length ? (
          <Typography.Link type="danger" onClick={onClear}>
            {t('googleDrive.browser.clearSelection')}
          </Typography.Link>
        ) : null
      }
      style={{ flex: '0 1 300px', minWidth: 260 }}
      styles={{ body: { padding: folders.length ? 4 : 16, maxHeight: 520, overflowY: 'auto' } }}
    >
      {folders.length ? (
        <Flex vertical>
          {folders.map((folder) => (
            <Flex
              key={folder.fileId}
              align="center"
              gap={10}
              style={{ padding: '8px 8px', borderRadius: themeToken.borderRadius }}
            >
              <FolderFilled style={{ fontSize: 18, color: themeToken.colorWarning }} />
              <Flex vertical style={{ minWidth: 0, flex: 1 }}>
                <Typography.Text strong ellipsis={{ tooltip: folder.name }}>
                  {folder.name}
                </Typography.Text>
                {folder.location ? (
                  <Typography.Text
                    type="secondary"
                    ellipsis={{ tooltip: folder.location }}
                    style={{ fontSize: 12 }}
                  >
                    {folder.location}
                  </Typography.Text>
                ) : null}
              </Flex>
              <Tooltip title={t('googleDrive.browser.unselect')}>
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => onRemove(folder.fileId)}
                />
              </Tooltip>
            </Flex>
          ))}
        </Flex>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('googleDrive.browser.nothingSelected')}
        />
      )}
    </Card>
  );
}

function CurrentFolderCard({
  token,
  folder,
  selected,
  coveredBy,
  onToggle,
}: {
  token?: string;
  folder: DriveBrowserFolder;
  selected: boolean;
  /** Name of a selected ancestor that already includes this folder. */
  coveredBy?: string;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const { token: themeToken } = theme.useToken();
  const contents = useDriveFolderContents(token, folder);
  const owner = folder.owners?.[0];
  const active = selected || Boolean(coveredBy);
  return (
    <Card
      size="small"
      style={{
        background: active ? themeToken.colorPrimaryBg : themeToken.colorFillQuaternary,
        borderColor: active ? themeToken.colorPrimaryBorder : undefined,
      }}
    >
      <Flex justify="space-between" align="center" gap={16} wrap>
        <Flex gap={12} align="flex-start" style={{ minWidth: 0, flex: 1 }}>
          <FolderOpenFilled
            style={{
              fontSize: 36,
              color: folder.isSharedDrive ? themeToken.colorPrimary : themeToken.colorWarning,
            }}
          />
          <Flex vertical gap={6} style={{ minWidth: 0 }}>
            <Space size={8} wrap>
              <Typography.Text strong style={{ fontSize: 16 }}>
                {folder.name}
              </Typography.Text>
              <Typography.Link href={driveFolderUrl(folder.id)} target="_blank" rel="noreferrer">
                <ExportOutlined />
              </Typography.Link>
            </Space>
            <Space size={12} wrap>
              {owner ? (
                <UserLine user={owner} />
              ) : folder.driveId ? (
                <Tag color="blue">{t('googleDrive.browser.sharedDrive')}</Tag>
              ) : null}
              {folder.modifiedTime ? (
                <Typography.Text type="secondary">
                  {t('googleDrive.browser.modifiedAt', { date: formatDate(folder.modifiedTime) })}
                  {folder.lastModifyingUser?.displayName
                    ? ` · ${t('googleDrive.browser.modifiedBy', {
                        name: folder.lastModifyingUser.displayName,
                      })}`
                    : ''}
                </Typography.Text>
              ) : null}
            </Space>
            <ContentsSummary
              contents={contents.data}
              loading={contents.isLoading}
              failed={contents.isError}
            />
            {contents.data?.previews.length ? (
              <PreviewStrip previews={contents.data.previews} size={56} />
            ) : null}
          </Flex>
        </Flex>
        {coveredBy ? (
          <Tag icon={<CheckOutlined />} color="success" style={{ marginInlineEnd: 0 }}>
            {t('googleDrive.browser.includedIn', { name: coveredBy })}
          </Tag>
        ) : (
          <Button
            size="large"
            type={selected ? 'default' : 'primary'}
            icon={selected ? <CloseOutlined /> : <CheckOutlined />}
            onClick={onToggle}
          >
            {selected
              ? t('googleDrive.browser.unselectCurrent')
              : t('googleDrive.browser.selectCurrent')}
          </Button>
        )}
      </Flex>
    </Card>
  );
}

function ParentLocation({ token, folder }: { token?: string; folder: DriveBrowserFolder }) {
  const { t } = useTranslation();
  const parent = useDriveFolder(token, folder.parents?.[0]);
  if (!parent.data) {
    return null;
  }
  return (
    <Typography.Text type="secondary" ellipsis style={{ fontSize: 12 }}>
      {t('googleDrive.browser.inFolder', { name: parent.data.name })}
    </Typography.Text>
  );
}

function FolderContentsCell({ token, folder }: { token?: string; folder: DriveBrowserFolder }) {
  const contents = useDriveFolderContents(token, folder);
  return (
    <Flex vertical gap={4}>
      <ContentsSummary
        contents={contents.data}
        loading={contents.isLoading}
        failed={contents.isError}
      />
      {contents.data?.previews.length ? (
        <PreviewStrip previews={contents.data.previews.slice(0, 5)} size={28} />
      ) : null}
    </Flex>
  );
}

function ContentsSummary({
  contents,
  loading,
  failed,
}: {
  contents?: DriveFolderContents;
  loading: boolean;
  failed: boolean;
}) {
  const { t } = useTranslation();
  if (loading) {
    return <Skeleton.Input active size="small" style={{ width: 160 }} />;
  }
  if (failed || !contents) {
    return <Typography.Text type="secondary">-</Typography.Text>;
  }
  const { folderCount, imageCount, videoCount, otherCount, mediaBytes, truncated } = contents;
  if (!folderCount && !imageCount && !videoCount && !otherCount) {
    return (
      <Typography.Text type="secondary">{t('googleDrive.browser.emptyFolder')}</Typography.Text>
    );
  }
  return (
    <Space size={4} wrap>
      {folderCount ? (
        <Tag icon={<FolderOutlined />} style={{ marginInlineEnd: 0 }}>
          {t('googleDrive.folderCount', { count: folderCount })}
        </Tag>
      ) : null}
      {imageCount ? (
        <Tag color="blue" style={{ marginInlineEnd: 0 }}>
          {t('googleDrive.imageCount', { count: imageCount })}
        </Tag>
      ) : null}
      {videoCount ? (
        <Tag color="purple" style={{ marginInlineEnd: 0 }}>
          {t('googleDrive.videoCount', { count: videoCount })}
        </Tag>
      ) : null}
      {mediaBytes ? (
        <Typography.Text type="secondary">{formatFileSize(mediaBytes)}</Typography.Text>
      ) : null}
      {otherCount ? (
        <Typography.Text type="secondary">
          {t('googleDrive.browser.otherFiles', { count: otherCount })}
        </Typography.Text>
      ) : null}
      {truncated ? (
        <Tooltip title={t('googleDrive.browser.truncatedHint')}>
          <Tag style={{ marginInlineEnd: 0 }}>…</Tag>
        </Tooltip>
      ) : null}
    </Space>
  );
}

function PreviewStrip({ previews, size }: { previews: DriveMediaPreview[]; size: number }) {
  const { token: themeToken } = theme.useToken();
  return (
    <Flex gap={4}>
      {previews.map((preview) => (
        <Tooltip key={preview.id} title={preview.name}>
          <div
            style={{
              position: 'relative',
              width: size,
              height: size,
              flexShrink: 0,
              overflow: 'hidden',
              borderRadius: themeToken.borderRadiusSM,
              background: themeToken.colorFillSecondary,
            }}
          >
            <img
              src={preview.thumbnailLink}
              alt={preview.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {preview.mimeType.startsWith('video/') ? (
              <Flex
                align="center"
                justify="center"
                style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.25)' }}
              >
                <PlayCircleFilled style={{ color: '#fff', fontSize: Math.max(12, size / 3) }} />
              </Flex>
            ) : null}
          </div>
        </Tooltip>
      ))}
    </Flex>
  );
}

function UserLine({ user }: { user: DriveUser }) {
  const name = user.displayName ?? user.emailAddress ?? '-';
  return (
    <Tooltip title={user.emailAddress}>
      <Space size={6} style={{ minWidth: 0 }}>
        <Avatar
          size={20}
          src={
            user.photoLink ? (
              <img src={user.photoLink} alt={name} referrerPolicy="no-referrer" />
            ) : undefined
          }
        >
          {name.charAt(0).toUpperCase()}
        </Avatar>
        <Typography.Text ellipsis style={{ maxWidth: 150 }}>
          {name}
        </Typography.Text>
      </Space>
    </Tooltip>
  );
}

function OwnerCell({ folder }: { folder: DriveBrowserFolder }) {
  const { t } = useTranslation();
  const owner = folder.owners?.[0];
  const sharer = folder.sharingUser;
  const editor = folder.lastModifyingUser?.displayName;
  const date = folder.modifiedTime ?? folder.createdTime;
  return (
    <Flex vertical gap={2} style={{ minWidth: 0 }}>
      {owner ? (
        <UserLine user={owner} />
      ) : folder.driveId ? (
        // Items in shared drives are owned by the drive, not by a person.
        <Tag color="blue" style={{ alignSelf: 'flex-start' }}>
          {t('googleDrive.browser.sharedDrive')}
        </Tag>
      ) : null}
      {owner && sharer && sharer.emailAddress !== owner.emailAddress ? (
        <Typography.Text type="secondary" ellipsis style={{ fontSize: 12 }}>
          {t('googleDrive.browser.sharedBy', { name: sharer.displayName ?? sharer.emailAddress })}
        </Typography.Text>
      ) : null}
      {date ? (
        <Typography.Text
          type="secondary"
          ellipsis={{
            tooltip: editor ? t('googleDrive.browser.modifiedBy', { name: editor }) : undefined,
          }}
          style={{ fontSize: 12 }}
        >
          {t('googleDrive.browser.modifiedAt', { date: formatDate(date) })}
        </Typography.Text>
      ) : null}
    </Flex>
  );
}
