import { mkdir, writeFile, access } from 'node:fs/promises';
import { join, basename, dirname } from 'node:path';

const seenNames = new Map();   // filename -> source url that claimed it

export function dedupe(urls) {
  return [...new Set(urls)];
}

/**
 * Local filename for a remote image. Collisions across upload months get a
 * month prefix so that 2019/08/logo.png and 2020/03/logo.png stay distinct.
 */
export function localNameFor(url) {
  const path = new URL(url).pathname;
  const name = basename(path);
  const claimed = seenNames.get(name);
  if (!claimed || claimed === url) { seenNames.set(name, url); return name; }
  const m = path.match(/\/(\d{4})\/(\d{2})\//);
  return m ? `${m[1]}${m[2]}-${name}` : `${Buffer.from(dirname(path)).toString('hex').slice(0, 6)}-${name}`;
}

/**
 * NOTE: src/assets/media/imac.jpg is committed CROPPED to its right half. The
 * WordPress original is 1900x931 with a blank white left half and the iMac on
 * the right; the homepage intro band shows it left-anchored in a half-width
 * column, so the blank half had to go. Re-running the migration re-downloads
 * the uncropped original — re-crop it, or the intro band shows empty space.
 *
 * Download every url into destDir, skipping files already present.
 * @returns {Promise<Map<string,string>>} url -> local filename
 */
export async function downloadMedia(urls, destDir) {
  await mkdir(destDir, { recursive: true });
  const map = new Map();
  for (const url of dedupe(urls)) {
    const name = localNameFor(url);
    const dest = join(destDir, name);
    map.set(url, name);
    try { await access(dest); continue; } catch { /* not cached yet */ }
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'ruckus-migration/1.0' } });
      if (!res.ok) { console.warn(`  ! ${res.status} ${url}`); continue; }
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
      console.log(`  ↓ ${name}`);
    } catch (err) {
      console.warn(`  ! failed ${url}: ${err.message}`);
    }
  }
  return map;
}
