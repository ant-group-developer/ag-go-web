import { apiClient } from '../../../shared/lib/api-client';
import type { CreateProjectInput } from '../types/create-project-input.type';
import type { Project, ProjectPage } from '../types/project.type';
import type { UpdateProjectInput } from '../types/update-project-input.type';

export function getProjects(): Promise<ProjectPage> {
  return apiClient<ProjectPage>('/projects');
}

export function createProject(input: CreateProjectInput): Promise<Project> {
  return apiClient<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getProject(projectId: string): Promise<Project> {
  return apiClient<Project>(`/projects/${projectId}`);
}

export function updateProject(projectId: string, input: UpdateProjectInput): Promise<Project> {
  return apiClient<Project>(`/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
