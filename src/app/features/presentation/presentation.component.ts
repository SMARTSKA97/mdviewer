import { Component, inject, signal, computed, HostListener, effect, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentStoreService } from '../../core/services/document-store.service';
import { MarkdownService } from '../../core/services/markdown.service';
import { MermaidService } from '../../core/services/mermaid.service';
import { SafeHtmlPipe } from '../../shared/pipes/safe-html.pipe';

@Component({
  selector: 'app-presentation',
  standalone: true,
  imports: [CommonModule, SafeHtmlPipe],
  template: `
    @if (store.viewMode() === 'presentation') {
      <div class="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-12 select-none overflow-hidden animate-in fade-in duration-200">
        <!-- Top Bar -->
        <div class="flex items-center justify-between opacity-60 hover:opacity-100 transition-opacity">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-sky-400 font-mono">SLIDE DECK</span>
            <span class="text-xs text-slate-500">•</span>
            <span class="text-xs text-slate-400 font-medium">{{ store.activeTab()?.title }}</span>
          </div>

          <div class="flex items-center gap-3">
            <span class="text-xs font-mono text-slate-400">{{ currentSlideIndex() + 1 }} / {{ slides().length }}</span>
            <button 
              (click)="exitPresentation()" 
              class="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-all"
              title="Exit (ESC)"
            >
              <span>Exit</span>
              <kbd class="font-mono text-[10px] text-slate-500">ESC</kbd>
            </button>
          </div>
        </div>

        <!-- Slide Body Container -->
        <div class="flex-1 flex items-center justify-center max-w-4xl w-full mx-auto my-6 overflow-hidden">
          <div 
            #slideContentRef
            [innerHTML]="currentSlideHtml() | safeHtml"
            class="markdown-preview text-lg sm:text-xl md:text-2xl leading-relaxed w-full animate-in zoom-in-95 duration-200"
          ></div>
        </div>

        <!-- Bottom Controls -->
        <div class="flex items-center justify-between opacity-60 hover:opacity-100 transition-opacity">
          <button 
            (click)="prevSlide()" 
            [disabled]="currentSlideIndex() === 0"
            class="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 disabled:opacity-30 disabled:pointer-events-none text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-all"
          >
            <span>← Previous</span>
            <kbd class="font-mono text-[10px] text-slate-500">←</kbd>
          </button>

          <!-- Slide Dots -->
          <div class="flex items-center gap-1.5 overflow-x-auto max-w-xs py-1">
            @for (slide of slides(); track $index; let i = $index) {
              <button 
                (click)="currentSlideIndex.set(i)" 
                [class.w-6]="currentSlideIndex() === i"
                [class.bg-sky-400]="currentSlideIndex() === i"
                [class.w-2]="currentSlideIndex() !== i"
                [class.bg-slate-700]="currentSlideIndex() !== i"
                class="h-2 rounded-full transition-all duration-200"
                [title]="'Slide ' + (i + 1)"
              ></button>
            }
          </div>

          <button 
            (click)="nextSlide()" 
            [disabled]="currentSlideIndex() === slides().length - 1"
            class="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 disabled:opacity-30 disabled:pointer-events-none text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-all"
          >
            <span>Next →</span>
            <kbd class="font-mono text-[10px] text-slate-500">→</kbd>
          </button>
        </div>
      </div>
    }
  `
})
export class PresentationComponent implements AfterViewInit {
  store = inject(DocumentStoreService);
  markdownService = inject(MarkdownService);
  mermaidService = inject(MermaidService);

  @ViewChild('slideContentRef') slideContentRef?: ElementRef<HTMLDivElement>;

  currentSlideIndex = signal<number>(0);

  // Split markdown by '---' to form individual slides
  slides = computed(() => {
    const raw = this.store.activeContent();
    if (!raw) return ['# Empty Document'];
    const parts = raw.split(/\n---\n/g).map(p => p.trim()).filter(p => p.length > 0);
    return parts.length > 0 ? parts : [raw];
  });

  currentSlideHtml = computed(() => {
    const slideList = this.slides();
    const idx = Math.min(this.currentSlideIndex(), slideList.length - 1);
    const md = slideList[idx] || '';
    return this.markdownService.render(md);
  });

  constructor() {
    effect(() => {
      // Re-hydrate diagrams when slide changes
      this.currentSlideHtml();
      setTimeout(() => {
        if (this.slideContentRef) {
          this.mermaidService.renderDiagramsInContainer(this.slideContentRef.nativeElement);
        }
      }, 50);
    });
  }

  ngAfterViewInit(): void {
    if (this.slideContentRef) {
      this.mermaidService.renderDiagramsInContainer(this.slideContentRef.nativeElement);
    }
  }

  nextSlide(): void {
    if (this.currentSlideIndex() < this.slides().length - 1) {
      this.currentSlideIndex.update(i => i + 1);
    }
  }

  prevSlide(): void {
    if (this.currentSlideIndex() > 0) {
      this.currentSlideIndex.update(i => i - 1);
    }
  }

  exitPresentation(): void {
    this.store.setViewMode('split');
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (this.store.viewMode() !== 'presentation') return;

    if (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'PageDown') {
      event.preventDefault();
      this.nextSlide();
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      this.prevSlide();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.exitPresentation();
    }
  }
}
