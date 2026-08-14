import { describe, it, expect } from 'vitest';
import { cleanHtml, stripShortcodes } from '../scripts/lib/html-to-content.mjs';
import { localNameFor } from '../scripts/lib/media.mjs';

// Regression: the cleaner and the downloader must agree on local filenames.
// Before nameFor existed, the cleaner always used the plain basename while the
// downloader disambiguated collisions, so two images sharing a filename produced
// MDX pointing at a file that was never written.
// Regression: both of these were confirmed lost on the live homepage — 3 background
// images (imac.jpg, seasm.jpg, ruckus_vid-1.jpg, the hero video poster) and the
// one-page nav anchors (#home, #work, #about).
describe('content that inline styles and ids carry', () => {
  it('rescues background images from inline styles', () => {
    const input = '<div class="row-bg" style="background-image: url(https://ruckuscreative.com/wp-content/uploads/2019/08/imac.jpg);"></div>';
    const { html, images } = cleanHtml(input, { baseUrl: 'https://ruckuscreative.com' });
    expect(images).toEqual(['https://ruckuscreative.com/wp-content/uploads/2019/08/imac.jpg']);
    expect(html).toContain('data-bg="@assets/media/imac.jpg"');
  });

  it('does not delete an element whose only content is a background image', () => {
    const input = '<div style="background-image:url(https://ruckuscreative.com/wp-content/uploads/a/hero.jpg)"></div>';
    const { html } = cleanHtml(input, { baseUrl: 'https://ruckuscreative.com' });
    expect(html).not.toBe('');
    expect(html).toContain('data-bg=');
  });

  it('ignores gradients and non-upload url() values', () => {
    const input = '<div style="background-image: linear-gradient(#000,#fff)"></div>'
      + '<div style="background:url(/wp-content/themes/salient/img/sprite.png)">x</div>';
    const { images } = cleanHtml(input, { baseUrl: 'https://ruckuscreative.com' });
    expect(images).toEqual([]);
  });

  it('preserves ids so fragment navigation keeps working', () => {
    const input = '<a href="https://ruckuscreative.com/#work">Work</a>'
      + '<div class="wpb_row" id="work"><p>Portfolio</p></div>';
    const { html } = cleanHtml(input, { baseUrl: 'https://ruckuscreative.com' });
    expect(html).toContain('href="/#work"');
    expect(html).toContain('id="work"');
  });

  it('drops generated and structural ids but keeps semantic anchors', () => {
    const input = '<div id="fws_6a7e9c0567133"><div id="portfolio-nav">nav</div>'
      + '<section id="work"><p>Work</p></section></div>';
    const { html } = cleanHtml(input, { baseUrl: 'https://ruckuscreative.com' });
    expect(html).not.toContain('fws_');
    expect(html).not.toContain('portfolio-nav');
    expect(html).toContain('id="work"');
  });

  it('keeps external link attributes', () => {
    const input = '<a href="https://example.com" target="_blank" rel="noopener">Ext</a>';
    const { html } = cleanHtml(input, { baseUrl: 'https://ruckuscreative.com' });
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener"');
  });
});

// Regression: stripping Salient's grid classes collapsed every multi-column
// page into one stacked column. The original /about/ is two span_6 columns.
describe('grid layout classes', () => {
  it('preserves col and span_N so multi-column layouts survive', () => {
    const input = '<div class="row"><div class="col span_6"><p>Left</p></div>'
      + '<div class="col span_6 col_last"><p>Right</p></div></div>';
    const { html } = cleanHtml(input, { baseUrl: 'https://ruckuscreative.com' });
    expect(html).toContain('class="row"');
    expect(html.match(/span_6/g)).toHaveLength(2);
    expect(html).toContain('col_last');
    expect(html).toContain('<p>Left</p>');
    expect(html).toContain('<p>Right</p>');
  });

  // Salient's .row wrapper lives in the theme template, not the page content,
  // so REST returns bare sibling columns with nothing to lay them out against.
  it('rebuilds the row wrapper around consecutive columns', () => {
    const input = '<div class="col span_6"><p>Left</p></div>'
      + '<div class="col span_6 col_last"><p>Right</p></div><div class="clear"></div>';
    const { html } = cleanHtml(input, { baseUrl: 'https://ruckuscreative.com' });
    expect(html).toContain('class="row"');
    expect(html.indexOf('class="row"')).toBeLessThan(html.indexOf('span_6'));
    expect(html.match(/class="row"/g)).toHaveLength(1);
  });

  it('does not wrap a column that is already inside a row', () => {
    const input = '<div class="row"><div class="col span_6"><p>x</p></div></div>';
    const { html } = cleanHtml(input, { baseUrl: 'https://ruckuscreative.com' });
    expect(html.match(/class="row"/g)).toHaveLength(1);
  });

  it('still strips decorative page-builder classes alongside them', () => {
    const input = '<div class="vc_row wpb_row row"><div class="col span_4 nectar-shadow"><p>x</p></div></div>';
    const { html } = cleanHtml(input, { baseUrl: 'https://ruckuscreative.com' });
    expect(html).toContain('span_4');
    expect(html).toContain('class="row"');
    expect(html).not.toContain('vc_row');
    expect(html).not.toContain('wpb_row');
    expect(html).not.toContain('nectar-shadow');
  });
});

describe('legacy internal paths', () => {
  const resolvePath = (p) => (p === '/portfolio/gone/' ? null : p.replace('/portfolio/', '/work/'));

  it('remaps a legacy path to its current route', () => {
    const { html } = cleanHtml('<a href="/portfolio/dos-equis/">Dos Equis</a>', {
      baseUrl: 'https://ruckuscreative.com', resolvePath,
    });
    expect(html).toContain('href="/work/dos-equis/"');
  });

  it('unwraps a link whose target no longer exists, keeping the content', () => {
    const { html } = cleanHtml('<a href="/portfolio/gone/"><img src="/x.jpg" alt="Gone"></a>', {
      baseUrl: 'https://ruckuscreative.com', resolvePath,
    });
    expect(html).not.toContain('<a');
    expect(html).toContain('alt="Gone"');
  });

  it('leaves external links untouched', () => {
    const { html } = cleanHtml('<a href="https://example.com/portfolio/x/">Ext</a>', {
      baseUrl: 'https://ruckuscreative.com', resolvePath,
    });
    expect(html).toContain('href="https://example.com/portfolio/x/"');
  });
});

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

  // Salient has its own shortcode set beyond WPBakery's [vc_*]. Found on the
  // live /knowledge/ and /portfolio-ruckus/ pages.
  it('removes salient theme shortcodes', () => {
    expect(stripShortcodes('[blog category="15,16" posts_per_page="7"]').trim()).toBe('');
  });

  it('promotes a title attribute to a heading instead of deleting it', () => {
    const input = '[text_box title="KNOWLEDGE BASE" icon=""]Intro copy.[/text_box]';
    const out = stripShortcodes(input);
    expect(out).toContain('<h2>KNOWLEDGE BASE</h2>');
    expect(out).toContain('Intro copy.');
    expect(out).not.toContain('[text_box');
  });

  it('handles the curly quotes wordpress writes into attributes', () => {
    const input = '[text_box title=”Tips, Tricks and Free Advice” icon=””]Body[/text_box]';
    const out = stripShortcodes(input);
    expect(out).toContain('<h2>Tips, Tricks and Free Advice</h2>');
    expect(out).not.toContain('[text_box');
  });

  // The REST API entity-encodes smart quotes while the rendered DOM does not.
  // This exact form appears in the live /knowledge/ page's REST response.
  it('handles entity-encoded quotes from the rest api', () => {
    const input = '[text_box title=&#8221;KNOWLEDGE BASE: Tips, Tricks&#8221; icon=&#8221;&#8221;]Body[/text_box]';
    const out = stripShortcodes(input);
    expect(out).toContain('<h2>KNOWLEDGE BASE: Tips, Tricks</h2>');
    expect(out).toContain('Body');
    expect(out).not.toContain('[text_box');
    expect(out).not.toContain('&#8221;');
  });

  it('converts hr and divider shortcodes to real rules', () => {
    expect(stripShortcodes('[hr]').trim()).toBe('<hr>');
    expect(stripShortcodes('[divider height="30"]').trim()).toBe('<hr>');
  });

  it('leaves ordinary bracketed prose alone', () => {
    const input = 'Revenue grew [see appendix] by 40%.';
    expect(stripShortcodes(input)).toBe(input);
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
