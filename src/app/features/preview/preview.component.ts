import { Component, ElementRef, ViewChild, inject, effect, Output, EventEmitter, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentStoreService } from '../../core/services/document-store.service';
import { MermaidService } from '../../core/services/mermaid.service';
import { ThemeService } from '../../core/services/theme.service';
import { AttachmentService } from '../../core/services/attachment.service';
import { SafeHtmlPipe } from '../../shared/pipes/safe-html.pipe';

@Component({
  selector: 'app-preview',
  standalone: true,
  imports: [CommonModule, SafeHtmlPipe],
  template: `
    <div 
      #previewContainerRef
      (scroll)="onPreviewScroll()"
      (click)="onPreviewClick($event)"
      class="app-preview h-full overflow-y-auto custom-scrollbar p-6 md:p-8 lg:p-10 select-text"
      style="background-color: var(--bg-primary); color: var(--text-primary);"
    >
      <div 
        #contentContainerRef
        [innerHTML]="store.renderedHtml() | safeHtml"
        class="markdown-preview max-w-4xl mx-auto min-h-full pb-20 select-text"
      ></div>
    </div>
  `
})
export class PreviewComponent implements AfterViewInit {
  store = inject(DocumentStoreService);
  mermaidService = inject(MermaidService);
  themeService = inject(ThemeService);
  attachmentService = inject(AttachmentService);

  @ViewChild('previewContainerRef') previewContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('contentContainerRef') contentContainerRef!: ElementRef<HTMLDivElement>;

  @Output() previewScrolled = new EventEmitter<{ scrollTop: number; scrollRatio: number }>();

  private renderDebounceTimer: any = null;

  constructor() {
    // Re-hydrate Mermaid diagrams whenever markdown HTML or theme updates
    effect(() => {
      // Access signals to track them
      const html = this.store.renderedHtml();
      const theme = this.themeService.currentTheme();

      clearTimeout(this.renderDebounceTimer);
      this.renderDebounceTimer = setTimeout(() => {
        this.hydrateDiagrams();
      }, 100);
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.hydrateDiagrams();
    }, 100);
  }

  onPreviewClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    // 1. Wikilink Navigation / Auto-creation
    const wikilinkAnchor = target.closest('a[data-wikilink]') as HTMLAnchorElement | null;
    if (wikilinkAnchor) {
      event.preventDefault();
      const rawTarget = wikilinkAnchor.getAttribute('data-wikilink');
      if (!rawTarget) return;

      const targetTitle = decodeURIComponent(rawTarget).trim();
      const targetFileName = targetTitle.endsWith('.md') ? targetTitle : targetTitle + '.md';

      const docs = this.store.documents();
      const existingDoc = docs.find(d => 
        d.title.toLowerCase() === targetTitle.toLowerCase() || 
        d.title.toLowerCase() === targetFileName.toLowerCase()
      );

      if (existingDoc) {
        const tabs = this.store.tabs();
        const existingTab = tabs.find(t => t.documentId === existingDoc.id || t.id === existingDoc.id);
        if (existingTab) {
          this.store.selectTab(existingTab.id);
        } else {
          this.store.openDocument(existingDoc.title, existingDoc.content);
        }
      } else {
        // Auto-create missing note!
        this.store.createNewTab(targetFileName, `# ${targetTitle}\n\nStart writing markdown here...`);
      }
      return;
    }

    // 2. Code Block Copy Button
    const copyBtn = target.closest('button[data-action="copy-code"]') as HTMLButtonElement | null;
    if (copyBtn) {
      event.preventDefault();
      const rawCode = copyBtn.getAttribute('data-code');
      if (!rawCode) return;

      try {
        const textToCopy = decodeURIComponent(rawCode);
        if (navigator.clipboard) {
          navigator.clipboard.writeText(textToCopy).then(() => {
            const span = copyBtn.querySelector('span');
            if (span) {
              const origText = span.textContent;
              span.textContent = 'Copied!';
              setTimeout(() => {
                span.textContent = origText;
              }, 2000);
            }
          });
        }
      } catch (err) {
        console.warn('Copy code block failed:', err);
      }
    }
  }

  onPreviewScroll(): void {
    if (!this.previewContainerRef) return;
    const el = this.previewContainerRef.nativeElement;
    const maxScroll = el.scrollHeight - el.clientHeight;
    const scrollRatio = maxScroll > 0 ? el.scrollTop / maxScroll : 0;
    this.previewScrolled.emit({ scrollTop: el.scrollTop, scrollRatio });
  }

  scrollToRatio(ratio: number): void {
    if (!this.previewContainerRef) return;
    const el = this.previewContainerRef.nativeElement;
    const maxScroll = el.scrollHeight - el.clientHeight;
    el.scrollTop = ratio * maxScroll;
  }

  private hydrateDiagrams(): void {
    if (!this.contentContainerRef) return;
    const container = this.contentContainerRef.nativeElement;
    this.mermaidService.renderDiagramsInContainer(container);

    // Resolve attachment:// images dynamically
    const images = container.querySelectorAll<HTMLImageElement>('img[src*="attachment://"], img[data-attachment-src*="attachment://"]');
    images.forEach(async (img) => {
      const src = img.getAttribute('data-attachment-src') || img.getAttribute('src');
      if (src && src.includes('attachment://')) {
        const match = src.match(/attachment:\/\/([a-zA-Z0-9_-]+)/);
        if (match) {
          const uri = `attachment://${match[1]}`;
          const resolved = await this.attachmentService.resolveAttachmentUri(uri);
          img.src = resolved;
          img.removeAttribute('data-attachment-src');
        }
      }
    });
  }
}
