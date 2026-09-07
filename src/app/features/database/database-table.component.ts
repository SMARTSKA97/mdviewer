import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService, DatabaseRow } from '../../core/services/database.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { DocumentStoreService } from '../../core/services/document-store.service';
import { Document } from '../../core/models/document.model';

@Component({
  selector: 'app-database-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col overflow-hidden bg-slate-950/90 text-slate-200 select-none">
      <!-- Toolbar Filters & Sorting Header -->
      <div class="p-3 border-b border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
        <!-- Search & Filter Controls -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Search Input -->
          <div class="relative">
            <input 
              type="text" 
              [ngModel]="dbService.searchQuery()" 
              (ngModelChange)="dbService.searchQuery.set($event)"
              placeholder="Filter notes..."
              class="w-48 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <!-- Status Filter Dropdown -->
          <select 
            [ngModel]="dbService.selectedStatusFilter() || ''"
            (ngModelChange)="dbService.selectedStatusFilter.set($event || null)"
            class="bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 outline-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            @for (status of dbService.defaultStatuses; track status) {
              <option [value]="status">{{ status }}</option>
            }
          </select>

          <!-- Folder Filter Dropdown -->
          <select 
            [ngModel]="dbService.selectedFolderFilter() || ''"
            (ngModelChange)="dbService.selectedFolderFilter.set($event || null)"
            class="bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 outline-none cursor-pointer"
          >
            <option value="">All Folders</option>
            <option value="root">Root Notes (No Folder)</option>
            @for (folder of workspaceService.folders(); track folder.id) {
              <option [value]="folder.id">📁 {{ folder.name }}</option>
            }
          </select>

          <!-- Sort By Dropdown -->
          <select 
            [ngModel]="dbService.sortBy()"
            (ngModelChange)="dbService.sortBy.set($event)"
            class="bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 outline-none cursor-pointer"
          >
            <option value="updatedAt">Sort: Last Modified</option>
            <option value="title">Sort: Title</option>
            <option value="status">Sort: Status</option>
            <option value="priority">Sort: Priority</option>
          </select>

          <!-- Sort Direction Toggle -->
          <button 
            (click)="toggleSortDirection()"
            class="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-mono text-slate-300 transition-colors"
            title="Toggle Sort Direction"
          >
            {{ dbService.sortDirection() === 'asc' ? '↑ ASC' : '↓ DESC' }}
          </button>
        </div>

        <!-- Right: Actions -->
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400 font-mono hidden sm:inline">
            {{ dbService.filteredRows().length }} items
          </span>
          <button 
            (click)="createNote()"
            class="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-medium shadow-md transition-colors flex items-center gap-1"
          >
            <span>+</span>
            <span>New Note</span>
          </button>
        </div>
      </div>

      <!-- Main Interactive Data Table Container -->
      <div class="flex-1 overflow-auto custom-scrollbar">
        <table class="w-full text-left border-collapse min-w-[700px]">
          <!-- Table Header -->
          <thead>
            <tr class="border-b border-slate-800 bg-slate-900/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th class="py-3 px-4 font-mono">Title</th>
              <th class="py-3 px-3 font-mono">Folder</th>
              <th class="py-3 px-3 font-mono">Status</th>
              <th class="py-3 px-3 font-mono">Priority</th>
              <th class="py-3 px-3 font-mono">Tags</th>
              <th class="py-3 px-4 font-mono text-right">Modified</th>
            </tr>
          </thead>

          <!-- Table Body -->
          <tbody class="divide-y divide-slate-800/60 text-xs">
            @if (dbService.filteredRows().length === 0) {
              <tr>
                <td colspan="6" class="py-12 text-center text-slate-500 font-mono text-xs">
                  No matching notes found in database.
                </td>
              </tr>
            } @else {
              @for (row of dbService.filteredRows(); track row.doc.id) {
                <tr class="hover:bg-slate-900/50 transition-colors group">
                  <!-- Title -->
                  <td class="py-2.5 px-4 font-medium text-slate-200 truncate max-w-xs">
                    <button 
                      (click)="openDoc(row.doc)"
                      class="flex items-center gap-2 hover:text-sky-400 transition-colors text-left truncate"
                    >
                      <span class="text-sky-400 text-sm">📝</span>
                      <span class="truncate">{{ row.title }}</span>
                    </button>
                  </td>

                  <!-- Folder -->
                  <td class="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                    <span class="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                      📁 {{ row.folderName }}
                    </span>
                  </td>

                  <!-- Status (Inline Editable Dropdown) -->
                  <td class="py-2.5 px-3">
                    <select 
                      [ngModel]="row.status"
                      (ngModelChange)="dbService.updateProperty(row.doc.id, 'status', $event)"
                      [class.bg-slate-800\/60]="row.status === 'Backlog'"
                      [class.text-slate-400]="row.status === 'Backlog'"
                      [class.bg-sky-500\/20]="row.status === 'To Do'"
                      [class.text-sky-300]="row.status === 'To Do'"
                      [class.bg-amber-500\/20]="row.status === 'In Progress'"
                      [class.text-amber-300]="row.status === 'In Progress'"
                      [class.bg-emerald-500\/20]="row.status === 'Done'"
                      [class.text-emerald-300]="row.status === 'Done'"
                      class="px-2 py-1 rounded-lg border border-slate-700/60 font-semibold text-[11px] outline-none cursor-pointer"
                    >
                      @for (s of dbService.defaultStatuses; track s) {
                        <option [value]="s" class="bg-slate-900 text-slate-200">{{ s }}</option>
                      }
                    </select>
                  </td>

                  <!-- Priority (Inline Editable Dropdown) -->
                  <td class="py-2.5 px-3">
                    <select 
                      [ngModel]="row.priority"
                      (ngModelChange)="dbService.updateProperty(row.doc.id, 'priority', $event)"
                      [class.bg-slate-800\/60]="row.priority === 'Low'"
                      [class.text-slate-400]="row.priority === 'Low'"
                      [class.bg-sky-500\/20]="row.priority === 'Medium'"
                      [class.text-sky-300]="row.priority === 'Medium'"
                      [class.bg-amber-500\/20]="row.priority === 'High'"
                      [class.text-amber-300]="row.priority === 'High'"
                      [class.bg-rose-500\/20]="row.priority === 'Urgent'"
                      [class.text-rose-300]="row.priority === 'Urgent'"
                      class="px-2 py-1 rounded-lg border border-slate-700/60 font-semibold text-[11px] outline-none cursor-pointer"
                    >
                      @for (p of dbService.defaultPriorities; track p) {
                        <option [value]="p" class="bg-slate-900 text-slate-200">{{ p }}</option>
                      }
                    </select>
                  </td>

                  <!-- Tags -->
                  <td class="py-2.5 px-3">
                    <div class="flex flex-wrap gap-1">
                      @for (tag of row.tags; track tag) {
                        <span class="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono">
                          #{{ tag }}
                        </span>
                      }
                    </div>
                  </td>

                  <!-- Date Modified -->
                  <td class="py-2.5 px-4 text-right font-mono text-[11px] text-slate-500">
                    {{ formatDate(row.updatedAt) }}
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class DatabaseTableComponent {
  dbService = inject(DatabaseService);
  workspaceService = inject(WorkspaceService);
  store = inject(DocumentStoreService);

  toggleSortDirection(): void {
    const current = this.dbService.sortDirection();
    this.dbService.sortDirection.set(current === 'asc' ? 'desc' : 'asc');
  }

  openDoc(doc: Document): void {
    const tabs = this.store.tabs();
    const existing = tabs.find(t => t.documentId === doc.id || t.id === doc.id);
    if (existing) {
      this.store.selectTab(existing.id);
    } else {
      this.store.openDocument(doc.title, doc.content);
    }
    // Switch to document editor view
    this.dbService.setMainViewMode('document');
  }

  async createNote(): Promise<void> {
    await this.dbService.createNoteWithMetadata();
  }

  formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
