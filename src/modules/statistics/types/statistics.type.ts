import type { AuditLog } from '../../audit/api/audit';
import type { ProjectEvaluationStatus } from '../../projects/types/project-list-params.type';

/** Mirrors the `/statistics/*` responses of ag-go-api (modules/statistics/statistics.types.ts). */

export type StatisticsGranularity = 'day' | 'week';

export type StatisticsPeriodInfo = {
  from: string;
  to: string;
  effectiveTo: string;
  previousFrom: string;
  previousTo: string;
  granularity: StatisticsGranularity;
  timeZone: string;
};

/** Window sent to period endpoints; `to` is exclusive. */
export type StatisticsPeriodParams = { from: string; to: string; tz: string };

export type PeriodCount = { current: number; previous: number };

export type StatisticsUser = { name?: string; email?: string; avatar?: string | null } | null;

export type StatisticsSummary = {
  period: StatisticsPeriodInfo;
  snapshot: {
    projects: number;
    projectsByStatus: Record<ProjectEvaluationStatus, number>;
    media: { total: number; images: number; videos: number };
    evaluation: {
      pending: number;
      approved: number;
      rejected: number;
      oldestPendingAt: string | null;
    };
    storage: { originalBytes: string; renderedBytes: string };
  };
  inPeriod: {
    newProjects: PeriodCount;
    newMedia: PeriodCount;
    decisions: { approved: PeriodCount; rejected: PeriodCount };
  };
};

export type StatisticsTrendPoint = {
  bucketStart: string;
  added: number;
  approved: number;
  rejected: number;
  backlog: number;
};

export type StatisticsTrend = { period: StatisticsPeriodInfo; points: StatisticsTrendPoint[] };

export type EvaluationBreakdown = {
  media: number;
  approved: number;
  rejected: number;
  pending: number;
};

export type StatisticsFolderProgress = EvaluationBreakdown & {
  folderId: string;
  folderName: string;
  folderPath: string;
  projects: number;
};

export type StatisticsAttentionProject = EvaluationBreakdown & {
  projectId: string;
  projectName: string;
  folderPath: string;
  evaluationStatus: ProjectEvaluationStatus;
  oldestPendingAt: string | null;
};

export type StatisticsProgress = {
  folders: { total: number; items: StatisticsFolderProgress[] };
  attentionProjects: { total: number; items: StatisticsAttentionProject[] };
};

export type StatisticsEvaluator = {
  userId: string;
  user: StatisticsUser;
  approved: number;
  rejected: number;
  total: number;
};

export type StatisticsContributor = {
  userId: string;
  user: StatisticsUser;
  projectsCreated: number;
  mediaAdded: number;
};

export type StatisticsTeam = {
  period: StatisticsPeriodInfo;
  evaluators: StatisticsEvaluator[];
  contributors: StatisticsContributor[];
};

export type StatisticsImportProblem = {
  id: string;
  projectId: string;
  projectName: string;
  status: 'failed' | 'partial';
  totalItems: number;
  failedItems: number;
  updatedAt: string;
};

export type StatisticsOperations = {
  period: StatisticsPeriodInfo;
  render: {
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
    averageRenderSeconds: number;
  };
  imports: {
    active: number;
    paused: number;
    completed: number;
    partial: number;
    failed: number;
    recentProblems: StatisticsImportProblem[];
  };
};

export type StatisticsActivityItem = Omit<AuditLog, 'beforeData'> & {
  projectId: string;
  projectName: string;
};

export type StatisticsActivity = { items: StatisticsActivityItem[] };
