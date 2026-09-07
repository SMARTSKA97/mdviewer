import { Injectable, inject } from '@angular/core';
import { ThemeService } from './theme.service';
import { FileService } from './file.service';
import { MermaidService } from './mermaid.service';
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  BorderStyle,
  WidthType,
  AlignmentType,
  ShadingType,
  Packer,
  ExternalHyperlink
} from 'docx';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private themeService = inject(ThemeService);
  private fileService = inject(FileService);
  private mermaidService = inject(MermaidService);

  /**
   * Synchronously get the fully rendered HTML from the live preview DOM.
   */
  getRenderedHtmlSync(rawHtml?: string): string {
    if (typeof document !== 'undefined') {
      const previewEl = document.querySelector('.markdown-preview');
      if (previewEl && previewEl.innerHTML.trim().length > 0) {
        return previewEl.innerHTML;
      }
    }
    return rawHtml || '';
  }

  /**
   * Export as native Microsoft Word .docx document with embedded PNG vector diagrams.
   */
  async exportAsDocx(renderedHtml: string, title: string): Promise<void> {
    const fullyRendered = this.getRenderedHtmlSync(renderedHtml);
    const baseName = (title || 'document').replace(/\.(md|html|docx?|pdf)$/i, '');

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = fullyRendered;
    tempDiv.querySelectorAll('.code-block-header, .code-block-copy-btn, .diagram-action-bar, .diagram-btn, .diagram-copy-svg-btn, .mermaid-loading, .heading-anchor, app-diagram-modal').forEach(el => el.remove());

    const docChildren: any[] = [];

    // Title / Header paragraph
    docChildren.push(
      new Paragraph({
        text: baseName,
        heading: HeadingLevel.TITLE,
        spacing: { after: 300 }
      })
    );

    const childNodes = Array.from(tempDiv.children);

    for (const node of childNodes) {
      const el = node as HTMLElement;
      const tagName = el.tagName.toUpperCase();

      if (tagName === 'H1') {
        docChildren.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 360, after: 140 },
            children: this.extractTextRuns(el)
          })
        );
      } else if (tagName === 'H2') {
        docChildren.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 280, after: 120 },
            children: this.extractTextRuns(el)
          })
        );
      } else if (tagName === 'H3') {
        docChildren.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
            children: this.extractTextRuns(el)
          })
        );
      } else if (tagName === 'H4' || tagName === 'H5' || tagName === 'H6') {
        docChildren.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_4,
            spacing: { before: 160, after: 80 },
            children: this.extractTextRuns(el)
          })
        );
      } else if (tagName === 'P') {
        docChildren.push(
          new Paragraph({
            spacing: { before: 80, after: 140 },
            children: this.extractTextRuns(el)
          })
        );
      } else if (tagName === 'PRE' || el.classList.contains('code-block-wrapper')) {
        const codeText = el.textContent || '';
        docChildren.push(
          new Paragraph({
            spacing: { before: 120, after: 120 },
            shading: {
              type: ShadingType.CLEAR,
              fill: 'F1F5F9'
            },
            border: {
              left: { color: 'CBD5E1', size: 12, style: BorderStyle.SINGLE }
            },
            children: [
              new TextRun({
                text: codeText,
                font: 'Courier New',
                size: 20 // 10pt
              })
            ]
          })
        );
      } else if (tagName === 'BLOCKQUOTE' || el.classList.contains('markdown-alert')) {
        const isAlert = el.classList.contains('markdown-alert');
        const alertTitle = el.querySelector('.markdown-alert-title')?.textContent?.trim() || '';
        const alertContent = el.querySelector('.markdown-alert-content') || el;

        docChildren.push(
          new Paragraph({
            spacing: { before: 140, after: 140 },
            border: {
              left: { color: '0284C7', size: 24, style: BorderStyle.SINGLE }
            },
            shading: {
              type: ShadingType.CLEAR,
              fill: 'F0F9FF'
            },
            children: [
              ...(isAlert && alertTitle ? [new TextRun({ text: `[${alertTitle}] `, bold: true, color: '0284C7' })] : []),
              ...this.extractTextRuns(alertContent as HTMLElement)
            ]
          })
        );
      } else if (tagName === 'TABLE') {
        const docxTable = this.createDocxTable(el as HTMLTableElement);
        if (docxTable) {
          docChildren.push(docxTable);
          docChildren.push(new Paragraph({ spacing: { after: 120 } }));
        }
      } else if (tagName === 'UL' || tagName === 'OL') {
        const items = Array.from(el.querySelectorAll('li'));
        for (const li of items) {
          docChildren.push(
            new Paragraph({
              bullet: tagName === 'UL' ? { level: 0 } : undefined,
              spacing: { before: 40, after: 60 },
              children: this.extractTextRuns(li)
            })
          );
        }
      } else if (el.classList.contains('mermaid-wrapper')) {
        const svgEl = el.querySelector('svg');
        if (svgEl) {
          const imageBuffer = await this.convertSvgToPngBuffer(svgEl);
          if (imageBuffer) {
            const aspect = (svgEl.clientHeight || 400) / (svgEl.clientWidth || 600);
            const width = 540;
            const height = Math.min(Math.round(width * aspect), 650);

            docChildren.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 180, after: 180 },
                children: [
                  new ImageRun({
                    data: imageBuffer,
                    transformation: { width, height },
                    type: 'png'
                  })
                ]
              })
            );
          }
        }
      } else if (tagName === 'IMG') {
        // Standard embedded img
        const imgEl = el as HTMLImageElement;
        const imgBuffer = await this.fetchImageBuffer(imgEl.src);
        if (imgBuffer) {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 140, after: 140 },
              children: [
                new ImageRun({
                  data: imgBuffer,
                  transformation: { width: 500, height: 320 },
                  type: 'png'
                })
              ]
            })
          );
        }
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440, // 1 inch
                bottom: 1440,
                left: 1440,
                right: 1440
              }
            }
          },
          children: docChildren
        }
      ]
    });

    const blob = await Packer.toBlob(doc);

    // Save as native .docx with FileSystem API or fallback
    await this.fileService.saveOrDownloadBlob(
      `${baseName}.docx`,
      blob,
      '.docx',
      'Microsoft Word Document (.docx)'
    );
  }

  /**
   * Export standalone styled HTML file.
   */
  async exportAsHtml(renderedHtml: string, title: string): Promise<void> {
    const fullyRendered = this.getRenderedHtmlSync(renderedHtml);
    const currentTheme = this.themeService.currentTheme();
    const isDark = this.themeService.getThemeOption(currentTheme).isDark;
    const baseName = (title || 'document').replace(/\.(md|html|docx?|pdf)$/i, '');

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = fullyRendered;
    tempDiv.querySelectorAll('.code-block-header, .code-block-copy-btn, .diagram-action-bar, .diagram-btn, .diagram-copy-svg-btn, .mermaid-loading, .heading-anchor, app-diagram-modal').forEach(el => el.remove());
    const cleanHtmlContent = tempDiv.innerHTML;

    const fullHtml = `<!doctype html>
<html lang="en" class="${isDark ? 'dark' : 'light'}" data-theme="${currentTheme}">
<head>
  <meta charset="utf-8">
  <title>${this.escapeHtml(baseName)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  <style>
    :root {
      --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
      --font-heading: 'Outfit', 'Inter', system-ui, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }
    body {
      font-family: var(--font-sans);
      margin: 0;
      padding: 2.5rem 1.5rem;
      background: ${isDark ? '#090d16' : '#ffffff'};
      color: ${isDark ? '#f8fafc' : '#1f2328'};
      line-height: 1.75;
      display: flex;
      justify-content: center;
    }
    .container {
      max-width: 860px;
      width: 100%;
    }
    h1, h2, h3, h4 { font-family: var(--font-heading); color: inherit; }
    h1 { border-bottom: 1px solid ${isDark ? '#334155' : '#d0d7de'}; padding-bottom: 0.5rem; }
    h2 { border-bottom: 1px solid ${isDark ? '#1e293b' : '#eaeef2'}; padding-bottom: 0.3rem; }
    a { color: #38bdf8; }
    code { font-family: var(--font-mono); background: ${isDark ? '#1e293b' : '#f6f8fa'}; padding: 0.2em 0.4em; border-radius: 4px; }
    pre { background: ${isDark ? '#0f172a' : '#f6f8fa'}; padding: 1rem; border-radius: 8px; white-space: pre-wrap; word-break: break-word; border: 1px solid ${isDark ? '#334155' : '#d0d7de'}; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; word-break: break-word; }
    th, td { border: 1px solid ${isDark ? '#334155' : '#d0d7de'}; padding: 0.6rem 1rem; }
    th { background: ${isDark ? '#0f172a' : '#f6f8fa'}; }
    blockquote { border-left: 4px solid #38bdf8; margin: 1rem 0; padding: 0.5rem 1rem; background: ${isDark ? '#0f172a' : '#f6f8fa'}; }
    .markdown-alert { padding: 0.75rem 1rem; margin: 1rem 0; border-radius: 6px; border-left: 4px solid #38bdf8; background: ${isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(9, 105, 218, 0.08)'}; }
    .markdown-alert-title { font-weight: 700; font-size: 0.85em; text-transform: uppercase; margin-bottom: 0.35rem; display: flex; gap: 0.4rem; }
    .markdown-alert-content strong { font-weight: 700; color: inherit; }
    .mermaid-wrapper { display: flex; justify-content: center; margin: 1.5rem 0; }
    .mermaid-wrapper svg { max-width: 100%; height: auto; }
    .code-block-header, .code-block-copy-btn, .diagram-action-bar, .diagram-btn, .diagram-copy-svg-btn, .mermaid-loading, .heading-anchor, app-diagram-modal { display: none !important; }
    img { max-width: 100%; height: auto; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="container markdown-preview">
    ${cleanHtmlContent}
  </div>
</body>
</html>`;

    const htmlBlob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    await this.fileService.saveOrDownloadBlob(
      `${baseName}.html`,
      htmlBlob,
      '.html',
      'HTML Document'
    );
  }

  /**
   * Export raw Markdown file.
   */
  async exportAsMarkdown(content: string, title: string): Promise<void> {
    const baseName = (title || 'document').replace(/\.(md|html|docx?|pdf)$/i, '');
    const mdBlob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    await this.fileService.saveOrDownloadBlob(
      `${baseName}.md`,
      mdBlob,
      '.md',
      'Markdown Document'
    );
  }

  /**
   * Export / Print as PDF via Dedicated Full-Width Multi-Page Print Window.
   * Completely avoids SPA 50% split columns and 1-page viewport clipping.
   * Renders Mermaid diagrams with clean, colorful Light Mode and completely strips UI action bars.
   */
  async exportAsPdf(renderedHtml: string, title: string): Promise<void> {
    const baseName = (title || 'Document').replace(/\.(md|html|docx?|pdf)$/i, '');

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = renderedHtml || this.getRenderedHtmlSync(renderedHtml);

    // Re-render all mermaid diagrams specifically with forceLight = true for PDF/Print
    await this.mermaidService.renderDiagramsInContainer(tempDiv, true);

    // Remove UI action bars, copy buttons, diagram icons, anchors
    tempDiv.querySelectorAll(
      '.code-block-header, .code-block-copy-btn, .diagram-action-bar, .diagram-btn, .diagram-copy-svg-btn, .mermaid-loading, .heading-anchor, app-diagram-modal'
    ).forEach(el => el.remove());

    const printableHtml = tempDiv.innerHTML;

    const printHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${this.escapeHtml(baseName)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 1.8cm 1.5cm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      width: 100% !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #111827 !important;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-size: 13.5px;
      line-height: 1.7;
      overflow: visible !important;
    }
    .print-wrapper {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 auto !important;
      padding: 0 !important;
      display: block !important;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #0f172a !important;
      font-weight: 700;
      page-break-after: avoid !important;
      break-after: avoid !important;
      margin-top: 1.6em;
      margin-bottom: 0.6em;
    }
    h1 { font-size: 2rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.4em; }
    h2 { font-size: 1.45rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; }
    h3 { font-size: 1.2rem; }
    h4 { font-size: 1.05rem; }
    p { margin: 0.8em 0; }
    strong { font-weight: 700; color: #000000 !important; }
    a { color: #0284c7; text-decoration: none; }
    code { font-family: 'JetBrains Mono', monospace; font-size: 0.88em; background: #f1f5f9; padding: 0.15em 0.4em; border-radius: 4px; border: 1px solid #e2e8f0; word-break: break-word; color: #0f172a !important; }
    pre {
      font-family: 'JetBrains Mono', monospace;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.9em 1.1em;
      white-space: pre-wrap !important;
      word-break: break-word !important;
      overflow-wrap: break-word !important;
      page-break-inside: auto !important;
      break-inside: auto !important;
      margin: 1em 0;
      font-size: 12px;
      line-height: 1.55;
      color: #0f172a !important;
    }
    pre code { background: none; border: none; padding: 0; white-space: pre-wrap !important; }
    blockquote { border-left: 4px solid #0284c7; background: #f0f9ff; margin: 1em 0; padding: 0.6em 1em; border-radius: 0 6px 6px 0; color: #334155; }
    
    .markdown-alert { padding: 0.8em 1em; margin: 1.2em 0; border-radius: 6px; border-left: 4px solid #0284c7; background: #f8fafc; page-break-inside: avoid; break-inside: avoid; }
    .markdown-alert-note { border-color: #0284c7; background: #f0f9ff; }
    .markdown-alert-tip { border-color: #16a34a; background: #f0fdf4; }
    .markdown-alert-important { border-color: #9333ea; background: #faf5ff; }
    .markdown-alert-warning { border-color: #d97706; background: #fffbeb; }
    .markdown-alert-caution { border-color: #dc2626; background: #fef2f2; }
    .markdown-alert-title { font-weight: 700; font-size: 0.85em; text-transform: uppercase; margin-bottom: 0.4em; }
    .markdown-alert-note .markdown-alert-title { color: #0284c7; }
    .markdown-alert-tip .markdown-alert-title { color: #16a34a; }
    .markdown-alert-important .markdown-alert-title { color: #9333ea; }
    .markdown-alert-warning .markdown-alert-title { color: #d97706; }
    .markdown-alert-caution .markdown-alert-title { color: #dc2626; }
    .markdown-alert-content strong { font-weight: 700; color: #000000; }
    
    table {
      width: 100% !important;
      border-collapse: collapse;
      margin: 1.2em 0;
      font-size: 0.88em;
      table-layout: auto !important;
      word-break: break-word !important;
      page-break-inside: auto !important;
      break-inside: auto !important;
    }
    thead { display: table-header-group !important; }
    tr { page-break-inside: avoid !important; break-inside: avoid !important; }
    th, td { border: 1px solid #cbd5e1; padding: 0.55em 0.8em; text-align: left; word-break: break-word !important; }
    th { background: #f1f5f9; font-weight: 600; }
    tr:nth-child(even) { background: #f8fafc; }
    
    .mermaid-wrapper {
      display: flex !important;
      justify-content: center !important;
      margin: 1.5em 0 !important;
      padding: 0.8em !important;
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 8px !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      max-width: 100% !important;
      overflow: hidden !important;
    }
    .mermaid-wrapper svg {
      max-width: 100% !important;
      max-height: 18cm !important;
      height: auto !important;
    }
    .code-block-header, .code-block-copy-btn, .diagram-action-bar, .diagram-btn, .diagram-copy-svg-btn, .mermaid-loading, .heading-anchor, app-diagram-modal {
      display: none !important;
    }
    img { max-width: 100%; height: auto; border-radius: 6px; page-break-inside: avoid; break-inside: avoid; }
  </style>
</head>
<body>
  <div class="print-wrapper">
    ${printableHtml}
  </div>
</body>
</html>`;

    // Create an isolated printable iframe that guarantees full multi-page flow without popup blockers
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(printHtml);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }, 400);
    }
  }

  /**
   * Copy rendered HTML to clipboard.
   */
  async copyHtmlToClipboard(renderedHtml: string): Promise<boolean> {
    try {
      const fullyRendered = this.getRenderedHtmlSync(renderedHtml);
      await navigator.clipboard.writeText(fullyRendered);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Copy raw markdown to clipboard.
   */
  async copyMarkdownToClipboard(rawMarkdown: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(rawMarkdown);
      return true;
    } catch {
      return false;
    }
  }

  private extractTextRuns(element: HTMLElement): any[] {
    const runs: any[] = [];
    const walk = (node: Node, isBold = false, isItalic = false, isCode = false) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (text) {
          runs.push(
            new TextRun({
              text,
              bold: isBold,
              italics: isItalic,
              font: isCode ? 'Courier New' : 'Calibri',
              size: 22 // 11pt
            })
          );
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toUpperCase();

        if (tag === 'STRONG' || tag === 'B') {
          Array.from(el.childNodes).forEach(c => walk(c, true, isItalic, isCode));
        } else if (tag === 'EM' || tag === 'I') {
          Array.from(el.childNodes).forEach(c => walk(c, isBold, true, isCode));
        } else if (tag === 'CODE') {
          Array.from(el.childNodes).forEach(c => walk(c, isBold, isItalic, true));
        } else if (tag === 'A') {
          const href = el.getAttribute('href') || '';
          const linkText = el.textContent || href;
          runs.push(
            new ExternalHyperlink({
              children: [
                new TextRun({
                  text: linkText,
                  style: 'Hyperlink',
                  color: '0284C7',
                  underline: {}
                })
              ],
              link: href
            })
          );
        } else {
          Array.from(el.childNodes).forEach(c => walk(c, isBold, isItalic, isCode));
        }
      }
    };

    Array.from(element.childNodes).forEach(c => walk(c));
    return runs.length > 0 ? runs : [new TextRun({ text: element.textContent || '', size: 22 })];
  }

  private createDocxTable(htmlTable: HTMLTableElement): Table | null {
    try {
      const rows = Array.from(htmlTable.rows);
      if (rows.length === 0) return null;

      const docxRows: TableRow[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = Array.from(row.cells);
        const isHeader = i === 0 || row.parentElement?.tagName.toUpperCase() === 'THEAD';

        const docxCells = cells.map(cell => {
          return new TableCell({
            width: { size: 100 / cells.length, type: WidthType.PERCENTAGE },
            shading: isHeader ? { type: ShadingType.CLEAR, fill: 'F1F5F9' } : undefined,
            children: [
              new Paragraph({
                children: this.extractTextRuns(cell)
              })
            ]
          });
        });

        docxRows.push(new TableRow({ children: docxCells, tableHeader: isHeader }));
      }

      return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: docxRows
      });
    } catch {
      return null;
    }
  }

  private async convertSvgToPngBuffer(svgElement: SVGElement): Promise<Uint8Array | null> {
    return new Promise((resolve) => {
      try {
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();

        img.onload = () => {
          const scale = 2;
          const width = (svgElement.clientWidth || img.width || 800) * scale;
          const height = (svgElement.clientHeight || img.height || 500) * scale;

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
              URL.revokeObjectURL(url);
              if (blob) {
                blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf))).catch(() => resolve(null));
              } else {
                resolve(null);
              }
            }, 'image/png');
            return;
          }
          URL.revokeObjectURL(url);
          resolve(null);
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };

        img.src = url;
      } catch {
        resolve(null);
      }
    });
  }

  private async fetchImageBuffer(src: string): Promise<Uint8Array | null> {
    try {
      const resp = await fetch(src);
      const blob = await resp.blob();
      const buf = await blob.arrayBuffer();
      return new Uint8Array(buf);
    } catch {
      return null;
    }
  }

  private uint8ArrayToBinaryString(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return binary;
  }

  private escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
