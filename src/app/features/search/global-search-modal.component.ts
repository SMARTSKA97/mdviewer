import { Component, ElementRef, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchService, SearchResult } from '../../core/services/search.service';
import { DocumentStoreService } from '../../core/services/document-store.service';

@Component({
  selector: 'app-global-search-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
      <div 
        class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center pt-16 md:pt-24 px-4 animate-in fade-in duration-150"
        (click)="closeModal()"
      >
        <div 
          class="w-full max-w-2xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[75vh]"
          style="background-color: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary);"
          (click)="$event.stopPropagation()"
        >
          <!-- Search Header -->
          <div class="p-4 border-b flex items-center gap-3" style="background-color: var(--bg-surface); border-color: var(--border-subtle);">
            <svg class="w-5 h-5 shrink-0" style="color: var(--accent);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input 
              #searchInputRef
              [(ngModel)]="searchQuery"
              (ngModelChange)="onQueryChange($event)"
              (keydown)="onKeyDown($event)"
              placeholder="Search notes by title, content, or tags... (Ctrl+Shift+F)"
              class="flex-1 bg-transparent border-none outline-none font-medium text-sm placeholder-slate-500"
              style="color: var(--text-primary);"
              autofocus
            />
            <kbd class="kbd-shortcut select-none">ESC</kbd>
          </div>

          <!-- Search Results List -->
          <div class="flex-1 overflow-y-auto custom-scrollbar p-2 divide-y divide-slate-800/50">
            @if (results().length === 0 && searchQuery().trim()) {
              <div class="py-12 text-center text-slate-500 text-sm font-medium">
                No matching notes found for "<span class="text-slate-300">{{ searchQuery() }}</span>"
              </div>
            } @else if (!searchQuery().trim()) {
              <div class="py-12 text-center text-slate-500 text-xs font-mono">
                Type to search across all workspace notes...
              </div>
            } @else {
              @for (result of results(); track result.documentId + (result.line || 0); let idx = $index) {
                <div 
                  (click)="selectResult(result)"
                  [class.bg-sky-500\/10]="selectedIndex() === idx"
                  [class.border-sky-500\/30]="selectedIndex() === idx"
                  class="p-3 rounded-xl hover:bg-slate-800/60 cursor-pointer transition-colors border border-transparent group flex flex-col gap-1"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-sm text-slate-200 group-hover:text-sky-300 transition-colors">
                        {{ result.title }}
                      </span>
                      @if (result.folderPath) {
                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          📁 {{ result.folderPath }}
                        </span>
                      }
                    </div>
                    <span 
                      [class.bg-sky-500\/20]="result.matchType === 'title'"
                      [class.text-sky-300]="result.matchType === 'title'"
                      [class.bg-emerald-500\/20]="result.matchType === 'content'"
                      [class.text-emerald-300]="result.matchType === 'content'"
                      [class.bg-purple-500\/20]="result.matchType === 'tag'"
                      [class.text-purple-300]="result.matchType === 'tag'"
                      class="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full uppercase"
                    >
                      {{ result.matchType }} {{ result.line ? 'L' + result.line : '' }}
                    </span>
                  </div>
                  <p class="text-xs text-slate-400 font-mono line-clamp-2 leading-relaxed">
                    {{ result.snippet }}
                  </p>
                </div>
              }
            }
          </div>

          <!-- Search Footer -->
          <div class="px-4 py-2 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between font-mono">
            <span>{{ results().length }} results</span>
            <div class="flex items-center gap-3">
              <span>↑↓ Navigate</span>
              <span>↵ Open Note</span>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class GlobalSearchModalComponent {
  searchService = inject(SearchService);
  store = inject(DocumentStoreService);

  @ViewChild('searchInputRef') searchInputRef?: ElementRef<HTMLInputElement>;

  readonly isOpen = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly selectedIndex = signal<number>(0);

  readonly results = computed<SearchResult[]>(() => {
    return this.searchService.search(this.searchQuery());
  });

  openModal(): void {
    this.isOpen.set(true);
    this.searchQuery.set('');
    this.selectedIndex.set(0);
    setTimeout(() => {
      if (this.searchInputRef) {
        this.searchInputRef.nativeElement.focus();
      }
    }, 50);
  }

  closeModal(): void {
    this.isOpen.set(false);
  }

  onQueryChange(val: string): void {
    this.selectedIndex.set(0);
  }

  selectResult(result: SearchResult): void {
    const tabs = this.store.tabs();
    const existingTab = tabs.find(t => t.documentId === result.documentId || t.id === result.documentId);

    if (existingTab) {
      this.store.selectTab(existingTab.id);
    } else {
      const doc = this.store.documents().find(d => d.id === result.documentId);
      if (doc) {
        this.store.openDocument(doc.title, doc.content);
      }
    }
    this.closeModal();
  }

  onKeyDown(event: KeyboardEvent): void {
    const resCount = this.results().length;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeModal();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (resCount > 0) {
        this.selectedIndex.update(idx => (idx + 1) % resCount);
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (resCount > 0) {
        this.selectedIndex.update(idx => (idx - 1 + resCount) % resCount);
      }
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const currentResults = this.results();
      const idx = this.selectedIndex();
      if (currentResults[idx]) {
        this.selectResult(currentResults[idx]);
      }
    }
  }
}
