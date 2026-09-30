import { describe, expect, it } from 'vitest';
import { getInitialPlaybackTime, getLoopSeekTime } from './range-player-helpers';

describe('getLoopSeekTime', () => {
  it('returns null when currentTime is before endSec', () => {
    expect(getLoopSeekTime(3.0, 1.0, 6.0)).toBeNull();
  });

  it('returns startSec when currentTime equals endSec', () => {
    expect(getLoopSeekTime(6.0, 1.0, 6.0)).toBe(1.0);
  });

  it('returns startSec when currentTime exceeds endSec', () => {
    expect(getLoopSeekTime(6.5, 1.0, 6.0)).toBe(1.0);
  });

  it('returns null when endSec <= startSec (degenerate range)', () => {
    expect(getLoopSeekTime(2.0, 5.0, 5.0)).toBeNull();
    expect(getLoopSeekTime(2.0, 5.0, 3.0)).toBeNull();
  });

  it('returns null at exactly startSec', () => {
    expect(getLoopSeekTime(1.0, 1.0, 6.0)).toBeNull();
  });

  it('returns startSec=0 when start is 0 and time is at end', () => {
    expect(getLoopSeekTime(10.0, 0, 10.0)).toBe(0);
  });
});

describe('getInitialPlaybackTime', () => {
  it('converts ms to seconds', () => {
    expect(getInitialPlaybackTime(5000)).toBe(5);
    expect(getInitialPlaybackTime(0)).toBe(0);
    expect(getInitialPlaybackTime(1500)).toBe(1.5);
  });
});
