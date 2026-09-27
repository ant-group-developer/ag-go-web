import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { mediaQueryKeys } from '../../media/queries/media-query-keys';
import { projectQueryKeys } from '../../projects/queries/project-query-keys';
import { useProjectImports } from './use-google-drive';

/**
 * Keeps the project's media lists and counters in step with its Google Drive imports: whenever
 * any import of the project (not only one started on this screen) progresses, the media queries
 * are refreshed. The imports query is polled while a batch is active and shared with the import
 * history card, so this adds no extra requests.
 */
export function useRefreshProjectMediaOnImportProgress(projectId: string) {
  const queryClient = useQueryClient();
  const projectImports = useProjectImports(projectId);
  const importProgress = projectImports.data
    ?.map((batch) => `${batch.id}:${batch.status}:${batch.completedItems}:${batch.failedItems}`)
    .join('|');
  const lastImportProgress = useRef<string | undefined>(undefined);

  useEffect(() => {
    const previous = lastImportProgress.current;
    lastImportProgress.current = importProgress;
    // The first snapshot only records the baseline; the media was just loaded with it.
    if (previous === undefined || importProgress === undefined || previous === importProgress) {
      return;
    }
    void queryClient.invalidateQueries({ queryKey: mediaQueryKeys.project(projectId) });
    void queryClient.invalidateQueries({ queryKey: mediaQueryKeys.projectReview(projectId) });
    void queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(projectId) });
    void queryClient.invalidateQueries({ queryKey: projectQueryKeys.list() });
    // Starting, pausing and finishing an import each add a project audit entry.
    void queryClient.invalidateQueries({ queryKey: ['audit', 'project', projectId] });
  }, [importProgress, projectId, queryClient]);
}
