import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService, DatabaseRow } from '../../core/services/database.service';
import { DocumentStoreService } from '../../core/services/document-store.service';
import { Document } from '../../core/models/document.model';

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col overflow-hidden bg-slate-950/90 text-slate-200 select-none">
      <!-- Header Toolbar -->
      <div class="p-3 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">📋 Kanban Status Board</span>
        </div>

        <div class="flex items-center gap-2">
          <input 
            type="text" 
            [ngModel]="dbService.searchQuery()" 
            (ngModelChange)="dbService.searchQuery.set($event)"
            placeholder="Search cards..."
            class="w-48 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-sky-500 transition-colors"
          />
        </div>
      </div>

      <!-- Main Kanban Columns Container -->
      <div class="flex-1 overflow-x-auto p-4 custom-scrollbar">
        <div class="flex gap-4 h-full min-w-max items-start">
          @for (status of dbService.defaultStatuses; track status) {
            <div class="w-72 bg-slate-900/70 border border-slate-800/90 rounded-2xl flex flex-col max-h-full overflow-hidden shadow-xl shrink-0">
              <!-- Column Header -->
              <div class="p-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90">
                <div class="flex items-center gap-2">
                  <span 
                    class="w-2.5 h-2.5 rounded-full"
                    [class.bg-slate-400]="status === 'Backlog'"
                    [class.bg-sky-400]="status === 'To Do'"
                    [class.bg-amber-400]="status === 'In Progress'"
                    [class.bg-emerald-400]="status === 'Done'"
                  ></span>
                  <h3 class="text-xs font-bold text-slate-200 tracking-wide font-mono">{{ status }}</h3>
                </div>

                <span class="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700/60 text-[10px] font-mono text-slate-400">
                  {{ getCardsForStatus(status).length }}
                </span>
              </div>

              <!-- Column Cards List -->
              <div class="flex-1 overflow-y-auto p-2.5 space-y-2.5 custom-scrollbar">
                @if (getCardsForStatus(status).length === 0) {
                  <div class="p-6 text-center text-slate-600 text-xs italic font-mono">
                    No cards in {{ status }}
                  </div>
                } @else {
                  @for (card of getCardsForStatus(status); track card.doc.id) {
                    <div 
                      class="p-3 bg-slate-950/80 hover:bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-xl shadow-sm transition-all space-y-2 group cursor-pointer"
                      (click)="openDoc(card.doc)"
                    >
                      <!-- Card Title -->
                      <div class="flex items-start justify-between gap-2">
                        <span class="text-xs font-semibold text-slate-200 group-hover:text-sky-300 transition-colors line-clamp-2">
                          📝 {{ card.title }}
                        </span>
                      </div>

                      <!-- Badges Row -->
                      <div class="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <!-- Folder Badge -->
                        <span class="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                          📁 {{ card.folderName }}
                        </span>

                        <!-- Priority Badge -->
                        <span 
                          class="px-1.5 py-0.5 rounded font-mono font-semibold"
                          [class.bg-slate-800]="card.priority === 'Low'"
                          [class.text-slate-400]="card.priority === 'Low'"
                          [class.bg-sky-500\/20]="card.priority === 'Medium'"
                          [class.text-sky-300]="card.priority === 'Medium'"
                          [class.bg-amber-500\/20]="card.priority === 'High'"
                          [class.text-amber-300]="card.priority === 'High'"
                          [class.bg-rose-500\/20]="card.priority === 'Urgent'"
                          [class.text-rose-300]="card.priority === 'Urgent'"
                        >
                          {{ card.priority }}
                        </span>
                      </div>

                      <!-- Tags -->
                      @if (card.tags.length > 0) {
                        <div class="flex flex-wrap gap-1">
                          @for (tag of card.tags; track tag) {
                            <span class="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono">
                              #{{ tag }}
                            </span>
                          }
                        </div>
                      }

                      <!-- Card Actions (Move Status Dropdown) -->
                      <div class="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px]" (click)="$event.stopPropagation()">
                        <span class="text-slate-500 font-mono">Move status:</span>
                        <select 
                          [ngModel]="card.status"
                          (ngModelChange)="dbService.updateProperty(card.doc.id, 'status', $event)"
                          class="bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-[10px] text-slate-300 outline-none cursor-pointer"
                        >
                          @for (s of dbService.defaultStatuses; track s) {
                            <option [value]="s">{{ s }}</option>
                          }
                        </select>
                      </div>
                    </div>
                  }
                }
              </div>

              <!-- Bottom Add Card Button -->
              <div class="p-2 border-t border-slate-800/80 bg-slate-900/60">
                <button 
                  (click)="addCardToStatus(status)"
                  class="w-full py-1.5 rounded-xl bg-slate-800/80 hover:bg-sky-600/30 text-slate-300 hover:text-sky-300 text-xs font-medium transition-colors flex items-center justify-center gap-1 border border-slate-700/50"
                >
                  <span>+</span>
                  <span>Add Note</span>
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class KanbanBoardComponent {
  dbService = inject(DatabaseService);
  store = inject(DocumentStoreService);

  getCardsForStatus(status: string): DatabaseRow[] {
    return this.dbService.filteredRows().filter(r => r.status.toLowerCase() === status.toLowerCase());
  }

  openDoc(doc: Document): void {
    const tabs = this.store.tabs();
    const existing = tabs.find(t => t.documentId === doc.id || t.id === doc.id);
    if (existing) {
      this.store.selectTab(existing.id);
    } else {
      this.store.openDocument(doc.title, doc.content);
    }
    this.dbService.setMainViewMode('document');
  }

  async addCardToStatus(status: string): Promise<void> {
    await this.dbService.createNoteWithMetadata(status);
  }
}
