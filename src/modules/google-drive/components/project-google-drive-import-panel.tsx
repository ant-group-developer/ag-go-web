import { DrivePicker, DrivePickerDocsView } from '@googleworkspace/drive-picker-react';
import { Button, Card, List, Progress, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import {
  useCreateDriveImport,
  useDisconnectGoogleDrive,
  useGoogleDriveConnection,
  useGoogleDrivePickerToken,
  useDriveImport,
  useCancelDriveImport,
  useRetryDriveImportItem,
  useStartGoogleDriveConnection,
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

export function ProjectGoogleDriveImportPanel({ projectId }: { projectId: string }) {
  const [selected, setSelected] = useState<PickedSource[]>([]);
  const connection = useGoogleDriveConnection();
  const pickerToken = useGoogleDrivePickerToken(Boolean(connection.data));
  const start = useStartGoogleDriveConnection();
  const disconnect = useDisconnectGoogleDrive();
  const createImport = useCreateDriveImport();
  const cancelImport = useCancelDriveImport();
  const retryItem = useRetryDriveImportItem();
  const [batchId, setBatchId] = useState<string>();
  const batch = useDriveImport(batchId ?? '');

  const openPicker = () => {
    if (pickerToken.data?.accessToken) {
      const picker = document.getElementById('project-drive-picker') as
        | (HTMLElement & { visible?: boolean })
        | null;
      if (picker) {
        picker.visible = true;
      }
    }
  };

  return (
    <Card
      title="Google Drive import"
      extra={
        connection.data ? (
          <Button danger size="small" onClick={() => disconnect.mutate()}>
            Ngắt kết nối
          </Button>
        ) : null
      }
    >
      {!connection.data ? (
        <Button type="primary" loading={start.isPending} onClick={() => start.mutate(projectId)}>
          Kết nối Google Drive
        </Button>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text type="secondary">
            Chọn nhiều file hoặc thư mục ảnh/video từ Google Drive.
          </Typography.Text>
          <Button
            disabled={!pickerToken.data?.accessToken}
            loading={pickerToken.isLoading}
            onClick={openPicker}
          >
            Mở Google Picker
          </Button>
          <DrivePicker
            {...({
              id: 'project-drive-picker',
              'app-id': import.meta.env.VITE_GOOGLE_PICKER_APP_ID,
              'client-id': import.meta.env.VITE_GOOGLE_PICKER_CLIENT_ID,
              'developer-key': import.meta.env.VITE_GOOGLE_PICKER_API_KEY,
              'oauth-token': pickerToken.data?.accessToken,
              'max-items': 100,
            } as Record<string, unknown>)}
            multiselect
            onPicked={(event: PickerEvent) => {
              const sources = (event.detail?.docs ?? [])
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
              setSelected(sources);
            }}
          >
            <DrivePickerDocsView
              {...({
                'enable-drives': 'true',
                'include-folders': 'true',
                'select-folder-enabled': 'true',
                'mime-types': 'image/*,video/*,application/vnd.google-apps.folder',
                'view-id': 'DOCS',
              } as Record<string, unknown>)}
            />
          </DrivePicker>
          {selected.length ? (
            <>
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
                loading={createImport.isPending}
                onClick={() =>
                  void createImport.mutateAsync({
                    projectId,
                    sources: selected,
                    idempotencyKey: crypto.randomUUID(),
                  }).then((created) => setBatchId(created.id))
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
