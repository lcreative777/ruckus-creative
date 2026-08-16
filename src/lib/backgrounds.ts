// src/lib/backgrounds.ts
//
// Surf / ocean / mountain photography for the inner-page header bands,
// downloaded at build time by scripts/fetch-unsplash.mjs.
//
// The pick is deterministic per page rather than random per request: the site
// is static, so genuine per-load randomness would need client JS and would swap
// the image after paint. Hashing the path gives each page its own arbitrary —
// and stable — photograph, which reads as random across the site while staying
// consistent for any given page.
import manifest from '../data/backgrounds.json';

export interface BackgroundImage {
  file: string;
  query: string;
  alt: string;
  color: string;
  photographer: string;
  photographerUrl: string;
  photoUrl: string;
}

const images = manifest.images as BackgroundImage[];

/** Unsplash requires a link back to Unsplash itself alongside the photographer. */
export const unsplashUrl: string = manifest.unsplashUrl;

const files = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/backgrounds/*.{jpg,jpeg,png,webp,avif}',
  { eager: true },
);

const byFile = new Map<string, ImageMetadata>(
  Object.entries(files).map(([path, mod]) => [path.split('/').pop()!, mod.default]),
);

/** FNV-1a — small, stable, and dependency-free. Only needs to spread evenly. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

export interface ResolvedBackground {
  image: ImageMetadata;
  meta: BackgroundImage;
}

export function backgroundFor(key: string, index?: number): ResolvedBackground | null {
  if (images.length === 0) return null;
  // When the caller knows the page's position among its siblings (getStaticPaths
  // does), use it: that guarantees no two pages share a photograph until the
  // library runs out. Cross-page state cannot do this — Astro evaluates each
  // page as its own module, so any shared counter resets per page.
  // Falling back to a hash of the key keeps single-page callers working.
  const slot = typeof index === 'number' ? index % images.length : hash(key) % images.length;
  const meta = images[slot];
  const image = byFile.get(meta.file);
  if (!image) {
    console.warn(`[backgrounds] "${meta.file}" is in the manifest but not in src/assets/backgrounds/`);
    return null;
  }
  return { image, meta };
}
