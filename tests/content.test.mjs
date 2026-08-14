// tests/content.test.mjs
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAGES, WORK, KNOWLEDGE } from '../scripts/lib/inventory.mjs';

const root = new URL('../src/content/', import.meta.url).pathname;
const read = (d, f) => readFileSync(join(root, d, f), 'utf8');
const list = (d) => readdirSync(join(root, d)).filter(f => f.endsWith('.mdx'));

describe('migrated content', () => {
  it('produced one file per inventory entry', () => {
    expect(list('pages')).toHaveLength(PAGES.length);
    expect(list('work')).toHaveLength(WORK.length);
    expect(list('knowledge')).toHaveLength(KNOWLEDGE.length);
  });

  it('gives every file frontmatter with a title and path', () => {
    for (const dir of ['pages', 'work', 'knowledge']) {
      for (const f of list(dir)) {
        const src = read(dir, f);
        expect(src.startsWith('---\n'), `${dir}/${f} missing frontmatter`).toBe(true);
        expect(src).toMatch(/\ntitle: ".+"/);
        expect(src).toMatch(/\npath: "\/.*"/);
      }
    }
  });

  it('leaves no wordpress or page-builder residue', () => {
    for (const dir of ['pages', 'work', 'knowledge']) {
      for (const f of list(dir)) {
        const body = read(dir, f).split('\n---\n')[1] ?? '';
        expect(body, `${dir}/${f}`).not.toMatch(/\[vc_/);
        expect(body, `${dir}/${f}`).not.toMatch(/wpb_|vc_row|nectar-/);
        expect(body, `${dir}/${f}`).not.toMatch(/https:\/\/ruckuscreative\.com/);
      }
    }
  });

  it('produces non-trivial body content for every entry', () => {
    for (const dir of ['pages', 'work', 'knowledge']) {
      for (const f of list(dir)) {
        const body = (read(dir, f).split('\n---\n')[1] ?? '').trim();
        expect(body.length, `${dir}/${f} body too short`).toBeGreaterThan(100);
      }
    }
  });
});
