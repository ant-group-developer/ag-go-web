import { apiClient } from '../../../shared/lib/api-client';
import type { CreateProjectInput } from '../types/create-project-input.type';
import type { Project, ProjectPage } from '../types/project.type';

export function getProjects(): Promise<ProjectPage> {
  return apiClient<ProjectPage>('/projects');
}

export function createProject(input: CreateProjectInput): Promise<Project> {
  return apiClient<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
