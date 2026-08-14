import { load } from 'cheerio';
import { basename } from 'node:path';

// Salient ships its own shortcodes alongside WPBakery's [vc_*] set. Listed
// explicitly rather than matched generically, so that ordinary bracketed prose
// is never mistaken for markup.
const THEME_SHORTCODES = [
  'text_box', 'blog', 'hr', 'divider', 'button', 'toggle', 'tabs', 'tab',
  'image_with_animation', 'clients', 'testimonial', 'milestone', 'split_line_heading',
];

// WordPress smart-quotes shortcode attributes, and the REST API returns them
// entity-encoded (title=&#8221;...&#8221;) while the rendered DOM returns literal
// characters. Match every form, or the title is dropped along with the tag.
const QUOTE = '(?:["“”″]|&#8220;|&#8221;|&#8243;|&quot;)';

/**
 * Remove WPBakery and Salient shortcodes, keeping the content between them.
 *
 * Some shortcodes carry real content in their attributes — Salient's
 * [text_box title="..."] holds the section heading — so those are promoted to
 * real markup before the tag itself is discarded. Stripping blindly would
 * silently delete copy.
 */
export function stripShortcodes(text) {
  const names = THEME_SHORTCODES.join('|');

  return text
    // Promote a shortcode's title attribute to a real heading.
    .replace(new RegExp(`\\[(?:${names})\\b[^\\]]*?\\stitle=${QUOTE}(.+?)${QUOTE}[^\\]]*\\]`, 'gi'),
      (_, title) => (title.trim() ? `<h2>${title.trim()}</h2>` : ''))
    // [hr] and [divider] are genuine horizontal rules.
    .replace(/\[(?:hr|divider)\b[^\]]*\]/gi, '<hr>')
    // Everything else: drop the tag, keep whatever sat between the pair.
    .replace(/\[\/?vc_[a-z_]*(?:\s[^\]]*)?\]/gi, '')
    .replace(new RegExp(`\\[\\/?(?:${names})\\b(?:\\s[^\\]]*)?\\]`, 'gi'), '');
}

// Wrapper classes that carry no meaning once the page builder is gone.
// Salient lays pages out on a 12-column grid: `col span_6` is a half-width
// column, `span_4` a third, and so on. Stripping those collapsed every
// multi-column page into a single stacked column — the original /about/ is two
// columns and rebuilt as one. `col`, `span_N`, `row` and `col_last` are
// therefore LAYOUT, not decoration, and are preserved and restyled.
const LAYOUT_CLASS = /^(col|col_last|row|clear|span_\d+)$/;

// Salient renders feature icons as icon-font glyphs (`steadysets-icon-*`).
// The font is not shipped, so the class survives as a hook that CSS swaps for
// a close SVG substitute. Without this the icons vanish entirely.
const ICON_CLASS = /^(steadysets-|linecon-|iconsmind-|im-icon|icon-)/;

const JUNK_CLASS = /^(vc_|wpb_|nectar-|nectar_|column_|full-width|inner-wrap|row-bg)/;

// ids are kept so fragment navigation survives, but Salient emits generated
// (fws_<hash>) and structural (sidebar, portfolio-nav) ids that are meaningless
// once the theme is gone — and duplicating them across 20 portfolio pages would
// produce invalid markup.
const JUNK_ID = /^(fws_|sidebar|project-meta|portfolio-nav|prev-link|next-link|all-items|ajax-|header-|footer-)/;

// `id` is kept because Salient one-page navs rely on fragment links (#home, #work,
// #about on the homepage) — stripping it silently breaks in-page navigation.
// `data-bg` carries background images rescued from inline styles (see below).
const KEEP_ATTR = new Set([
  'href', 'src', 'alt', 'title', 'width', 'height', 'colspan', 'rowspan',
  'id', 'data-bg', 'data-band-color', 'rel', 'target',
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
 * @param {{baseUrl: string, nameFor?: (url: string) => string,
 *          resolvePath?: (path: string) => string|null}} opts
 *   `nameFor` maps an absolute image URL to its local filename. It MUST be the
 *   same function the downloader uses, or the sentinel paths written here will
 *   not match the files written to disk. Pass `localNameFor` from ./media.mjs.
 *   `resolvePath` maps an internal path onto a route this site builds; returning
 *   null means the target is gone and the link should be unwrapped. Pass
 *   `resolveInternalPath` from ./inventory.mjs.
 * @returns {{html: string, images: string[]}}
 */
export function cleanHtml(rawHtml, { baseUrl, nameFor = plainBasename, resolvePath = (p) => p }) {
  const $ = load(stripShortcodes(rawHtml), null, false);
  const images = [];

  $('script, style, noscript, iframe[src*="gravity"], .gform_wrapper').remove();

  // Salient stashes a video's URL in a bare <span> for its JS to read, then
  // hides it. Without that JS the raw URL renders as visible text under the
  // hero. It carries no content — the video id is passed to HeroVideo directly.
  // Only when the span stands alone: inside an anchor the URL is the link's
  // visible text, and removing it empties the anchor so the cleanup pass then
  // deletes the link itself.
  $('span').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    if (!/^https?:\/\/\S+$/.test(text)) return;
    if ($el.children().length > 0) return;
    if ($el.closest('a').length > 0) return;
    $el.remove();
  });

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

  // Salient paints a section's background on a `.row-bg` layer nested inside
  // `.row-bg-wrap`, while the section's content sits as a SIBLING of that wrap.
  // Setting the background on the layer itself paints an empty inner div, so
  // hoist it to the section element that contains both.
  const bgTarget = ($el) => {
    const wrap = $el.closest('.row-bg-wrap');
    if (wrap.length && wrap.parent().length) return wrap.parent();
    return $el.parent().length ? $el.parent() : $el;
  };

  // Row and hero imagery lives in inline `background-image`, not <img>. The
  // style attribute is stripped below, so capture the URL first and hand the
  // sentinel forward on `data-bg` — otherwise the image is lost with no trace.
  $('[style*="url("]').each((_, el) => {
    const $el = $(el);
    const match = /url\(\s*["']?([^)"']+?)["']?\s*\)/i.exec($el.attr('style') ?? '');
    if (!match) return;
    let abs;
    try { abs = new URL(match[1], baseUrl).href; } catch { return; }
    if (!abs.includes('/wp-content/uploads/')) return;   // ignore theme sprites and gradients
    if (!images.includes(abs)) images.push(abs);
    bgTarget($el).attr('data-bg', `@assets/media/${nameFor(abs)}`);
  });

  // Section background colours live in the same layer. Losing them flattened
  // the homepage: the "We Drive Growth" band is #b81e04 and rendered white.
  $('[style*="background-color"]').each((_, el) => {
    const $el = $(el);
    const match = /background-color:\s*([^;"']+)/i.exec($el.attr('style') ?? '');
    if (!match) return;
    const colour = match[1].trim();
    // #fff on a band is Salient's default, not a design choice — skip it so we
    // do not paint white over the page's own background.
    if (/^(#fff(fff)?|white|transparent|rgba\(0,\s*0,\s*0,\s*0\))$/i.test(colour)) return;
    bgTarget($el).attr('data-band-color', colour);
  });

  // Internal absolute links become root-relative; external links are left alone.
  // Legacy paths are remapped, and links whose target no longer exists anywhere
  // are unwrapped — keeping the text and image, dropping the dead anchor.
  $('a[href]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href');
    let resolved;
    try {
      const u = new URL(href, baseUrl);
      if (u.origin !== new URL(baseUrl).origin) return;   // external, leave alone
      resolved = resolvePath(u.pathname + u.search + u.hash);
    } catch {
      return;   // mailto:, tel:, and bare fragments are left untouched
    }
    if (resolved === null) $el.replaceWith($el.contents());
    else $el.attr('href', resolved);
  });

  // Drop presentational attributes everywhere.
  $('*').each((_, el) => {
    if (!el.attribs) return;
    // An <svg>'s attributes ARE the graphic — viewBox, d, fill. Stripping them
    // to the HTML keep-list leaves an empty box where an icon should be.
    if (el.name === 'svg' || $(el).closest('svg').length > 0) return;
    for (const name of Object.keys(el.attribs)) {
      if (name === 'id' && JUNK_ID.test(el.attribs.id)) { delete el.attribs.id; continue; }
      if (KEEP_ATTR.has(name)) continue;
      if (name === 'class') {
        const kept = (el.attribs.class || '')
          .split(/\s+/)
          .filter(c => c && (LAYOUT_CLASS.test(c) || ICON_CLASS.test(c) || !JUNK_CLASS.test(c)));
        if (kept.length) el.attribs.class = kept.join(' ');
        else delete el.attribs.class;
        continue;
      }
      delete el.attribs[name];
    }
  });

  // Salient's `.row` wrapper lives in the theme template, not in the page
  // content, so columns arrive as bare siblings with nothing to lay them out
  // against. Rebuild the wrapper around each run of consecutive columns.
  $('.col').each((_, el) => {
    const $el = $(el);
    if ($el.parent().hasClass('row')) return;          // already wrapped
    const run = [el];
    let next = $el.next();
    while (next.length && (next.hasClass('col') || next.hasClass('clear'))) {
      run.push(next[0]);
      next = next.next();
    }
    // Only a genuine multi-column group gets a row. Salient nests lone `col`
    // wrappers many levels deep (row_col_wrap_12 > col > child_column), and
    // wrapping each of those produced 41 nested flex containers on the
    // homepage where the original has one. A real column carries a span_N.
    const columns = run.filter(n => $(n).hasClass('col'));
    if (columns.length < 2) return;
    if (!columns.some(n => /\bspan_\d+/.test($(n).attr('class') ?? ''))) return;

    $(run[0]).before('<div class="row"></div>');
    const $row = $(run[0]).prev();
    run.forEach(node => $row.append(node));
  });

  // Unwrap divs that now hold nothing but a single child. Terminates because each
  // replaceWith removes one node, strictly decreasing the node count.
  // Divs carrying an id or a rescued background are load-bearing and stay put.
  let changed = true;
  while (changed) {
    changed = false;
    $('div').each((_, el) => {
      const $el = $(el);
      if ($el.attr('class') || $el.attr('id') || $el.attr('data-bg') || $el.attr('data-band-color')) return;
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
    if ($el.attr('data-bg') || $el.attr('data-band-color') || $el.attr('id')) return;
    if (!$el.text().trim()
        && $el.find('img, br, hr, svg, [data-bg], [data-band-color], i[class*="icon"], [class*="icon-"]').length === 0
        && !/\bicon\b|icon-/.test($el.attr('class') ?? '')) $el.remove();
  });

  const html = $.html().replace(/\n{3,}/g, '\n\n').trim();
  return { html, images };
}
