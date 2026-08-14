import { describe, it, expect } from 'vitest';
import { cleanHtml, stripShortcodes } from '../scripts/lib/html-to-content.mjs';
import { localNameFor } from '../scripts/lib/media.mjs';

// Regression: the cleaner and the downloader must agree on local filenames.
// Before nameFor existed, the cleaner always used the plain basename while the
// downloader disambiguated collisions, so two images sharing a filename produced
// MDX pointing at a file that was never written.
describe('image naming agrees with the downloader', () => {
  it('gives colliding basenames distinct sentinel paths', () => {
    const a = 'https://ruckuscreative.com/wp-content/uploads/2019/08/collide.png';
    const b = 'https://ruckuscreative.com/wp-content/uploads/2020/03/collide.png';
    const { html } = cleanHtml(`<img src="${a}"><img src="${b}">`, {
      baseUrl: 'https://ruckuscreative.com',
      nameFor: localNameFor,
    });
    const sentinels = html.match(/@assets\/media\/[^"]+/g);
    expect(new Set(sentinels).size).toBe(2);
    expect(sentinels).toEqual([
      `@assets/media/${localNameFor(a)}`,
      `@assets/media/${localNameFor(b)}`,
    ]);
  });

  it('defaults to the plain basename when no nameFor is supplied', () => {
    const { html } = cleanHtml(
      '<img src="https://ruckuscreative.com/wp-content/uploads/2019/08/solo.png">',
      { baseUrl: 'https://ruckuscreative.com' },
    );
    expect(html).toContain('src="@assets/media/solo.png"');
  });
});

describe('stripShortcodes', () => {
  it('removes wpbakery shortcodes but keeps inner text', () => {
    const input = '[vc_row][vc_column][vc_column_text]Hello world[/vc_column_text][/vc_column][/vc_row]';
    expect(stripShortcodes(input).trim()).toBe('Hello world');
  });

  it('removes shortcodes carrying attributes', () => {
    const input = '[vc_row type="in_container" text_align="left"]Keep me[/vc_row]';
    expect(stripShortcodes(input).trim()).toBe('Keep me');
  });
});

describe('cleanHtml', () => {
  it('drops salient wrapper divs but keeps semantic content', () => {
    const input = `<div class="vc_row wpb_row"><div class="wpb_column vc_column_container">
      <div class="wpb_wrapper"><h2>Our Process</h2><p>Some copy.</p></div></div></div>`;
    const { html } = cleanHtml(input, { baseUrl: 'https://ruckuscreative.com' });
    expect(html).toContain('<h2>Our Process</h2>');
    expect(html).toContain('<p>Some copy.</p>');
    expect(html).not.toContain('wpb_row');
    expect(html).not.toContain('vc_column_container');
  });

  it('strips inline style and data attributes', () => {
    const input = '<p style="color:#d93" data-animation="fade" class="wpb_text">Copy</p>';
    const { html } = cleanHtml(input, { baseUrl: 'https://ruckuscreative.com' });
    expect(html).not.toContain('style=');
    expect(html).not.toContain('data-animation');
  });

  it('collects image urls and rewrites them to local asset paths', () => {
    const input = '<img src="https://ruckuscreative.com/wp-content/uploads/2019/08/boxer.jpg" alt="Boxer">';
    const { html, images } = cleanHtml(input, { baseUrl: 'https://ruckuscreative.com' });
    expect(images).toEqual(['https://ruckuscreative.com/wp-content/uploads/2019/08/boxer.jpg']);
    expect(html).toContain('src="@assets/media/boxer.jpg"');
    expect(html).toContain('alt="Boxer"');
  });

  it('prefers the largest srcset candidate as the image source', () => {
    const input = `<img src="https://ruckuscreative.com/wp-content/uploads/a-300x200.jpg"
      srcset="https://ruckuscreative.com/wp-content/uploads/a-300x200.jpg 300w,
              https://ruckuscreative.com/wp-content/uploads/a-1200x800.jpg 1200w" alt="A">`;
    const { images } = cleanHtml(input, { baseUrl: 'https://ruckuscreative.com' });
    expect(images).toEqual(['https://ruckuscreative.com/wp-content/uploads/a-1200x800.jpg']);
  });

  it('rewrites internal absolute links to root-relative paths', () => {
    const input = '<a href="https://ruckuscreative.com/about/">About</a><a href="https://example.com/x">Ext</a>';
    const { html } = cleanHtml(input, { baseUrl: 'https://ruckuscreative.com' });
    expect(html).toContain('href="/about/"');
    expect(html).toContain('href="https://example.com/x"');
  });

  it('removes empty leftover elements', () => {
    const input = '<div class="wpb_wrapper"><div></div><p>  </p><p>Real</p></div>';
    const { html } = cleanHtml(input, { baseUrl: 'https://ruckuscreative.com' });
    expect(html).toContain('<p>Real</p>');
    expect(html.match(/<p>\s*<\/p>/)).toBeNull();
  });
});
