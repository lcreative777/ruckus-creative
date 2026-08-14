import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/data/site.ts', import.meta.url), 'utf8');

describe('site data', () => {
  it('carries the client-confirmed address and no stale variant', () => {
    expect(src).toContain('Suite 300-173');
    expect(src).not.toContain('Suite 300-1733');
    expect(src).not.toContain('Suite 100-173');
  });

  it('lists the six anchor nav items in order', () => {
    const order = ['#home', '#intro', '#work', '#about', '#services', '#contact'];
    let last = -1;
    for (const a of order) {
      const i = src.indexOf(`/${a}`);
      expect(i, `${a} missing from nav`).toBeGreaterThan(-1);
      expect(i, `${a} out of order`).toBeGreaterThan(last);
      last = i;
    }
  });

  it('uses the confirmed phone number', () => {
    expect(src).toContain('714.514.1482');
  });
});
