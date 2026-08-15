// tests/icons.test.mjs
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = new URL('../src/assets/icons/', import.meta.url).pathname;
const files = readdirSync(dir).filter(f => f.endsWith('.svg'));

describe('icons', () => {
  it('ships the icons the design references', () => {
    for (const name of ['chart-gear-svgrepo-com', 'hvv-svgrepo-com', 'fast-svgrepo-com',
      'diamond-svgrepo-com', 'mobile-device-svgrepo-com', 'presentation-svgrepo-com',
      'atom-svgrepo-com', 'event-svgrepo-com', 'print-outline']) {
      expect(files, `${name}.svg missing`).toContain(`${name}.svg`);
    }
  });

  it('carries no hardcoded dark fills, so currentColor works', () => {
    for (const f of files) {
      const svg = readFileSync(join(dir, f), 'utf8');
      expect(svg, `${f} still hardcodes a colour`).not.toMatch(/(fill|stroke)="#(000000|000|231F20|121923)"/i);
    }
  });

  it('keeps a viewBox on every icon so it scales', () => {
    for (const f of files) {
      expect(readFileSync(join(dir, f), 'utf8'), `${f} has no viewBox`).toMatch(/viewBox="/);
    }
  });
});
