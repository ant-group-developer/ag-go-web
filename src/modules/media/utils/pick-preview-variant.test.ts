import { describe, expect, it } from 'vitest';
import { pickPreviewVariant } from './pick-preview-variant';

describe('pickPreviewVariant', () => {
  const variants = [{ width: 1920 }, { width: 480 }, { width: 960 }];

  it('picks the smallest preview at least as wide as the frame', () => {
    expect(pickPreviewVariant(variants, 500)).toEqual({ width: 960 });
    expect(pickPreviewVariant(variants, 480)).toEqual({ width: 480 });
  });

  it('falls back to the largest', () => {
    expect(pickPreviewVariant(variants, 4000)).toEqual({ width: 1920 });
    expect(pickPreviewVariant(variants)).toEqual({ width: 1920 });
    expect(pickPreviewVariant([], 100)).toBeUndefined();
  });
});
