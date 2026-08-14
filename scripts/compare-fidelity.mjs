// scripts/compare-fidelity.mjs
//
// Fidelity sweep: fetch every migrated URL from both the live WordPress site and
// the rebuilt preview, extract each one's main content region, and diff the
// structural signals that matter — how much copy survived, which headings exist,
// how many images and links, and whether the column grid came through.
//
// This exists because spot-checking one page at a time missed four separate
// fidelity breaks. Structure is compared, not pixels: the bar is "no content or
// structure lost", which is what a page-by-page eyeball is bad at and a script
// is good at.
//
// Usage: node scripts/compare-fidelity.mjs [--preview <url>] [--json out.json]

import { load } from 'cheerio';
import { writeFile } from 'node:fs/promises';
import { allEntries, ORIGIN } from './lib/inventory.mjs';

const args = process.argv.slice(2);
// indexOf returns -1 when a flag is absent, and args[-1 + 1] is args[0] — which
// silently picks up whatever the first argument happens to be.
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1] ?? null;
};
const PREVIEW = flag('--preview') ?? 'https://ruckuscreative.ruckus-astro.workers.dev';
const JSON_OUT = flag('--json');

const UA = { 'User-Agent': 'ruckus-fidelity-check/1.0' };

async function fetchText(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
}

/** Strip chrome and return the content region for whichever site this is. */
function contentRegion(html, which) {
  const $ = load(html);
  $('script, style, noscript').remove();

  if (which === 'old') {
    // Salient wraps page content in .container.main-content inside
    // #ajax-content-wrap. Header, footer and the slide-out are outside it.
    $('#header-outer, #footer-outer, #slide-out-widget-area, #page-header-bg').remove();
    for (const sel of ['.container.main-content', '#ajax-content-wrap .container-wrap', '#ajax-content-wrap']) {
      const el = $(sel).first();
      if (el.length && el.text().trim()) return el;
    }
    return $('body');
  }

  // Rebuilt site: everything meaningful is inside <main>, minus our own chrome.
  // Take <main> whole rather than `.prose` — the page <h1> and the work title
  // band live in <article>/<div> outside `.prose`, and scoping to `.prose`
  // reported them as missing headings when they were simply out of range.
  $('.site-header, .site-footer').remove();
  const main = $('main').first();
  if (main.length && main.text().trim()) return main;
  return $('body');
}

const normalize = (s) => s.replace(/\s+/g, ' ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').trim();
const words = (s) => normalize(s).split(' ').filter(Boolean);

function profile($el, $) {
  const text = normalize($el.text());
  const headings = [];
  $el.find('h1, h2, h3').each((_, h) => {
    const t = normalize($(h).text());
    if (t) headings.push(t.slice(0, 60));
  });
  return {
    words: words(text).length,
    chars: text.length,
    headings,
    images: $el.find('img, picture').length,
    links: $el.find('a[href]').length,
    listItems: $el.find('li').length,
    paragraphs: $el.find('p').length,
    columns: $el.find('[class*="span_"]').length,
    text,
  };
}

/** Words present in the original that are absent from the rebuild. */
function missingPhrases(oldText, newText) {
  const newSet = new Set(words(newText.toLowerCase()));
  const missing = [];
  let run = [];
  for (const w of words(oldText.toLowerCase())) {
    if (newSet.has(w)) {
      if (run.length >= 6) missing.push(run.join(' '));
      run = [];
    } else {
      run.push(w);
    }
  }
  if (run.length >= 6) missing.push(run.join(' '));
  return missing;
}

const results = [];
console.log(`Comparing ${allEntries().length} pages\n${ORIGIN}  vs  ${PREVIEW}\n`);

for (const entry of allEntries()) {
  const row = { path: entry.path, type: entry.type };
  try {
    const [oldHtml, newHtml] = await Promise.all([
      fetchText(ORIGIN + entry.path),
      fetchText(PREVIEW + entry.path),
    ]);
    const $o = load(oldHtml);
    const $n = load(newHtml);
    const o = profile(contentRegion(oldHtml, 'old'), $o);
    const n = profile(contentRegion(newHtml, 'new'), $n);

    row.old = { words: o.words, headings: o.headings.length, images: o.images, links: o.links, cols: o.columns };
    row.new = { words: n.words, headings: n.headings.length, images: n.images, links: n.links, cols: n.columns };
    row.wordRatio = o.words ? +(n.words / o.words).toFixed(2) : null;
    row.missingHeadings = o.headings.filter(h => !n.headings.some(x => x.includes(h) || h.includes(x)));
    row.addedHeadings = n.headings.filter(h => !o.headings.some(x => x.includes(h) || h.includes(x)));
    row.missingPhrases = missingPhrases(o.text, n.text).slice(0, 3);

    const flags = [];
    if (row.wordRatio !== null && row.wordRatio < 0.9) flags.push(`COPY -${Math.round((1 - row.wordRatio) * 100)}%`);
    if (o.images > n.images) flags.push(`IMAGES ${n.images}/${o.images}`);
    if (row.missingHeadings.length) flags.push(`HEADINGS -${row.missingHeadings.length}`);
    if (o.columns > 0 && n.columns === 0) flags.push('COLUMNS LOST');
    row.flags = flags;
  } catch (err) {
    row.error = err.message;
    row.flags = ['FETCH FAILED'];
  }
  results.push(row);
  const status = row.flags.length ? `⚠  ${row.flags.join(', ')}` : 'ok';
  console.log(`${row.path.padEnd(46)} ${status}`);
}

console.log('\n' + '─'.repeat(78));
const bad = results.filter(r => r.flags.length);
console.log(`${results.length - bad.length}/${results.length} pages clean, ${bad.length} flagged\n`);

for (const r of bad) {
  console.log(`\n${r.path}`);
  if (r.error) { console.log(`  fetch failed: ${r.error}`); continue; }
  console.log(`  words   old=${r.old.words}  new=${r.new.words}  (${r.wordRatio}×)`);
  console.log(`  images  old=${r.old.images}  new=${r.new.images}     links old=${r.old.links} new=${r.new.links}`);
  console.log(`  columns old=${r.old.cols}  new=${r.new.cols}`);
  if (r.missingHeadings.length) console.log(`  missing headings: ${JSON.stringify(r.missingHeadings)}`);
  if (r.addedHeadings.length) console.log(`  added headings:   ${JSON.stringify(r.addedHeadings)}`);
  for (const p of r.missingPhrases) console.log(`  missing copy:     "${p.slice(0, 110)}…"`);
}

if (JSON_OUT) {
  await writeFile(JSON_OUT, JSON.stringify(results, null, 2));
  console.log(`\nFull results written to ${JSON_OUT}`);
}

process.exitCode = bad.length ? 1 : 0;
