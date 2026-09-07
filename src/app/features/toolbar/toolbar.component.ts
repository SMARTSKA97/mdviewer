import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentStoreService } from '../../core/services/document-store.service';

export interface FormatAction {
  type: string;
  prefix: string;
  suffix: string;
  defaultText?: string;
  block?: boolean;
}

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="app-toolbar h-10 border-b px-3 flex items-center justify-between gap-2 select-none overflow-x-auto no-scrollbar" style="background-color: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary);">
      <div class="flex items-center gap-1">
        <!-- History -->
        <button (click)="action.emit('undo')" class="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-all flex items-center justify-center" title="Undo (Ctrl+Z)">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2a5 5 0 01-5 5H6M3 10l6-6M3 10l6 6"/>
          </svg>
        </button>

        <button (click)="action.emit('redo')" class="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-all flex items-center justify-center" title="Redo (Ctrl+Y)">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10H11a5 5 0 00-5 5v2a5 5 0 005 5h7m3-12l-6-6m6 6l-6 6"/>
          </svg>
        </button>

        <div class="w-px h-4 bg-slate-800 mx-1"></div>

        <!-- Typography Formats -->
        <button (click)="applyBold()" class="p-1.5 px-2 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 font-bold transition-all text-xs" title="Bold (Ctrl+B)">
          <span>B</span>
        </button>

        <button (click)="applyItalic()" class="p-1.5 px-2 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 italic font-serif transition-all text-xs" title="Italic (Ctrl+I)">
          <span>I</span>
        </button>

        <button (click)="applyStrikethrough()" class="p-1.5 px-2 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 line-through transition-all text-xs" title="Strikethrough">
          <span>S</span>
        </button>

        <div class="w-px h-4 bg-slate-800 mx-1"></div>

        <!-- Headings -->
        <button (click)="applyHeading(1)" class="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 font-mono text-xs font-bold transition-all" title="Heading 1">
          <span>H1</span>
        </button>

        <button (click)="applyHeading(2)" class="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 font-mono text-xs font-bold transition-all" title="Heading 2">
          <span>H2</span>
        </button>

        <button (click)="applyHeading(3)" class="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 font-mono text-xs font-bold transition-all" title="Heading 3">
          <span>H3</span>
        </button>

        <div class="w-px h-4 bg-slate-800 mx-1"></div>

        <!-- Quotes & Code -->
        <button (click)="applyQuote()" class="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-all" title="Quote Block">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
          </svg>
        </button>

        <button (click)="applyInlineCode()" class="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 font-mono text-xs transition-all" title="Inline Code">
          <span>&lt;/&gt;</span>
        </button>

        <button (click)="applyCodeBlock()" class="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-all" title="Code Block">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
          </svg>
        </button>

        <div class="w-px h-4 bg-slate-800 mx-1"></div>

        <!-- Links & Media -->
        <button (click)="applyLink()" class="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-all" title="Insert Link">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
        </button>

        <button (click)="applyImage()" class="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-all" title="Insert Image">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </button>

        <div class="w-px h-4 bg-slate-800 mx-1"></div>

        <!-- Lists -->
        <button (click)="applyBulletList()" class="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-all" title="Bulleted List">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
          </svg>
        </button>

        <button (click)="applyNumberedList()" class="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-all" title="Numbered List">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>

        <button (click)="applyChecklist()" class="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-all" title="Task Checklist">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </button>

        <div class="w-px h-4 bg-slate-800 mx-1"></div>

        <!-- Table & Math & Diagram -->
        <button (click)="insertTable()" class="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-all" title="Insert Table">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18M10 3v18M14 3v18M3 4h18a1 1 0 011 1v14a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1z"/>
          </svg>
        </button>

        <button (click)="insertMath()" class="p-1.5 px-2 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 font-serif font-bold text-xs transition-all" title="Insert LaTeX Math">
          <span>∑</span>
        </button>

        <button (click)="insertMermaid()" class="p-1.5 px-2 rounded-md text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 font-semibold text-xs transition-all flex items-center gap-1" title="Insert Mermaid Diagram">
          <span>🧜 Diagram</span>
        </button>

        <button (click)="applyHorizontalRule()" class="p-1.5 px-2 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 text-xs transition-all" title="Horizontal Rule">
          <span>—</span>
        </button>
      </div>

      <!-- Right sync scroll toggle -->
      <div class="flex items-center gap-1 shrink-0">
        <button 
          (click)="store.toggleScrollSync()"
          [class.text-sky-400]="store.isScrollSynced()"
          [class.bg-sky-500/10]="store.isScrollSynced()"
          [class.border-sky-500/30]="store.isScrollSynced()"
          [class.text-slate-500]="!store.isScrollSynced()"
          class="p-1.5 px-2 rounded-md border border-transparent flex items-center gap-1 text-[11px] transition-all hover:text-slate-200"
          title="Toggle Synchronized Scrolling"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
          </svg>
          <span class="hidden sm:inline">Sync Scroll</span>
        </button>
      </div>
    </div>
  `
})
export class ToolbarComponent {
  store = inject(DocumentStoreService);

  @Output() action = new EventEmitter<string>();
  @Output() format = new EventEmitter<FormatAction>();

  applyBold(): void {
    this.format.emit({ type: 'wrap', prefix: '**', suffix: '**', defaultText: 'bold text' });
  }

  applyItalic(): void {
    this.format.emit({ type: 'wrap', prefix: '*', suffix: '*', defaultText: 'italic text' });
  }

  applyStrikethrough(): void {
    this.format.emit({ type: 'wrap', prefix: '~~', suffix: '~~', defaultText: 'strikethrough' });
  }

  applyHeading(level: number): void {
    const prefix = '#'.repeat(level) + ' ';
    this.format.emit({ type: 'line', prefix, suffix: '' });
  }

  applyQuote(): void {
    this.format.emit({ type: 'line', prefix: '> ', suffix: '' });
  }

  applyInlineCode(): void {
    this.format.emit({ type: 'wrap', prefix: '`', suffix: '`', defaultText: 'code' });
  }

  applyCodeBlock(): void {
    this.format.emit({ type: 'wrap', prefix: '\n```typescript\n', suffix: '\n```\n', defaultText: '// your code here' });
  }

  applyLink(): void {
    this.format.emit({ type: 'wrap', prefix: '[', suffix: '](https://example.com)', defaultText: 'link text' });
  }

  applyImage(): void {
    this.format.emit({ type: 'wrap', prefix: '![', suffix: '](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800)', defaultText: 'Image description' });
  }

  applyBulletList(): void {
    this.format.emit({ type: 'line', prefix: '- ', suffix: '' });
  }

  applyNumberedList(): void {
    this.format.emit({ type: 'line', prefix: '1. ', suffix: '' });
  }

  applyChecklist(): void {
    this.format.emit({ type: 'line', prefix: '- [ ] ', suffix: '' });
  }

  insertTable(): void {
    const tableText = '\n| Header 1 | Header 2 | Header 3 |\n| :--- | :---: | ---: |\n| Cell 1 | Cell 2 | Cell 3 |\n| Data A | Data B | Data C |\n';
    this.format.emit({ type: 'insert', prefix: tableText, suffix: '' });
  }

  insertMath(): void {
    this.format.emit({ type: 'wrap', prefix: '\n$$\n', suffix: '\n$$\n', defaultText: 'f(x) = \\int_{-\\infty}^{\\infty} e^{-x^2} dx' });
  }

  insertMermaid(): void {
    const mermaidText = '\n```mermaid\nflowchart TD\n    A[Start] --> B(Process)\n    B --> C{Decision}\n    C -->|Yes| D[Done]\n    C -->|No| B\n```\n';
    this.format.emit({ type: 'insert', prefix: mermaidText, suffix: '' });
  }

  applyHorizontalRule(): void {
    this.format.emit({ type: 'insert', prefix: '\n---\n', suffix: '' });
  }
}
