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
