import { Injectable, inject } from '@angular/core';
import mermaid from 'mermaid';
import { ThemeService } from './theme.service';
import { DocumentStoreService } from './document-store.service';
import { ThemeId } from '../models/theme.model';

@Injectable({
  providedIn: 'root'
})
export class MermaidService {
  private themeService = inject(ThemeService);
  private store = inject(DocumentStoreService);
  private renderCounter = 0;
  private currentAppliedTheme: string | null = null;

  constructor() {
    this.initMermaid();
  }

  initMermaid(forceLight: boolean = false): void {
    const currentTheme: ThemeId = forceLight ? 'github-light' : this.themeService.currentTheme();
    const themeOpt = this.themeService.getThemeOption(currentTheme);
    const isDark = forceLight ? false : themeOpt.isDark;
    const themeKey = `${currentTheme}-${forceLight ? 'light' : 'dark'}`;

    if (this.currentAppliedTheme === themeKey) return;

    const themeVariables = this.getThemeVariables(currentTheme, isDark);

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        securityLevel: 'loose',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        themeVariables,
        flowchart: {
          curve: 'basis',
          htmlLabels: true,
          padding: 16,
          nodeSpacing: 50,
          rankSpacing: 50
        },
        sequence: {
          showSequenceNumbers: false,
          actorMargin: 50,
          boxMargin: 10,
          boxTextMargin: 5,
          noteMargin: 10,
          messageMargin: 35
        },
        er: {
          useMaxWidth: true
        }
      });
      this.currentAppliedTheme = themeKey;
    } catch (e) {
      console.warn('Mermaid init error:', e);
    }
  }

  private getThemeVariables(themeId: ThemeId, isDark: boolean): Record<string, any> {
    switch (themeId) {
      case 'github-light':
        return {
          darkMode: false,
          background: '#ffffff',
          primaryColor: '#f6f8fa',
          primaryTextColor: '#1f2328',
          primaryBorderColor: '#0969da',
          mainBkg: '#ffffff',
          nodeBorder: '#d0d7de',
          nodeTextColor: '#1f2328',
          lineColor: '#57606a',
          secondaryColor: '#f3f4f6',
          tertiaryColor: '#ffffff',
          clusterBkg: '#f8fafc',
          clusterBorder: '#d0d7de',
          edgeLabelBackground: '#ffffff',
          actorBkg: '#f6f8fa',
          actorBorder: '#0969da',
          actorTextColor: '#1f2328',
          actorLineColor: '#d0d7de',
          signalColor: '#0969da',
          signalTextColor: '#1f2328',
          labelBoxBkgColor: '#f6f8fa',
          labelBoxBorderColor: '#0969da',
          labelTextColor: '#1f2328',
          noteBkgColor: '#fff8c5',
          noteBorderColor: '#d4a72c',
          noteTextColor: '#4d2d00'
        };

      case 'dracula':
        return {
          darkMode: true,
          background: '#282a36',
          primaryColor: '#44475a',
          primaryTextColor: '#f8f8f2',
          primaryBorderColor: '#bd93f9',
          mainBkg: '#44475a',
          nodeBorder: '#bd93f9',
          nodeTextColor: '#f8f8f2',
          lineColor: '#6272a4',
          secondaryColor: '#3b3e51',
          tertiaryColor: '#282a36',
          clusterBkg: 'rgba(33, 34, 44, 0.7)',
          clusterBorder: '#6272a4',
          edgeLabelBackground: '#282a36',
          actorBkg: '#44475a',
          actorBorder: '#ff79c6',
          actorTextColor: '#f8f8f2',
          actorLineColor: '#6272a4',
          signalColor: '#bd93f9',
          signalTextColor: '#f8f8f2',
          labelBoxBkgColor: '#44475a',
          labelBoxBorderColor: '#ff79c6',
          labelTextColor: '#f8f8f2',
          noteBkgColor: '#44475a',
          noteBorderColor: '#f1fa8c',
          noteTextColor: '#f1fa8c'
        };

      case 'nord':
        return {
          darkMode: true,
          background: '#2e3440',
          primaryColor: '#3b4252',
          primaryTextColor: '#eceff4',
          primaryBorderColor: '#88c0d0',
          mainBkg: '#3b4252',
          nodeBorder: '#88c0d0',
          nodeTextColor: '#eceff4',
          lineColor: '#4c566a',
          secondaryColor: '#434c5e',
          tertiaryColor: '#2e3440',
          clusterBkg: 'rgba(39, 44, 54, 0.7)',
          clusterBorder: '#4c566a',
          edgeLabelBackground: '#2e3440',
          actorBkg: '#3b4252',
          actorBorder: '#81a1c1',
          actorTextColor: '#eceff4',
          actorLineColor: '#4c566a',
          signalColor: '#88c0d0',
          signalTextColor: '#eceff4',
          labelBoxBkgColor: '#3b4252',
          labelBoxBorderColor: '#88c0d0',
          labelTextColor: '#eceff4',
          noteBkgColor: '#3b4252',
          noteBorderColor: '#ebcb8b',
          noteTextColor: '#ebcb8b'
        };

      case 'emerald':
        return {
          darkMode: true,
          background: '#061510',
          primaryColor: '#064e3b',
          primaryTextColor: '#ecfdf5',
          primaryBorderColor: '#10b981',
          mainBkg: '#064e3b',
          nodeBorder: '#10b981',
          nodeTextColor: '#ecfdf5',
          lineColor: '#059669',
          secondaryColor: '#065f46',
          tertiaryColor: '#061510',
          clusterBkg: 'rgba(2, 44, 34, 0.7)',
          clusterBorder: '#065f46',
          edgeLabelBackground: '#061510',
          actorBkg: '#064e3b',
          actorBorder: '#34d399',
          actorTextColor: '#ecfdf5',
          actorLineColor: '#059669',
          signalColor: '#10b981',
          signalTextColor: '#ecfdf5',
          labelBoxBkgColor: '#064e3b',
          labelBoxBorderColor: '#10b981',
          labelTextColor: '#ecfdf5',
          noteBkgColor: '#064e3b',
          noteBorderColor: '#fbbf24',
          noteTextColor: '#fef08a'
        };

      case 'obsidian':
      default:
        return {
          darkMode: isDark,
          background: isDark ? '#090d16' : '#ffffff',
          primaryColor: isDark ? '#1e293b' : '#f8fafc',
          primaryTextColor: isDark ? '#f8fafc' : '#0f172a',
          primaryBorderColor: isDark ? '#38bdf8' : '#0284c7',
          mainBkg: isDark ? '#1e293b' : '#f8fafc',
          nodeBorder: isDark ? '#38bdf8' : '#0284c7',
          nodeTextColor: isDark ? '#f8fafc' : '#0f172a',
          lineColor: isDark ? '#64748b' : '#64748b',
          secondaryColor: isDark ? '#334155' : '#f1f5f9',
          tertiaryColor: isDark ? '#0f172a' : '#ffffff',
          clusterBkg: isDark ? 'rgba(15, 23, 42, 0.65)' : '#f8fafc',
          clusterBorder: isDark ? '#334155' : '#cbd5e1',
          edgeLabelBackground: isDark ? '#0f172a' : '#ffffff',
          actorBkg: isDark ? '#1e293b' : '#f0f9ff',
          actorBorder: isDark ? '#38bdf8' : '#0284c7',
          actorTextColor: isDark ? '#f8fafc' : '#0f172a',
          actorLineColor: isDark ? '#64748b' : '#94a3b8',
          signalColor: isDark ? '#38bdf8' : '#0284c7',
          signalTextColor: isDark ? '#f8fafc' : '#0f172a',
          labelBoxBkgColor: isDark ? '#1e293b' : '#f0f9ff',
          labelBoxBorderColor: isDark ? '#38bdf8' : '#0284c7',
          labelTextColor: isDark ? '#f8fafc' : '#0f172a',
          noteBkgColor: isDark ? '#1e293b' : '#fef9c3',
          noteBorderColor: isDark ? '#eab308' : '#ca8a04',
          noteTextColor: isDark ? '#fef08a' : '#713f12'
        };
    }
  }

  /**
   * Render all mermaid diagram blocks in the given container.
   * Keeps data-mermaid so diagrams can automatically re-render when switching themes.
   */
  async renderDiagramsInContainer(container: HTMLElement, forceLight: boolean = false): Promise<void> {
    if (!container) return;

    const diagramElements = container.querySelectorAll<HTMLElement>('.mermaid-wrapper[data-mermaid]');
    if (diagramElements.length === 0) return;

    // Reset applied theme to ensure proper initialization
    this.currentAppliedTheme = null;
    this.initMermaid(forceLight);

    for (const el of Array.from(diagramElements)) {
      const rawCode = el.getAttribute('data-mermaid');
      if (!rawCode) continue;

      const code = decodeURIComponent(rawCode).trim();
      const cleanId = `mermaid_svg_${Date.now()}_${++this.renderCounter}`;

      try {
        const { svg } = await mermaid.render(cleanId, code);
        el.innerHTML = svg;
        el.classList.add('mermaid-rendered');

        // Attach interactive action toolbar in live UI
        if (!forceLight) {
          this.attachDiagramActions(el, svg, code);
        }
      } catch (err: any) {
        console.warn('Mermaid rendering error:', err);
        el.innerHTML = `<div class="mermaid-error p-3 rounded-lg bg-red-950/40 border border-red-800 text-left text-xs font-mono text-red-300">
          <div class="font-bold flex items-center gap-1.5 text-red-400 mb-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <span>Mermaid Diagram Syntax Error</span>
          </div>
          <p class="text-[11px] text-red-300 opacity-90">${err?.message || 'Invalid diagram definition'}</p>
        </div>`;
      }
    }
  }

  private attachDiagramActions(wrapper: HTMLElement, svgContent: string, rawCode: string): void {
    // Remove previous toolbar if any
    wrapper.querySelectorAll('.diagram-action-bar').forEach(b => b.remove());

    const bar = document.createElement('div');
    bar.className = 'diagram-action-bar';

    // 1. Copy Code Button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'diagram-btn';
    copyBtn.type = 'button';
    copyBtn.title = 'Copy Mermaid Code';
    copyBtn.innerHTML = `
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
      </svg>
      <span>Copy</span>
    `;
    copyBtn.onclick = (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(rawCode).then(() => {
        copyBtn.innerHTML = `
          <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <span class="text-emerald-400">Copied!</span>
        `;
        setTimeout(() => {
          copyBtn.innerHTML = `
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
            <span>Copy</span>
          `;
        }, 2000);
      });
    };

    // 2. Download SVG Button
    const svgBtn = document.createElement('button');
    svgBtn.className = 'diagram-btn';
    svgBtn.type = 'button';
    svgBtn.title = 'Download Diagram as SVG';
    svgBtn.innerHTML = `
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
      </svg>
      <span>SVG</span>
    `;
    svgBtn.onclick = (e) => {
      e.stopPropagation();
      this.downloadSvg(svgContent);
    };

    // 3. Download PNG Button
    const pngBtn = document.createElement('button');
    pngBtn.className = 'diagram-btn';
    pngBtn.type = 'button';
    pngBtn.title = 'Download Diagram as PNG Image';
    pngBtn.innerHTML = `
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
      <span>PNG</span>
    `;
    pngBtn.onclick = (e) => {
      e.stopPropagation();
      this.downloadPng(svgContent);
    };

    // 4. Fullscreen Zoom Modal Button
    const zoomBtn = document.createElement('button');
    zoomBtn.className = 'diagram-btn diagram-btn-primary';
    zoomBtn.type = 'button';
    zoomBtn.title = 'Expand & Zoom in Full Screen';
    zoomBtn.innerHTML = `
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
      </svg>
      <span>Expand</span>
    `;
    zoomBtn.onclick = (e) => {
      e.stopPropagation();
      this.store.openDiagramModal(rawCode, svgContent);
    };

    bar.appendChild(copyBtn);
    bar.appendChild(svgBtn);
    bar.appendChild(pngBtn);
    bar.appendChild(zoomBtn);

    wrapper.style.position = 'relative';
    wrapper.appendChild(bar);
  }

  downloadSvg(svgContent: string): void {
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagram-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  downloadPng(svgContent: string): void {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, 'image/svg+xml');
      const svgEl = doc.querySelector('svg');
      if (!svgEl) return;

      // Remove UI buttons from SVG if present
      svgEl.querySelectorAll('.diagram-action-bar, .diagram-btn, .diagram-copy-svg-btn').forEach(b => b.remove());

      // Ensure standard SVG XML namespaces
      if (!svgEl.getAttribute('xmlns')) {
        svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      }
      if (!svgEl.getAttribute('xmlns:xlink')) {
        svgEl.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      }

      // Calculate width and height from viewBox or element attributes
      let width = 1200;
      let height = 800;
      const viewBox = svgEl.getAttribute('viewBox');
      if (viewBox) {
        const parts = viewBox.split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
          width = Math.round(parts[2]);
          height = Math.round(parts[3]);
        }
      } else {
        const w = parseFloat(svgEl.getAttribute('width') || '0');
        const h = parseFloat(svgEl.getAttribute('height') || '0');
        if (w > 0 && h > 0) {
          width = Math.round(w);
          height = Math.round(h);
        }
      }

      // Set explicit pixel dimensions on SVG
      svgEl.setAttribute('width', String(width));
      svgEl.setAttribute('height', String(height));

      const cleanSvgString = new XMLSerializer().serializeToString(svgEl);
      const svgBase64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(cleanSvgString)));

      const currentTheme = this.themeService.currentTheme();
      const isDark = this.themeService.getThemeOption(currentTheme).isDark;
      const bgFill = isDark ? '#0f172a' : '#ffffff';
      const scale = 2; // 2x retina crispness

      const img = new Image();
      img.crossOrigin = 'anonymous';

      const renderToCanvasAndDownload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width * scale;
          canvas.height = height * scale;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          ctx.fillStyle = bgFill;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          canvas.toBlob((blob) => {
            const fileName = `mermaid-diagram-${Date.now()}.png`;
            if (blob) {
              const blobUrl = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = blobUrl;
              a.download = fileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
            } else {
              const pngUrl = canvas.toDataURL('image/png');
              const a = document.createElement('a');
              a.href = pngUrl;
              a.download = fileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
          }, 'image/png');
        } catch (err) {
          console.error('Canvas export error:', err);
        }
      };

      img.onload = renderToCanvasAndDownload;

      img.onerror = () => {
        // Fallback using Blob URL
        const svgBlob = new Blob([cleanSvgString], { type: 'image/svg+xml;charset=utf-8' });
        const blobUrl = URL.createObjectURL(svgBlob);
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = width * scale;
          canvas.height = height * scale;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = bgFill;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(fallbackImg, 0, 0, canvas.width, canvas.height);
            const pngUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = `mermaid-diagram-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
          URL.revokeObjectURL(blobUrl);
        };
        fallbackImg.src = blobUrl;
      };

      img.src = svgBase64;
    } catch (err) {
      console.error('PNG download error:', err);
    }
  }
}
