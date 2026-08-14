import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const seo = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  canonical: z.string().nullable(),
  ogImage: z.string().nullable(),
});

const base = {
  title: z.string(),
  path: z.string().regex(/^\/.*\/$|^\/$/, 'path must start and end with a slash'),
  seo,
  source: z.enum(['rest', 'dom']),
};

const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '**/*.md' }),
  schema: z.object({ ...base }),
});

const work = defineCollection({
  loader: glob({ base: './src/content/work', pattern: '**/*.md' }),
  schema: z.object({ ...base, client: z.string().nullable().default(null) }),
});

const knowledge = defineCollection({
  loader: glob({ base: './src/content/knowledge', pattern: '**/*.md' }),
  schema: z.object({ ...base, pubDate: z.coerce.date(), updatedDate: z.coerce.date().optional() }),
});

export const collections = { pages, work, knowledge };
