export const getProjectStatus = (status: string) => {
  switch (status) {
    case 'draft':
      return { color: 'default', label: 'projects.statusDraft' };

    case 'pending':
      return { color: 'processing', label: 'projects.statusPending' };

    case 'completed':
      return { color: 'success', label: 'projects.statusCompleted' };

    case 'partially_completed':
      return {
        color: 'warning',
        label: 'projects.statusPartiallyCompleted',
      };

    case 'failed':
      return { color: 'error', label: 'projects.statusFailed' };

    default:
      return { color: 'default', label: status };
  }
};
