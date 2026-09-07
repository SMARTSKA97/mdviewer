import { Injectable } from '@angular/core';
import { marked, Renderer } from 'marked';
import DOMPurify from 'dompurify';
import katex from 'katex';
import Prism from 'prismjs';

// Load extra languages for Prism
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';

import { DocumentStats, TocItem } from '../models/document.model';

@Injectable({
  providedIn: 'root'
})
export class MarkdownService {
  private customRenderer: Renderer;

  constructor() {
    this.customRenderer = new marked.Renderer();
    this.configureRenderer();
  }

  private headingSlugCounts = new Map<string, number>();

  private configureRenderer(): void {
    // Custom Heading with deduplicated slug IDs for TOC jumping
    this.customRenderer.heading = ({ text, depth }: { text: string; depth: number }) => {
      const rawText = text.replace(/<[^>]*>/g, '').trim();
      const baseSlug = this.slugify(rawText);
      const count = (this.headingSlugCounts.get(baseSlug) || 0) + 1;
      this.headingSlugCounts.set(baseSlug, count);

      const slug = count > 1 ? `${baseSlug}-${count - 1}` : baseSlug;
      return `<h${depth} id="${slug}" class="group relative">
        <a href="#${slug}" class="heading-anchor absolute -left-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-sky-400" aria-label="Link to ${rawText}">#</a>
        ${text}
      </h${depth}>`;
    };

    // Custom Code Block (with Prism highlight, Copy button, and Mermaid interception)
    this.customRenderer.code = ({ text, lang }: { text: string; lang?: string }) => {
      const language = (lang || '').trim().toLowerCase();

      // Mermaid diagram block
      if (language === 'mermaid') {
        const encodedCode = encodeURIComponent(text);
        return `<div class="mermaid-wrapper" data-mermaid="${encodedCode}">
          <div class="mermaid-loading">
            <svg class="animate-spin h-5 w-5 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span>Rendering diagram...</span>
          </div>
        </div>`;
      }

      // KaTeX math block (```math or ```latex)
      if (language === 'math' || language === 'latex' || language === 'katex') {
        try {
          const renderedMath = katex.renderToString(text, {
            displayMode: true,
            throwOnError: false
          });
          return `<div class="katex-block my-4 p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-center overflow-x-auto">${renderedMath}</div>`;
        } catch {
          // Fallback if error
        }
      }

      // Syntax highlighting with Prism
      let highlighted = text;
      if (language && Prism.languages[language]) {
        try {
          highlighted = Prism.highlight(text, Prism.languages[language], language);
        } catch {
          highlighted = this.escapeHtml(text);
        }
      } else {
        highlighted = this.escapeHtml(text);
      }

      const encodedSource = encodeURIComponent(text);
      const displayLang = language ? language.toUpperCase() : 'TEXT';

      return `<div class="code-block-wrapper">
        <div class="code-block-header">
          <span class="code-block-lang">${displayLang}</span>
          <button type="button" class="code-block-copy-btn" data-code="${encodedSource}" data-action="copy-code">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
            <span>Copy</span>
          </button>
        </div>
        <pre class="language-${language}"><code class="language-${language}">${highlighted}</code></pre>
      </div>`;
    };

    // Custom Image with parsed caption support (bold, italic in captions)
    this.customRenderer.image = ({ href, title, text }: { href: string; title?: string | null; text: string }) => {
      const parsedCaption = marked.parseInline(text || '');
      const cleanAlt = text.replace(/[*_`~]/g, '');
      const titleAttr = title ? ` title="${this.escapeHtml(title)}"` : '';

      return `<figure class="my-4 text-center">
        <img src="${href}" data-attachment-src="${href}" alt="${this.escapeHtml(cleanAlt)}"${titleAttr} class="rounded-lg max-w-full mx-auto shadow-md" />
        ${text ? `<figcaption class="text-xs text-slate-400 mt-2 font-medium">${parsedCaption}</figcaption>` : ''}
      </figure>`;
    };

    // Configure marked options
    marked.setOptions({
      renderer: this.customRenderer,
      gfm: true,
      breaks: true
    });
  }

  private static readonly KNOWN_HTML_TAGS = new Set([
    'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base', 'bdi', 'bdo', 'blockquote',
    'body', 'br', 'button', 'canvas', 'caption', 'cite', 'code', 'col', 'colgroup', 'data', 'datalist',
    'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'embed', 'fieldset', 'figcaption',
    'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hr', 'html',
    'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'link', 'main', 'map',
    'mark', 'meta', 'meter', 'nav', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p',
    'param', 'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script', 'section',
    'select', 'small', 'source', 'span', 'strong', 'style', 'sub', 'summary', 'sup', 'svg', 'table',
    'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track',
    'u', 'ul', 'var', 'video', 'wbr'
  ]);

  /**
   * Render raw markdown into safe, sanitized HTML with Math, Alerts, and Mermaid hooks
   */
  render(rawMarkdown: string): string {
    if (!rawMarkdown) return '';

    this.headingSlugCounts.clear();

    // 0. Extract YAML frontmatter block if present
    let frontmatterCardHtml = '';
    let textToProcess = rawMarkdown;

    const trimmedRaw = rawMarkdown.trimStart();
    if (trimmedRaw.startsWith('---')) {
      const match = trimmedRaw.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*/);
      if (match) {
        const yamlText = match[1];
        textToProcess = trimmedRaw.substring(match[0].length);

        const data: Record<string, any> = {};
        const yamlLines = yamlText.split(/\r?\n/);
        let currentKey: string | null = null;

        for (const line of yamlLines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;

          if (trimmed.includes(':')) {
            const parts = trimmed.split(':');
            const k = parts[0].trim();
            const rawV = parts.slice(1).join(':').trim();

            if (rawV === '') {
              currentKey = k;
              data[k] = [];
            } else if (rawV.startsWith('[') && rawV.endsWith(']')) {
              const items = rawV.substring(1, rawV.length - 1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
              data[k] = items;
              currentKey = null;
            } else {
              data[k] = rawV.replace(/^['"]|['"]$/g, '');
              currentKey = null;
            }
          } else if (trimmed.startsWith('- ') && currentKey && Array.isArray(data[currentKey])) {
            data[currentKey].push(trimmed.substring(2).trim().replace(/^['"]|['"]$/g, ''));
          }
        }

        frontmatterCardHtml = this.renderFrontmatterCard(data);
      }
    }

    // 1. Normalize global unicode artifacts & non-breaking spaces
    let text = textToProcess
      .replace(/[\u200B\u200C\u200D\uFEFF\u2060\u180E\u200E\u200F]/g, '')
      .replace(/[\u00A0\u202F\u2007\u2000-\u200A]/g, ' ')
      .replace(/\r\n/g, '\n');

    const tokenMap = new Map<string, string>();
    let tokenCounter = 0;

    // 2. Protect fenced code blocks (``` ... ```)
    text = text.replace(/(```[\s\S]*?```)/g, (match) => {
      const key = `@@FENCED_CODE_${tokenCounter++}@@`;
      tokenMap.set(key, match);
      return key;
    });

    // 3. Protect inline code spans (`...`)
    text = text.replace(/(`[^`\n]*?`)/g, (match) => {
      const key = `@@INLINE_CODE_${tokenCounter++}@@`;
      tokenMap.set(key, match);
      return key;
    });

    // 4. Line-level normalizations
    const lines = text.split('\n');
    const processedLines = lines.map(line => {
      let l = line;
      // A. Headings without space: "#Heading" -> "# Heading"
      l = l.replace(/^(#{1,6})([^\s#])/g, '$1 $2');
      // B. Blockquotes without space: ">Quote" -> "> Quote"
      l = l.replace(/^((?:>\s*)+)(?=[^\s>])/g, (m) => m.endsWith(' ') ? m : m + ' ');
      // C. Unicode bullets to standard '- ' (preserves indentation!)
      l = l.replace(/^([ \t]*)[•▪▫◦‣⁃∙●★✓✔►▶–—·○◆◇■□➢➜][ \t]*/g, '$1- ');
      // D. Numbered lists: "1) Item" -> "1. Item"
      l = l.replace(/^([ \t]*)(?:\((\d+)\)|(\d+)\))[ \t]+/g, '$1$2$3. ');
      // E. Task lists / Checkboxes: "- [] " -> "- [ ] "
      l = l.replace(/^([ \t]*[-*+])[ \t]*\[([ xX])\][ \t]*/g, '$1 [$2] ');
      return l;
    });
    text = processedLines.join('\n');

    // 5. Escape angle bracket placeholders like <Unique-GUID>, <Your-App-ID>, <GUID>, <host>
    text = text.replace(/<([A-Za-z0-9_./:-]+)>/g, (m, tag) => {
      const lowerTag = tag.toLowerCase();
      if (MarkdownService.KNOWN_HTML_TAGS.has(lowerTag) || lowerTag.startsWith('http://') || lowerTag.startsWith('https://') || lowerTag.includes('@')) {
        return m;
      }
      return `&lt;${tag}&gt;`;
    });

    // 6. Extract Math equations into clean token placeholders
    // Display math $$...$$
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, mathStr) => {
      const key = `@@KATEX_BLOCK_${tokenCounter++}@@`;
      try {
        const rendered = katex.renderToString(mathStr.trim(), { displayMode: true, throwOnError: false });
        tokenMap.set(key, `<div class="katex-display-math my-4 p-3 rounded-lg bg-slate-900/50 border border-slate-800 text-center overflow-x-auto">${rendered}</div>`);
      } catch {
        tokenMap.set(key, `$$${mathStr}$$`);
      }
      return `\n\n${key}\n\n`;
    });

    // Inline math $...$
    text = text.replace(/(?<!\\)\$([^\$\n]+?)\$/g, (_, mathStr) => {
      const key = `@@KATEX_INLINE_${tokenCounter++}@@`;
      try {
        const rendered = katex.renderToString(mathStr.trim(), { displayMode: false, throwOnError: false });
        tokenMap.set(key, `<span class="katex-inline-math">${rendered}</span>`);
      } catch {
        tokenMap.set(key, `$${mathStr}$`);
      }
      return key;
    });

    // 6.5 Parse Obsidian Wikilinks [[Note Title]] and [[Note Title|Display]]
    text = text.replace(/\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]/g, (_, targetNote, customDisplay) => {
      const rawTarget = targetNote.trim();
      const displayText = (customDisplay && customDisplay.trim()) ? customDisplay.trim() : rawTarget;
      const key = `@@WIKILINK_${tokenCounter++}@@`;
      const encodedTarget = encodeURIComponent(rawTarget);
      const encodedDisplay = encodeURIComponent(displayText);

      tokenMap.set(key, `<a href="#" data-wikilink="${encodedTarget}" data-wikititle="${encodedDisplay}" class="wikilink text-sky-400 hover:text-sky-300 underline font-medium cursor-pointer inline-flex items-center gap-1" title="Open wikilink: ${rawTarget}"><span>🔗</span><span>${displayText}</span></a>`);
      return key;
    });

    // 7. Inline delimiter and spacing repairs
    // Link/Image spacing: "[Text] (http...)" -> "[Text](http...)"
    text = text.replace(/(!?\[[^\]]*\])\s+(\([^\)]*\))/g, '$1$2');

    // Fix missing space before '(' or '[' when following closing bold:
    text = text.replace(/(\*\*|__)\((?=[^\s])/g, '$1 (');
    text = text.replace(/(\*\*|__|\*|_|~~)\[(?=[^\s])/g, '$1 [');

    // Bold delimiter repairs
    text = text.replace(/(\b\w+)\*\* +([^\n*]+?)\*\*([^\w*]|$)/g, '$1 **$2**$3');
    text = text.replace(/(^|[\s\(\[{<])\*\* +([^\s*][^\n*]*?)\*\*([^\w*]|$)/g, '$1**$2**$3');

    // Italic delimiter repairs
    text = text.replace(/(\b\w+)\* +([^\n*]+?)\*([^\w*]|$)/g, '$1 *$2*$3');
    text = text.replace(/(^|[\s\(\[{<])\* +([^\s*][^\n*]*?)\*([^\w*]|$)/g, '$1*$2*$3');

    // Underscore repairs
    text = text.replace(/(\b\w+)__ +([^\n_]+?)__([^\w_]|$)/g, '$1 __$2__$3');
    text = text.replace(/(\b\w+)_ +([^\n_]+?)_([^\w_]|$)/g, '$1 _$2_$3');
    text = text.replace(/(^|[\s\(\[{<])__ +([^\s_][^\n_]*?)__([^\w_]|$)/g, '$1__$2__$3');
    text = text.replace(/(^|[\s\(\[{<])_ +([^\s_][^\n_]*?)_([^\w_]|$)/g, '$1_$2_$3');

    // Closing spaces
    text = text.replace(/([A-Za-z0-9`"'\)\]]) +\*\*([\s.,:;!?\)\}\]]|$)/g, '$1**$2');
    text = text.replace(/([A-Za-z0-9`"'\)\]]) +\*([\s.,:;!?\)\}\]]|$)/g, '$1*$2');
    text = text.replace(/([A-Za-z0-9`"'\)\]]) +__([\s.,:;!?\)\}\]]|$)/g, '$1__$2');
    text = text.replace(/([A-Za-z0-9`"'\)\]]) +_([\s.,:;!?\)\}\]]|$)/g, '$1_$2');
    text = text.replace(/([A-Za-z0-9`"'\)\]]) +~~([\s.,:;!?\)\}\]]|$)/g, '$1~~$2');

    // 8. Restore inline code spans & fenced code blocks BEFORE alerts/marked parse
    for (const [key, val] of tokenMap.entries()) {
      if (key.startsWith('@@INLINE_CODE_') || key.startsWith('@@FENCED_CODE_')) {
        text = text.replace(key, val);
      }
    }

    // 9. Preprocess GitHub alerts using clean token placeholders
    const alertTypes = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'] as const;
    const icons: Record<string, string> = { NOTE: 'ℹ️', TIP: '💡', IMPORTANT: '⚡', WARNING: '⚠️', CAUTION: '🛑' };

    for (const type of alertTypes) {
      const regex = new RegExp(`>\\s*\\[!${type}\\][ \\t]*([^\\n\\r]*)(?:\\n|\\r\\n)((?:>.*(?:\\n|\\r\\n|$))+)`, 'gi');
      text = text.replace(regex, (_, customTitle, alertContent) => {
        const cleanAlertContent = alertContent
          .split(/\r?\n/)
          .map((line: string) => line.replace(/^>\s?/, ''))
          .join('\n')
          .trim();

        const parsedAlertBody = marked.parse(cleanAlertContent, { async: false }) as string;
        const titleText = (customTitle && customTitle.trim())
          ? marked.parseInline(customTitle.trim())
          : type;

        const key = `@@ALERT_${type}_${tokenCounter++}@@`;
        tokenMap.set(key, `<div class="markdown-alert markdown-alert-${type.toLowerCase()}">
          <div class="markdown-alert-title">
            <span>${icons[type]}</span>
            <span>${titleText}</span>
          </div>
          <div class="markdown-alert-content">${parsedAlertBody}</div>
        </div>`);
        return `\n\n${key}\n\n`;
      });
    }

    // 10. Parse Markdown to HTML
    let rawHtml = marked.parse(text, { async: false }) as string;

    // 11. Restore Math, Alert & Wikilink placeholders
    for (const [key, replacement] of tokenMap.entries()) {
      if (key.startsWith('@@KATEX_') || key.startsWith('@@ALERT_') || key.startsWith('@@WIKILINK_')) {
        rawHtml = rawHtml.replace(key, replacement);
      }
    }

    // 12. Sanitize with DOMPurify while preserving data attributes, math tags, and SVGs
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      ALLOW_DATA_ATTR: true,
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|blob|data|attachment):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      ADD_TAGS: [
        'iframe', 'svg', 'path', 'circle', 'line', 'rect', 'polygon', 'g', 'defs', 'use', 'clippath',
        'math', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'mover', 'munder', 'msqrt', 'mroot',
        'semantics', 'annotation', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'input', 'button', 'span', 'div',
        'figure', 'figcaption', 'strong', 'em', 'del', 'b', 'i'
      ],
      ADD_ATTR: [
        'data-attachment-src',
        'data-mermaid',
        'data-code',
        'data-action',
        'data-wikilink',
        'data-wikititle',
        'target',
        'id',
        'class',
        'style',
        'viewbox',
        'xmlns',
        'fill',
        'stroke',
        'stroke-width',
        'stroke-linecap',
        'stroke-linejoin',
        'd',
        'cx',
        'cy',
        'r',
        'x',
        'y',
        'width',
        'height',
        'aria-hidden',
        'disabled',
        'type',
        'checked',
        'src',
        'alt',
        'title'
      ]
    });

    return frontmatterCardHtml + cleanHtml;
  }

  private renderFrontmatterCard(data: Record<string, any>): string {
    const keys = Object.keys(data);
    if (keys.length === 0) return '';

    let itemsHtml = '';
    for (const key of keys) {
      const val = data[key];
      let valHtml = '';

      if (Array.isArray(val)) {
        valHtml = `<div class="flex flex-wrap gap-1">${val.map(v => `<span class="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono text-[11px]">#${this.escapeHtml(String(v))}</span>`).join('')}</div>`;
      } else if (key.toLowerCase() === 'status') {
        valHtml = `<span class="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium text-[11px]">${this.escapeHtml(String(val))}</span>`;
      } else if (key.toLowerCase() === 'priority') {
        valHtml = `<span class="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium text-[11px]">${this.escapeHtml(String(val))}</span>`;
      } else {
        valHtml = `<span class="text-slate-200 font-medium">${this.escapeHtml(String(val))}</span>`;
      }

      itemsHtml += `
        <div class="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950/40 border border-slate-800/60">
          <span class="text-[11px] font-semibold text-slate-400 uppercase font-mono shrink-0">${this.escapeHtml(key)}:</span>
          <div class="truncate text-xs">${valHtml}</div>
        </div>
      `;
    }

    return `<div class="document-frontmatter-card my-4 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-inner select-none font-sans">
      <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
        <span>🏷️</span>
        <span>Document Properties</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        ${itemsHtml}
      </div>
    </div>`;
  }

  /**
   * Extract Table of Contents (TOC) headings (H1 - H4)
   */
  extractToc(markdown: string): TocItem[] {
    if (!markdown) return [];

    const toc: TocItem[] = [];
    const lines = markdown.split('\n');
    const slugCounts = new Map<string, number>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^(#{1,4})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const rawTitle = match[2].trim().replace(/[*_`~]/g, '');
        const baseSlug = this.slugify(rawTitle);
        const count = (slugCounts.get(baseSlug) || 0) + 1;
        slugCounts.set(baseSlug, count);

        const id = count > 1 ? `${baseSlug}-${count - 1}` : baseSlug;

        toc.push({
          id,
          text: rawTitle,
          level,
          line: i + 1
        });
      }
    }

    return toc;
  }

  /**
   * Calculate document live statistics
   */
  calculateStats(text: string): DocumentStats {
    if (!text || !text.trim()) {
      return { words: 0, chars: 0, lines: 0, readingTimeMin: 0, headingsCount: 0 };
    }

    const chars = text.length;
    const lines = text.split('\n').length;
    
    // Words count (excluding markdown formatting characters)
    const cleanWords = text
      .replace(/[#*`_~\[\]\(\)\<\>]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 0);
    const words = cleanWords.length;

    // Average reading speed: 200 words per minute
    const readingTimeMin = Math.max(1, Math.ceil(words / 200));

    // Heading count
    const headingMatches = text.match(/^#{1,6}\s+/gm);
    const headingsCount = headingMatches ? headingMatches.length : 0;

    return { words, chars, lines, readingTimeMin, headingsCount };
  }

  /**
   * Generate slug for heading links
   */
  slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
