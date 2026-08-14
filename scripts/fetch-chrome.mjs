// scripts/fetch-chrome.mjs
// Logos and favicons live in no page's content, so the Plan 1 migration never
// saw them. Fetch them explicitly.
import { downloadMedia } from './lib/media.mjs';

const BASE = 'https://ruckuscreative.com/wp-content/uploads';
// Verified 2026-08-14 against the live homepage: these sit at the uploads root,
// not under a year/month folder like the content media does.
const FILES = [
  'ruckus_logo_dark.png',
  'ruckus_logo_light.png',
  'footer-logo.jpg',
  'cropped-FAVICON-32x32.png',
  'cropped-FAVICON-180x180.png',
  'cropped-FAVICON-192x192.png',
  'cropped-FAVICON-270x270.png',
];

const dest = new URL('../src/assets/chrome/', import.meta.url).pathname;
const urls = FILES.map(f => `${BASE}/${f}`);
const map = await downloadMedia(urls, dest);
console.log(`\n${map.size} chrome assets in src/assets/chrome/`);
