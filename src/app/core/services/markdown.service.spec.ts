import { describe, beforeEach, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MarkdownService } from './markdown.service';

describe('MarkdownService', () => {
  let service: MarkdownService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MarkdownService]
    });
    service = TestBed.inject(MarkdownService);
  });

  it('should render markdown to sanitized HTML', () => {
    const raw = '# Hello World\n\nThis is a **test** document.';
    const html = service.render(raw);

    expect(html).toContain('<h1 id="hello-world"');
    expect(html).toContain('Hello World');
    expect(html).toContain('<strong>test</strong>');
  });

  it('should deduplicate duplicate heading slug IDs in HTML and TOC', () => {
    const markdown = '# Overview\n\nText 1\n\n# Overview\n\nText 2\n\n# Overview\n\nText 3';
    const html = service.render(markdown);
    const toc = service.extractToc(markdown);

    expect(html).toContain('id="overview"');
    expect(html).toContain('id="overview-1"');
    expect(html).toContain('id="overview-2"');

    expect(toc.length).toBe(3);
    expect(toc[0].id).toBe('overview');
    expect(toc[1].id).toBe('overview-1');
    expect(toc[2].id).toBe('overview-2');
  });

  it('should render code blocks with data-action="copy-code" and no inline onclick attribute', () => {
    const markdown = '```typescript\nconst a = 42;\n```';
    const html = service.render(markdown);

    expect(html).toContain('data-action="copy-code"');
    expect(html).not.toContain('onclick="window.__copyCodeBlock');
  });

  it('should calculate live document stats accurately', () => {
    const text = '# Title\n\nThis is a sample sentence containing several words.\n\n## Subheading';
    const stats = service.calculateStats(text);

    expect(stats.lines).toBe(5);
    expect(stats.headingsCount).toBe(2);
    expect(stats.words).toBeGreaterThan(5);
    expect(stats.chars).toBe(text.length);
  });

  it('should render GitHub alert callouts correctly', () => {
    const markdown = '> [!NOTE]\n> This is an important note alert.';
    const html = service.render(markdown);

    expect(html).toContain('markdown-alert');
    expect(html).toContain('markdown-alert-note');
    expect(html).toContain('This is an important note alert.');
  });

  it('should preserve attachment:// URIs and data-attachment-src in rendered images', () => {
    const markdown = '![Pasted Image](attachment://att-12345)';
    const html = service.render(markdown);

    expect(html).toContain('src="attachment://att-12345"');
    expect(html).toContain('data-attachment-src="attachment://att-12345"');
  });
});
