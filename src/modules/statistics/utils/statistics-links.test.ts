import { describe, expect, it } from 'vitest';
import { GO_PERMISSIONS } from '../../../shared/auth/permissions';
import {
  folderProjectsLink,
  logsTabLink,
  projectDetailLink,
  projectStatusLink,
  type StatisticsLinkAccess,
} from './statistics-links';

function access(permissions: string[], isAdmin = false): StatisticsLinkAccess {
  return { isAdmin, can: (permission) => isAdmin || permissions.includes(permission) };
}

const admin = access([], true);
const reader = access([GO_PERMISSIONS.PROJECT_READ]);
const evaluator = access([GO_PERMISSIONS.PROJECT_READ, GO_PERMISSIONS.PROJECT_EVALUATE]);
const nobody = access([]);

describe('projectStatusLink', () => {
  it('sends admins to the list of every project', () => {
    expect(projectStatusLink('pending', admin)).toBe('/all-projects?evaluationStatuses=pending');
    expect(projectStatusLink('draft', admin)).toBe('/all-projects?evaluationStatuses=draft');
  });

  it('uses the list that shows each status', () => {
    expect(projectStatusLink('completed', reader)).toBe('/projects?evaluationStatuses=completed');
    expect(projectStatusLink('partially_completed', reader)).toBe(
      '/projects?evaluationStatuses=partially_completed',
    );
    expect(projectStatusLink('draft', reader)).toBe('/my-projects?evaluationStatuses=draft');
    expect(projectStatusLink('failed', evaluator)).toBe(
      '/project-evaluations?evaluationStatuses=failed',
    );
  });

  it('gives no link when the viewer cannot open that list', () => {
    expect(projectStatusLink('pending', reader)).toBeNull();
    expect(projectStatusLink('completed', nobody)).toBeNull();
  });
});

describe('folderProjectsLink', () => {
  it('prefers the evaluation list when work is waiting and the viewer evaluates', () => {
    expect(folderProjectsLink('f 1', true, evaluator)).toBe('/project-evaluations?folderId=f%201');
    expect(folderProjectsLink('f1', false, evaluator)).toBe('/projects?folderId=f1');
    expect(folderProjectsLink('f1', true, reader)).toBe('/projects?folderId=f1');
    expect(folderProjectsLink('f1', true, admin)).toBe('/all-projects?folderId=f1');
    expect(folderProjectsLink('f1', true, nobody)).toBeNull();
  });
});

describe('projectDetailLink and logsTabLink', () => {
  it('follow the route permissions', () => {
    expect(projectDetailLink('p1', reader)).toBe('/projects/p1');
    expect(projectDetailLink('p1', nobody)).toBeNull();
    expect(logsTabLink('render', access([GO_PERMISSIONS.RENDER_READ]))).toBe(
      '/system/logs?tab=render',
    );
    expect(logsTabLink('import', access([GO_PERMISSIONS.RENDER_READ]))).toBeNull();
  });
});
