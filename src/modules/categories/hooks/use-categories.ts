import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCategory, getCategories } from '../api/categories';
import { categoryQueryKeys } from '../queries/category-query-keys';

export function useCategories(enabled = true) {
  return useQuery({
    queryKey: categoryQueryKeys.list(),
    queryFn: getCategories,
    enabled,
    refetchOnWindowFocus: true,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all() }),
  });
}
