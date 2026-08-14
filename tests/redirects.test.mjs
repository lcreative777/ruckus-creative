// tests/redirects.test.mjs
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { REDIRECTS } from '../scripts/lib/inventory.mjs';

const emitted = JSON.parse(
  readFileSync(new URL('../src/redirects.json', import.meta.url), 'utf8')
);

describe('emitted redirects', () => {
  it('matches the inventory exactly', () => {
    expect(emitted).toHaveLength(REDIRECTS.length);
    for (const r of REDIRECTS) {
      expect(emitted).toContainEqual({ from: r.from, to: r.to, status: 301 });
    }
  });

  it('never points a redirect at another redirect', () => {
    const sources = new Set(emitted.map(r => r.from));
    for (const r of emitted) expect(sources.has(r.to)).toBe(false);
  });
});
