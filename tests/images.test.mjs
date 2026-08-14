import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/lib/images.ts', import.meta.url), 'utf8');

describe('image library', () => {
  it('globs the media directory eagerly so lookups are synchronous', () => {
    expect(src).toMatch(/import\.meta\.glob\(/);
    expect(src).toContain('/src/assets/media/');
    expect(src).toContain('eager: true');
  });

  it('exports the sentinel prefix it strips', () => {
    expect(src).toContain('@assets/media/');
    expect(src).toMatch(/export function resolveMedia/);
  });
});
