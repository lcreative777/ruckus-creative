// src/lib/work-content.ts
//
// The Cinema work case-study template (src/pages/work/[slug].astro) needs
// the entry's migrated body split into a "brief" column and an "images"
// column, plus the previous-project link carried in the old bottom_controls
// nav. Inspecting all 20 src/content/work/*.md bodies shows one consistent
// structure: a single `.post-area.col.span_9` block holding the case
// photography, and a `.col.span_3.col_last` block holding one <p> per meta
// line — so splitting on those two blocks is a structural extraction of
// real, already-migrated DOM, not an invented one.
//
// What is NOT uniform across the 20 is the shape *inside* the meta
// paragraphs: some are `<strong>LABEL:</strong> value`, some fold the
// value's first words into the strong tag itself
// (`<strong>CLIENT: ColorGraphics</strong> – Premium…`), one has a stray
// `<strong>&nbsp;</strong>` before its real label, and a couple carry extra
// unlabeled paragraphs continuing a quote (dual-graphics, jwc-environmental).
// Parsing that into clean label/value pairs would mean inventing structure
// the source doesn't reliably have. So this stops at paragraph granularity —
// every <p> becomes one hairline-separated brief block — and lets the
// template's CSS style whichever leading <strong> a paragraph happens to
// have as a label. No copy is reordered, summarized, or split mid-sentence.
export interface CaseStudyParts {
  imagesHtml: string;
  briefHtml: string;
  prevSlug: string | null;
}

export function parseCaseStudy(body: string, slug: string): CaseStudyParts {
  const imgBlock = /<div class="post-area col span_9">([\s\S]*?)<\/div><!--\/post-area-->/.exec(body);
  if (!imgBlock) {
    throw new Error(`work-content: "${slug}" has no .post-area.col.span_9 image block`);
  }

  const metaBlock = /<div class="col span_3 col_last">([\s\S]*?)<\/div><!--\/sidebar-->/.exec(body);
  if (!metaBlock) {
    throw new Error(`work-content: "${slug}" has no .col.span_3.col_last meta block`);
  }
  const paragraphs = [...metaBlock[1].matchAll(/<p>[\s\S]*?<\/p>/g)].map((m) => m[0]);
  if (paragraphs.length === 0) {
    throw new Error(`work-content: "${slug}" meta block has no <p> fields`);
  }

  // The migrated bottom_controls nav labels the chronologically-previous
  // case "Previous Project" on an <a rel="next">; the first project in the
  // sequence (us-pool-tile) has an empty <li></li> in that slot instead.
  const prevMatch = /<a href="\/work\/([^/]+)\/" rel="next">\s*<i[^>]*><\/i>\s*<span>Previous Project<\/span>/.exec(body);

  return {
    imagesHtml: imgBlock[1].trim(),
    briefHtml: paragraphs.join('\n'),
    prevSlug: prevMatch ? prevMatch[1] : null,
  };
}
