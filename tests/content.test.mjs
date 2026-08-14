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

  // The original residue check only looked for [vc_ , so Salient's own
  // shortcodes ([text_box], [hr], [blog]) survived into /knowledge/ and
  // /portfolio-ruckus/ unnoticed. Assert on any shortcode, not just WPBakery's.
  it('leaves no shortcodes of any flavour', () => {
    const SHORTCODE = /\[\/?(?:vc_|text_box|blog|hr|divider|button|toggle|tabs?|image_with_animation|clients|testimonial|milestone|split_line_heading)\b/;
    for (const dir of ['pages', 'work', 'knowledge']) {
      for (const f of list(dir)) {
        const body = read(dir, f).split('\n---\n')[1] ?? '';
        const found = body.match(SHORTCODE);
        expect(found, `${dir}/${f} still contains ${found?.[0]}`).toBeNull();
      }
    }
  });

  // Every internal link must resolve to a route this site actually builds.
  // Caught /portfolio-ruckus/ still pointing at legacy /portfolio/* URLs.
  it('points every internal link at a migrated route', () => {
    const known = new Set([
      ...PAGES.map(e => e.path), ...WORK.map(e => e.path), ...KNOWLEDGE.map(e => e.path),
    ]);
    const offenders = [];
    for (const dir of ['pages', 'work', 'knowledge']) {
      for (const f of list(dir)) {
        const body = read(dir, f).split('\n---\n')[1] ?? '';
        for (const [, href] of body.matchAll(/href="(\/[^"#?]*)"/g)) {
          if (!known.has(href)) offenders.push(`${dir}/${f} -> ${href}`);
        }
      }
    }
    expect(offenders, `internal links with no matching route:\n${offenders.join('\n')}`).toEqual([]);
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
