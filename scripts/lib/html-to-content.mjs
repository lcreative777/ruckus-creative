import { load } from 'cheerio';
import { basename } from 'node:path';

/** Remove WPBakery shortcodes, keeping any text between them. */
export function stripShortcodes(text) {
  return text.replace(/\[\/?vc_[a-z_]*(?:\s[^\]]*)?\]/gi, '');
}

// Wrapper classes that carry no meaning once the page builder is gone.
const JUNK_CLASS = /^(vc_|wpb_|nectar-|nectar_|span_|col |column_|full-width|inner-wrap|row-bg)/;

// `id` is kept because Salient one-page navs rely on fragment links (#home, #work,
// #about on the homepage) — stripping it silently breaks in-page navigation.
// `data-bg` carries background images rescued from inline styles (see below).
const KEEP_ATTR = new Set([
  'href', 'src', 'alt', 'title', 'width', 'height', 'colspan', 'rowspan',
  'id', 'data-bg', 'rel', 'target',
]);

/** Pick the highest-resolution candidate from a srcset. */
function largestFromSrcset(srcset) {
  const best = srcset.split(',')
    .map(part => part.trim().split(/\s+/))
    .filter(p => p[0])
    .map(([url, dim]) => ({ url, w: parseInt(dim ?? '0', 10) || 0 }))
    .sort((a, b) => b.w - a.w)[0];
  return best?.url ?? null;
}

/** Default naming: the WordPress filename, unchanged. */
const plainBasename = (url) => basename(new URL(url).pathname);

/**
 * @param {string} rawHtml
 * @param {{baseUrl: string, nameFor?: (url: string) => string}} opts
 *   `nameFor` maps an absolute image URL to its local filename. It MUST be the
 *   same function the downloader uses, or the sentinel paths written here will
 *   not match the files written to disk. Pass `localNameFor` from ./media.mjs.
 * @returns {{html: string, images: string[]}}
 */
export function cleanHtml(rawHtml, { baseUrl, nameFor = plainBasename }) {
  const $ = load(stripShortcodes(rawHtml), null, false);
  const images = [];

  $('script, style, noscript, iframe[src*="gravity"], .gform_wrapper').remove();

  // Resolve images to their largest source, record them, point at local assets.
  $('img').each((_, el) => {
    const $el = $(el);
    const srcset = $el.attr('srcset');
    const chosen = (srcset && largestFromSrcset(srcset)) || $el.attr('src');
    if (!chosen) { $el.remove(); return; }
    const abs = new URL(chosen, baseUrl).href;
    if (!images.includes(abs)) images.push(abs);
    $el.attr('src', `@assets/media/${nameFor(abs)}`);
    $el.removeAttr('srcset').removeAttr('sizes').removeAttr('loading');
  });

  // WPBakery and Salient put hero and row imagery in inline `background-image`
  // styles rather than <img> tags. The style attribute is stripped below, so
  // capture those URLs first and hand the sentinel forward on `data-bg` —
  // otherwise the image is lost with no trace and no failing test.
  $('[style*="url("]').each((_, el) => {
    const $el = $(el);
    const match = /url\(\s*["']?([^)"']+?)["']?\s*\)/i.exec($el.attr('style') ?? '');
    if (!match) return;
    let abs;
    try { abs = new URL(match[1], baseUrl).href; } catch { return; }
    if (!abs.includes('/wp-content/uploads/')) return;   // ignore theme sprites and gradients
    if (!images.includes(abs)) images.push(abs);
    $el.attr('data-bg', `@assets/media/${nameFor(abs)}`);
  });

  // Internal absolute links become root-relative; external links are left alone.
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    try {
      const u = new URL(href, baseUrl);
      if (u.origin === new URL(baseUrl).origin) $(el).attr('href', u.pathname + u.search + u.hash);
    } catch { /* mailto:, tel:, and fragments are left untouched */ }
  });

  // Drop presentational attributes everywhere.
  $('*').each((_, el) => {
    if (!el.attribs) return;
    for (const name of Object.keys(el.attribs)) {
      if (KEEP_ATTR.has(name)) continue;
      if (name === 'class') {
        const kept = (el.attribs.class || '').split(/\s+/).filter(c => c && !JUNK_CLASS.test(c));
        if (kept.length) el.attribs.class = kept.join(' ');
        else delete el.attribs.class;
        continue;
      }
      delete el.attribs[name];
    }
  });

  // Unwrap divs that now hold nothing but a single child. Terminates because each
  // replaceWith removes one node, strictly decreasing the node count.
  // Divs carrying an id or a rescued background are load-bearing and stay put.
  let changed = true;
  while (changed) {
    changed = false;
    $('div').each((_, el) => {
      const $el = $(el);
      if ($el.attr('class') || $el.attr('id') || $el.attr('data-bg')) return;
      if ($el.children().length !== 1) return;
      $el.replaceWith($el.children());
      changed = true;
    });
  }

  // Remove elements left empty by the cleanup. An element holding only a
  // background image has no text and no child img, so check data-bg explicitly
  // or the rescued hero sections get deleted right after being rescued.
  $('div, p, span, section').each((_, el) => {
    const $el = $(el);
    if ($el.attr('data-bg') || $el.attr('id')) return;
    if (!$el.text().trim() && $el.find('img, br, hr, [data-bg]').length === 0) $el.remove();
  });

  const html = $.html().replace(/\n{3,}/g, '\n\n').trim();
  return { html, images };
}
