import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { allEntries } from '../scripts/lib/inventory.mjs';

const dist = new URL('../dist/client/', import.meta.url).pathname;

describe('built routes', () => {
  it('emits an index.html at every migrated URL', () => {
    const missing = allEntries()
      .map(e => ({ path: e.path, file: join(dist, e.path, 'index.html') }))
      .filter(x => !existsSync(x.file))
      .map(x => x.path);
    expect(missing, `missing built routes:\n${missing.join('\n')}`).toEqual([]);
  });

  it('emits a 404 page', () => {
    expect(existsSync(join(dist, '404.html'))).toBe(true);
  });
});
