export const PERMISSIONS = {
  PROJECT: {
    READ: 'go.project.read',
    CREATE: 'go.project.create',
    UPDATE: 'go.project.update',
    DELETE: 'go.project.delete',
    EVALUATE: 'go.project.evaluate',
  },
  MEDIA: {
    READ: 'go.media.read',
    CREATE: 'go.media.create',
    UPDATE: 'go.media.update',
    DELETE: 'go.media.delete',
    EVALUATE: 'go.media.evaluate',
  },
  USER: {
    READ: 'go.user.read',
    CREATE: 'go.user.create',
    UPDATE: 'go.user.update',
    DELETE: 'go.user.delete',
  },
  USER_PERMISSION: {
    READ: 'go.user-permission.read',
    UPDATE: 'go.user-permission.update',
  },
  QUOTA: {
    READ: 'go.quota.read',
    CREATE: 'go.quota.create',
    UPDATE: 'go.quota.update',
    DELETE: 'go.quota.delete',
  },
  CATEGORY: {
    READ: 'go.category.read',
    CREATE: 'go.category.create',
    UPDATE: 'go.category.update',
    DELETE: 'go.category.delete',
  },
  COUNTRY: {
    READ: 'go.country.read',
    CREATE: 'go.country.create',
    UPDATE: 'go.country.update',
    DELETE: 'go.country.delete',
  },
  PROVINCE: {
    READ: 'go.province.read',
    CREATE: 'go.province.create',
    UPDATE: 'go.province.update',
    DELETE: 'go.province.delete',
  },
  RESOLUTION: {
    READ: 'go.resolution.read',
    CREATE: 'go.resolution.create',
    UPDATE: 'go.resolution.update',
    DELETE: 'go.resolution.delete',
  },
  DURATION: {
    READ: 'go.duration.read',
    CREATE: 'go.duration.create',
    UPDATE: 'go.duration.update',
    DELETE: 'go.duration.delete',
  },
  TAG: {
    READ: 'go.tag.read',
    CREATE: 'go.tag.create',
    UPDATE: 'go.tag.update',
    DELETE: 'go.tag.delete',
  },
  SOCIAL_MEDIA: {
    READ: 'go.social-media.read',
    CREATE: 'go.social-media.create',
    UPDATE: 'go.social-media.update',
    DELETE: 'go.social-media.delete',
  },
  PRIVACY_POLICY: {
    READ: 'go.privacy-policy.read',
    CREATE: 'go.privacy-policy.create',
    UPDATE: 'go.privacy-policy.update',
    DELETE: 'go.privacy-policy.delete',
  },
  LICENSE: {
    READ: 'go.license.read',
    CREATE: 'go.license.create',
    UPDATE: 'go.license.update',
    DELETE: 'go.license.delete',
  },
  SETTING: {
    READ: 'go.setting.read',
    CREATE: 'go.setting.create',
    UPDATE: 'go.setting.update',
    DELETE: 'go.setting.delete',
  },
  PHOTOGRAPHER_OF_WEEK: {
    READ: 'go.photographer-of-week.read',
    CREATE: 'go.photographer-of-week.create',
    UPDATE: 'go.photographer-of-week.update',
    DELETE: 'go.photographer-of-week.delete',
  },
  EMAIL_TEMPLATE: {
    READ: 'go.email-template.read',
    CREATE: 'go.email-template.create',
    UPDATE: 'go.email-template.update',
    DELETE: 'go.email-template.delete',
  },
  EMAIL_TEMPLATE_VARIABLE: {
    READ: 'go.email-template-variable.read',
    CREATE: 'go.email-template-variable.create',
    UPDATE: 'go.email-template-variable.update',
    DELETE: 'go.email-template-variable.delete',
  },
  FOLDER: {
    READ: 'go.folder.read',
    CREATE: 'go.folder.create',
    UPDATE: 'go.folder.update',
    DELETE: 'go.folder.delete',
  },
} as const;

type Values<T> = T[keyof T];

export type Permission = Values<{
  [K in keyof typeof PERMISSIONS]: Values<(typeof PERMISSIONS)[K]>;
}>;

export const USER_TYPES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

export type UserType = (typeof USER_TYPES)[keyof typeof USER_TYPES];
