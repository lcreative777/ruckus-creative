// tests/content-page.test.mjs
//
// Verifies src/lib/content-page.ts against the actual 7 migrated pages:
// every word in the source body must still appear in the classified
// output (nothing dropped/reworded), and the classification counts match
// a hand-audit of each file (see content-page.ts's header comment).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseContentBlocks, groupHeadings } from '../src/lib/content-page.ts';

const dir = new URL('../src/content/pages/', import.meta.url).pathname;

function bodyOf(file) {
  const src = readFileSync(join(dir, file), 'utf8');
  return src.split('\n---\n')[1].trim();
}

function words(text) {
  // Tags strip to '' (not ' ') so an inline wrapper with no adjacent
  // whitespace in the source — e.g. a phone number's tel: <a> landing right
  // up against its trailing period, "…1482</a>." — doesn't get counted as
  // two tokens on one side and one on the other. Block-level separation
  // (between blocks) is handled by renderedTextOf's explicit `.join(' ')`;
  // <br> tags are always followed by a real newline in the source, which
  // still splits on its own.
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .split(/\s+/)
    .filter(Boolean);
}

function renderedTextOf(blocks) {
  const parts = [];
  for (const b of blocks) {
    if (b.kind === 'lead' || b.kind === 'divider' || b.kind === 'cta' || b.kind === 'pullquote' || b.kind === 'plain') {
      parts.push(b.html);
    } else if (b.kind === 'heading') {
      parts.push(b.headingHtml, b.bodyHtml, ...(b.items ?? []));
    } else if (b.kind === 'list') {
      parts.push(...b.items);
    }
  }
  return parts.join(' ');
}

const PAGES = {
  'about.md': { lead: 1, pullquote: 1, cta: 1 },
  'strategic-creative-capabilities.md': { lead: 1, cta: 1, headingWithList: 4 },
  'process-ruckus-creative.md': { lead: 1, divider: 2, cta: 1, heading: 12 },
  'results-based-advertising-branding.md': { lead: 1, pullquote: 2, cta: 1 },
  'contact-ruckus-creative.md': { heading: 2 },
  'privacy-policy.md': { heading: 6 },
  'terms-and-conditions.md': { heading: 11, list: 1 },
};

describe('content-page classifier', () => {
  for (const [file, expected] of Object.entries(PAGES)) {
    it(`preserves every word of ${file}`, () => {
      const body = bodyOf(file);
      const blocks = parseContentBlocks(body);
      const before = words(body).sort();
      const after = words(renderedTextOf(blocks)).sort();
      expect(after.length, `${file}: word count changed (${before.length} -> ${after.length})`).toBe(before.length);
      expect(after).toEqual(before);
    });

    it(`classifies ${file} as hand-audited`, () => {
      const blocks = parseContentBlocks(bodyOf(file));
      const count = (kind) => blocks.filter((b) => b.kind === kind).length;
      if (expected.lead !== undefined) expect(count('lead'), 'lead').toBe(expected.lead);
      if (expected.pullquote !== undefined) expect(count('pullquote'), 'pullquote').toBe(expected.pullquote);
      if (expected.cta !== undefined) expect(count('cta'), 'cta').toBe(expected.cta);
      if (expected.divider !== undefined) expect(count('divider'), 'divider').toBe(expected.divider);
      if (expected.list !== undefined) expect(count('list'), 'list').toBe(expected.list);
      if (expected.heading !== undefined) expect(count('heading'), 'heading').toBe(expected.heading);
      if (expected.headingWithList !== undefined) {
        const withList = blocks.filter((b) => b.kind === 'heading' && b.items).length;
        expect(withList, 'heading-with-list').toBe(expected.headingWithList);
      }
    });
  }

  it('groups consecutive capability headings into one grid, About/Results headings stay singles', () => {
    const capBlocks = parseContentBlocks(bodyOf('strategic-creative-capabilities.md'));
    const capGroups = groupHeadings(capBlocks).filter((r) => r.kind === 'group');
    expect(capGroups).toHaveLength(1);
    expect(capGroups[0].blocks).toHaveLength(4);

    const termsBlocks = parseContentBlocks(bodyOf('terms-and-conditions.md'));
    const termsGroups = groupHeadings(termsBlocks).filter((r) => r.kind === 'group');
    expect(termsGroups, 'Terms headings are each followed by prose, so none should group').toHaveLength(0);
  });

  it('linkifies the site phone number to tel: without touching the fax number', () => {
    const blocks = parseContentBlocks(bodyOf('contact-ruckus-creative.md'));
    const rendered = renderedTextOf(blocks);
    expect(rendered).toContain('href="tel:+17145141482"');
    expect(rendered).not.toContain('href="tel:+19494818540"');
    expect(rendered).toContain('949.481.8540 fx.');
  });
});
