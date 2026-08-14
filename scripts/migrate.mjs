// scripts/migrate.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { allEntries, ORIGIN, resolveInternalPath, applyCorrections } from './lib/inventory.mjs';
import { fetchEntry } from './lib/wp-client.mjs';
import { cleanHtml } from './lib/html-to-content.mjs';
import { downloadMedia, localNameFor } from './lib/media.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const CONTENT_DIR = join(ROOT, 'src/content');
const MEDIA_DIR = join(ROOT, 'src/assets/media');
const DIR_FOR = { page: 'pages', work: 'work', knowledge: 'knowledge' };

const yaml = (v) => (v === null || v === undefined ? 'null' : JSON.stringify(String(v)));

function frontmatter(rec) {
  const lines = [
    '---',
    `title: ${yaml(rec.title)}`,
    `path: ${yaml(rec.entry.path)}`,
    `source: ${yaml(rec.source)}`,
    'seo:',
    `  title: ${yaml(rec.seo.title)}`,
    `  description: ${yaml(rec.seo.description)}`,
    `  canonical: ${yaml(rec.seo.canonical)}`,
    `  ogImage: ${yaml(rec.seo.ogImage)}`,
  ];
  if (rec.entry.type === 'knowledge') {
    // The schema requires pubDate. If REST gave us no date (DOM fallback path),
    // fail here with a clear message rather than emitting `null` and letting
    // Zod report a confusing coercion error later.
    if (!rec.date) {
      throw new Error(`no publication date for knowledge post "${rec.entry.slug}" ` +
        `(source: ${rec.source}) — REST returned no record, so pubDate cannot be set`);
    }
    lines.push(`pubDate: ${yaml(rec.date)}`);
    if (rec.modified) lines.push(`updatedDate: ${yaml(rec.modified)}`);
  }
  if (rec.entry.type === 'work') lines.push('client: null');
  lines.push('---', '');
  return lines.join('\n');
}

const failures = [];
const allImages = [];

console.log(`Migrating ${allEntries().length} entries from ${ORIGIN}\n`);

for (const entry of allEntries()) {
  try {
    process.stdout.write(`${entry.path} ... `);
    const rec = await fetchEntry(entry);
    // nameFor MUST be localNameFor so the sentinel paths written into the MDX
    // match the filenames downloadMedia writes to disk.
    const { html: cleaned, images } = cleanHtml(rec.html, { baseUrl: ORIGIN, nameFor: localNameFor, resolvePath: resolveInternalPath });
    const html = applyCorrections(cleaned);
    allImages.push(...images);

    const dir = join(CONTENT_DIR, DIR_FOR[entry.type]);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${entry.slug}.md`), frontmatter(rec) + html + '\n', 'utf8');

    console.log(`ok (${rec.source}, ${images.length} images, ${html.length}b)`);
  } catch (err) {
    console.log(`FAILED — ${err.message}`);
    failures.push({ path: entry.path, error: err.message });
  }
}

console.log(`\nDownloading ${new Set(allImages).size} unique images...`);
await downloadMedia(allImages, MEDIA_DIR);

console.log(`\n${allEntries().length - failures.length}/${allEntries().length} entries migrated.`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  ${f.path}: ${f.error}`);
  process.exitCode = 1;
}
