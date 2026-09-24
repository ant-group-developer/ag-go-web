import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { folderQueryKeys } from '../../folders/queries/folder-query-keys';
import {
  getFolderAccessUsers,
  getFolderGrants,
  getUserGrants,
  removeFolderGrant,
  searchUsers,
  setFolderGrant,
} from '../api/folder-access';
import { folderAccessQueryKeys } from '../queries/folder-access-query-keys';
import type { FolderAccessUsersParams } from '../types/folder-access-users-params.type';

export function useUserSearch(keyword: string) {
  return useInfiniteQuery({
    queryKey: folderAccessQueryKeys.userSearch(keyword),
    queryFn: ({ pageParam }) => searchUsers(keyword, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    retry: false,
  });
}

export function useFolderAccessUsers(params: FolderAccessUsersParams) {
  return useQuery({
    queryKey: folderAccessQueryKeys.users(params),
    queryFn: () => getFolderAccessUsers(params),
    placeholderData: keepPreviousData,
  });
}

export function useFolderGrants(folderId?: string) {
  return useQuery({
    queryKey: folderAccessQueryKeys.folder(folderId ?? ''),
    queryFn: () => getFolderGrants(folderId!),
    enabled: Boolean(folderId),
  });
}

export function useUserGrants(userId?: string) {
  return useQuery({
    queryKey: folderAccessQueryKeys.user(userId ?? ''),
    queryFn: () => getUserGrants(userId!),
    enabled: Boolean(userId),
  });
}

function useInvalidateAccess() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: folderAccessQueryKeys.all() }),
      queryClient.invalidateQueries({ queryKey: folderQueryKeys.tree() }),
    ]);
}

export function useSetFolderGrant() {
  const invalidate = useInvalidateAccess();
  return useMutation({ mutationFn: setFolderGrant, onSuccess: invalidate });
}

export function useRemoveFolderGrant() {
  const invalidate = useInvalidateAccess();
  return useMutation({
    mutationFn: ({ folderId, principalId }: { folderId: string; principalId: string }) =>
      removeFolderGrant(folderId, principalId),
    onSuccess: invalidate,
  });
}
