// src/lib/images.ts
// Plan 1 wrote image references as the sentinel `@assets/media/<file>` — a
// deliberately non-resolving marker, so that Astro's asset pipeline (and not a
// plain <img>) handles every image. This maps a sentinel back to real
// ImageMetadata that astro:assets can optimize.

export const SENTINEL = '@assets/media/';

const media = import.meta.glob(
  '/src/assets/media/*.{jpg,jpeg,png,gif,webp,avif}',
  { eager: true },
) as Record<string, { default: ImageMetadata }>;

const byFilename = new Map<string, ImageMetadata>(
  Object.entries(media).map(([path, mod]) => [path.split('/').pop()!, mod.default]),
);

/**
 * Resolve a sentinel (or a bare filename) to ImageMetadata.
 * @returns null when no such file was migrated — the caller decides whether
 *   that is fatal. Never guess a substitute image.
 */
export function resolveMedia(ref: string): ImageMetadata | null {
  const filename = ref.startsWith(SENTINEL) ? ref.slice(SENTINEL.length) : ref;
  return byFilename.get(filename) ?? null;
}

/** Every migrated media filename. Used by tests and by the build-time audit. */
export function allMediaFilenames(): string[] {
  return [...byFilename.keys()].sort();
}
