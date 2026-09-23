import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSettings, updateSettings } from '../api/settings';

export const settingsQueryKey = ['settings'] as const;

export function useSettings() {
  return useQuery({ queryKey: settingsQueryKey, queryFn: getSettings });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsQueryKey, settings);
    },
  });
}
