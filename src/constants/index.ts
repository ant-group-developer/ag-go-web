export const APP_NAME = 'AG Go';

export const API_ROUTES = {
    SETTINGS: '/settings',
    PERMISSIONS: '/permissions',
} as const;

export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_PAGE_SIZE: 20,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

export const PROJECT_SORT = {
    RELEVANCE: 'relevance',
    LATEST: 'latest',
    POPULAR: 'popular',
    TRENDING: 'trending',
} as const;

export const AUTHOR_SORT = {
    PROJECTS: 'projects',
    FOLLOWERS: 'followers',
    LATEST: 'latest',
} as const;

export const AUTHOR_SORT_OPTIONS = [
    { key: AUTHOR_SORT.PROJECTS, labelKey: 'sortOptions.projects' },
    { key: AUTHOR_SORT.FOLLOWERS, labelKey: 'sortOptions.followers' },
    { key: AUTHOR_SORT.LATEST, labelKey: 'sortOptions.latest' },
] as const;
