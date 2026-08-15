// src/lib/home-content.ts
//
// The homepage sections in src/components/home/ are driven by the migrated
// body of src/content/pages/home.md rather than retyped copy, wherever the
// source markup is repetitive enough to parse reliably: the work grid,
// pillars, process rail, capabilities, testimonials and stat numbers.
// One-off prose blocks (Intro lead, Statement, Why Us, CTA) are authored
// directly in their components, transcribed verbatim from the same file —
// parsing free-form prose for a single occurrence buys nothing.
//
// Every parser asserts the count it expects. If the source markup ever
// changes shape, that's a loud build failure here rather than a silently
// empty section.
import { getCollection } from 'astro:content';

let cachedBody: string | null = null;

async function homeBody(): Promise<string> {
  if (cachedBody !== null) return cachedBody;
  const entry = (await getCollection('pages')).find((p) => p.data.path === '/');
  if (!entry) throw new Error('home-content: no pages entry with path "/"');
  cachedBody = entry.body ?? '';
  return cachedBody;
}

/** Un-escapes the handful of HTML entities that survive in home.md's body. */
function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
}

export interface WorkTile {
  slug: string;
  title: string;
  thumbnail: string;
}

/** The 20 work tiles, verbatim and in the order the migrated homepage lists them. */
export async function getWorkTiles(): Promise<WorkTile[]> {
  const body = await homeBody();
  const itemRe = /<div class="work-item style-4">([\s\S]*?)<\/div><!--work-item-->/g;
  const tiles: WorkTile[] = [];
  for (const [, block] of body.matchAll(itemRe)) {
    const thumbnail = /src="@assets\/media\/([^"]+)"/.exec(block)?.[1];
    const slug = /href="\/work\/([^/]+)\/"/.exec(block)?.[1];
    const title = /<h3>([^<]*)<\/h3>/.exec(block)?.[1]?.trim();
    if (!thumbnail || !slug || !title) {
      throw new Error(`home-content: work tile missing data — ${block.slice(0, 80)}…`);
    }
    tiles.push({ slug, title: decodeEntities(title), thumbnail });
  }
  if (tiles.length !== 20) {
    throw new Error(`home-content: expected 20 work tiles, found ${tiles.length}`);
  }
  return tiles;
}

export interface Pillar {
  title: string;
  body: string;
}

/** The 3 "We Drive Growth" / "We're Creative Opportunist" / "We're Focused on Success" cells. */
export async function getPillars(): Promise<Pillar[]> {
  const body = await homeBody();
  const re = /<h5>([^<]+)<\/h5>\s*<p>([^<]+)<\/p>/g;
  const pillars = [...body.matchAll(re)].map((m) => ({
    title: decodeEntities(m[1]),
    body: decodeEntities(m[2]),
  }));
  if (pillars.length !== 3) {
    throw new Error(`home-content: expected 3 pillars, found ${pillars.length}`);
  }
  return pillars;
}

export interface ProcessStep {
  title: string;
  body: string;
}

/** The 5 Brand Alignment Process™ steps: FOUNDATION → EVALUATION. */
export async function getProcessSteps(): Promise<ProcessStep[]> {
  const body = await homeBody();
  const start = body.indexOf('id="about"');
  const end = body.indexOf('Why Us?');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('home-content: could not locate the process rail region');
  }
  const region = body.slice(start, end);
  const re = /<h4>([^<]+)<\/h4>\s*<p>([^<]+)<\/p>/g;
  const steps = [...region.matchAll(re)].map((m) => ({
    title: decodeEntities(m[1]),
    body: decodeEntities(m[2]),
  }));
  if (steps.length !== 5) {
    throw new Error(`home-content: expected 5 process steps, found ${steps.length}`);
  }
  return steps;
}

/**
 * Services the client added after the WordPress migration.
 *
 * These are NOT in home.md, and they must not be written back into it — the
 * migration is re-runnable and would overwrite the file. Applying them here
 * keeps the parsed source untouched while still rendering the current service
 * list. `replace` swaps an existing line; `add` appends new ones.
 */
const CAPABILITY_UPDATES: Record<string, { replace?: Record<string, string>; add?: string[] }> = {
  'Online': { add: ['Website Security', 'Website Maintenance'] },
  'Online Marketing': { replace: { 'SEO': 'SEO / AEO / GEO' } },
};

function applyCapabilityUpdates(groups: CapabilityGroup[]): CapabilityGroup[] {
  return groups.map((group) => {
    const update = CAPABILITY_UPDATES[group.title];
    if (!update) return group;
    let items = group.items;
    if (update.replace) {
      items = items.map((item) => update.replace![item] ?? item);
    }
    if (update.add) {
      items = [...items, ...update.add.filter((extra) => !items.includes(extra))];
    }
    return { ...group, items };
  });
}

export interface CapabilityGroup {
  title: string;
  items: string[];
}

/** The 6 capability blocks (Online, Online Marketing, Print, Presentations, Brand Development, Event Marketing). */
export async function getCapabilityGroups(): Promise<CapabilityGroup[]> {
  const body = await homeBody();
  const start = body.indexOf('<h2>Capabilities</h2>');
  const end = body.indexOf('Get ready to stand out');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('home-content: could not locate the capabilities region');
  }
  const region = body.slice(start, end);
  const re = /<h4>([^<]+)<\/h4>\s*<p>([\s\S]*?)<\/p>/g;
  const groups = [...region.matchAll(re)].map((m) => ({
    title: decodeEntities(m[1]),
    items: m[2]
      .split('<br>')
      .map((s) => decodeEntities(s.replace(/^\s*[–-]\s*/, '').trim()))
      .filter(Boolean),
  }));
  if (groups.length !== 6) {
    throw new Error(`home-content: expected 6 capability groups, found ${groups.length}`);
  }
  return applyCapabilityUpdates(groups);
}

export interface Quote {
  name: string;
  title: string;
  body: string;
}

/** All 8 testimonials, verbatim and in source order, including its own inconsistencies. */
export async function getTestimonials(): Promise<Quote[]> {
  const body = await homeBody();
  const re =
    /<blockquote> <div class="image-icon">.<\/div> <p>([\s\S]*?)<\/p><span class="testimonial-name">([^<]*)<\/span><span class="title">([^<]*)<\/span><\/blockquote>/g;
  const quotes = [...body.matchAll(re)].map((m) => ({
    body: decodeEntities(m[1].trim()),
    name: decodeEntities(m[2].trim()),
    title: decodeEntities(m[3].trim()),
  }));
  if (quotes.length !== 8) {
    throw new Error(`home-content: expected 8 testimonials, found ${quotes.length}`);
  }
  return quotes;
}

export interface Stat {
  value: number;
  label: string;
}

/** The 2 counted stats (Pixels Pushed, Projects Completed) — raw numbers, formatted by the caller. */
export async function getStats(): Promise<Stat[]> {
  const body = await homeBody();
  const re = /<span>(\d+)<\/span><\/div> <div class="subject">([^<]+)<\/div>/g;
  const stats = [...body.matchAll(re)].map((m) => ({
    value: Number(m[1]),
    label: decodeEntities(m[2]),
  }));
  if (stats.length !== 2) {
    throw new Error(`home-content: expected 2 stats, found ${stats.length}`);
  }
  return stats;
}
