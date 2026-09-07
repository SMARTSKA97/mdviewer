import { Component, inject, signal, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentStoreService } from '../../core/services/document-store.service';
import { ThemeService } from '../../core/services/theme.service';
import { FileService } from '../../core/services/file.service';
import { ShareService } from '../../core/services/share.service';
import { DatabaseService } from '../../core/services/database.service';
import { ViewMode } from '../../core/models/document.model';
import { ThemeId } from '../../core/models/theme.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="h-14 border-b backdrop-blur-md px-3 flex items-center justify-between select-none z-30 relative" style="background-color: var(--bg-surface); border-color: var(--border-color); color: var(--text-primary);">
      <!-- Left: Logo & Sidebar Toggle -->
      <div class="flex items-center gap-2.5">
        <button 
          (click)="store.toggleSidebar()" 
          class="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 rounded-lg transition-all"
          [title]="store.isSidebarCollapsed() ? 'Expand Sidebar (Ctrl+Shift+[)' : 'Collapse Sidebar (Ctrl+Shift+[)'"
        >
          <svg class="w-5 h-5 transition-transform duration-200" [class.rotate-180]="store.isSidebarCollapsed()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
          </svg>
        </button>

        <div class="flex items-center gap-2 cursor-pointer" (click)="store.openCommandPalette()" title="Open Command Palette (Ctrl+K)">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-sky-500/20 flex items-center justify-center">
            <div class="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-bold text-sky-400 text-sm">
              MD
            </div>
          </div>
          <div class="hidden sm:block">
            <div class="font-bold text-sm tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent flex items-center gap-1.5">
              MDViewer
            </div>
          </div>
        </div>
      </div>

      <!-- Center: Clean Active Document Title Indicator -->
      <div class="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl border border-transparent transition-colors">
        @if (store.activeTab(); as active) {
          <span class="text-xs font-semibold flex items-center gap-2 truncate max-w-xs md:max-w-md">
            <span class="text-sky-400 font-bold">📝</span>
            <span class="truncate">{{ active.title }}</span>
            @if (active.isDirty) {
              <span class="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse" title="Unsaved changes"></span>
            }
          </span>
        }
      </div>

      <!-- Right: View Modes & Actions -->
      <div class="flex items-center gap-1.5">
        <!-- Main Workspace View Mode Segmented Controls (Document / Table / Kanban) -->
        <div class="hidden sm:flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button 
            (click)="dbService.setMainViewMode('document')"
            [class.bg-sky-600]="dbService.mainViewMode() === 'document'"
            [class.text-white]="dbService.mainViewMode() === 'document'"
            [class.text-slate-400]="dbService.mainViewMode() !== 'document'"
            class="px-2.5 py-1 text-xs font-medium rounded-md hover:text-white transition-all flex items-center gap-1"
            title="Markdown Document View"
          >
            <span>📄</span>
            <span class="hidden md:inline">Note</span>
          </button>

          <button 
            (click)="dbService.setMainViewMode('table')"
            [class.bg-sky-600]="dbService.mainViewMode() === 'table'"
            [class.text-white]="dbService.mainViewMode() === 'table'"
            [class.text-slate-400]="dbService.mainViewMode() !== 'table'"
            class="px-2.5 py-1 text-xs font-medium rounded-md hover:text-white transition-all flex items-center gap-1"
            title="Interactive Metadata Table View"
          >
            <span>📊</span>
            <span class="hidden md:inline">Table</span>
          </button>

          <button 
            (click)="dbService.setMainViewMode('kanban')"
            [class.bg-sky-600]="dbService.mainViewMode() === 'kanban'"
            [class.text-white]="dbService.mainViewMode() === 'kanban'"
            [class.text-slate-400]="dbService.mainViewMode() !== 'kanban'"
            class="px-2.5 py-1 text-xs font-medium rounded-md hover:text-white transition-all flex items-center gap-1"
            title="Kanban Status Board View"
          >
            <span>📋</span>
            <span class="hidden md:inline">Kanban</span>
          </button>
        </div>

        @if (dbService.mainViewMode() === 'document') {
          <!-- View Mode Segmented Controls (Split / Edit / Preview) -->
          <div class="hidden md:flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
            <button 
              (click)="store.setViewMode('split')"
              [class.bg-slate-800]="store.viewMode() === 'split'"
              [class.text-sky-400]="store.viewMode() === 'split'"
              [class.text-slate-400]="store.viewMode() !== 'split'"
              class="px-2 py-1 text-xs font-medium rounded-md hover:text-white transition-all flex items-center gap-1"
              title="Split Mode"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 4v16M15 4v16M4 4h16v16H4z"/>
              </svg>
              <span>Split</span>
            </button>

            <button 
              (click)="store.setViewMode('editor')"
              [class.bg-slate-800]="store.viewMode() === 'editor'"
              [class.text-sky-400]="store.viewMode() === 'editor'"
              [class.text-slate-400]="store.viewMode() !== 'editor'"
              class="px-2 py-1 text-xs font-medium rounded-md hover:text-white transition-all flex items-center gap-1"
              title="Editor Only"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              <span>Edit</span>
            </button>

            <button 
              (click)="store.setViewMode('preview')"
              [class.bg-slate-800]="store.viewMode() === 'preview'"
              [class.text-sky-400]="store.viewMode() === 'preview'"
              [class.text-slate-400]="store.viewMode() !== 'preview'"
              class="px-2 py-1 text-xs font-medium rounded-md hover:text-white transition-all flex items-center gap-1"
              title="Preview Only"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              <span>Preview</span>
            </button>
          </div>
        }

        <div class="h-4 w-px bg-slate-800 mx-1 hidden sm:block"></div>

        <!-- Open File -->
        <button 
          (click)="openFile()" 
          class="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-all"
          title="Open Markdown File (Ctrl+O)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"/>
          </svg>
        </button>

        <!-- Save File -->
        <button 
          (click)="saveFile()" 
          class="p-2 text-slate-400 hover:text-sky-400 hover:bg-slate-800/60 rounded-lg transition-all relative"
          title="Save File (Ctrl+S)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
          </svg>
          @if (store.activeTab()?.isDirty) {
            <span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sky-400"></span>
          }
        </button>

        <!-- Share URL -->
        <button 
          (click)="shareLink()" 
          class="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-all"
          title="Share Compressed URL"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
          </svg>
        </button>

        <!-- Export Modal -->
        <button 
          (click)="store.openExportModal()" 
          class="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800/60 rounded-lg transition-all"
          title="Export as HTML, PDF, Markdown"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
          </svg>
        </button>

        <!-- Theme Selector Dropdown -->
        <div class="relative">
          <button 
            (click)="toggleThemeMenu($event)" 
            class="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-all flex items-center gap-1"
            title="Change Theme"
          >
            <div class="w-3.5 h-3.5 rounded-full border border-slate-600" [style.backgroundColor]="themeService.getThemeOption(themeService.currentTheme()).accentColor"></div>
          </button>

          @if (themeMenuOpen()) {
            <div 
              (click)="$event.stopPropagation()"
              class="absolute right-0 mt-2 w-52 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 border backdrop-blur-md"
              style="background-color: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary);"
            >
              <div class="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Select Theme</div>
              @for (t of themeService.themes; track t.id) {
                <button 
                  (click)="selectTheme(t.id, $event)" 
                  class="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors"
                  [style.backgroundColor]="t.id === themeService.currentTheme() ? 'var(--selection-bg)' : 'transparent'"
                  [style.color]="t.id === themeService.currentTheme() ? 'var(--accent)' : 'var(--text-primary)'"
                >
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full border border-slate-600 shrink-0" [style.backgroundColor]="t.accentColor"></div>
                    <span>{{ t.name }}</span>
                  </div>
                  @if (t.id === themeService.currentTheme()) {
                    <svg class="w-3.5 h-3.5" style="color: var(--accent);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                  }
                </button>
              }
            </div>
          }
        </div>

        <!-- Vault Encryption & Local Sync -->
        <button 
          (click)="openVault('vault')" 
          class="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800/60 rounded-lg transition-all"
          title="Vault Encryption & Local-First Sync (Ctrl+Shift+U)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        </button>

        <!-- Cheatsheet Modal -->
        <button 
          (click)="store.openCheatSheetModal()" 
          class="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-all"
          title="Markdown & Mermaid Cheatsheet"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
          </svg>
        </button>

        <!-- Command Palette Trigger -->
        <button 
          (click)="store.openCommandPalette()" 
          class="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 text-xs font-mono transition-all"
        >
          <span>Quick actions</span>
          <span class="kbd-shortcut">Ctrl+K</span>
        </button>
      </div>
    </header>

    <!-- Share Toast Notification -->
    @if (shareToast()) {
      <div class="fixed bottom-10 right-6 z-50 bg-sky-500 text-black font-semibold text-xs px-4 py-2.5 rounded-lg shadow-xl shadow-sky-500/20 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        <span>Compressed URL copied to clipboard!</span>
      </div>
    }
  `
})
export class HeaderComponent {
  store = inject(DocumentStoreService);
  themeService = inject(ThemeService);
  fileService = inject(FileService);
  shareService = inject(ShareService);
  dbService = inject(DatabaseService);

  themeMenuOpen = signal<boolean>(false);
  shareToast = signal<boolean>(false);

  editingTabId: string | null = null;
  editingTitle = '';

  toggleThemeMenu(event?: Event): void {
    if (event) event.stopPropagation();
    this.themeMenuOpen.update(v => !v);
  }

  selectTheme(themeId: ThemeId, event?: Event): void {
    if (event) event.stopPropagation();
    this.themeService.setTheme(themeId);
    this.themeMenuOpen.set(false);
  }

  async openFile(): Promise<void> {
    const res = await this.fileService.openLocalFile();
    if (res) {
      this.store.openDocument(res.title, res.content, res.handle);
    }
  }

  async saveFile(): Promise<void> {
    const tab = this.store.activeTab();
    if (!tab) return;

    const res = await this.fileService.saveFile(tab.content, tab.title, tab.fileHandle);
    this.store.markActiveTabSaved(res.handle);
    if (res.title !== tab.title) {
      this.store.renameActiveTab(res.title);
    }
  }

  shareLink(): void {
    const tab = this.store.activeTab();
    if (!tab) return;

    const url = this.shareService.generateShareUrl(tab.content, tab.title);
    navigator.clipboard.writeText(url).then(() => {
      this.shareToast.set(true);
      setTimeout(() => this.shareToast.set(false), 2500);
    });
  }

  startRenameTab(tabId: string, currentTitle: string, event: Event): void {
    event.stopPropagation();
    this.editingTabId = tabId;
    this.editingTitle = currentTitle;
  }

  saveRenameTab(tabId: string): void {
    if (this.editingTitle.trim()) {
      this.store.renameActiveTab(this.editingTitle.trim());
    }
    this.editingTabId = null;
  }

  cancelRenameTab(): void {
    this.editingTabId = null;
  }

  openVault(tab: 'vault' | 'sync' = 'vault'): void {
    window.dispatchEvent(new CustomEvent('app:open-vault', { detail: { tab } }));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Close theme menu if clicked outside
    if (this.themeMenuOpen()) {
      this.themeMenuOpen.set(false);
    }
  }
}
