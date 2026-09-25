import { FolderOutlined } from '@ant-design/icons';
import { Space, Tag, Tooltip, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { ImportSourceFolder } from '../api/google-drive';

type ImportSourceFoldersProps = {
  folders: ImportSourceFolder[];
  /** Show at most this many tags; the rest are listed in a tooltip. */
  maxVisible?: number;
};

function FolderTag({ folder }: { folder: ImportSourceFolder }) {
  const failed = folder.status === 'failed';
  const tag = (
    <Tag
      icon={<FolderOutlined />}
      color={failed ? 'error' : undefined}
      style={{ marginInlineEnd: 0, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}
    >
      {folder.name}
    </Tag>
  );
  return (
    <Tooltip title={folder.name}>
      {folder.fileId ? (
        <a
          href={`https://drive.google.com/drive/folders/${encodeURIComponent(folder.fileId)}`}
          target="_blank"
          rel="noreferrer"
        >
          {tag}
        </a>
      ) : (
        tag
      )}
    </Tooltip>
  );
}

export function ImportSourceFolders({ folders, maxVisible }: ImportSourceFoldersProps) {
  const { t } = useTranslation();
  if (!folders.length) {
    return <Typography.Text type="secondary">{t('googleDrive.noSourceFolders')}</Typography.Text>;
  }
  const visible = maxVisible ? folders.slice(0, maxVisible) : folders;
  const hidden = folders.slice(visible.length);
  return (
    <Space size={4} wrap>
      {visible.map((folder, index) => (
        <FolderTag key={folder.fileId ?? index} folder={folder} />
      ))}
      {hidden.length ? (
        <Tooltip title={hidden.map((folder) => folder.name).join(', ')}>
          <Tag style={{ marginInlineEnd: 0 }}>+{hidden.length}</Tag>
        </Tooltip>
      ) : null}
    </Space>
  );
}
