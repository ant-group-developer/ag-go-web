/**
 * Centralized route paths for the entire application.
 * Import from here instead of hardcoding paths.
 */
export const ROUTES = {
    // Tổng quan
    HOME: '/',
    DASHBOARD: '/',
    HOME_PAGE: '/',
    PROJECTS: '/projects',
    PROJECT_NEW: '/projects/new',
    PROJECT_DETAIL: (id: string) => `/projects/${id}`,
    PROJECT_EDIT: (id: string) => `/projects/${id}/edit`,
    PROJECT_EVALUATE: (id: string) => `/projects/${id}/evaluate`,
    PREVIEW: (id: string) => `/preview/${id}`,
    GALLERIES: '/galleries',
    AUTHORS: '/authors',
    CATEGORY_DETAIL: (slug: string) => `/galleries/${slug}`,

    // Quản trị hệ thống
    ADMIN_USERS: '/admin/users',
    ADMIN_SETTINGS: '/admin/settings',
    ADMIN_LOGS: '/admin/logs',
    ADMIN_CATEGORY: '/admin/category',
    ADMIN_TAG: '/admin/tag',
    ADMIN_PROJECTS: '/admin/projects/all',
    ADMIN_PROJECTS_ALL: '/admin/projects/all',
    ADMIN_PROJECTS_PENDING: '/admin/projects/evaluating',
    ADMIN_PROJECTS_EVALUATING: '/admin/projects/evaluating',
    ADMIN_MEDIA: '/admin/media',
    ADMIN_FOLDER: '/admin/folder',
    ADMIN_COUNTRY: '/admin/country',
    ADMIN_PROVINCE: '/admin/province',
    ADMIN_RESOLUTION: '/admin/resolution',
    ADMIN_DURATION: '/admin/duration',

    // Quản lý
    MANAGE_PROJECTS: '/manage/projects',
    MANAGE_MEDIA: '/manage/media',
    PROCESSING_LOGS: '/processing-logs',

    // Profile
    PROFILE: '/profile',
    USER_DETAIL: (usernameOrId: string) => `/users/${usernameOrId}`,
    INBOX: '/inbox',

    // Auth
    AUTH_LOGIN: '/auth/login',
    AUTH_LOGOUT: '/auth/logout',
} as const;
