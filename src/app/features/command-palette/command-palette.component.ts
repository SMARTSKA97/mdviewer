import { Component, inject, signal, computed, HostListener, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentStoreService } from '../../core/services/document-store.service';
import { ThemeService } from '../../core/services/theme.service';
import { FileService } from '../../core/services/file.service';
import { ExportService } from '../../core/services/export.service';
import { CommandService } from '../../core/services/command.service';
import { CommandItem } from '../../core/models/document.model';

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (store.commandPaletteOpen()) {
      <div 
        class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150"
        (click)="close()"
      >
        <div 
          class="w-full max-w-xl rounded-2xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[75vh]"
          style="background-color: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary);"
          (click)="$event.stopPropagation()"
        >
          <!-- Search Header -->
          <div class="p-3 border-b flex items-center gap-3" style="border-color: var(--border-subtle);">
            <svg class="w-5 h-5 shrink-0" style="color: var(--accent);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>

            <input 
              #searchInputRef
              type="text" 
              [(ngModel)]="searchQuery" 
              (keydown)="onKeyDown($event)"
              placeholder="Type a command or search headings..."
              class="w-full bg-transparent text-sm placeholder-slate-500 outline-none font-sans"
              style="color: var(--text-primary);"
            />

            <span class="kbd-shortcut">ESC</span>
          </div>

          <!-- Command List -->
          <div class="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
            @if (filteredCommands().length === 0) {
              <div class="p-8 text-center text-xs opacity-60 font-mono">
                No matching commands or headings found.
              </div>
            } @else {
              @for (cmd of filteredCommands(); track cmd.id; let i = $index) {
                <div 
                  (click)="execute(cmd)"
                  (mouseenter)="selectedIndex.set(i)"
                  class="flex items-center justify-between px-3 py-2.5 rounded-xl border cursor-pointer transition-all text-xs"
                  [style.backgroundColor]="selectedIndex() === i ? 'var(--selection-bg)' : 'transparent'"
                  [style.borderColor]="selectedIndex() === i ? 'var(--accent)' : 'transparent'"
                  [style.color]="selectedIndex() === i ? 'var(--accent)' : 'var(--text-primary)'"
                >
                  <div class="flex items-center gap-2.5 truncate">
                    <span class="text-sm shrink-0">{{ cmd.icon || '⚡' }}</span>
                    <div class="truncate">
                      <div class="font-medium truncate">{{ cmd.title }}</div>
                      @if (cmd.description) {
                        <div class="text-[10px] truncate opacity-70">{{ cmd.description }}</div>
                      }
                    </div>
                  </div>

                  @if (cmd.shortcut) {
                    <span class="kbd-shortcut shrink-0">{{ cmd.shortcut }}</span>
                  }
                </div>
              }
            }
          </div>

          <!-- Footer -->
          <div class="p-2.5 border-t text-[11px] flex items-center justify-between font-mono" style="background-color: var(--bg-surface); border-color: var(--border-subtle); color: var(--text-muted);">
            <div class="flex items-center gap-3">
              <span><kbd class="font-mono">↑↓</kbd> Navigate</span>
              <span><kbd class="font-mono">↵</kbd> Select</span>
            </div>
            <span>MDViewer Command Center</span>
          </div>
        </div>
      </div>
    }
  `
})
export class CommandPaletteComponent implements AfterViewInit {
  store = inject(DocumentStoreService);
  themeService = inject(ThemeService);
  fileService = inject(FileService);
  exportService = inject(ExportService);
  commandService = inject(CommandService);

  @ViewChild('searchInputRef') searchInputRef?: ElementRef<HTMLInputElement>;

  searchQuery = '';
  selectedIndex = signal<number>(0);

  // Registered commands list
  readonly baseCommands = computed<CommandItem[]>(() => {
    const registryItems: CommandItem[] = this.commandService.commands().map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      category: 'action' as const,
      icon: c.icon,
      shortcut: c.shortcut,
      action: c.action
    }));

    const list: CommandItem[] = [
      ...registryItems,
      {
        id: 'open-file',
        title: 'Open Local File',
        description: 'Open a markdown file from disk',
        category: 'action',
        icon: '📂',
        shortcut: 'Ctrl+O',
        action: () => {
          this.fileService.openLocalFile().then(res => {
            if (res) this.store.openDocument(res.title, res.content, res.handle);
          });
        }
      },
      {
        id: 'save-file',
        title: 'Save File',
        description: 'Save current document to disk',
        category: 'action',
        icon: '💾',
        shortcut: 'Ctrl+S',
        action: () => {
          const tab = this.store.activeTab();
          if (tab) {
            this.fileService.saveFile(tab.content, tab.title, tab.fileHandle).then(res => {
              this.store.markActiveTabSaved(res.handle);
            });
          }
        }
      },
      {
        id: 'export-modal',
        title: 'Export Document',
        description: 'Export as HTML, PDF, or Markdown',
        category: 'action',
        icon: '📥',
        shortcut: 'Ctrl+E',
        action: () => this.store.openExportModal()
      },
      {
        id: 'toggle-sidebar',
        title: 'Toggle Sidebar',
        description: 'Show / hide the TOC and files sidebar',
        category: 'view',
        icon: '📑',
        shortcut: 'Ctrl+Shift+[',
        action: () => this.store.toggleSidebar()
      },
      {
        id: 'toggle-zen',
        title: 'Toggle Zen Focus Mode',
        description: 'Distraction-free full-screen writing',
        category: 'view',
        icon: '🧘',
        shortcut: 'Ctrl+Shift+Z',
        action: () => this.store.toggleZenMode()
      },
      {
        id: 'view-split',
        title: 'View: Split Mode',
        description: 'Show Editor and Live Preview side-by-side',
        category: 'view',
        icon: '⚡',
        action: () => this.store.setViewMode('split')
      },
      {
        id: 'view-editor',
        title: 'View: Editor Only',
        description: 'Expand editor to full width',
        category: 'view',
        icon: '📝',
        action: () => this.store.setViewMode('editor')
      },
      {
        id: 'view-preview',
        title: 'View: Preview Only',
        description: 'Expand rendered preview to full width',
        category: 'view',
        icon: '👁️',
        action: () => this.store.setViewMode('preview')
      },
      // Theme commands
      ...this.themeService.themes.map(t => ({
        id: `theme-${t.id}`,
        title: `Theme: ${t.name}`,
        description: t.description,
        category: 'theme' as const,
        icon: '🎨',
        action: () => this.themeService.setTheme(t.id)
      })),
      // Diagram Inserts
      {
        id: 'insert-flowchart',
        title: 'Insert Mermaid Flowchart',
        description: 'Add a flowchart diagram block',
        category: 'insert',
        icon: '🧜',
        action: () => this.insertText('\n```mermaid\nflowchart LR\n    A[Start] --> B([Process]) --> C[(Database)]\n```\n')
      },
      {
        id: 'insert-c4-architecture',
        title: 'Insert Mermaid C4 Architecture Diagram',
        description: 'Add C4 Container system architecture block',
        category: 'insert',
        icon: '🏛️',
        action: () => this.insertText('\n```mermaid\nC4Container\n    Person(user, "User")\n    System_Boundary(c1, "System") {\n        Container(api, "REST API", "Gateway")\n        ContainerDb(db, "Database", "PostgreSQL")\n    }\n    Rel(user, api, "Uses")\n    Rel(api, db, "Reads/Writes")\n```\n')
      },
      {
        id: 'insert-sequence',
        title: 'Insert Mermaid Sequence Diagram',
        description: 'Add an actor sequence diagram block',
        category: 'insert',
        icon: '🧜',
        action: () => this.insertText('\n```mermaid\nsequenceDiagram\n    autonumber\n    Client->>Server: Request\n    Server-->>Client: 200 OK\n```\n')
      },
      {
        id: 'insert-math-block',
        title: 'Insert LaTeX Math Block',
        description: 'Add KaTeX display equation',
        category: 'insert',
        icon: '📐',
        action: () => this.insertText('\n$$\nf(x) = \\sum_{i=0}^n a_i x^i\n$$\n')
      }
    ];

    // Append current TOC headings as jump-to actions
    for (const h of this.store.toc()) {
      list.push({
        id: `heading-${h.id}`,
        title: `Jump to: ${h.text}`,
        description: `Level ${h.level} heading`,
        category: 'action',
        icon: '🔖',
        action: () => {
          const el = document.getElementById(h.id);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    return list;
  });

  filteredCommands = computed(() => {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.baseCommands();

    return this.baseCommands().filter(c =>
      c.title.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  ngAfterViewInit(): void {
    if (this.searchInputRef) {
      setTimeout(() => this.searchInputRef?.nativeElement.focus(), 50);
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    const list = this.filteredCommands();
    const isMeta = event.ctrlKey || event.metaKey;

    if (isMeta && event.key.toLowerCase() === 'p') {
      event.preventDefault();
      this.close();
      window.print();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex.update(i => (i + 1) % Math.max(1, list.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex.update(i => (i - 1 + list.length) % Math.max(1, list.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const current = list[this.selectedIndex()];
      if (current) this.execute(current);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  execute(cmd: CommandItem): void {
    this.close();
    cmd.action();
  }

  close(): void {
    this.store.closeCommandPalette();
    this.searchQuery = '';
    this.selectedIndex.set(0);
  }

  private insertText(text: string): void {
    const current = this.store.activeContent();
    this.store.updateContent(current + text);
  }

  @HostListener('document:keydown', ['$event'])
  onGlobalKeyDown(event: KeyboardEvent): void {
    const isMeta = event.ctrlKey || event.metaKey;

    if (isMeta && event.key.toLowerCase() === 'p') {
      event.preventDefault();
      if (this.store.commandPaletteOpen()) {
        this.close();
      }
      window.print();
    } else if (isMeta && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (this.store.commandPaletteOpen()) {
        this.close();
      } else {
        this.store.openCommandPalette();
        setTimeout(() => this.searchInputRef?.nativeElement.focus(), 50);
      }
    }
  }
}
