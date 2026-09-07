import { Component, ElementRef, ViewChild, inject, signal, effect, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentStoreService } from '../../core/services/document-store.service';
import { IndexerService } from '../../core/services/indexer.service';

interface Node {
  id: string;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isCurrent: boolean;
}

interface Edge {
  source: string;
  target: string;
}

@Component({
  selector: 'app-graph-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
      <div 
        class="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col animate-in fade-in duration-150"
        (click)="closeModal()"
      >
        <!-- Header Controls -->
        <div 
          class="p-4 border-b flex items-center justify-between z-10"
          style="background-color: var(--bg-surface); border-color: var(--border-subtle); color: var(--text-primary);"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center gap-2">
            <span class="text-xl">🕸️</span>
            <div>
              <h2 class="text-sm font-bold text-slate-100">Knowledge Graph View</h2>
              <p class="text-[11px] text-slate-400 font-mono">{{ nodes.length }} notes • {{ edges.length }} links</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button 
              (click)="resetPhysics()"
              class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 border border-slate-700"
            >
              🔄 Reset Layout
            </button>
            <button 
              (click)="closeModal()"
              class="px-3 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 text-xs font-semibold border border-rose-500/30"
            >
              Close (ESC)
            </button>
          </div>
        </div>

        <!-- Canvas Area -->
        <div class="flex-1 relative overflow-hidden bg-slate-950 cursor-grab active:cursor-grabbing" (click)="$event.stopPropagation()">
          <canvas 
            #graphCanvasRef
            (mousedown)="onCanvasMouseDown($event)"
            (mousemove)="onCanvasMouseMove($event)"
            (mouseup)="onCanvasMouseUp()"
            class="w-full h-full block"
          ></canvas>

          <!-- Instructions Overlay -->
          <div class="absolute bottom-4 left-4 px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-[11px] text-slate-400 font-mono pointer-events-none select-none">
            <span>Click node to open note • Drag to move</span>
          </div>
        </div>
      </div>
    }
  `
})
export class GraphViewComponent implements AfterViewInit, OnDestroy {
  store = inject(DocumentStoreService);
  indexer = inject(IndexerService);

  @ViewChild('graphCanvasRef') graphCanvasRef?: ElementRef<HTMLCanvasElement>;

  readonly isOpen = signal<boolean>(false);

  nodes: Node[] = [];
  edges: Edge[] = [];
  private animFrameId: number | null = null;
  private draggedNode: Node | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private isDragging = false;

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        setTimeout(() => this.initGraph(), 50);
      }
    });
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  openModal(): void {
    this.isOpen.set(true);
  }

  closeModal(): void {
    this.isOpen.set(false);
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  private initGraph(): void {
    const canvas = this.graphCanvasRef?.nativeElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;

    const width = rect.width;
    const height = rect.height;

    const docs = this.store.documents().filter(d => !d.archived);
    const activeDocId = this.store.activeTab()?.documentId;

    this.nodes = docs.map((doc, idx) => {
      const angle = (idx / docs.length) * Math.PI * 2;
      const radius = Math.min(width, height) * 0.3;
      return {
        id: doc.id,
        title: doc.title,
        x: width / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 40,
        y: height / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        radius: doc.id === activeDocId ? 10 : 7,
        isCurrent: doc.id === activeDocId
      };
    });

    // Build edges from backlinks
    this.edges = [];
    const backlinksMap = this.indexer.backlinksIndex();

    for (const doc of docs) {
      const key = doc.title.toLowerCase().replace(/\.md$/, '').trim();
      const entries = backlinksMap.get(key) || [];

      for (const entry of entries) {
        if (this.nodes.some(n => n.id === entry.sourceDocId) && this.nodes.some(n => n.id === doc.id)) {
          this.edges.push({
            source: entry.sourceDocId,
            target: doc.id
          });
        }
      }
    }

    this.startSimulation(width, height);
  }

  resetPhysics(): void {
    this.initGraph();
  }

  private startSimulation(width: number, height: number): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    const canvas = this.graphCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const step = () => {
      ctx.save();
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.clearRect(0, 0, width, height);

      // Force-directed physics
      for (let i = 0; i < this.nodes.length; i++) {
        const a = this.nodes[i];
        // Center gravity
        a.vx += (width / 2 - a.x) * 0.0005;
        a.vy += (height / 2 - a.y) * 0.0005;

        // Node repulsion
        for (let j = i + 1; j < this.nodes.length; j++) {
          const b = this.nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 120) {
            const force = (120 - dist) / dist * 0.05;
            a.vx -= dx * force;
            a.vy -= dy * force;
            b.vx += dx * force;
            b.vy += dy * force;
          }
        }
      }

      // Edge spring attraction
      for (const edge of this.edges) {
        const source = this.nodes.find(n => n.id === edge.source);
        const target = this.nodes.find(n => n.id === edge.target);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - 90) * 0.005;
          source.vx += dx * force;
          source.vy += dy * force;
          target.vx -= dx * force;
          target.vy -= dy * force;

          // Draw edge line
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // Update position & draw nodes
      for (const node of this.nodes) {
        if (node !== this.draggedNode) {
          node.vx *= 0.85; // Damping
          node.vy *= 0.85;
          node.x += node.vx;
          node.y += node.vy;

          // Clamp
          node.x = Math.max(20, Math.min(width - 20, node.x));
          node.y = Math.max(20, Math.min(height - 20, node.y));
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.isCurrent ? '#38bdf8' : '#64748b';
        ctx.fill();

        ctx.strokeStyle = node.isCurrent ? '#f59e0b' : '#334155';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Node Title Label
        ctx.font = '11px monospace';
        ctx.fillStyle = node.isCurrent ? '#f8fafc' : '#94a3b8';
        ctx.fillText(node.title, node.x + node.radius + 6, node.y + 4);
      }

      ctx.restore();
      this.animFrameId = requestAnimationFrame(step);
    };

    step();
  }

  onCanvasMouseDown(event: MouseEvent): void {
    const canvas = this.graphCanvasRef?.nativeElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const clicked = this.nodes.find(n => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 6;
    });

    if (clicked) {
      this.draggedNode = clicked;
      this.dragStartX = event.clientX;
      this.dragStartY = event.clientY;
      this.isDragging = false;
    }
  }

  onCanvasMouseMove(event: MouseEvent): void {
    if (!this.draggedNode) return;
    const canvas = this.graphCanvasRef?.nativeElement;
    if (!canvas) return;

    const dist = Math.hypot(event.clientX - this.dragStartX, event.clientY - this.dragStartY);
    if (dist > 5) {
      this.isDragging = true;
    }

    const rect = canvas.getBoundingClientRect();
    this.draggedNode.x = event.clientX - rect.left;
    this.draggedNode.y = event.clientY - rect.top;
  }

  onCanvasMouseUp(): void {
    if (this.draggedNode) {
      const node = this.draggedNode;
      const wasDragging = this.isDragging;
      this.draggedNode = null;
      this.isDragging = false;

      // Only open document if user clicked without dragging
      if (!wasDragging) {
        const doc = this.store.documents().find(d => d.id === node.id);
        if (doc) {
          const existing = this.store.tabs().find(t => t.documentId === doc.id || t.id === doc.id);
          if (existing) {
            this.store.selectTab(existing.id);
          } else {
            this.store.openDocument(doc.title, doc.content);
          }
          this.closeModal();
        }
      }
    }
  }
}
