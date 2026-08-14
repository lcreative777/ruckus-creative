import { load } from 'cheerio';
import { basename } from 'node:path';

/** Remove WPBakery shortcodes, keeping any text between them. */
export function stripShortcodes(text) {
  return text.replace(/\[\/?vc_[a-z_]*(?:\s[^\]]*)?\]/gi, '');
}

// Wrapper classes that carry no meaning once the page builder is gone.
const JUNK_CLASS = /^(vc_|wpb_|nectar-|nectar_|span_|col |column_|full-width|inner-wrap|row-bg)/;

const KEEP_ATTR = new Set(['href', 'src', 'alt', 'title', 'width', 'height', 'colspan', 'rowspan']);

/** Pick the highest-resolution candidate from a srcset. */
function largestFromSrcset(srcset) {
  const best = srcset.split(',')
    .map(part => part.trim().split(/\s+/))
    .filter(p => p[0])
    .map(([url, dim]) => ({ url, w: parseInt(dim ?? '0', 10) || 0 }))
    .sort((a, b) => b.w - a.w)[0];
  return best?.url ?? null;
}

/**
 * @param {string} rawHtml
 * @param {{baseUrl: string}} opts
 * @returns {{html: string, images: string[]}}
 */
export function cleanHtml(rawHtml, { baseUrl }) {
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
    $el.attr('src', `@assets/media/${basename(new URL(abs).pathname)}`);
    $el.removeAttr('srcset').removeAttr('sizes').removeAttr('loading');
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

  // Unwrap divs that now hold nothing but a single child.
  let changed = true;
  while (changed) {
    changed = false;
    $('div').each((_, el) => {
      const $el = $(el);
      if (!$el.attr('class') && $el.children().length === 1 && !$el.text().trim().startsWith('<')) {
        $el.replaceWith($el.children());
        changed = true;
      }
    });
  }

  // Remove elements left empty by the cleanup.
  $('div, p, span, section').each((_, el) => {
    const $el = $(el);
    if (!$el.text().trim() && $el.find('img, br, hr').length === 0) $el.remove();
  });

  const html = $.html().replace(/\n{3,}/g, '\n\n').trim();
  return { html, images };
}
