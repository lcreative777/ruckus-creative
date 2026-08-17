export const ORIGIN = 'https://ruckuscreative.com';

const page = (slug, path) => ({ type: 'page', slug, path, url: ORIGIN + path });
const work = (slug) => ({ type: 'work', slug, path: `/work/${slug}/`, url: `${ORIGIN}/work/${slug}/` });
const post = (slug) => ({ type: 'knowledge', slug, path: `/${slug}/`, url: `${ORIGIN}/${slug}/` });

export const PAGES = [
  page('home', '/'),
  page('about', '/about/'),
  page('strategic-creative-capabilities', '/strategic-creative-capabilities/'),
  page('process-ruckus-creative', '/process-ruckus-creative/'),
  page('results-based-advertising-branding', '/results-based-advertising-branding/'),
  page('knowledge', '/knowledge/'),
  page('portfolio-ruckus', '/portfolio-ruckus/'),
  page('contact-ruckus-creative', '/contact-ruckus-creative/'),
  page('privacy-policy', '/privacy-policy/'),
  page('terms-and-conditions', '/terms-and-conditions/'),
];

export const WORK = [
  'colorgraphics', 'heineken', 'dual-graphics', 'fnic', 'future-fins',
  'kirin-brewery', 'metrex-research', 'national-planning-corp', 'qai-laboratories',
  'surf-rx', 'jwc-environmental', 'the-rms-group', 'tecate-cervesa',
  'touchpoint-marketing', 'us-pool-tile', 'sophia-redpeg-marketing',
  'universal-pool-tile', 'mayweather-the-best-ever-book', 'aqua-flo', 'dos-equis',
].map(work);

export const KNOWLEDGE = [
  'whats-your-point-let-your-prospects-say-no-as-long-as-they-know-what-you-offer',
  'print-is-expensive-dont-let-your-sales-team-waste-it-qualify-qualify-qualify',
  'advertising-is-for-profits',
  '3-2-1-using-pr-for-lift-off-and-lift',
  'ask-and-ye-shall-receive-get-a-response',
  'dont-just-say-it-prove-it',
  'three-strikes-youre-out-three-overused-taglines-to-avoid-at-all-costs',
  'clarity-create-an-unforgettable-brand',
  'differentiate-for-higher-profits-create-a-monopoly-and-raise-your-prices',
].map(post);

const to = (from, dest) => ({ from, to: dest, status: 301 });

export const REDIRECTS = [
  to('/contact/', '/contact-ruckus-creative/'),
  to('/category/news/', '/knowledge/'),
  to('/category/knowledge/', '/knowledge/'),
  // 8 Salient demo posts, all dated 2011
  to('/you-think-water-moves-fast/', '/knowledge/'),
  to('/airspeed-velocity-of-a-swallow/', '/knowledge/'),
  to('/when-do-spiders-sleep/', '/knowledge/'),
  to('/youre-the-expert-now/', '/knowledge/'),
  to('/a-matter-of-deductive-logic/', '/knowledge/'),
  to('/mauris-imperdiet-eros/', '/knowledge/'),
  to('/aliquam-at-dui-velit/', '/knowledge/'),
  to('/ut-placerat-egestas/', '/knowledge/'),
];

export function allEntries() {
  return [...PAGES, ...WORK, ...KNOWLEDGE];
}

const WORK_SLUGS = new Set(WORK.map(w => w.slug));

// Hand-verified against the live site. /portfolio-ruckus/ is a stale page still
// linking to the pre-rename /portfolio/* URLs; the live site 301s the ones that
// survive and 404s the rest. The .html link is a dead reference to the PR article.
const LEGACY_PATHS = new Map([
  ['/knowledge-pr-for-lift.html', '/3-2-1-using-pr-for-lift-off-and-lift/'],
]);

/**
 * Map a legacy internal path onto a route this site actually builds.
 * @returns {string|null} the resolved path, or null when the target no longer
 *   exists anywhere (the caller should unwrap the link rather than emit a 404).
 */
export function resolveInternalPath(path) {
  if (LEGACY_PATHS.has(path)) return LEGACY_PATHS.get(path);
  const portfolio = /^\/portfolio\/([a-z0-9-]+)\/$/.exec(path);
  if (portfolio) return WORK_SLUGS.has(portfolio[1]) ? `/work/${portfolio[1]}/` : null;
  return path;
}

/**
 * Verbatim corrections applied to migrated body copy.
 *
 * The live site carries three different suite numbers (300-173 on the homepage,
 * 100-173 on the contact page, 300-1733 in the footer). The client confirmed
 * Suite 300-173 as correct on 2026-08-14, so the wrong variants are fixed at
 * migration time rather than hand-edited — a hand edit would be clobbered by the
 * next migrate run.
 */
export const CONTENT_CORRECTIONS = [
  { find: /27525 Puerta Real,\s*Suite 100-173/g, replace: '27525 Puerta Real, Suite 300-173' },
  { find: /27525 Puerta Real,\s*Suite 300-1733/g, replace: '27525 Puerta Real, Suite 300-173' },
  // Missing space after the full stop in the Capabilities CTA. Deliberately
  // anchored on this exact sentence pair rather than a general /\.(?=[A-Z])/
  // rule: the content is full of legitimate full-stop-then-capital sequences
  // (initials, "U.S.", abbreviations) that such a rule would wreck.
  {
    find: /questions or comments\.We are here/g,
    replace: 'questions or comments. We are here',
  },
];

/** Apply every correction to a block of cleaned HTML. */
export function applyCorrections(html) {
  return CONTENT_CORRECTIONS.reduce((acc, c) => acc.replace(c.find, c.replace), html);
}
