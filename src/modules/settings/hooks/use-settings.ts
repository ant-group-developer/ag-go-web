import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPublicSettings, getSettings, updateSettings } from '../api/settings';

export const settingsQueryKey = ['settings'] as const;
export const publicSettingsQueryKey = ['settings', 'public'] as const;

export function useSettings() {
  return useQuery({ queryKey: settingsQueryKey, queryFn: getSettings });
}

export function usePublicSettings() {
  return useQuery({
    queryKey: publicSettingsQueryKey,
    queryFn: getPublicSettings,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsQueryKey, settings);
      queryClient.setQueryData(publicSettingsQueryKey, settings);
    },
  });
}
