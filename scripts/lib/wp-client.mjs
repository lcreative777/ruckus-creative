import { load } from 'cheerio';
import { ORIGIN } from './inventory.mjs';

export const REST_TYPE = { page: 'pages', knowledge: 'posts', work: 'portfolio' };

/** Decide whether REST content is usable, or whether we must scrape the rendered page. */
export function pickSource(restJson) {
  if (!Array.isArray(restJson) || restJson.length === 0) return 'dom';
  const html = restJson[0]?.content?.rendered ?? '';
  if (html.trim() === '') return 'dom';
  if (html.includes('[vc_')) return 'dom';   // WPBakery shortcodes are not rendered by REST
  return 'rest';
}

async function getText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'ruckus-migration/1.0' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

/** Pull Rank Math / Open Graph metadata out of a rendered page's <head>. */
export function extractSeo(renderedHtml) {
  const $ = load(renderedHtml);
  const meta = (sel, attr = 'content') => $(sel).attr(attr) ?? null;
  return {
    title: $('head > title').text().trim() || null,
    description: meta('meta[name="description"]'),
    canonical: meta('link[rel="canonical"]', 'href'),
    ogImage: meta('meta[property="og:image"]'),
    ogTitle: meta('meta[property="og:title"]'),
    ogDescription: meta('meta[property="og:description"]'),
  };
}

/** Pull the main content region out of a fully rendered Salient page. */
export function extractMainContent(renderedHtml) {
  const $ = load(renderedHtml);
  $('script, style, noscript, #header-outer, #footer-outer, #slide-out-widget-area').remove();
  const candidates = ['#ajax-content-wrap .container-wrap', '.main-content', '#content', 'main'];
  for (const sel of candidates) {
    const el = $(sel).first();
    if (el.length && el.html()?.trim()) return el.html();
  }
  return $('body').html() ?? '';
}

/**
 * Fetch one inventory entry.
 * Always fetches the rendered page (SEO metadata only lives there),
 * and additionally uses REST content when it is clean.
 */
export async function fetchEntry(entry) {
  const rendered = await getText(entry.url);
  const seo = extractSeo(rendered);

  let restJson = null;
  try {
    const type = REST_TYPE[entry.type];
    const slug = entry.slug === 'home' ? '' : entry.slug;
    if (slug) {
      const raw = await getText(`${ORIGIN}/wp-json/wp/v2/${type}?slug=${encodeURIComponent(slug)}`);
      restJson = JSON.parse(raw);
    }
  } catch {
    restJson = null;   // REST unavailable for this type; DOM path handles it
  }

  const source = pickSource(restJson);
  const rec = Array.isArray(restJson) ? restJson[0] : null;

  const html = source === 'rest'
    ? rec.content.rendered
    : extractMainContent(rendered);

  return {
    entry,
    title: rec?.title?.rendered ?? seo.ogTitle ?? seo.title ?? entry.slug,
    date: rec?.date ?? null,
    modified: rec?.modified ?? null,
    html,
    source,
    seo,
  };
}
