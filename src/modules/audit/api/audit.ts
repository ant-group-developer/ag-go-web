import { apiClient } from '../../../shared/lib/api-client';

export type AuditLog = {
  id: string;
  action: string;
  actorUserId: string;
  actorUser?: { name?: string; email?: string; avatar?: string | null } | null;
  createdAt: string;
  beforeData?: unknown;
  afterData?: unknown;
};

export function getProjectAudit(projectId: string) {
  return apiClient<{ items: AuditLog[]; total: number; page: number; pageSize: number }>(
    `/audit/project/${projectId}`,
  );
}
