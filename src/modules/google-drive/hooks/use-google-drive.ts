import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelDriveImport,
  createDriveImport,
  disconnectGoogleDrive,
  getAllImports,
  getDriveImport,
  getGoogleDriveConnection,
  getGoogleDrivePickerToken,
  getProjectImports,
  pauseDriveImport,
  resumeDriveImport,
  retryDriveImportItem,
  startGoogleDriveConnection,
  summarizeGoogleDriveSources,
  type ImportBatch,
} from '../api/google-drive';
import { IMPORT_FINISHED_STATUSES } from '../utils/import-format';

const keys = {
  all: ['google-drive'] as const,
  connection: () => [...keys.all, 'connection'] as const,
  import: (id: string) => [...keys.all, 'import', id] as const,
  projectImports: (id: string) => [...keys.all, 'project-imports', id] as const,
  allImports: () => [...keys.all, 'all-imports'] as const,
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

export function useAllImports(enabled = true) {
  return useQuery({
    queryKey: keys.allImports(),
    queryFn: getAllImports,
    enabled,
    refetchInterval: (query) =>
      query.state.data?.some((batch) => !IMPORT_FINISHED_STATUSES.includes(batch.status))
        ? 5_000
        : false,
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
