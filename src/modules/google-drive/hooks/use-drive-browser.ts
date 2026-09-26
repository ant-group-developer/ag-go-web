import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  DriveApiError,
  getDriveFolder,
  getDriveFolderContents,
  listDriveFolders,
  listSharedDrives,
  type DriveFolderListInput,
} from '../api/drive-browser';

export type DriveBrowserListInput = DriveFolderListInput | { kind: 'shared-drives' };

/** Keyed by access token so a refreshed token re-reads everything it failed on. */
export const driveBrowserKeys = {
  all: ['google-drive', 'browser'] as const,
  folder: (token: string, id: string) => [...driveBrowserKeys.all, token, 'folder', id] as const,
  list: (token: string, input: DriveBrowserListInput) =>
    [...driveBrowserKeys.all, token, 'list', input] as const,
  contents: (token: string, id: string) =>
    [...driveBrowserKeys.all, token, 'contents', id] as const,
};

/** Folder listings are cheap to re-read; keep them warm while the user moves back and forth. */
const STALE_TIME = 2 * 60 * 1000;

/** Client errors (expired token, missing access) will not succeed on retry. */
function retryDriveRequest(failureCount: number, error: Error) {
  if (error instanceof DriveApiError && error.status < 500 && error.status !== 429) {
    return false;
  }
  return failureCount < 2;
}

export function useDriveFolder(token: string | undefined, folderId: string | undefined) {
  return useQuery({
    queryKey: driveBrowserKeys.folder(token ?? '', folderId ?? ''),
    queryFn: ({ signal }) => getDriveFolder(token!, folderId!, signal),
    enabled: Boolean(token && folderId),
    staleTime: STALE_TIME,
    retry: retryDriveRequest,
  });
}

export function useDriveFolderList(token: string | undefined, input: DriveBrowserListInput) {
  return useInfiniteQuery({
    queryKey: driveBrowserKeys.list(token ?? '', input),
    queryFn: ({ pageParam, signal }) =>
      input.kind === 'shared-drives'
        ? listSharedDrives(token!, pageParam, signal)
        : listDriveFolders(token!, input, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextPageToken,
    enabled: Boolean(token),
    staleTime: STALE_TIME,
    retry: retryDriveRequest,
  });
}

export function useDriveFolderContents(
  token: string | undefined,
  folder: { id: string; driveId?: string } | undefined,
) {
  return useQuery({
    queryKey: driveBrowserKeys.contents(token ?? '', folder?.id ?? ''),
    queryFn: ({ signal }) => getDriveFolderContents(token!, folder!, signal),
    enabled: Boolean(token && folder),
    staleTime: STALE_TIME,
    retry: retryDriveRequest,
  });
}
