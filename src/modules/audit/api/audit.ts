import { apiClient } from '../../../shared/lib/api-client';

export type AuditLog = {
  id: string;
  action: string;
  actorUserId: string;
  actorUser?: { name?: string; email?: string; avatar?: string | null } | null;
  createdAt: string;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: unknown;
  /** Current name of the file the entry is about, when it still exists. */
  mediaFileName?: string | null;
};

export function getProjectAudit(projectId: string) {
  return apiClient<{ items: AuditLog[]; total: number; page: number; pageSize: number }>(
    `/audit/project/${projectId}`,
  );
}
