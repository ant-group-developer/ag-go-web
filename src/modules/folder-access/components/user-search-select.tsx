import { Spin, Typography } from 'antd';
import { useMemo, useState, type UIEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from '../../../shared/components/select';
import { useDebouncedValue } from '../../../shared/hooks/use-debounced-value';
import { ApiError } from '../../../shared/lib/api-client';
import { useUserSearch } from '../hooks/use-folder-access';
import type { AccountUserSummary } from '../types/account-user-summary.type';
import type { UserSearchSelectProps } from '../types/user-search-select-props.type';
import { UserCell } from './user-cell';

/** Load the next page when the list is scrolled within this many pixels of its end. */
const LOAD_MORE_THRESHOLD = 48;

export function UserSearchSelect({
  value,
  onChange,
  selectedUser,
  placeholder,
  style,
}: UserSearchSelectProps) {
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebouncedValue(keyword.trim());
  const search = useUserSearch(debouncedKeyword);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = search;

  const users = useMemo(() => {
    const seen = new Set<string>();
    const found: AccountUserSummary[] = [];
    for (const page of search.data?.pages ?? []) {
      for (const user of page.data) {
        if (!seen.has(user.id)) {
          seen.add(user.id);
          found.push(user);
        }
      }
    }
    if (selectedUser && !seen.has(selectedUser.id)) {
      return [selectedUser, ...found];
    }
    return found;
  }, [search.data, selectedUser]);
  const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const total = search.data?.pages[0]?.meta.total;

  const handlePopupScroll = (event: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (
      hasNextPage &&
      !isFetchingNextPage &&
      scrollHeight - scrollTop - clientHeight < LOAD_MORE_THRESHOLD
    ) {
      void fetchNextPage();
    }
  };

  const notFoundContent =
    search.isFetching && !isFetchingNextPage ? (
      <Spin size="small" />
    ) : search.isError ? (
      <Typography.Text type="danger">
        {search.error instanceof ApiError && search.error.status === 403
          ? t('folderAccess.userSearchForbidden')
          : search.error.message}
      </Typography.Text>
    ) : (
      t('folderAccess.userSearchEmpty')
    );

  return (
    <Select<string>
      showSearch
      allowClear
      value={value}
      style={{ minWidth: 280, ...style }}
      placeholder={placeholder ?? t('folderAccess.userSearchPlaceholder')}
      filterOption={false}
      searchValue={keyword}
      onSearch={setKeyword}
      onChange={(userId) => {
        const user: AccountUserSummary | undefined = userId ? userById.get(userId) : undefined;
        onChange?.(userId, user);
        setKeyword('');
      }}
      onPopupScroll={handlePopupScroll}
      notFoundContent={notFoundContent}
      loading={search.isFetching}
      options={users.map((user) => ({
        value: user.id,
        label: user.name || user.email || user.id,
      }))}
      optionRender={(option) => (
        <UserCell user={userById.get(option.value as string)} fallbackId={option.value as string} />
      )}
      popupRender={(menu) => (
        <>
          {menu}
          {users.length > 0 && (isFetchingNextPage || total !== undefined) ? (
            <div style={{ padding: '6px 12px', textAlign: 'center' }}>
              {isFetchingNextPage ? (
                <Spin size="small" />
              ) : (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {hasNextPage
                    ? t('folderAccess.userSearchLoaded', { count: users.length, total })
                    : t('folderAccess.userSearchAllLoaded', { total })}
                </Typography.Text>
              )}
            </div>
          ) : null}
        </>
      )}
    />
  );
}
