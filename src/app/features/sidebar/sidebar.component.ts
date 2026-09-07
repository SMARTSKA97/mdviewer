import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentStoreService } from '../../core/services/document-store.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { IndexerService } from '../../core/services/indexer.service';
import { FrontmatterService } from '../../core/services/frontmatter.service';
import { Document } from '../../core/models/document.model';

type SidebarTab = 'tree' | 'toc' | 'backlinks' | 'properties' | 'favorites' | 'recent' | 'snippets' | 'trash';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <aside 
      class="app-sidebar h-full border-r flex flex-col transition-all duration-300 ease-in-out relative z-20 select-none shrink-0 overflow-hidden"
      style="background-color: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary);"
      [class.w-80]="!store.isSidebarCollapsed()"
      [class.w-0]="store.isSidebarCollapsed()"
      [class.opacity-0]="store.isSidebarCollapsed()"
      [class.pointer-events-none]="store.isSidebarCollapsed()"
    >
      <!-- Sidebar Navigation Header & Tabs -->
      <div class="p-2 border-b border-slate-800/80 bg-slate-950/40 space-y-1.5">
        <div class="grid grid-cols-7 gap-0.5 bg-slate-900/90 p-0.5 rounded-xl border border-slate-800/80">
          <button 
            (click)="activeTab.set('tree')"
            [class.bg-slate-800]="activeTab() === 'tree'"
            [class.text-sky-400]="activeTab() === 'tree'"
            [class.text-slate-400]="activeTab() !== 'tree'"
            class="py-1.5 text-xs font-medium rounded-lg hover:text-white transition-all flex flex-col items-center justify-center gap-0.5"
            title="Workspace Tree & Folders"
          >
            <span class="text-sm">📁</span>
          </button>

          <button 
            (click)="activeTab.set('toc')"
            [class.bg-slate-800]="activeTab() === 'toc'"
            [class.text-sky-400]="activeTab() === 'toc'"
            [class.text-slate-400]="activeTab() !== 'toc'"
            class="py-1.5 text-xs font-medium rounded-lg hover:text-white transition-all flex flex-col items-center justify-center gap-0.5"
            title="Document Outline TOC"
          >
            <span class="text-sm">📑</span>
          </button>

          <button 
            (click)="activeTab.set('backlinks')"
            [class.bg-slate-800]="activeTab() === 'backlinks'"
            [class.text-sky-400]="activeTab() === 'backlinks'"
            [class.text-slate-400]="activeTab() !== 'backlinks'"
            class="py-1.5 text-xs font-medium rounded-lg hover:text-white transition-all flex flex-col items-center justify-center gap-0.5"
            title="Backlinks & Linked References"
          >
            <span class="text-sm">🔗</span>
          </button>

          <button 
            (click)="activeTab.set('properties')"
            [class.bg-slate-800]="activeTab() === 'properties'"
            [class.text-sky-400]="activeTab() === 'properties'"
            [class.text-slate-400]="activeTab() !== 'properties'"
            class="py-1.5 text-xs font-medium rounded-lg hover:text-white transition-all flex flex-col items-center justify-center gap-0.5"
            title="YAML Frontmatter Properties"
          >
            <span class="text-sm">🏷️</span>
          </button>

          <button 
            (click)="activeTab.set('favorites')"
            [class.bg-slate-800]="activeTab() === 'favorites'"
            [class.text-amber-400]="activeTab() === 'favorites'"
            [class.text-slate-400]="activeTab() !== 'favorites'"
            class="py-1.5 text-xs font-medium rounded-lg hover:text-white transition-all flex flex-col items-center justify-center gap-0.5"
            title="Favorite Notes"
          >
            <span class="text-sm">⭐</span>
          </button>

          <button 
            (click)="activeTab.set('snippets')"
            [class.bg-slate-800]="activeTab() === 'snippets'"
            [class.text-purple-400]="activeTab() === 'snippets'"
            [class.text-slate-400]="activeTab() !== 'snippets'"
            class="py-1.5 text-xs font-medium rounded-lg hover:text-white transition-all flex flex-col items-center justify-center gap-0.5"
            title="Diagrams & Templates"
          >
            <span class="text-sm">📐</span>
          </button>

          <button 
            (click)="activeTab.set('trash')"
            [class.bg-slate-800]="activeTab() === 'trash'"
            [class.text-rose-400]="activeTab() === 'trash'"
            [class.text-slate-400]="activeTab() !== 'trash'"
            class="py-1.5 text-xs font-medium rounded-lg hover:text-white transition-all flex flex-col items-center justify-center gap-0.5"
            title="Trash Bin"
          >
            <span class="text-sm">🗑️</span>
          </button>
        </div>
      </div>

      <!-- Main Sidebar Scrollable Body -->
      <div class="flex-1 overflow-y-auto p-3 custom-scrollbar">

        <!-- 1. TREE VIEW TAB -->
        @if (activeTab() === 'tree') {
          <div class="space-y-3">
            <!-- Open Files / Active Tabs Section -->
            <div class="rounded-xl border p-2 space-y-1.5" style="background-color: var(--bg-surface); border-color: var(--border-subtle);">
              <div class="flex items-center justify-between px-1">
                <span class="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5" style="color: var(--accent);">
                  <span>📄 Open Files</span>
                  <span class="text-[10px] font-mono opacity-70">({{ store.tabs().length }})</span>
                </span>
                <button 
                  (click)="store.createNewTab()"
                  class="px-2 py-0.5 rounded text-[10px] font-bold transition-all shadow-sm flex items-center gap-1"
                  style="background-color: var(--accent); color: #000;"
                  title="New File Tab"
                >
                  + New
                </button>
              </div>

              <div class="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-0.5">
                @for (tab of store.tabs(); track tab.id) {
                  <div 
                    (click)="store.selectTab(tab.id)"
                    class="group flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all"
                    [style.backgroundColor]="tab.id === store.activeTabId() ? 'var(--selection-bg)' : 'var(--bg-tertiary)'"
                    [style.borderColor]="tab.id === store.activeTabId() ? 'var(--accent)' : 'var(--border-subtle)'"
                    [style.color]="tab.id === store.activeTabId() ? 'var(--accent)' : 'var(--text-primary)'"
                  >
                    <div class="flex items-center gap-2 truncate">
                      <span class="text-xs shrink-0">📝</span>
                      @if (editingTabId === tab.id) {
                        <input 
                          type="text" 
                          [(ngModel)]="editingTitle" 
                          (blur)="saveRenameTab(tab.id)" 
                          (keydown.enter)="saveRenameTab(tab.id)" 
                          (keydown.escape)="cancelRenameTab()"
                          (click)="$event.stopPropagation()"
                          autofocus
                          class="text-xs px-1 py-0.5 rounded border outline-none w-28"
                          style="background-color: var(--bg-primary); color: var(--text-primary); border-color: var(--accent);"
                        />
                      } @else {
                        <span 
                          (dblclick)="startRenameTab(tab.id, tab.title, $event)" 
                          class="truncate max-w-[130px]" 
                          title="Double click to rename file"
                        >
                          {{ tab.title }}
                        </span>
                      }
                      @if (tab.isDirty) {
                        <span class="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 animate-pulse" title="Unsaved changes"></span>
                      }
                    </div>

                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        (click)="startRenameTab(tab.id, tab.title, $event)" 
                        class="p-0.5 rounded hover:opacity-80 text-[10px]"
                        title="Rename File"
                      >✏️</button>
                      <button 
                        (click)="store.closeTab(tab.id, $event)" 
                        class="p-0.5 rounded hover:text-red-400 transition-colors"
                        title="Close Tab"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Workspace Folders Toolbar -->
            <div class="flex items-center justify-between px-1 pt-1">
              <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Workspace Files</span>
              <div class="flex items-center gap-1">
                <button 
                  (click)="promptCreateFolder()"
                  class="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white text-[11px] rounded font-medium transition-colors border border-slate-700"
                  title="New Folder"
                >
                  + Folder
                </button>
                <button 
                  (click)="store.createNewTab()"
                  class="px-2 py-0.5 bg-sky-600 hover:bg-sky-500 text-white text-[11px] rounded font-medium transition-colors shadow-sm"
                  title="New Note"
                >
                  + Note
                </button>
              </div>
            </div>

            <!-- Folders List -->
            @for (folder of workspaceService.folders(); track folder.id) {
              <div class="rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden">
                <!-- Folder Header Row -->
                <div 
                  (click)="workspaceService.toggleFolderCollapsed(folder.id)"
                  class="flex items-center justify-between p-2 hover:bg-slate-800/60 cursor-pointer text-xs font-medium text-slate-200 transition-colors group"
                >
                  <div class="flex items-center gap-1.5 truncate">
                    <span class="text-slate-400 text-[10px]">{{ folder.isCollapsed ? '►' : '▼' }}</span>
                    <span>📁</span>
                    <span class="truncate">{{ folder.name }}</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <button 
                      (click)="promptCreateNoteInFolder(folder.id, $event)"
                      class="px-1.5 py-0.5 rounded bg-sky-600/30 hover:bg-sky-500 text-sky-300 hover:text-white text-[10px] font-semibold transition-colors"
                      title="Create Note in this folder"
                    >
                      + Note
                    </button>
                    <button 
                      (click)="promptRenameFolder(folder.id, folder.name, $event)"
                      class="p-0.5 text-slate-400 hover:text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Rename Folder"
                    >
                      ✏️
                    </button>
                  </div>
                </div>

                <!-- Folder Children Notes -->
                @if (!folder.isCollapsed) {
                  <div class="pl-4 pr-2 pb-1 border-t border-slate-800/50 space-y-0.5 pt-1">
                    @if (getFolderDocs(folder.id).length === 0) {
                      <div class="text-[10px] text-slate-500 italic py-1 px-1">Empty folder. Click "+ Note" above to add notes.</div>
                    } @else {
                      @for (doc of getFolderDocs(folder.id); track doc.id) {
                        <div 
                          (click)="selectDoc(doc)"
                          [class.bg-sky-500\/10]="isDocActive(doc.id)"
                          [class.text-sky-300]="isDocActive(doc.id)"
                          class="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800/60 cursor-pointer text-xs transition-colors group"
                        >
                          <div class="flex items-center gap-1.5 truncate">
                            <span>📝</span>
                            <span class="truncate text-[11px]">{{ doc.title }}</span>
                          </div>
                          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              (click)="promptMoveNoteToFolder(doc.id, $event)"
                              class="hover:text-sky-300 text-[10px]"
                              title="Move to another folder"
                            >📁</button>
                            <button 
                              (click)="workspaceService.toggleFavorite(doc.id); $event.stopPropagation()"
                              class="hover:text-amber-400 text-[10px]"
                              title="Favorite Note"
                            >{{ doc.favorite ? '⭐' : '☆' }}</button>
                            <button 
                              (click)="workspaceService.moveToTrash(doc.id); $event.stopPropagation()"
                              class="hover:text-rose-400 text-[10px]"
                              title="Move to Trash"
                            >🗑️</button>
                          </div>
                        </div>
                      }
                    }
                  </div>
                }
              </div>
            }

            <!-- Root Unfolder Notes -->
            <div class="space-y-1 pt-1">
              <div class="text-[10px] font-semibold uppercase text-slate-500 px-1">Root Notes (No Folder)</div>
              @for (doc of getFolderDocs(null); track doc.id) {
                <div 
                  (click)="selectDoc(doc)"
                  [class.bg-sky-500\/10]="isDocActive(doc.id)"
                  [class.text-sky-300]="isDocActive(doc.id)"
                  [class.border-sky-500\/30]="isDocActive(doc.id)"
                  class="flex items-center justify-between p-2 rounded-xl border border-slate-800/80 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-800/60 cursor-pointer transition-all group"
                >
                  <div class="flex items-center gap-2 truncate">
                    <span class="text-sky-400">📝</span>
                    <span class="text-xs font-medium text-slate-200 truncate">{{ doc.title }}</span>
                  </div>
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      (click)="promptMoveNoteToFolder(doc.id, $event)"
                      class="hover:text-sky-300 text-xs"
                      title="Move to Folder"
                    >📁</button>
                    <button 
                      (click)="workspaceService.toggleFavorite(doc.id); $event.stopPropagation()"
                      class="hover:text-amber-400 text-xs"
                      title="Toggle Favorite"
                    >{{ doc.favorite ? '⭐' : '☆' }}</button>
                    <button 
                      (click)="workspaceService.moveToTrash(doc.id); $event.stopPropagation()"
                      class="hover:text-rose-400 text-xs"
                      title="Move to Trash"
                    >🗑️</button>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- 2. TOC TAB -->
        @if (activeTab() === 'toc') {
          <div class="space-y-1">
            <div class="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1 mb-1">
              <span>Document Outline</span>
              <span class="text-[10px] text-slate-500 font-mono">{{ store.toc().length }} headings</span>
            </div>

            @if (store.toc().length === 0) {
              <div class="text-center py-8 text-slate-500 text-xs">
                <p>No headings detected yet.</p>
                <p class="text-[11px] text-slate-600 mt-1">Use # Heading 1 or ## Heading 2 in markdown.</p>
              </div>
            } @else {
              @for (item of store.toc(); track item.id + item.level) {
                <a 
                  (click)="scrollToHeading(item.id, $event)"
                  [style.paddingLeft.rem]="(item.level - 1) * 0.75 + 0.5"
                  class="flex items-center gap-1.5 py-1.5 pr-2 rounded-lg text-xs hover:bg-slate-900 text-slate-300 hover:text-sky-400 cursor-pointer transition-colors group truncate"
                >
                  <span class="text-[10px] text-slate-600 group-hover:text-sky-400/60 font-mono">H{{ item.level }}</span>
                  <span class="truncate">{{ item.text }}</span>
                </a>
              }
            }
          </div>
        }

        <!-- 3. BACKLINKS TAB -->
        @if (activeTab() === 'backlinks') {
          <div class="space-y-3">
            <!-- Linked References -->
            <div>
              <div class="text-[11px] font-semibold uppercase tracking-wider text-sky-400 px-2 py-1 flex items-center justify-between">
                <span>🔗 Linked References</span>
                <span class="text-[10px] text-slate-500 font-mono">{{ activeBacklinks.length }} links</span>
              </div>

              @if (activeBacklinks.length === 0) {
                <div class="text-center py-6 text-slate-500 text-xs font-mono">
                  No notes link to "<span class="text-slate-300">{{ store.activeTab()?.title }}</span>" yet.
                  <p class="text-[10px] text-slate-600 mt-1">Use [[{{ store.activeTab()?.title?.replace('.md', '') }}]] in another note to link here!</p>
                </div>
              } @else {
                <div class="space-y-1.5 mt-1">
                  @for (link of activeBacklinks; track link.sourceDocId + link.line) {
                    <div 
                      (click)="openDocById(link.sourceDocId)"
                      class="p-2.5 rounded-xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-800/80 cursor-pointer transition-all space-y-1 group"
                    >
                      <div class="flex items-center justify-between text-xs font-semibold text-sky-300 group-hover:text-sky-200">
                        <span>📝 {{ link.sourceTitle }}</span>
                        <span class="text-[10px] text-slate-500 font-mono">L{{ link.line }}</span>
                      </div>
                      <p class="text-xs text-slate-400 font-mono line-clamp-2 leading-relaxed">
                        {{ link.snippet }}
                      </p>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Unlinked References -->
            <div class="pt-2 border-t border-slate-800/60">
              <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
                <span>💡 Unlinked Mentions</span>
                <span class="text-[10px] text-slate-500 font-mono">{{ activeUnlinked.length }} matches</span>
              </div>

              @for (match of activeUnlinked; track match.sourceDocId + match.line) {
                <div 
                  (click)="openDocById(match.sourceDocId)"
                  class="p-2.5 rounded-xl border border-slate-800/50 bg-slate-950/40 hover:bg-slate-900/60 cursor-pointer transition-all space-y-1 group mt-1"
                >
                  <div class="flex items-center justify-between text-xs font-medium text-slate-300 group-hover:text-sky-300">
                    <span>{{ match.sourceTitle }}</span>
                    <span class="text-[10px] text-slate-500 font-mono">L{{ match.line }}</span>
                  </div>
                  <p class="text-xs text-slate-400 font-mono line-clamp-2 leading-relaxed">
                    {{ match.snippet }}
                  </p>
                </div>
              }
            </div>
          </div>
        }

        <!-- 4. PROPERTIES TAB -->
        @if (activeTab() === 'properties') {
          <div class="space-y-3">
            <div class="text-[11px] font-semibold uppercase tracking-wider text-purple-400 px-2 py-1 flex items-center justify-between">
              <span>🏷️ Document Properties</span>
            </div>

            <div class="p-3 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
              <div class="space-y-1">
                <label class="text-[10px] font-semibold text-slate-400 uppercase font-mono">Title</label>
                <div class="text-xs font-semibold text-slate-200">{{ store.activeTab()?.title }}</div>
              </div>

              <div class="space-y-1 pt-1 border-t border-slate-800/60">
                <label class="text-[10px] font-semibold text-slate-400 uppercase font-mono">Tags Index</label>
                <div class="flex flex-wrap gap-1 pt-0.5">
                  @for (tagEntry of indexer.tagsIndex(); track tagEntry.tag) {
                    <span class="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono border border-purple-500/30">
                      #{{ tagEntry.tag }} ({{ tagEntry.count }})
                    </span>
                  }
                </div>
              </div>
            </div>
          </div>
        }

        <!-- 5. FAVORITES TAB -->
        @if (activeTab() === 'favorites') {
          <div class="space-y-1.5">
            <div class="text-[11px] font-semibold uppercase tracking-wider text-amber-400 px-2 py-1 flex items-center gap-1.5">
              <span>⭐ Favorite Notes</span>
            </div>

            @if (workspaceService.favoriteDocuments().length === 0) {
              <div class="text-center py-8 text-slate-500 text-xs font-mono">
                No favorite notes starred yet. Click ☆ on any note to pin it here!
              </div>
            } @else {
              @for (doc of workspaceService.favoriteDocuments(); track doc.id) {
                <div 
                  (click)="selectDoc(doc)"
                  class="p-2.5 rounded-xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-800/80 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div class="flex items-center gap-2 truncate">
                    <span class="text-amber-400">⭐</span>
                    <span class="text-xs font-medium text-slate-200 truncate">{{ doc.title }}</span>
                  </div>
                  <button 
                    (click)="workspaceService.toggleFavorite(doc.id); $event.stopPropagation()"
                    class="text-amber-400 text-xs opacity-60 hover:opacity-100"
                  >★</button>
                </div>
              }
            }
          </div>
        }

        <!-- 6. SNIPPETS TAB -->
        @if (activeTab() === 'snippets') {
          <div class="space-y-4">
            <div>
              <div class="text-[11px] font-semibold uppercase tracking-wider text-purple-400 px-1 mb-2">🧜 Mermaid Diagrams</div>
              <div class="grid grid-cols-1 gap-1.5">
                @for (snippet of mermaidSnippets; track snippet.name) {
                  <button 
                    (click)="insertSnippet(snippet.code)"
                    class="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 text-left text-xs text-slate-200 transition-all"
                  >
                    <div>
                      <div class="font-medium">{{ snippet.name }}</div>
                      <div class="text-[10px] text-slate-500">{{ snippet.desc }}</div>
                    </div>
                    <span class="text-xs text-slate-500">+ Insert</span>
                  </button>
                }
              </div>
            </div>
          </div>
        }

        <!-- 7. TRASH TAB -->
        @if (activeTab() === 'trash') {
          <div class="space-y-2">
            <div class="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-rose-400 px-2 py-1">
              <span>🗑️ Trash Bin</span>
              @if (workspaceService.trashDocuments().length > 0) {
                <button 
                  (click)="confirmEmptyTrash()"
                  class="text-[10px] text-rose-400 hover:underline font-mono"
                >
                  Empty Trash
                </button>
              }
            </div>

            @if (workspaceService.trashDocuments().length === 0) {
              <div class="text-center py-8 text-slate-500 text-xs font-mono">
                Trash bin is empty.
              </div>
            } @else {
              @for (doc of workspaceService.trashDocuments(); track doc.id) {
                <div class="p-2.5 rounded-xl border border-rose-950/60 bg-rose-950/20 flex items-center justify-between group">
                  <div class="truncate">
                    <div class="text-xs font-medium text-slate-300 truncate">{{ doc.title }}</div>
                    <div class="text-[10px] text-slate-500 font-mono">Deleted note</div>
                  </div>
                  <div class="flex items-center gap-1">
                    <button 
                      (click)="workspaceService.restoreFromTrash(doc.id)"
                      class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 text-[10px] rounded font-medium"
                      title="Restore Note"
                    >
                      Restore
                    </button>
                    <button 
                      (click)="workspaceService.deletePermanently(doc.id)"
                      class="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 text-[10px] rounded font-medium"
                      title="Delete Permanently"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              }
            }
          </div>
        }

      </div>

      <!-- Footer Stats & Graph Button -->
      <div class="p-3 border-t border-slate-800/80 bg-slate-950/90 text-xs text-slate-400 flex items-center justify-between">
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span class="text-[11px] text-slate-300 font-medium">IndexedDB Ready</span>
        </div>
        <span class="text-[11px] text-slate-500 font-mono">{{ store.stats().words }} words</span>
      </div>
    </aside>
  `
})
export class SidebarComponent {
  store = inject(DocumentStoreService);
  workspaceService = inject(WorkspaceService);
  indexer = inject(IndexerService);
  frontmatterService = inject(FrontmatterService);

  activeTab = signal<SidebarTab>('tree');

  editingTabId: string | null = null;
  editingTitle = '';

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

  mermaidSnippets = [
    { name: 'System Architecture', desc: 'Subgraphs, queues & class styling', code: '\n```mermaid\nflowchart LR\n  A[Client] --> B[API Gateway]\n```\n' },
    { name: 'Sequence Diagram', desc: 'Actors & messages', code: '\n```mermaid\nsequenceDiagram\n  Client->>API: Request\n```\n' }
  ];

  get activeBacklinks() {
    const title = this.store.activeTab()?.title ?? '';
    return this.indexer.getBacklinksForDocument(title);
  }

  get activeUnlinked() {
    const title = this.store.activeTab()?.title ?? '';
    return this.indexer.getUnlinkedReferencesForDocument(title);
  }

  getFolderDocs(folderId: string | null): Document[] {
    return this.workspaceService.activeDocuments().filter(d => (d.parentId ?? null) === folderId);
  }

  isDocActive(docId: string): boolean {
    const tab = this.store.activeTab();
    return !!(tab && (tab.documentId === docId || tab.id === docId));
  }

  selectDoc(doc: Document): void {
    const tabs = this.store.tabs();
    const existing = tabs.find(t => t.documentId === doc.id || t.id === doc.id);
    if (existing) {
      this.store.selectTab(existing.id);
    } else {
      this.store.openDocument(doc.title, doc.content);
    }
  }

  openDocById(docId: string): void {
    const doc = this.store.documents().find(d => d.id === docId);
    if (doc) this.selectDoc(doc);
  }

  async promptCreateFolder(): Promise<void> {
    const name = prompt('Folder name:', 'New Folder');
    if (name) {
      await this.workspaceService.createFolder(name);
    }
  }

  async promptCreateNoteInFolder(folderId: string, event: Event): Promise<void> {
    event.stopPropagation();
    const title = prompt('Note title:', 'Untitled.md');
    if (title) {
      const tabId = this.store.createNewTab(title);
      const tab = this.store.tabs().find(t => t.id === tabId);
      if (tab) {
        await this.workspaceService.moveDocumentToFolder(tab.documentId, folderId);
      }
    }
  }

  async promptRenameFolder(folderId: string, currentName: string, event: Event): Promise<void> {
    event.stopPropagation();
    const newName = prompt('New folder name:', currentName);
    if (newName && newName.trim() !== currentName) {
      await this.workspaceService.renameFolder(folderId, newName.trim());
    }
  }

  async promptMoveNoteToFolder(docId: string, event: Event): Promise<void> {
    event.stopPropagation();
    const folders = this.workspaceService.folders();
    if (folders.length === 0) {
      alert('No folders exist yet. Click "+ Folder" at the top of the sidebar to create one!');
      return;
    }

    const folderList = folders.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
    const choice = prompt(`Move note to folder:\n0. [Root Notes - No Folder]\n${folderList}\n\nEnter folder number:`);
    if (choice !== null) {
      const idx = parseInt(choice.trim(), 10);
      if (idx === 0) {
        await this.workspaceService.moveDocumentToFolder(docId, null);
      } else if (idx > 0 && idx <= folders.length) {
        await this.workspaceService.moveDocumentToFolder(docId, folders[idx - 1].id);
      }
    }
  }

  confirmEmptyTrash(): void {
    if (confirm('Are you sure you want to permanently delete all notes in the Trash bin?')) {
      this.workspaceService.emptyTrash();
    }
  }

  scrollToHeading(id: string, event: Event): void {
    event.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  insertSnippet(text: string): void {
    this.store.updateContent(this.store.activeContent() + text);
  }

  formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}
