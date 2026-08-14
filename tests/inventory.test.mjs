import { describe, it, expect } from 'vitest';
import { PAGES, WORK, KNOWLEDGE, REDIRECTS, allEntries } from '../scripts/lib/inventory.mjs';

describe('inventory', () => {
  it('has the exact counts from the spec', () => {
    expect(PAGES).toHaveLength(10);
    expect(WORK).toHaveLength(20);
    expect(KNOWLEDGE).toHaveLength(9);
    expect(allEntries()).toHaveLength(39);
  });

  it('gives every entry a trailing-slash path', () => {
    for (const e of allEntries()) {
      expect(e.path.startsWith('/')).toBe(true);
      expect(e.path.endsWith('/')).toBe(true);
    }
  });

  it('uses /work/ paths for portfolio entries', () => {
    for (const e of WORK) expect(e.path).toMatch(/^\/work\/[a-z0-9-]+\/$/);
  });

  it('excludes all 8 demo posts from KNOWLEDGE', () => {
    const demo = ['you-think-water-moves-fast', 'airspeed-velocity-of-a-swallow',
      'when-do-spiders-sleep', 'youre-the-expert-now', 'a-matter-of-deductive-logic',
      'mauris-imperdiet-eros', 'aliquam-at-dui-velit', 'ut-placerat-egestas'];
    const slugs = KNOWLEDGE.map(e => e.slug);
    for (const d of demo) expect(slugs).not.toContain(d);
  });

  it('redirects every demo post plus the duplicates', () => {
    expect(REDIRECTS).toHaveLength(11);
    for (const r of REDIRECTS) {
      expect(r.from.endsWith('/')).toBe(true);
      expect(r.to.endsWith('/')).toBe(true);
      expect(r.status).toBe(301);
    }
  });

  it('never redirects a URL that is also migrated', () => {
    const live = new Set(allEntries().map(e => e.path));
    for (const r of REDIRECTS) expect(live.has(r.from)).toBe(false);
  });
});
