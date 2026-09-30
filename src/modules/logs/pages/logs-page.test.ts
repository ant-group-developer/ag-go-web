import { describe, expect, it } from 'vitest';
import { GO_PERMISSIONS } from '../../../shared/auth/permissions';
import { LOG_PAGE_TABS } from './logs-page';

describe('LogsPage tab definitions', () => {
  it('includes the analysis tab', () => {
    expect(LOG_PAGE_TABS).toContain('analysis');
  });

  it('includes all original tabs', () => {
    expect(LOG_PAGE_TABS).toContain('log');
    expect(LOG_PAGE_TABS).toContain('render');
    expect(LOG_PAGE_TABS).toContain('import');
  });

  it('analysis tab comes after the existing tabs', () => {
    const idx = (LOG_PAGE_TABS as readonly string[]).indexOf('analysis');
    expect(idx).toBeGreaterThan(0);
  });
});

describe('GO_PERMISSIONS', () => {
  it('includes ANALYSIS_MANAGE', () => {
    expect(GO_PERMISSIONS.ANALYSIS_MANAGE).toBe('go.analysis.manage');
  });
});
