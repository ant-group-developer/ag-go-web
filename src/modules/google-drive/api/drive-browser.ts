/**
 * Direct Google Drive v3 calls from the browser for the folder browser, authorised with the
 * short-lived access token from `/google-drive/picker-token` (scope `drive.readonly`).
 */
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';

export const DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

/** Direct children scanned per folder for the contents summary (one Drive page). */
const CONTENTS_PAGE_SIZE = 1000;
const PREVIEW_LIMIT = 6;

const FILE_FIELDS = [
  'id',
  'name',
  'mimeType',
  'driveId',
  'parents',
  'createdTime',
  'modifiedTime',
  'shared',
  'webViewLink',
  'owners(displayName,emailAddress,photoLink)',
  'lastModifyingUser(displayName,emailAddress,photoLink)',
  'sharingUser(displayName,emailAddress,photoLink)',
].join(',');

export type DriveUser = {
  displayName?: string;
  emailAddress?: string;
  photoLink?: string;
};

export type DriveBrowserFolder = {
  id: string;
  name: string;
  mimeType: string;
  driveId?: string;
  parents?: string[];
  createdTime?: string;
  modifiedTime?: string;
  shared?: boolean;
  webViewLink?: string;
  owners?: DriveUser[];
  lastModifyingUser?: DriveUser;
  sharingUser?: DriveUser;
  /** Set for the root folder of a shared drive (listed from `drives.list`). */
  isSharedDrive?: boolean;
};

export type DriveMediaPreview = {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
};

export type DriveFolderContents = {
  folderCount: number;
  imageCount: number;
  videoCount: number;
  otherCount: number;
  /** Sum of the direct image/video children sizes. */
  mediaBytes: number;
  /** True when the folder has more direct children than one scanned page. */
  truncated: boolean;
  previews: DriveMediaPreview[];
};

export type DriveFolderPage = {
  folders: DriveBrowserFolder[];
  nextPageToken?: string;
};

export class DriveApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function driveGet<T>(
  token: string,
  path: string,
  params: Record<string, string | undefined>,
  signal?: AbortSignal,
): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      query.set(key, value);
    }
  }
  const response = await fetch(`${DRIVE_API_URL}/${path}?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new DriveApiError(
      body?.error?.message ?? `Google Drive API failed with ${response.status}`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

function quote(value: string) {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
}

export function getDriveFolder(token: string, folderId: string, signal?: AbortSignal) {
  return driveGet<DriveBrowserFolder>(
    token,
    `files/${encodeURIComponent(folderId)}`,
    { fields: FILE_FIELDS, supportsAllDrives: 'true' },
    signal,
  );
}

export type DriveFolderSort = 'name' | 'modified' | 'shared';

const ORDER_BY: Record<DriveFolderSort, string> = {
  name: 'name_natural',
  modified: 'modifiedTime desc',
  shared: 'sharedWithMeTime desc',
};

export type DriveFolderListInput = (
  | { kind: 'children'; parentId: string; driveId?: string }
  | { kind: 'shared-with-me' }
  | { kind: 'search'; text: string }
) & { sort: DriveFolderSort };

/** Lists folders only: children of a folder, folders shared with the user, or a name search. */
export async function listDriveFolders(
  token: string,
  input: DriveFolderListInput,
  pageToken?: string,
  signal?: AbortSignal,
): Promise<DriveFolderPage> {
  const conditions = [`mimeType = ${quote(DRIVE_FOLDER_MIME_TYPE)}`, 'trashed = false'];
  let corpora = 'user';
  let driveId: string | undefined;
  if (input.kind === 'children') {
    conditions.push(`${quote(input.parentId)} in parents`);
    if (input.driveId) {
      corpora = 'drive';
      driveId = input.driveId;
    }
  } else if (input.kind === 'shared-with-me') {
    conditions.push('sharedWithMe = true');
  } else {
    conditions.push(`name contains ${quote(input.text)}`);
    corpora = 'allDrives';
  }
  const page = await driveGet<{ nextPageToken?: string; files?: DriveBrowserFolder[] }>(
    token,
    'files',
    {
      q: conditions.join(' and '),
      fields: `nextPageToken,files(${FILE_FIELDS})`,
      // `sharedWithMeTime` only applies to the shared-with-me listing.
      orderBy:
        ORDER_BY[input.sort === 'shared' && input.kind !== 'shared-with-me' ? 'name' : input.sort],
      pageSize: '100',
      corpora,
      driveId,
      includeItemsFromAllDrives: 'true',
      supportsAllDrives: 'true',
      pageToken,
    },
    signal,
  );
  return { folders: page.files ?? [], nextPageToken: page.nextPageToken };
}

/** Lists the shared drives the user can access, shaped as browsable root folders. */
export async function listSharedDrives(
  token: string,
  pageToken?: string,
  signal?: AbortSignal,
): Promise<DriveFolderPage> {
  const page = await driveGet<{
    nextPageToken?: string;
    drives?: Array<{ id: string; name: string; createdTime?: string }>;
  }>(
    token,
    'drives',
    { pageSize: '100', fields: 'nextPageToken,drives(id,name,createdTime)', pageToken },
    signal,
  );
  return {
    folders: (page.drives ?? []).map((drive) => ({
      id: drive.id,
      name: drive.name,
      mimeType: DRIVE_FOLDER_MIME_TYPE,
      driveId: drive.id,
      createdTime: drive.createdTime,
      isSharedDrive: true,
    })),
    nextPageToken: page.nextPageToken,
  };
}

/** Counts the direct children of a folder by type and keeps a few media thumbnails. */
export async function getDriveFolderContents(
  token: string,
  folder: { id: string; driveId?: string },
  signal?: AbortSignal,
): Promise<DriveFolderContents> {
  const page = await driveGet<{
    nextPageToken?: string;
    files?: Array<DriveMediaPreview & { size?: string }>;
  }>(
    token,
    'files',
    {
      q: `${quote(folder.id)} in parents and trashed = false`,
      fields: 'nextPageToken,files(id,name,mimeType,size,thumbnailLink)',
      orderBy: 'modifiedTime desc',
      pageSize: String(CONTENTS_PAGE_SIZE),
      corpora: folder.driveId ? 'drive' : 'user',
      driveId: folder.driveId,
      includeItemsFromAllDrives: 'true',
      supportsAllDrives: 'true',
    },
    signal,
  );
  const contents: DriveFolderContents = {
    folderCount: 0,
    imageCount: 0,
    videoCount: 0,
    otherCount: 0,
    mediaBytes: 0,
    truncated: Boolean(page.nextPageToken),
    previews: [],
  };
  for (const file of page.files ?? []) {
    const isImage = file.mimeType.startsWith('image/');
    const isVideo = file.mimeType.startsWith('video/');
    if (file.mimeType === DRIVE_FOLDER_MIME_TYPE) {
      contents.folderCount += 1;
    } else if (isImage || isVideo) {
      if (isImage) {
        contents.imageCount += 1;
      } else {
        contents.videoCount += 1;
      }
      contents.mediaBytes += Number(file.size ?? 0) || 0;
      if (file.thumbnailLink && contents.previews.length < PREVIEW_LIMIT) {
        contents.previews.push({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          thumbnailLink: file.thumbnailLink,
        });
      }
    } else {
      contents.otherCount += 1;
    }
  }
  return contents;
}

export function driveFolderUrl(folderId: string) {
  return `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`;
}
