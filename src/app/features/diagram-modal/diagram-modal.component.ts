import { Component, inject, signal, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentStoreService } from '../../core/services/document-store.service';
import { MermaidService } from '../../core/services/mermaid.service';
import { SafeHtmlPipe } from '../../shared/pipes/safe-html.pipe';

@Component({
  selector: 'app-diagram-modal',
  standalone: true,
  imports: [CommonModule, SafeHtmlPipe],
  template: `
    @if (store.diagramModalState(); as modal) {
      <div 
        (click)="onBackdropClick($event)"
        class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
      >
        <div 
          (click)="$event.stopPropagation()"
          class="relative w-full max-w-6xl h-[88vh] border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style="background-color: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary);"
        >
          <!-- Modal Header -->
          <div class="px-5 py-3.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
                </svg>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-white tracking-wide">Mermaid Diagram Viewer</h3>
                <p class="text-[11px] text-slate-400">Interactive pan, zoom, and high-resolution export</p>
              </div>
            </div>

            <!-- Header Controls & Actions -->
            <div class="flex items-center gap-2">
              <!-- Zoom Controls -->
              <div class="flex items-center bg-slate-900 border border-slate-750 rounded-lg p-0.5 text-xs text-slate-300">
                <button 
                  (click)="zoomOut()" 
                  class="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors"
                  title="Zoom Out (-)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                  </svg>
                </button>
                <span class="px-2 text-[11px] font-mono select-none text-slate-400">{{ Math.round(zoomScale() * 100) }}%</span>
                <button 
                  (click)="zoomIn()" 
                  class="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors"
                  title="Zoom In (+)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                  </svg>
                </button>
                <button 
                  (click)="resetTransform()" 
                  class="px-2 py-1 hover:text-white hover:bg-slate-800 rounded text-[10px] font-medium border-l border-slate-800 transition-colors"
                  title="Reset View (0)"
                >
                  Reset
                </button>
              </div>

              <!-- Copy Code Button -->
              <button 
                (click)="copyCode(modal.code)"
                class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-medium text-slate-200 hover:text-white flex items-center gap-1.5 transition-all"
                title="Copy Mermaid Code"
              >
                @if (copiedCode()) {
                  <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  <span class="text-emerald-400 font-medium">Copied!</span>
                } @else {
                  <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                  </svg>
                  <span>Code</span>
                }
              </button>

              <!-- Download SVG -->
              <button 
                (click)="downloadSvg(modal.svg)"
                class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-medium text-slate-200 hover:text-white flex items-center gap-1.5 transition-all"
                title="Download SVG file"
              >
                <svg class="w-3.5 h-3.5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                <span>SVG</span>
              </button>

              <!-- Download PNG -->
              <button 
                (click)="downloadPng(modal.svg)"
                class="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-medium text-white flex items-center gap-1.5 shadow-md shadow-sky-900/30 transition-all"
                title="Download high-resolution PNG image"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <span>PNG</span>
              </button>

              <!-- Close Button -->
              <button 
                (click)="store.closeDiagramModal()"
                class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
                title="Close (ESC)"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Canvas / Viewport Area (Interactive Pan & Zoom) -->
          <div 
            #canvasContainer
            (mousedown)="startPan($event)"
            (wheel)="onWheel($event)"
            class="flex-1 relative overflow-hidden bg-slate-950/90 cursor-grab active:cursor-grabbing select-none flex items-center justify-center diagram-grid-bg"
          >
            <div 
              [style.transform]="'translate(' + panX() + 'px, ' + panY() + 'px) scale(' + zoomScale() + ')'"
              [style.transform-origin]="'center center'"
              class="transition-transform duration-75 flex items-center justify-center p-8 max-w-full max-h-full pointer-events-auto"
              [innerHTML]="modal.svg | safeHtml"
            ></div>

            <!-- Hint overlay -->
            <div class="absolute bottom-3 left-4 text-[11px] text-slate-500 flex items-center gap-3 select-none pointer-events-none bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800/60 backdrop-blur-sm">
              <span>💡 <strong class="text-slate-400">Click & drag</strong> to pan</span>
              <span>•</span>
              <span><strong class="text-slate-400">Scroll</strong> to zoom</span>
              <span>•</span>
              <span><strong class="text-slate-400">ESC</strong> to exit</span>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .diagram-grid-bg {
      background-image: radial-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px);
      background-size: 20px 20px;
    }
    :host ::ng-deep svg {
      max-width: none !important;
      height: auto !important;
      filter: drop-shadow(0 15px 25px rgba(0, 0, 0, 0.35));
    }
  `]
})
export class DiagramModalComponent {
  store = inject(DocumentStoreService);
  mermaidService = inject(MermaidService);
  Math = Math;

  @ViewChild('canvasContainer') canvasContainer!: ElementRef<HTMLDivElement>;

  zoomScale = signal<number>(1);
  panX = signal<number>(0);
  panY = signal<number>(0);
  copiedCode = signal<boolean>(false);

  private isPanning = false;
  private startX = 0;
  private startY = 0;

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.store.diagramModalState()) return;

    if (event.key === 'Escape') {
      this.store.closeDiagramModal();
    } else if (event.key === '+' || event.key === '=') {
      this.zoomIn();
    } else if (event.key === '-' || event.key === '_') {
      this.zoomOut();
    } else if (event.key === '0') {
      this.resetTransform();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    this.store.closeDiagramModal();
  }

  zoomIn(): void {
    this.zoomScale.update(s => Math.min(3.5, Number((s + 0.15).toFixed(2))));
  }

  zoomOut(): void {
    this.zoomScale.update(s => Math.max(0.3, Number((s - 0.15).toFixed(2))));
  }

  resetTransform(): void {
    this.zoomScale.set(1);
    this.panX.set(0);
    this.panY.set(0);
  }

  startPan(event: MouseEvent): void {
    if (event.button !== 0) return; // Only primary button
    this.isPanning = true;
    this.startX = event.clientX - this.panX();
    this.startY = event.clientY - this.panY();

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isPanning) return;
      this.panX.set(e.clientX - this.startX);
      this.panY.set(e.clientY - this.startY);
    };

    const onMouseUp = () => {
      this.isPanning = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
    this.zoomScale.update(s => {
      const next = s * zoomFactor;
      return Math.min(3.5, Math.max(0.3, Number(next.toFixed(2))));
    });
  }

  copyCode(code: string): void {
    navigator.clipboard.writeText(code).then(() => {
      this.copiedCode.set(true);
      setTimeout(() => this.copiedCode.set(false), 2000);
    });
  }

  downloadSvg(svgContent: string): void {
    this.mermaidService.downloadSvg(svgContent);
  }

  downloadPng(svgContent: string): void {
    this.mermaidService.downloadPng(svgContent);
  }
}
