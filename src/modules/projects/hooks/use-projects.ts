import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tagQueryKeys } from '../../tags/queries/tag-query-keys';
import {
  createProject,
  deleteProject,
  getProject,
  getProjectOwners,
  getProjects,
  updateProject,
} from '../api/projects';
import { projectQueryKeys } from '../queries/project-query-keys';
import type { ProjectListParams } from '../types/project-list-params.type';
import type { UpdateProjectInput } from '../types/update-project-input.type';

export function useProjects(params: ProjectListParams = {}) {
  return useQuery({
    queryKey: projectQueryKeys.list(params),
    queryFn: () => getProjects(params),
  });
}

/** Owners (authors) of the projects the user can list, for the author filter. */
export function useProjectOwners(enabled = true) {
  return useQuery({
    queryKey: projectQueryKeys.owners(),
    queryFn: getProjectOwners,
    enabled,
    staleTime: 60_000,
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: projectQueryKeys.detail(projectId),
    queryFn: () => getProject(projectId),
    enabled: Boolean(projectId),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.all() });
      void queryClient.invalidateQueries({ queryKey: tagQueryKeys.list() });
    },
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProjectInput) => updateProject(projectId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.all() });
      void queryClient.invalidateQueries({ queryKey: tagQueryKeys.list() });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.all() });
    },
  });
}
