import { ProTable, type ProColumns } from '@ant-design/pro-components';
import { Alert, Button, Empty, Input, Space, Tag, Tooltip, Typography } from 'antd';
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SortDropdown } from '../../../shared/components/sort-dropdown';
import { useDebouncedValue } from '../../../shared/hooks/use-debounced-value';
import { formatDate } from '../../../shared/lib/format-date';
import { PAGE_TABLE_STICKY } from '../../../shared/lib/sticky-table-header';
import { useFolderAccessUsers } from '../hooks/use-folder-access';
import type { FolderAccessUserSummary } from '../types/folder-access-user-summary.type';
import type { FolderAccessUserSortField } from '../types/folder-access-users-params.type';
import type { FolderAccessUsersTableProps } from '../types/folder-access-users-table-props.type';
import { UserCell } from './user-cell';

const sortFields = ['user', 'folderCount', 'highestLevel', 'updatedAt'] as const;
const levelColors = { viewer: 'default', editor: 'blue', manager: 'gold' } as const;
const MAX_FOLDER_TAGS = 3;

const usersUrlParams = {
  q: parseAsString.withDefault(''),
  // Same default as the server: users by name, A → Z.
  sortBy: parseAsStringLiteral(sortFields).withDefault('user'),
  sortOrder: parseAsStringLiteral(['asc', 'desc'] as const).withDefault('asc'),
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(20),
};

export function FolderAccessUsersTable({ onOpenUser }: FolderAccessUsersTableProps) {
  const { t } = useTranslation();
  const [urlState, setUrlState] = useQueryStates(usersUrlParams, { history: 'replace' });
  const [keywordInput, setKeywordInput] = useState(urlState.q);
  const keyword = useDebouncedValue(keywordInput.trim());
  const { sortBy, sortOrder, page, pageSize } = urlState;

  useEffect(() => {
    if (keyword !== urlState.q) {
      void setUrlState({ q: keyword || null, page: null });
    }
  }, [keyword, urlState.q, setUrlState]);

  const users = useFolderAccessUsers({
    keyword: urlState.q || undefined,
    sortBy,
    sortOrder,
    page,
    limit: pageSize,
  });

  const sortFieldLabels: Record<FolderAccessUserSortField, string> = {
    user: t('folderAccess.user'),
    folderCount: t('folderAccess.folderCount'),
    highestLevel: t('folderAccess.highestLevel'),
    updatedAt: t('folderAccess.lastUpdatedAt'),
  };

  const columns: ProColumns<FolderAccessUserSummary>[] = [
    {
      title: t('folderAccess.user'),
      key: 'user',
      width: 280,
      ellipsis: true,
      render: (_, row) => <UserCell user={row.user} fallbackId={row.userId} />,
    },
    {
      title: t('folderAccess.folderCount'),
      key: 'folderCount',
      width: 130,
      render: (_, row) => row.folderCount,
    },
    {
      title: t('folderAccess.folders'),
      key: 'folders',
      render: (_, row) => {
        const hidden = row.folders.slice(MAX_FOLDER_TAGS);
        return (
          <Space size={[4, 4]} wrap>
            {row.folders.slice(0, MAX_FOLDER_TAGS).map((folder) => (
              <Tooltip
                key={folder.id}
                title={`${folder.pathText} · ${t(`folderAccess.levels.${folder.accessLevel}`)}`}
              >
                <Tag
                  color={levelColors[folder.accessLevel]}
                  style={{
                    marginInlineEnd: 0,
                    maxWidth: 240,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    verticalAlign: 'top',
                  }}
                >
                  {folder.pathText}
                </Tag>
              </Tooltip>
            ))}
            {hidden.length > 0 ? (
              <Tooltip
                title={
                  <Space direction="vertical" size={2}>
                    {hidden.map((folder) => (
                      <span key={folder.id}>
                        {folder.pathText} · {t(`folderAccess.levels.${folder.accessLevel}`)}
                      </span>
                    ))}
                  </Space>
                }
              >
                <Tag style={{ marginInlineEnd: 0 }}>+{hidden.length}</Tag>
              </Tooltip>
            ) : null}
          </Space>
        );
      },
    },
    {
      title: t('folderAccess.highestLevel'),
      key: 'highestLevel',
      width: 140,
      render: (_, row) => (
        <Tag color={levelColors[row.highestLevel]}>
          {t(`folderAccess.levels.${row.highestLevel}`)}
        </Tag>
      ),
    },
    {
      title: t('folderAccess.lastUpdatedAt'),
      key: 'updatedAt',
      width: 170,
      render: (_, row) => formatDate(row.lastUpdatedAt),
    },
    {
      title: t('folders.actions'),
      key: 'actions',
      width: 110,
      fixed: 'right',
      render: (_, row) => (
        <Button
          type="link"
          style={{ padding: 0 }}
          onClick={() => onOpenUser(row.userId, row.user ?? undefined)}
        >
          {t('folderAccess.viewDetails')}
        </Button>
      ),
    },
  ];

  if (users.isError) {
    return <Alert type="error" message={users.error.message} />;
  }

  return (
    <ProTable<FolderAccessUserSummary>
      rowKey="userId"
      sticky={PAGE_TABLE_STICKY}
      headerTitle={<Typography.Text strong>{t('folderAccess.usersWithAccess')}</Typography.Text>}
      dataSource={users.data?.data}
      loading={users.isFetching}
      search={false}
      options={{
        reload: () => void users.refetch(),
        density: false,
        setting: false,
        fullScreen: false,
      }}
      toolBarRender={() => [
        <Input.Search
          key="search"
          allowClear
          value={keywordInput}
          placeholder={t('folderAccess.userSearchPlaceholder')}
          onChange={(event) => setKeywordInput(event.target.value)}
          style={{ width: 280 }}
        />,
        <SortDropdown<FolderAccessUserSortField>
          key="sort"
          fields={sortFields.map((field) => ({ value: field, label: sortFieldLabels[field] }))}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onChange={(change) => void setUrlState({ ...change, page: null })}
        />,
      ]}
      onRow={(row) => ({
        onClick: (event) => {
          if (!(event.target as HTMLElement).closest('button, a')) {
            onOpenUser(row.userId, row.user ?? undefined);
          }
        },
        style: { cursor: 'pointer' },
      })}
      locale={{ emptyText: <Empty description={t('folderAccess.noUsersWithAccess')} /> }}
      pagination={{
        current: page,
        pageSize,
        total: users.data?.total ?? 0,
        showSizeChanger: true,
        showTotal: (total, range) =>
          t('common.paginationTotal', { start: range[0], end: range[1], total }),
      }}
      columns={columns}
      onChange={(pagination) => {
        void setUrlState({
          page: pagination.current ?? 1,
          pageSize: pagination.pageSize ?? 20,
        });
      }}
    />
  );
}
