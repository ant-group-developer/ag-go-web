import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelDriveImport,
  createDriveImport,
  disconnectGoogleDrive,
  getDriveImport,
  getGoogleDriveConnection,
  getGoogleDrivePickerToken,
  retryDriveImportItem,
  startGoogleDriveConnection,
} from '../api/google-drive';

const keys = {
  all: ['google-drive'] as const,
  connection: () => [...keys.all, 'connection'] as const,
  import: (id: string) => [...keys.all, 'import', id] as const,
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

export function useCreateDriveImport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createDriveImport,
    onSuccess: (batch) => {
      void client.invalidateQueries({ queryKey: keys.import(batch.id) });
    },
  });
}

export function useDriveImport(id: string) {
  return useQuery({
    queryKey: keys.import(id),
    queryFn: () => getDriveImport(id),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data && ['completed', 'failed', 'cancelled'].includes(query.state.data.status)
        ? false
        : 5_000,
  });
}

export function useCancelDriveImport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: cancelDriveImport,
    onSuccess: (batch) => {
      void client.invalidateQueries({ queryKey: keys.import(batch.id) });
    },
  });
}

export function useRetryDriveImportItem() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, itemId }: { batchId: string; itemId: string }) =>
      retryDriveImportItem(batchId, itemId),
    onSuccess: (item) => {
      void client.invalidateQueries({ queryKey: [...keys.all, 'import', item.batchId] });
    },
  });
}
