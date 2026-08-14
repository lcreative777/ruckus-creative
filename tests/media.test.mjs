import { describe, it, expect } from 'vitest';
import { localNameFor, dedupe } from '../scripts/lib/media.mjs';

describe('localNameFor', () => {
  it('uses the wordpress filename', () => {
    expect(localNameFor('https://ruckuscreative.com/wp-content/uploads/2019/08/boxer.jpg'))
      .toBe('boxer.jpg');
  });

  it('disambiguates identical filenames from different upload months', () => {
    const a = localNameFor('https://x.com/wp-content/uploads/2019/08/logo.png');
    const b = localNameFor('https://x.com/wp-content/uploads/2020/03/logo.png');
    expect(a).not.toBe(b);
  });

  it('strips query strings', () => {
    expect(localNameFor('https://x.com/uploads/a.jpg?ver=123')).toBe('a.jpg');
  });
});

describe('dedupe', () => {
  it('removes duplicate urls preserving order', () => {
    expect(dedupe(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
  });
});
