export const mediaQueryKeys = {
  all: () => ['media'] as const,
  project: (projectId: string) => [...mediaQueryKeys.all(), 'project', projectId] as const,
  projectReview: (projectId: string) =>
    [...mediaQueryKeys.all(), 'project-review', projectId] as const,
  evaluationHistory: (mediaId: string) =>
    [...mediaQueryKeys.all(), 'evaluation-history', mediaId] as const,
  assetOriginalUrl: (assetId: string) =>
    [...mediaQueryKeys.all(), 'asset-original-url', assetId] as const,
  assetPreviewUrl: (assetId: string, variantCode: string, width?: number) =>
    [...mediaQueryKeys.all(), 'asset-preview-url', assetId, variantCode, width ?? null] as const,
};
