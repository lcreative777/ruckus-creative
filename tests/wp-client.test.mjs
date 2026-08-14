import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { pickSource, REST_TYPE, decodeEntities } from '../scripts/lib/wp-client.mjs';

const read = (f) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8'));

describe('pickSource', () => {
  it('uses rest when content has no shortcodes', () => {
    expect(pickSource(read('about.rest.json'))).toBe('rest');
  });

  it('falls back to dom when content contains vc_ shortcodes', () => {
    expect(pickSource(read('capabilities.rest.json'))).toBe('dom');
  });

  it('falls back to dom when the rest response is empty', () => {
    expect(pickSource([])).toBe('dom');
    expect(pickSource(null)).toBe('dom');
  });
});

describe('REST_TYPE', () => {
  it('maps collection types to wp rest endpoints', () => {
    expect(REST_TYPE.page).toBe('pages');
    expect(REST_TYPE.knowledge).toBe('posts');
    expect(REST_TYPE.work).toBe('portfolio');
  });
});

// WordPress entity-encodes smart punctuation in titles. Left raw, Astro escapes
// the ampersand and the page renders a literal "&#8211;".
describe('decodeEntities', () => {
  it('decodes numeric entities', () => {
    expect(decodeEntities('Clarity &#8211; create an unforgettable brand'))
      .toBe('Clarity – create an unforgettable brand');
    expect(decodeEntities('Don&#8217;t just say it')).toBe('Don’t just say it');
  });

  it('decodes named entities and leaves plain text alone', () => {
    expect(decodeEntities('Design &amp; Strategy')).toBe('Design & Strategy');
    expect(decodeEntities('Plain title')).toBe('Plain title');
  });

  it('passes through empty values', () => {
    expect(decodeEntities('')).toBe('');
    expect(decodeEntities(null)).toBe(null);
  });
});
