import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { pickSource, REST_TYPE } from '../scripts/lib/wp-client.mjs';

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
