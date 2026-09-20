import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createProject, getProjects } from '../api/projects';
import { projectQueryKeys } from '../queries/project-query-keys';

export function useProjects() {
  return useQuery({
    queryKey: projectQueryKeys.list(),
    queryFn: getProjects,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectQueryKeys.all() }),
  });
}
