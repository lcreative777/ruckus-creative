// src/lib/content-page.ts
//
// The 7 standalone content pages (About, Capabilities, Process, Results,
// Contact, Privacy, Terms) migrated as flat runs of <p> tags with zero
// headings — see docs/design/cinema/handoff.md's problem statement. This
// module re-marks-up that existing text at build time. It never rewrites,
// reorders, or drops a single word: every paragraph in the source becomes
// exactly one classified block, and every block's renderable HTML is either
// the paragraph's original inner HTML verbatim, or a losslessly-repackaged
// version of it (a "– Item<br>" run becomes <li>– Item</li>, still carrying
// the same "– Item" text).
//
// Classification rules, verified by hand against all 7 pages
// (see the PR description / agent report for the page-by-page walkthrough):
//
//  1. LEAD       — the first block, if it contains <strong> and is long
//                   enough (>5 words) to be prose rather than a label.
//  2. DIVIDER     — a paragraph entirely wrapped in <em> (optionally also
//                   <strong>), short, with no lowercase letters — e.g.
//                   "BRAND ALIGNMENT PROCESS" / "IGNITION -7, CREATIVE KEYS
//                   TO SUCCESS" on the Process page.
//  3. CTA         — the LAST block, if it contains the site phone number.
//  4. HEADING     — a paragraph starting "<strong>LABEL:</strong>" (colon
//                   inside the strong — About/Capabilities/Process style),
//                   or "<strong>Label</strong><br>" (no colon, immediately
//                   followed by a line break — Privacy's style), or an
//                   entirely-bold paragraph of 5 words or fewer standing
//                   alone (Terms' "Introduction.", "No warranties." style;
//                   also catches Contact's "Ruckus Creative, llc" and its
//                   phone/fax line). If the remainder after the label is 2+
//                   lines all starting with an en dash, it's also flagged
//                   as a list (Capabilities' "– Websites<br>– Mobile sites…").
//  5. PULLQUOTE   — any other paragraph entirely wrapped in <strong>.
//  6. LIST        — a source <ul> — already real markup, passed through.
//  7. PLAIN       — everything else (mixed inline emphasis in running prose).
//
// Any paragraph that matches none of the above still renders — as PLAIN —
// per the hard "never drop copy" rule.
import { site } from '../data/site';

export type ContentBlock =
  | { kind: 'lead'; html: string }
  | { kind: 'divider'; html: string }
  | { kind: 'cta'; html: string }
  | { kind: 'pullquote'; html: string }
  | { kind: 'heading'; headingHtml: string; bodyHtml: string; items: string[] | null }
  | { kind: 'list'; items: string[] }
  | { kind: 'plain'; html: string };

// Matches the site phone number in any of the punctuation styles the
// migrated copy uses ("714-514-1482", "714.514.1482").
const PHONE_RE = /714[.\-\s]?514[.\-\s]?1482/g;

/** Wraps every occurrence of the site phone number in a `tel:` link. Never
 *  touches any other digits (e.g. Contact's fax number stays plain text). */
function linkifyPhone(html: string): string {
  return html.replace(PHONE_RE, (m) => `<a href="tel:${site.phoneE164}" class="tel-link">${m}</a>`);
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

function decodeEntities(s: string): string {
  return s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

function plainTextOf(html: string): string {
  return decodeEntities(stripTags(html)).replace(/\s+/g, ' ').trim();
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** True if `text` contains at least one letter and no lowercase letters —
 *  i.e. it reads as an authored all-caps label. */
function isShoutCase(text: string): boolean {
  return /[A-Z]/.test(text) && !/[a-z]/.test(text);
}

/** Splits a heading's remainder into either a list (2+ lines all starting
 *  with an en dash / hyphen) or plain prose body. Item text keeps its
 *  original leading dash verbatim — nothing is stripped, only re-tagged. */
function splitHeadingBody(remainder: string): { bodyHtml: string; items: string[] | null } {
  const trimmed = remainder.replace(/^\s*(<br\s*\/?>)?\s*/i, '').trim();
  if (!trimmed) return { bodyHtml: '', items: null };
  const lines = trimmed.split(/<br\s*\/?>/i).map((s) => s.trim()).filter(Boolean);
  const dashLines = lines.filter((l) => /^[–-]\s/.test(l));
  if (lines.length >= 2 && dashLines.length === lines.length) {
    return { bodyHtml: '', items: lines };
  }
  return { bodyHtml: trimmed, items: null };
}

/** Extracts top-level <p>...</p> and <ul>...</ul> blocks in document order,
 *  ignoring the legacy page-builder <div>/<hr> wrappers around them (none of
 *  the 7 pages nest a <p> or <ul> inside another one, so a non-greedy
 *  top-level match is safe and simpler than a real parser). */
function extractBlocks(html: string): Array<{ tag: 'p' | 'ul'; inner: string }> {
  const re = /<p>([\s\S]*?)<\/p>|<ul>([\s\S]*?)<\/ul>/g;
  const out: Array<{ tag: 'p' | 'ul'; inner: string }> = [];
  for (const m of html.matchAll(re)) {
    if (m[1] !== undefined) out.push({ tag: 'p', inner: m[1] });
    else out.push({ tag: 'ul', inner: m[2] });
  }
  // Safety net, in the spirit of home-content.ts's count assertions: if this
  // regex ever misses a paragraph (malformed/nested markup), fail the build
  // loudly instead of silently rendering fewer blocks than the source has.
  const rawCount = (html.match(/<p>/g) ?? []).length + (html.match(/<ul>/g) ?? []).length;
  if (out.length !== rawCount) {
    throw new Error(`content-page: extracted ${out.length} blocks but found ${rawCount} <p>/<ul> tags`);
  }
  return out;
}

const HEADING_COLON_RE = /^<strong>([^<:]+:)<\/strong>/;
const HEADING_BR_RE = /^<strong>([^<]+)<\/strong>\s*<br\s*\/?>/i;
const FULLY_BOLD_RE = /^<strong>[\s\S]*<\/strong>\.?$/;
const FULLY_EM_RE = /^<em>[\s\S]*<\/em>$/;
const FULLY_STRONG_EM_RE = /^<strong><em>[\s\S]*<\/em><\/strong>$/;

export function parseContentBlocks(bodyHtml: string): ContentBlock[] {
  const raw = extractBlocks(bodyHtml);
  const blocks: ContentBlock[] = [];

  raw.forEach(({ tag, inner }, i) => {
    const isLast = i === raw.length - 1;

    if (tag === 'ul') {
      const items = [...inner.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => linkifyPhone(m[1].trim()));
      blocks.push({ kind: 'list', items });
      return;
    }

    const trimmedInner = inner.trim();
    const plain = plainTextOf(trimmedInner);

    // 1. LEAD — first block, contains <strong>, reads as prose (not a label).
    if (i === 0 && /<strong>/.test(trimmedInner) && wordCount(plain) > 5) {
      blocks.push({ kind: 'lead', html: linkifyPhone(trimmedInner) });
      return;
    }

    // 2. DIVIDER — entirely <em> (optionally <strong><em>), short, all-caps.
    if ((FULLY_EM_RE.test(trimmedInner) || FULLY_STRONG_EM_RE.test(trimmedInner)) && isShoutCase(plain)) {
      blocks.push({ kind: 'divider', html: plain });
      return;
    }

    // 3. CTA — last block, contains the site phone number.
    if (isLast && PHONE_RE.test(plain)) {
      blocks.push({ kind: 'cta', html: linkifyPhone(trimmedInner) });
      return;
    }

    // 4a. HEADING — "<strong>LABEL:</strong>" prefix.
    const colonMatch = HEADING_COLON_RE.exec(trimmedInner);
    if (colonMatch) {
      const { bodyHtml, items } = splitHeadingBody(trimmedInner.slice(colonMatch[0].length));
      blocks.push({
        kind: 'heading',
        headingHtml: colonMatch[1],
        bodyHtml: linkifyPhone(bodyHtml),
        items,
      });
      return;
    }

    // 4b. HEADING — "<strong>Label</strong><br>" prefix (no colon), guarded
    // against matching a bare number (Contact's phone/fax line falls through
    // to the whole-paragraph fallback below instead).
    const brMatch = HEADING_BR_RE.exec(trimmedInner);
    if (brMatch && !/^[\d.\-\s]+$/.test(brMatch[1].trim())) {
      const { bodyHtml, items } = splitHeadingBody(trimmedInner.slice(brMatch[0].length));
      blocks.push({
        kind: 'heading',
        headingHtml: brMatch[1],
        bodyHtml: linkifyPhone(bodyHtml),
        items,
      });
      return;
    }

    // 5/4c. Entirely bold: a short standalone label is a HEADING (Terms'
    // "Introduction.", Contact's "Ruckus Creative, llc" and its phone/fax
    // line); anything longer is a PULLQUOTE (About/Results' rhetorical
    // one-liners).
    if (FULLY_BOLD_RE.test(trimmedInner)) {
      if (wordCount(plain) <= 5) {
        blocks.push({ kind: 'heading', headingHtml: linkifyPhone(trimmedInner), bodyHtml: '', items: null });
      } else {
        blocks.push({ kind: 'pullquote', html: linkifyPhone(trimmedInner) });
      }
      return;
    }

    // 7. PLAIN — everything else, verbatim (inline emphasis/<br> preserved).
    blocks.push({ kind: 'plain', html: linkifyPhone(trimmedInner) });
  });

  if (blocks.length === 0) {
    throw new Error('content-page: parsed zero blocks from a non-empty body');
  }
  return blocks;
}

/** Groups consecutive `heading` blocks (2 or more in a row) into a hairline
 *  grid, matching the homepage's Pillars/Capabilities/Stats convention.
 *  Non-consecutive headings (Privacy/Terms, where prose is interleaved
 *  between each one) are left as single blocks in the linear flow — that
 *  reflects the source structure exactly rather than inventing groupings it
 *  doesn't support. */
export type RenderItem =
  | { kind: 'group'; blocks: Extract<ContentBlock, { kind: 'heading' }>[] }
  | { kind: 'single'; block: ContentBlock };

export function groupHeadings(blocks: ContentBlock[]): RenderItem[] {
  const out: RenderItem[] = [];
  let run: Extract<ContentBlock, { kind: 'heading' }>[] = [];

  const flush = () => {
    if (run.length === 0) return;
    if (run.length >= 2) out.push({ kind: 'group', blocks: run });
    else out.push({ kind: 'single', block: run[0] });
    run = [];
  };

  for (const block of blocks) {
    if (block.kind === 'heading') {
      run.push(block);
    } else {
      flush();
      out.push({ kind: 'single', block });
    }
  }
  flush();
  return out;
}
