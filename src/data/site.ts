// src/data/site.ts
// Single source of truth for business identity. The live WordPress site renders
// three different suite numbers; 300-173 is the client-confirmed correct one
// (2026-08-14). Never copy this data from the live site.

export const site = {
  name: 'Ruckus Creative',
  legalName: 'Ruckus Creative, LLC',
  url: 'https://ruckuscreative.com',
  description: 'Business results through strategic creative. A full-service creative agency that creates results.',
  email: 'info@ruckuscreative.com',
  phone: '714.514.1482',
  phoneE164: '+17145141482',
  address: {
    street: '27525 Puerta Real, Suite 300-173',
    city: 'Mission Viejo',
    region: 'CA',
    postalCode: '92691',
    country: 'US',
  },
  founded: '1993',
  /**
   * Cloudflare Turnstile PUBLIC site key. Safe to commit — the matching secret
   * lives in a Worker secret (TURNSTILE_SECRET_KEY), never here.
   * Empty until the widget is created; the contact form renders without the
   * challenge and /api/contact fails closed with a 503 and the phone number,
   * rather than accepting unverified submissions.
   */
  turnstileSiteKey: '0x4AAAAAAER_mmbPuTjhndlO',
  /**
   * Geographic scope asserted in the AdvertisingAgency/LocalBusiness schema.
   * Client-confirmed (2026-08-16): California as the home market, with
   * nationwide US reach. schema.org takes areaServed as a list, so both are
   * stated — the narrower entry supports local/regional intent without
   * capping the business at the state line.
   */
  areaServed: [
    { type: 'State', name: 'California' },
    { type: 'Country', name: 'United States' },
  ],
  /**
   * Profiles emitted as schema.org sameAs. This is the strongest signal tying
   * the site to a verifiable entity, which is what answer and generative
   * engines lean on when deciding whether a brand is real and what it does.
   * Only add URLs that genuinely resolve — a sameAs pointing at a dead or
   * wrong profile damages entity resolution rather than helping it.
   */
  socials: [
    // The /company/ page, not the /in/ personal profile. sameAs asserts "this
    // is the same entity", and this node is typed AdvertisingAgency — pointing
    // it at a person's profile would claim the agency and that person are one
    // and the same, which is the confusion sameAs exists to prevent.
    { name: 'LinkedIn', url: 'https://www.linkedin.com/company/ruckus-creative' },
  ],
} as const;

/**
 * Service catalogue, emitted as schema.org OfferCatalog from Seo.astro and
 * available to any page that wants to render the same list.
 *
 * `name` is the term a person would search for; `alternateName` carries the
 * expansion so the acronym-led entries (AEO, GEO) are still machine-readable.
 * Kept here rather than inline in the JSON-LD so the marketing copy and the
 * structured data cannot drift apart.
 */
export const services = [
  {
    name: 'Branding',
    alternateName: 'Brand Development and Strategy',
    description:
      'Brand positioning, identity and messaging built to differentiate and drive business results.',
  },
  {
    name: 'SEO',
    alternateName: 'Search Engine Optimization',
    description:
      'Technical and content search optimization that earns durable organic visibility and qualified traffic.',
  },
  {
    name: 'AEO',
    alternateName: 'Answer Engine Optimization',
    description:
      'Structuring content and entities so answer engines and featured results surface the brand directly.',
  },
  {
    name: 'GEO',
    alternateName: 'Generative Engine Optimization',
    description:
      'Positioning a brand to be cited and recommended by generative AI assistants and LLM-powered search.',
  },
  {
    name: 'Web Design',
    alternateName: 'Website Design and Development',
    description:
      'Fast, accessible, conversion-focused websites designed around Core Web Vitals and search performance.',
  },
  {
    name: 'Website Maintenance',
    alternateName: 'Website Support and Security',
    description:
      'Ongoing updates, security hardening, monitoring and performance care that keep a site healthy.',
  },
  {
    name: 'Application Development',
    alternateName: 'Custom Web Application Development',
    description:
      'Custom web applications and integrations built to fit how a business actually operates.',
  },
] as const;

/**
 * Main navigation. The first six items target homepage sections; Knowledge
 * is the one standalone-page link the Cinema header adds. Contact is not
 * rendered as its own nav link in the Cinema header — it's reached through
 * the "Start a Ruckus" pill (see `ctaLink` below) — but stays in this list
 * since the mobile slide-out's contact block links back to it too.
 */
export const nav = [
  { label: 'Home', href: '/#home' },
  { label: 'Intro', href: '/#intro' },
  { label: 'Work', href: '/#work' },
  { label: 'About', href: '/#about' },
  { label: 'Services', href: '/#services' },
  { label: 'Contact', href: '/#contact' },
  { label: 'Knowledge', href: '/knowledge/' },
] as const;

/** "Start a Ruckus" pill target, top-right of the fixed header. */
export const ctaLink = { label: 'Start a Ruckus', href: '/#contact' } as const;

/** Footer legal links. */
export const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy-policy/' },
  { label: 'Terms and Conditions', href: '/terms-and-conditions/' },
] as const;

/**
 * Secondary nav shown beside knowledge posts. The live site renders these in a
 * span_3 sidebar next to the span_9 article column.
 */
export const sidebarLinks = [
  { label: 'Results', href: '/results-based-advertising-branding/' },
  { label: 'Portfolio', href: '/portfolio-ruckus/' },
  { label: 'Capabilities', href: '/strategic-creative-capabilities/' },
  { label: 'Process', href: '/process-ruckus-creative/' },
  { label: 'About', href: '/about/' },
] as const;
