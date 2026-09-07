import { Component, inject, signal, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './features/header/header.component';
import { SidebarComponent } from './features/sidebar/sidebar.component';
import { ToolbarComponent, FormatAction } from './features/toolbar/toolbar.component';
import { EditorComponent } from './features/editor/editor.component';
import { PreviewComponent } from './features/preview/preview.component';
import { StatusBarComponent } from './features/status-bar/status-bar.component';
import { CommandPaletteComponent } from './features/command-palette/command-palette.component';
import { ExportModalComponent } from './features/export-modal/export-modal.component';
import { CheatsheetModalComponent } from './features/cheatsheet-modal/cheatsheet-modal.component';
import { PresentationComponent } from './features/presentation/presentation.component';
import { DiagramModalComponent } from './features/diagram-modal/diagram-modal.component';
import { GlobalSearchModalComponent } from './features/search/global-search-modal.component';
import { GraphViewComponent } from './features/graph/graph-view.component';
import { DatabaseTableComponent } from './features/database/database-table.component';
import { KanbanBoardComponent } from './features/database/kanban-board.component';
import { VaultModalComponent } from './features/vault/vault-modal.component';
import { DocumentStoreService } from './core/services/document-store.service';
import { ThemeService } from './core/services/theme.service';
import { DatabaseService } from './core/services/database.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    SidebarComponent,
    ToolbarComponent,
    EditorComponent,
    PreviewComponent,
    StatusBarComponent,
    CommandPaletteComponent,
    ExportModalComponent,
    CheatsheetModalComponent,
    PresentationComponent,
    DiagramModalComponent,
    GlobalSearchModalComponent,
    GraphViewComponent,
    DatabaseTableComponent,
    KanbanBoardComponent,
    VaultModalComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  store = inject(DocumentStoreService);
  themeService = inject(ThemeService);
  dbService = inject(DatabaseService);

  @ViewChild(EditorComponent) editorComponent?: EditorComponent;
  @ViewChild(PreviewComponent) previewComponent?: PreviewComponent;
  @ViewChild(GlobalSearchModalComponent) searchModal?: GlobalSearchModalComponent;
  @ViewChild(GraphViewComponent) graphModal?: GraphViewComponent;
  @ViewChild(VaultModalComponent) vaultModal?: VaultModalComponent;

  // Splitter width ratio (default 50% editor, 50% preview)
  splitterRatio = signal<number>(50);
  isDraggingSplitter = signal<boolean>(false);

  private isScrollingSync = false;

  onToolbarFormat(format: FormatAction): void {
    if (this.editorComponent) {
      this.editorComponent.applyFormat(format);
    }
  }

  onToolbarAction(action: string): void {
    if (action === 'undo' && this.editorComponent) {
      this.editorComponent.undo();
    } else if (action === 'redo' && this.editorComponent) {
      this.editorComponent.redo();
    }
  }

  // Synchronized scrolling handlers
  onEditorScrolled(data: { scrollTop: number; scrollRatio: number }): void {
    if (!this.store.isScrollSynced() || this.isScrollingSync) return;
    this.isScrollingSync = true;
    if (this.previewComponent) {
      this.previewComponent.scrollToRatio(data.scrollRatio);
    }
    setTimeout(() => {
      this.isScrollingSync = false;
    }, 20);
  }

  onPreviewScrolled(data: { scrollTop: number; scrollRatio: number }): void {
    if (!this.store.isScrollSynced() || this.isScrollingSync) return;
    this.isScrollingSync = true;
    if (this.editorComponent) {
      this.editorComponent.scrollToRatio(data.scrollRatio);
    }
    setTimeout(() => {
      this.isScrollingSync = false;
    }, 20);
  }

  // Resizable Splitter Gutter
  startSplitterDrag(event: MouseEvent): void {
    event.preventDefault();
    this.isDraggingSplitter.set(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.isDraggingSplitter()) return;
      const totalWidth = window.innerWidth;
      const offsetPercent = (moveEvent.clientX / totalWidth) * 100;
      // Clamp between 20% and 80%
      const clamped = Math.max(20, Math.min(80, offsetPercent));
      this.splitterRatio.set(clamped);
    };

    const onMouseUp = () => {
      this.isDraggingSplitter.set(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  // Global Keyboard Shortcuts
  @HostListener('document:keydown', ['$event'])
  onGlobalKeyDown(event: KeyboardEvent): void {
    const isMeta = event.ctrlKey || event.metaKey;

    // Ctrl+Shift+F : Global Workspace Search
    if (isMeta && event.shiftKey && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      this.searchModal?.openModal();
      return;
    }

    // Ctrl+Shift+G : Knowledge Graph View
    if (isMeta && event.shiftKey && event.key.toLowerCase() === 'g') {
      event.preventDefault();
      this.graphModal?.openModal();
      return;
    }

    // Ctrl+Shift+Z : Toggle Zen Mode
    if (isMeta && event.shiftKey && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      this.store.toggleZenMode();
      return;
    }

    // Escape Key : Exit Zen Mode
    if (event.key === 'Escape' && this.store.isZenMode()) {
      event.preventDefault();
      this.store.toggleZenMode();
      return;
    }

    // Ctrl+Shift+[ : Toggle Sidebar
    if (isMeta && event.shiftKey && (event.key === '[' || event.key === '{')) {
      event.preventDefault();
      this.store.toggleSidebar();
      return;
    }

    // Ctrl+Shift+E : Export Dialog
    if (isMeta && event.shiftKey && event.key.toLowerCase() === 'e') {
      event.preventDefault();
      this.store.openExportModal();
      return;
    }

    // Ctrl+Shift+U : Vault Encryption & Sync Dialog
    if (isMeta && event.shiftKey && event.key.toLowerCase() === 'u') {
      event.preventDefault();
      this.vaultModal?.openModal('vault');
      return;
    }

    // Ctrl+P : Print / Export to PDF (Triggers browser print with markdown CSS formatting)
    if (isMeta && !event.shiftKey && event.key.toLowerCase() === 'p') {
      event.preventDefault();
      if (this.store.commandPaletteOpen()) {
        this.store.closeCommandPalette();
      }
      window.print();
      return;
    }

    // Ctrl+K : Command Palette Toggle
    if (isMeta && !event.shiftKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (this.store.commandPaletteOpen()) {
        this.store.closeCommandPalette();
      } else {
        this.store.openCommandPalette();
      }
      return;
    }
  }

  @HostListener('window:app:open-search')
  onOpenSearch(): void {
    this.searchModal?.openModal();
  }

  @HostListener('window:app:open-graph')
  onOpenGraph(): void {
    this.graphModal?.openModal();
  }

  @HostListener('window:app:open-vault', ['$event'])
  onOpenVault(event: Event): void {
    const detail = (event as CustomEvent)?.detail;
    const tab = detail?.tab || 'vault';
    this.vaultModal?.openModal(tab);
  }
}
