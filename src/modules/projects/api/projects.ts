import { apiClient } from '../../../shared/lib/api-client';

export type Project = {
  id: string;
  name: string;
  folderId: string;
  evaluationStatus: string;
  mediaCount: number;
  description: string | null;
};

export type ProjectPage = {
  items: Project[];
  nextCursor: string | null;
};

export function getProjects(): Promise<ProjectPage> {
  return apiClient<ProjectPage>('/projects');
}
