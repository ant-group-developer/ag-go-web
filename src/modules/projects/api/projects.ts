import { apiClient } from '../../../shared/lib/api-client';
import type { CreateProjectInput } from '../types/create-project-input.type';
import type { ProjectListParams } from '../types/project-list-params.type';
import type { Project, ProjectPage } from '../types/project.type';
import type { UpdateProjectInput } from '../types/update-project-input.type';

export function getProjects(params: ProjectListParams = {}): Promise<ProjectPage> {
  const query = new URLSearchParams();
  if (params.page !== undefined) {
    query.set('page', String(params.page));
  }
  if (params.pageSize !== undefined) {
    query.set('pageSize', String(params.pageSize));
  }
  if (params.keyword) {
    query.set('keyword', params.keyword);
  }
  if (params.folderId) {
    query.set('folderId', params.folderId);
  }
  if (params.folderIds?.length) {
    query.set('folderIds', params.folderIds.join(','));
  }
  if (params.countryId) {
    query.set('countryId', params.countryId);
  }
  if (params.provinceId) {
    query.set('provinceId', params.provinceId);
  }
  if (params.categoryId) {
    query.set('categoryId', params.categoryId);
  }
  if (params.categoryIds?.length) {
    query.set('categoryIds', params.categoryIds.join(','));
  }
  if (params.tagIds?.length) {
    query.set('tagIds', params.tagIds.join(','));
  }
  if (params.evaluationStatuses?.length) {
    query.set('evaluationStatuses', params.evaluationStatuses.join(','));
  }
  if (params.mine) {
    query.set('mine', 'true');
  }
  if (params.sortBy) {
    query.set('sortBy', params.sortBy);
  }
  if (params.sortOrder) {
    query.set('sortOrder', params.sortOrder);
  }
  const queryString = query.toString();
  return apiClient<ProjectPage>(`/projects${queryString ? `?${queryString}` : ''}`);
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

export function deleteProject(projectId: string): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(`/projects/${projectId}`, {
    method: 'DELETE',
  });
}
