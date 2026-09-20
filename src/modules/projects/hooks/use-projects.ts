import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tagQueryKeys } from '../../tags/queries/tag-query-keys';
import { createProject, getProject, getProjects, updateProject } from '../api/projects';
import { projectQueryKeys } from '../queries/project-query-keys';
import type { UpdateProjectInput } from '../types/update-project-input.type';

export function useProjects() {
  return useQuery({
    queryKey: projectQueryKeys.list(),
    queryFn: getProjects,
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
