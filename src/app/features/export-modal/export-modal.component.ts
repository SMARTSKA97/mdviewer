import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentStoreService } from '../../core/services/document-store.service';
import { ExportService } from '../../core/services/export.service';
import { BackupService } from '../../core/services/backup.service';

@Component({
  selector: 'app-export-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (store.exportModalOpen()) {
      <div 
        class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        (click)="store.closeExportModal()"
      >
        <div 
          class="w-full max-w-xl border rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-150"
          style="background-color: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary);"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div class="flex items-center justify-between pb-4 border-b border-slate-800">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                </svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-100">Export Document</h3>
                <p class="text-[11px] text-slate-400">Choose your preferred export format</p>
              </div>
            </div>

            <button 
              (click)="store.closeExportModal()" 
              class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Options Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 my-5">
            <!-- 1. PDF Document (Full Document) -->
            <button 
              (click)="exportPdf()"
              class="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-red-500/50 hover:bg-slate-800/50 text-left transition-all group flex flex-col justify-between"
            >
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-lg">📄</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-mono">.pdf</span>
                </div>
                <div class="text-xs font-bold text-slate-200 group-hover:text-red-300">PDF Document</div>
                <div class="text-[11px] text-slate-500 mt-1">Full-width multi-page document with clean page breaks & typography.</div>
              </div>
              <div class="text-[11px] text-red-400 font-medium mt-3 flex items-center gap-1">
                <span>Print / Save PDF</span>
                <span>→</span>
              </div>
            </button>

            <!-- 2. Word Document (.docx) -->
            <button 
              (click)="exportWordDoc()"
              class="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/50 text-left transition-all group flex flex-col justify-between"
            >
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-lg">📘</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono">.docx</span>
                </div>
                <div class="text-xs font-bold text-slate-200 group-hover:text-blue-300">Word Document (.docx)</div>
                <div class="text-[11px] text-slate-500 mt-1">Native Office OpenXML (.docx) with embedded diagram images.</div>
              </div>
              <div class="text-[11px] text-blue-400 font-medium mt-3 flex items-center gap-1">
                <span>Download .docx</span>
                <span>→</span>
              </div>
            </button>

            <!-- 3. Standalone HTML -->
            <button 
              (click)="exportHtml()"
              class="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-800/50 text-left transition-all group flex flex-col justify-between"
            >
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-lg">🌐</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono">.html</span>
                </div>
                <div class="text-xs font-bold text-slate-200 group-hover:text-sky-300">Standalone HTML</div>
                <div class="text-[11px] text-slate-500 mt-1">Single file with styles, fonts, and math embedded.</div>
              </div>
              <div class="text-[11px] text-sky-400 font-medium mt-3 flex items-center gap-1">
                <span>Download HTML</span>
                <span>→</span>
              </div>
            </button>

            <!-- 4. Markdown File -->
            <button 
              (click)="exportMarkdown()"
              class="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/50 text-left transition-all group flex flex-col justify-between"
            >
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-lg">📝</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">.md</span>
                </div>
                <div class="text-xs font-bold text-slate-200 group-hover:text-emerald-300">Raw Markdown</div>
                <div class="text-[11px] text-slate-500 mt-1">Download raw source .md file to local disk.</div>
              </div>
              <div class="text-[11px] text-emerald-400 font-medium mt-3 flex items-center gap-1">
                <span>Download .md</span>
                <span>→</span>
              </div>
            </button>

            <!-- 5. Full Workspace Backup (.json) -->
            <button 
              (click)="exportWorkspaceBackup()"
              class="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/50 text-left transition-all group flex flex-col justify-between"
            >
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-lg">📦</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono">.json</span>
                </div>
                <div class="text-xs font-bold text-slate-200 group-hover:text-amber-300">Full Workspace Backup</div>
                <div class="text-[11px] text-slate-500 mt-1">Export all notes, folders, metadata & attachments.</div>
              </div>
              <div class="text-[11px] text-amber-400 font-medium mt-3 flex items-center gap-1">
                <span>Export Workspace Backup</span>
                <span>→</span>
              </div>
            </button>

            <!-- 6. Restore Workspace Backup (.json) -->
            <button 
              (click)="triggerBackupImport(backupFileInput)"
              class="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800/50 text-left transition-all group flex flex-col justify-between"
            >
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-lg">📥</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono">Restore</span>
                </div>
                <div class="text-xs font-bold text-slate-200 group-hover:text-purple-300">Restore Workspace Backup</div>
                <div class="text-[11px] text-slate-500 mt-1">Upload & restore workspace from .json backup file.</div>
              </div>
              <div class="text-[11px] text-purple-400 font-medium mt-3 flex items-center gap-1">
                <span>Upload Backup File</span>
                <span>→</span>
              </div>
            </button>
          </div>

          <input #backupFileInput type="file" accept=".json" (change)="onBackupFileSelected($event)" class="hidden" />

          <!-- Quick Copy Action Strip -->
          <div class="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between">
            <div class="text-xs text-slate-300 font-medium">Quick Copy HTML to clipboard</div>
            <button 
              (click)="copyHtml()"
              class="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-black font-semibold text-xs transition-all"
            >
              {{ copiedHtml() ? 'Copied to Clipboard!' : 'Copy HTML Snippet' }}
            </button>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-800 mt-4">
            <button 
              (click)="store.closeExportModal()" 
              class="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class ExportModalComponent {
  store = inject(DocumentStoreService);
  exportService = inject(ExportService);
  backupService = inject(BackupService);

  copiedHtml = signal<boolean>(false);
  importMessage = signal<string>('');
  importError = signal<boolean>(false);

  async exportPdf(): Promise<void> {
    const tab = this.store.activeTab();
    if (!tab) return;
    this.store.closeExportModal();
    await this.exportService.exportAsPdf(this.store.renderedHtml(), tab.title);
  }

  async exportWordDoc(): Promise<void> {
    const tab = this.store.activeTab();
    if (!tab) return;
    this.store.closeExportModal();
    await this.exportService.exportAsDocx(this.store.renderedHtml(), tab.title);
  }

  async exportHtml(): Promise<void> {
    const tab = this.store.activeTab();
    if (!tab) return;
    this.store.closeExportModal();
    await this.exportService.exportAsHtml(this.store.renderedHtml(), tab.title);
  }

  async exportMarkdown(): Promise<void> {
    const tab = this.store.activeTab();
    if (!tab) return;
    this.store.closeExportModal();
    await this.exportService.exportAsMarkdown(tab.content, tab.title);
  }

  async exportWorkspaceBackup(): Promise<void> {
    this.store.closeExportModal();
    await this.backupService.exportWorkspaceBackup();
  }

  triggerBackupImport(input: HTMLInputElement): void {
    input.click();
  }

  async onBackupFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const text = await file.text();
    const success = await this.backupService.importWorkspaceBackup(text);
    if (success) {
      this.store.closeExportModal();
    } else {
      this.importError.set(true);
      this.importMessage.set('Failed to restore backup. Invalid JSON format.');
    }
  }

  async copyHtml(): Promise<void> {
    const ok = await this.exportService.copyHtmlToClipboard(this.store.renderedHtml());
    if (ok) {
      this.copiedHtml.set(true);
      setTimeout(() => {
        this.copiedHtml.set(false);
      }, 1800);
    }
  }
}
