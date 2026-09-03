import { describe, expect, it } from 'vitest';
import { nextReconnectDelayMs } from './jobSocket';

describe('job socket reconnect', () => {
  it('backs off exponentially and caps', () => {
    expect(nextReconnectDelayMs(0)).toBe(1000);
    expect(nextReconnectDelayMs(1)).toBe(2000);
    expect(nextReconnectDelayMs(2)).toBe(4000);
    expect(nextReconnectDelayMs(10)).toBe(15000);
  });
});
