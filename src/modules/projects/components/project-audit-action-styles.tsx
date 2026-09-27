import {
  AuditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloudDownloadOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
  MinusCircleOutlined,
  PaperClipOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

/** Visual style per known audit action; unknown actions fall back to a neutral history marker. */
export type AuditActionColor =
  'green6' | 'blue6' | 'red6' | 'cyan6' | 'orange6' | 'purple6' | 'gold6' | 'colorTextTertiary';

type AuditActionStyle = { color: AuditActionColor; icon: ReactNode };

const AUDIT_ACTION_STYLES: Record<string, AuditActionStyle> = {
  project_created: { color: 'green6', icon: <PlusCircleOutlined /> },
  project_updated: { color: 'blue6', icon: <EditOutlined /> },
  project_deleted: { color: 'red6', icon: <DeleteOutlined /> },
  media_attached: { color: 'cyan6', icon: <PaperClipOutlined /> },
  media_uploaded: { color: 'cyan6', icon: <CloudUploadOutlined /> },
  media_updated: { color: 'blue6', icon: <EditOutlined /> },
  media_deleted: { color: 'orange6', icon: <MinusCircleOutlined /> },
  evaluation_changed: { color: 'purple6', icon: <AuditOutlined /> },
  import_started: { color: 'cyan6', icon: <CloudDownloadOutlined /> },
  import_paused: { color: 'gold6', icon: <PauseCircleOutlined /> },
  import_resumed: { color: 'cyan6', icon: <PlayCircleOutlined /> },
  import_cancelled: { color: 'colorTextTertiary', icon: <StopOutlined /> },
  import_completed: { color: 'green6', icon: <CheckCircleOutlined /> },
  import_partial: { color: 'orange6', icon: <ExclamationCircleOutlined /> },
  import_failed: { color: 'red6', icon: <CloseCircleOutlined /> },
};
const DEFAULT_ACTION_STYLE: AuditActionStyle = {
  color: 'colorTextTertiary',
  icon: <HistoryOutlined />,
};

export function getAuditActionStyle(action: string): AuditActionStyle {
  return AUDIT_ACTION_STYLES[action] ?? DEFAULT_ACTION_STYLE;
}
