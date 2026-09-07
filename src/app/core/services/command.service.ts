import { Injectable, signal, computed, inject } from '@angular/core';
import { DocumentStoreService } from './document-store.service';
import { WorkspaceService } from './workspace.service';

export interface CommandItem {
  id: string;
  title: string;
  description?: string;
  category: 'Document' | 'Navigation' | 'View' | 'Editor' | 'Export' | 'Workspace';
  icon: string;
  shortcut?: string;
  action: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class CommandService {
  private store = inject(DocumentStoreService);
  private workspaceService = inject(WorkspaceService);

  private registry = signal<CommandItem[]>([]);

  readonly commands = computed(() => this.registry());

  constructor() {
    this.registerDefaultCommands();
  }

  registerCommand(command: CommandItem): void {
    const current = this.registry();
    const index = current.findIndex(c => c.id === command.id);
    if (index >= 0) {
      const updated = [...current];
      updated[index] = command;
      this.registry.set(updated);
    } else {
      this.registry.set([...current, command]);
    }
  }

  executeCommand(id: string): void {
    const command = this.registry().find(c => c.id === id);
    if (command) {
      command.action();
    }
  }

  searchCommands(query: string): CommandItem[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.registry();

    return this.registry().filter(cmd => 
      cmd.title.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q) ||
      (cmd.description && cmd.description.toLowerCase().includes(q)) ||
      (cmd.shortcut && cmd.shortcut.toLowerCase().includes(q))
    );
  }

  private registerDefaultCommands(): void {
    const defaults: CommandItem[] = [
      {
        id: 'new-document',
        title: 'New Note',
        description: 'Create a new untitled Markdown note',
        category: 'Document',
        icon: '📝',
        shortcut: 'Ctrl+Alt+N',
        action: () => this.store.createNewTab()
      },
      {
        id: 'global-search',
        title: 'Global Search',
        description: 'Search across all workspace notes and content',
        category: 'Navigation',
        icon: '🔍',
        shortcut: 'Ctrl+Shift+F',
        action: () => {
          // Trigger search modal via document event or store state
          window.dispatchEvent(new CustomEvent('app:open-search'));
        }
      },
      {
        id: 'knowledge-graph',
        title: 'Interactive Knowledge Graph',
        description: 'Open 2D force-directed relationship graph',
        category: 'View',
        icon: '🕸️',
        shortcut: 'Ctrl+Shift+G',
        action: () => {
          window.dispatchEvent(new CustomEvent('app:open-graph'));
        }
      },
      {
        id: 'toggle-zen-mode',
        title: 'Toggle Zen Mode',
        description: 'Distraction-free full-screen editor mode',
        category: 'View',
        icon: '🧘',
        shortcut: 'Ctrl+Shift+Z',
        action: () => this.store.toggleZenMode()
      },
      {
        id: 'toggle-sidebar',
        title: 'Toggle Sidebar Panel',
        description: 'Expand or collapse the navigation sidebar',
        category: 'View',
        icon: '📐',
        shortcut: 'Ctrl+Shift+[',
        action: () => this.store.toggleSidebar()
      },
      {
        id: 'open-export-dialog',
        title: 'Export Document',
        description: 'Export note to HTML, PDF, Markdown, DOCX, or PNG',
        category: 'Export',
        icon: '📥',
        shortcut: 'Ctrl+Shift+E',
        action: () => this.store.openExportModal()
      },
      {
        id: 'print-document',
        title: 'Print / Save to PDF',
        description: 'Print formatted document preview or save to PDF',
        category: 'Export',
        icon: '🖨️',
        shortcut: 'Ctrl+P',
        action: () => window.print()
      },
      {
        id: 'open-cheatsheet',
        title: 'Markdown Cheatsheet',
        description: 'View Markdown syntax guide and shortcuts',
        category: 'Workspace',
        icon: '📖',
        shortcut: 'Ctrl+/',
        action: () => this.store.openCheatSheetModal()
      },
      {
        id: 'open-diagram-modal',
        title: 'Insert Mermaid Diagram',
        description: 'Open visual diagram editor builder',
        category: 'Editor',
        icon: '📊',
        action: () => this.store.openDiagramModal('', '')
      },
      {
        id: 'toggle-view-editor',
        title: 'Switch to Editor Only Mode',
        description: 'Hide preview pane and focus on editor',
        category: 'View',
        icon: '✏️',
        action: () => this.store.setViewMode('editor')
      },
      {
        id: 'toggle-view-split',
        title: 'Switch to Split View Mode',
        description: 'Show editor and live preview side-by-side',
        category: 'View',
        icon: '⚖️',
        action: () => this.store.setViewMode('split')
      },
      {
        id: 'toggle-view-preview',
        title: 'Switch to Preview Only Mode',
        description: 'Hide editor and focus on rendered preview',
        category: 'View',
        icon: '👁️',
        action: () => this.store.setViewMode('preview')
      },
      {
        id: 'open-vault',
        title: 'Vault Encryption Settings',
        description: 'Configure AES-256 Web Crypto vault protection and auto-lock',
        category: 'Workspace',
        icon: '🔒',
        shortcut: 'Ctrl+Shift+U',
        action: () => window.dispatchEvent(new CustomEvent('app:open-vault', { detail: { tab: 'vault' } }))
      },
      {
        id: 'open-sync',
        title: 'Local-First Delta Sync',
        description: 'Export or import device sync payload (LWW merge resolution)',
        category: 'Workspace',
        icon: '🔄',
        action: () => window.dispatchEvent(new CustomEvent('app:open-vault', { detail: { tab: 'sync' } }))
      }
    ];

    this.registry.set(defaults);
  }
}
