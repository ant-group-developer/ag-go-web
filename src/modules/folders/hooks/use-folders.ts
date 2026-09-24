import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFolder, deleteFolder, getFolders, updateFolder } from '../api/folders';
import type { UpdateFolderInput } from '../types/update-folder-input.type';
import { folderQueryKeys } from '../queries/folder-query-keys';

export function useFolders(enabled = true) {
  return useQuery({
    queryKey: folderQueryKeys.tree(),
    queryFn: getFolders,
    enabled,
    refetchOnWindowFocus: true,
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFolder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: folderQueryKeys.tree() }),
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFolderInput }) => updateFolder(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: folderQueryKeys.tree() }),
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFolder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: folderQueryKeys.tree() }),
  });
}
