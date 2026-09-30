import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelDriveImport,
  createDriveImport,
  disconnectGoogleDrive,
  getAllImports,
  getDriveImport,
  getGoogleDriveConnection,
  getGoogleDrivePickerToken,
  getImportItems,
  getProjectImports,
  pauseDriveImport,
  resumeDriveImport,
  retryDriveImportItem,
  startGoogleDriveConnection,
  summarizeGoogleDriveSources,
  type ImportBatch,
  type ImportHistoryParams,
  type ImportItemsParams,
} from '../api/google-drive';
import { IMPORT_FINISHED_STATUSES } from '../utils/import-format';

const keys = {
  all: ['google-drive'] as const,
  connection: () => [...keys.all, 'connection'] as const,
  import: (id: string) => [...keys.all, 'import', id] as const,
  importItems: (id: string, params: ImportItemsParams) =>
    [...keys.import(id), 'items', params] as const,
  projectImports: (id: string) => [...keys.all, 'project-imports', id] as const,
  allImports: () => [...keys.all, 'all-imports'] as const,
  allImportsPage: (params: ImportHistoryParams) => [...keys.allImports(), params] as const,
};

export function useGoogleDriveConnection() {
  return useQuery({ queryKey: keys.connection(), queryFn: getGoogleDriveConnection });
}

export function useStartGoogleDriveConnection() {
  return useMutation({
    mutationFn: startGoogleDriveConnection,
    onSuccess: ({ authorizationUrl }) => {
      window.location.assign(authorizationUrl);
    },
  });
}

export function useGoogleDrivePickerToken(enabled = true) {
  return useQuery({
    queryKey: [...keys.connection(), 'picker-token'],
    queryFn: getGoogleDrivePickerToken,
    enabled,
    staleTime: 45 * 60 * 1000,
  });
}

export function useDisconnectGoogleDrive() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: disconnectGoogleDrive,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.connection() });
    },
  });
}

export function useSummarizeGoogleDriveSources() {
  return useMutation({
    mutationFn: summarizeGoogleDriveSources,
  });
}

export function useCreateDriveImport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createDriveImport,
    onSuccess: (batch) => {
      void client.invalidateQueries({ queryKey: keys.import(batch.id) });
      void client.invalidateQueries({ queryKey: keys.projectImports(batch.projectId) });
      void client.invalidateQueries({ queryKey: keys.allImports() });
    },
  });
}

export function useDriveImport(id: string) {
  return useQuery({
    queryKey: keys.import(id),
    queryFn: () => getDriveImport(id),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data && IMPORT_FINISHED_STATUSES.includes(query.state.data.status)
        ? false
        : 5_000,
  });
}

/**
 * One page of the files of a batch. Polls while `live` (the batch is still running, so files
 * change status and folder discovery may add more).
 */
export function useImportItems(batchId: string, params: ImportItemsParams, live: boolean) {
  return useQuery({
    queryKey: keys.importItems(batchId, params),
    queryFn: () => getImportItems(batchId, params),
    enabled: Boolean(batchId),
    // Keep the current rows on screen while the next page or filter loads.
    placeholderData: keepPreviousData,
    refetchInterval: live ? 5_000 : false,
  });
}

export function useProjectImports(projectId: string) {
  return useQuery({
    queryKey: keys.projectImports(projectId),
    queryFn: () => getProjectImports(projectId),
    enabled: Boolean(projectId),
    refetchInterval: (query) =>
      query.state.data?.some((batch) => !IMPORT_FINISHED_STATUSES.includes(batch.status))
        ? 5_000
        : false,
  });
}

/** One page of the Drive imports across projects. */
export function useAllImports(params: ImportHistoryParams, enabled = true) {
  return useQuery({
    queryKey: keys.allImportsPage(params),
    queryFn: () => getAllImports(params),
    enabled,
    // Keep the current rows on screen while the next page or filter loads.
    placeholderData: keepPreviousData,
    // Poll while any batch in scope (not only on this page) is still running.
    refetchInterval: (query) => ((query.state.data?.counts.active ?? 0) > 0 ? 5_000 : false),
  });
}

function useBatchMutation(mutationFn: (id: string) => Promise<ImportBatch>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (batch) => {
      void client.invalidateQueries({ queryKey: keys.import(batch.id) });
      void client.invalidateQueries({ queryKey: keys.projectImports(batch.projectId) });
      void client.invalidateQueries({ queryKey: keys.allImports() });
    },
  });
}

export function useCancelDriveImport() {
  return useBatchMutation(cancelDriveImport);
}

export function usePauseDriveImport() {
  return useBatchMutation(pauseDriveImport);
}

export function useResumeDriveImport() {
  return useBatchMutation(resumeDriveImport);
}

export function useRetryDriveImportItem() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, itemId }: { batchId: string; itemId: string }) =>
      retryDriveImportItem(batchId, itemId),
    onSuccess: (item) => {
      void client.invalidateQueries({ queryKey: [...keys.all, 'import', item.batchId] });
      void client.invalidateQueries({ queryKey: [...keys.all, 'project-imports'] });
      void client.invalidateQueries({ queryKey: keys.allImports() });
    },
  });
}
