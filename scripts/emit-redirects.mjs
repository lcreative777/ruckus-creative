import { writeFile } from 'node:fs/promises';
import { REDIRECTS } from './lib/inventory.mjs';

const out = new URL('../src/redirects.json', import.meta.url);
await writeFile(out, JSON.stringify(REDIRECTS, null, 2) + '\n', 'utf8');
console.log(`Wrote ${REDIRECTS.length} redirects.`);
