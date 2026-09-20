import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFolder, getFolders } from '../api/folders';
import { folderQueryKeys } from '../queries/folder-query-keys';

export function useFolders(enabled = true) {
  return useQuery({
    queryKey: folderQueryKeys.tree(),
    queryFn: getFolders,
    enabled,
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFolder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: folderQueryKeys.tree() }),
  });
}
