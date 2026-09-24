import { DrivePicker, DrivePickerDocsView } from '@googleworkspace/drive-picker-react';
import { Alert, Button, Card, List, Progress, Space, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import {
  useCancelDriveImport,
  useCreateDriveImport,
  useDisconnectGoogleDrive,
  useDriveImport,
  useGoogleDriveConnection,
  useGoogleDrivePickerToken,
  useRetryDriveImportItem,
  useStartGoogleDriveConnection,
  useSummarizeGoogleDriveSources,
} from '../hooks/use-google-drive';

type PickedSource = {
  fileId: string;
  driveId?: string;
  name?: string;
  mimeType?: string;
};

type PickerDocument = {
  id: string;
  driveId?: string;
  name?: string;
  mimeType?: string;
};

type PickerEvent = { detail?: { docs?: PickerDocument[] } };
type PickerMode = 'files' | 'folders';

export function ProjectGoogleDriveImportPanel({ projectId }: { projectId: string }) {
  const [selected, setSelected] = useState<PickedSource[]>([]);
  const connection = useGoogleDriveConnection();
  const pickerToken = useGoogleDrivePickerToken(
    connection.data?.status === 'active' &&
      connection.data.scopes.some((scope) =>
        scope.includes('https://www.googleapis.com/auth/drive.readonly'),
      ),
  );
  const start = useStartGoogleDriveConnection();
  const disconnect = useDisconnectGoogleDrive();
  const createImport = useCreateDriveImport();
  const cancelImport = useCancelDriveImport();
  const retryItem = useRetryDriveImportItem();
  const summarizeSources = useSummarizeGoogleDriveSources();
  const [batchId, setBatchId] = useState<string>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>('files');
  const [pickerError, setPickerError] = useState<string>();
  const batch = useDriveImport(batchId ?? '');
  const selectedCounts = useMemo(
    () =>
      selected.reduce(
        (counts, source) => {
          if (source.mimeType === 'application/vnd.google-apps.folder') {
            counts.folderCount += 1;
          } else if (source.mimeType?.startsWith('video/')) {
            counts.videoCount += 1;
          } else if (source.mimeType?.startsWith('image/')) {
            counts.imageCount += 1;
          }
          return counts;
        },
        { imageCount: 0, videoCount: 0, folderCount: 0 },
      ),
    [selected],
  );

  const openPicker = (mode: PickerMode) => {
    if (pickerToken.data?.accessToken && connection.data?.status === 'active') {
      setPickerError(undefined);
      setPickerMode(mode);
      setPickerOpen(true);
    }
  };

  const hasPickerScope = Boolean(
    connection.data?.scopes.some((scope) =>
      scope.includes('https://www.googleapis.com/auth/drive.readonly'),
    ),
  );
  const isConnected = connection.data?.status === 'active' && hasPickerScope;

  return (
    <Card
      title="Google Drive import"
      extra={
        connection.data?.status === 'active' ? (
          <Button danger size="small" onClick={() => disconnect.mutate()}>
            Ngắt kết nối
          </Button>
        ) : null
      }
    >
      {!isConnected ? (
        <Button
          type="primary"
          loading={start.isPending}
          onClick={() =>
            start.mutate({
              projectId,
              returnUrl: `${window.location.pathname}${window.location.search}${window.location.hash}`,
            })
          }
        >
          {connection.data ? 'Kết nối lại Google Drive' : 'Kết nối Google Drive'}
        </Button>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          {!hasPickerScope ? (
            <Alert
              type="warning"
              showIcon
              message="Google Drive cần được cấp lại quyền đọc file để hiển thị My Drive và Shared with me."
            />
          ) : null}
          {pickerToken.isError ? (
            <Alert
              type="error"
              showIcon
              message={pickerToken.error.message}
              description="Hãy kết nối lại Google Drive nếu quyền OAuth đã cũ."
            />
          ) : null}
          {pickerError ? <Alert type="error" showIcon message={pickerError} /> : null}
          <Typography.Text type="secondary">
            Chọn file ảnh/video hoặc thư mục chứa ảnh/video từ Google Drive.
          </Typography.Text>
          <Space.Compact block>
            <Button
              type="primary"
              disabled={!pickerToken.data?.accessToken}
              loading={pickerToken.isLoading}
              onClick={() => openPicker('files')}
            >
              Chọn file ảnh/video
            </Button>
            <Button
              disabled={!pickerToken.data?.accessToken}
              loading={pickerToken.isLoading}
              onClick={() => openPicker('folders')}
            >
              Chọn folder
            </Button>
          </Space.Compact>
          {pickerOpen ? (
            <DrivePicker
              {...({
                id: 'project-drive-picker',
                'app-id': import.meta.env.VITE_GOOGLE_PICKER_APP_ID,
                'client-id': import.meta.env.VITE_GOOGLE_PICKER_CLIENT_ID,
                'developer-key': import.meta.env.VITE_GOOGLE_PICKER_API_KEY,
                'oauth-token': pickerToken.data?.accessToken,
                scope: 'https://www.googleapis.com/auth/drive.readonly',
                'mine-only': false,
                origin: window.location.origin,
                'max-items': 100,
              } as Record<string, unknown>)}
              multiselect
              onCanceled={() => setPickerOpen(false)}
              onOauthError={() => {
                setPickerOpen(false);
                setPickerError('Google Picker không thể xác thực quyền truy cập Google Drive.');
              }}
              onOauthResponse={() => setPickerError(undefined)}
              onPicked={(event: PickerEvent) => {
                setPickerOpen(false);
                const pickedDocs = event.detail?.docs ?? [];
                const sources = pickedDocs
                  .filter(
                    (doc) =>
                      doc.mimeType === 'application/vnd.google-apps.folder' ||
                      doc.mimeType?.startsWith('image/') ||
                      doc.mimeType?.startsWith('video/'),
                  )
                  .map((doc) => ({
                    fileId: doc.id,
                    driveId: doc.driveId,
                    name: doc.name,
                    mimeType: doc.mimeType,
                  }));
                if (sources.length < pickedDocs.length) {
                  setPickerError('Chỉ có thể import file ảnh, video hoặc thư mục.');
                }
                setSelected(sources);
                summarizeSources.mutate(
                  sources.map((source) => ({ fileId: source.fileId, driveId: source.driveId })),
                );
              }}
            >
              {pickerMode === 'files' ? (
                <>
                  <DrivePickerDocsView
                    {...({
                      'include-folders': 'false',
                      'select-folder-enabled': 'false',
                      'mime-types': 'image/*,video/*',
                      mode: 'GRID',
                      'view-id': 'DOCS',
                    } as Record<string, unknown>)}
                  />
                  <DrivePickerDocsView
                    {...({
                      'enable-drives': 'true',
                      'include-folders': 'false',
                      'select-folder-enabled': 'false',
                      'mime-types': 'image/*,video/*',
                      mode: 'GRID',
                      'view-id': 'DOCS',
                    } as Record<string, unknown>)}
                  />
                </>
              ) : (
                <>
                  <DrivePickerDocsView
                    {...({
                      'include-folders': 'true',
                      'select-folder-enabled': 'true',
                      'mime-types': 'application/vnd.google-apps.folder',
                      mode: 'GRID',
                      'view-id': 'FOLDERS',
                    } as Record<string, unknown>)}
                  />
                  <DrivePickerDocsView
                    {...({
                      'enable-drives': 'true',
                      'include-folders': 'true',
                      'select-folder-enabled': 'true',
                      'mime-types': 'application/vnd.google-apps.folder',
                      mode: 'GRID',
                      'view-id': 'FOLDERS',
                    } as Record<string, unknown>)}
                  />
                </>
              )}
            </DrivePicker>
          ) : null}
          {selected.length ? (
            <>
              {summarizeSources.isPending ? (
                <Alert
                  type="info"
                  showIcon
                  message="Đang quét folder để thống kê số file ảnh/video..."
                />
              ) : summarizeSources.isError ? (
                <Alert
                  type="error"
                  showIcon
                  message="Không thể thống kê file trong Google Drive"
                  description={summarizeSources.error.message}
                />
              ) : summarizeSources.data ? (
                <Alert
                  type="info"
                  showIcon
                  message={`Tổng cộng ${summarizeSources.data.fileCount} file hợp lệ`}
                  description={
                    <Space wrap>
                      <Tag color="blue">{summarizeSources.data.imageCount} ảnh</Tag>
                      <Tag color="purple">{summarizeSources.data.videoCount} video</Tag>
                      {summarizeSources.data.folderCount > 0 ? (
                        <Tag>{summarizeSources.data.folderCount} folder</Tag>
                      ) : null}
                      {summarizeSources.data.unsupportedCount > 0 ? (
                        <Typography.Text type="secondary">
                          {summarizeSources.data.unsupportedCount} file khác sẽ bị bỏ qua
                        </Typography.Text>
                      ) : null}
                    </Space>
                  }
                />
              ) : (
                <Space wrap>
                  <Tag color="blue">{selectedCounts.imageCount} ảnh đã chọn</Tag>
                  <Tag color="purple">{selectedCounts.videoCount} video đã chọn</Tag>
                  {selectedCounts.folderCount > 0 ? (
                    <Tag>{selectedCounts.folderCount} folder đang chờ quét</Tag>
                  ) : null}
                </Space>
              )}
              <List
                bordered
                size="small"
                dataSource={selected}
                renderItem={(source) => (
                  <List.Item>
                    <Space>
                      <Tag>{source.mimeType?.startsWith('video/') ? 'Video' : 'Image/Folder'}</Tag>
                      <Typography.Text>{source.name ?? source.fileId}</Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
              <Button
                type="primary"
                loading={createImport.isPending || summarizeSources.isPending}
                disabled={summarizeSources.isPending || summarizeSources.isError}
                onClick={() =>
                  void createImport
                    .mutateAsync({
                      projectId,
                      sources: selected,
                      idempotencyKey: crypto.randomUUID(),
                    })
                    .then((created) => setBatchId(created.id))
                }
              >
                Import vào project
              </Button>
            </>
          ) : null}
          {batchId ? (
            <Card size="small" title="Import progress" style={{ marginTop: 16 }}>
              <Progress
                percent={batch.data?.progressPercent ?? 0}
                status={
                  batch.data?.status === 'failed'
                    ? 'exception'
                    : batch.data?.status === 'completed'
                      ? 'success'
                      : 'active'
                }
              />
              <Space style={{ marginBottom: 8 }}>
                <Typography.Text>
                  {batch.data?.completedItems ?? 0}/{batch.data?.totalItems ?? 0} hoàn tất
                </Typography.Text>
                {batch.data && !['completed', 'failed', 'cancelled'].includes(batch.data.status) ? (
                  <Button
                    danger
                    size="small"
                    loading={cancelImport.isPending}
                    onClick={() => cancelImport.mutate(batchId)}
                  >
                    Hủy import
                  </Button>
                ) : null}
              </Space>
              <List
                size="small"
                dataSource={batch.data?.items ?? []}
                renderItem={(item) => (
                  <List.Item
                    actions={
                      item.status === 'failed'
                        ? [
                            <Button
                              key="retry"
                              size="small"
                              loading={retryItem.isPending}
                              onClick={() => retryItem.mutate({ batchId, itemId: item.id })}
                            >
                              Retry
                            </Button>,
                          ]
                        : undefined
                    }
                  >
                    <List.Item.Meta
                      title={item.sourceName}
                      description={item.errorMessage ?? item.status}
                    />
                  </List.Item>
                )}
              />
            </Card>
          ) : null}
        </Space>
      )}
    </Card>
  );
}
