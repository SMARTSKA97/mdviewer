import { Injectable, signal, computed, inject } from '@angular/core';
import { DocumentStoreService } from './document-store.service';
import { WorkspaceService } from './workspace.service';
import { FrontmatterService } from './frontmatter.service';
import { IndexedDbDocumentRepository } from '../repositories/indexed-db-document.repository';
import { Document } from '../models/document.model';

export type MainViewMode = 'document' | 'table' | 'kanban';

export interface DatabaseRow {
  doc: Document;
  title: string;
  folderName: string;
  status: string;
  priority: string;
  tags: string[];
  dueDate?: string;
  updatedAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private store = inject(DocumentStoreService);
  private workspaceService = inject(WorkspaceService);
  private frontmatterService = inject(FrontmatterService);
  private repository = inject(IndexedDbDocumentRepository);

  readonly mainViewMode = signal<MainViewMode>('document');
  readonly selectedFolderFilter = signal<string | null>(null);
  readonly selectedTagFilter = signal<string | null>(null);
  readonly selectedStatusFilter = signal<string | null>(null);
  readonly searchQuery = signal<string>('');

  readonly sortBy = signal<'title' | 'updatedAt' | 'priority' | 'status'>('updatedAt');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  readonly defaultStatuses = ['Backlog', 'To Do', 'In Progress', 'Done'];
  readonly defaultPriorities = ['Low', 'Medium', 'High', 'Urgent'];

  readonly databaseRows = computed<DatabaseRow[]>(() => {
    const docs = this.store.documents().filter(d => !d.archived);
    const folders = this.workspaceService.folders();

    const folderMap = new Map<string, string>();
    folders.forEach(f => folderMap.set(f.id, f.name));

    return docs.map(doc => {
      const { data } = this.frontmatterService.parse(doc.content);
      const folderName = doc.parentId ? (folderMap.get(doc.parentId) || 'Folder') : 'Root Notes';

      const status = data['status'] ? String(data['status']) : 'To Do';
      const priority = data['priority'] ? String(data['priority']) : 'Medium';
      const tags = Array.isArray(data['tags']) ? data['tags'] : (doc.tags || []);
      const dueDate = data['dueDate'] ? String(data['dueDate']) : undefined;

      return {
        doc,
        title: doc.title,
        folderName,
        status,
        priority,
        tags,
        dueDate,
        updatedAt: doc.updatedAt
      };
    });
  });

  readonly filteredRows = computed<DatabaseRow[]>(() => {
    let rows = this.databaseRows();
    const folderFilter = this.selectedFolderFilter();
    const tagFilter = this.selectedTagFilter();
    const statusFilter = this.selectedStatusFilter();
    const query = this.searchQuery().trim().toLowerCase();

    if (folderFilter) {
      rows = rows.filter(r => r.doc.parentId === folderFilter || (folderFilter === 'root' && !r.doc.parentId));
    }

    if (tagFilter) {
      rows = rows.filter(r => r.tags.some(t => t.toLowerCase() === tagFilter.toLowerCase()));
    }

    if (statusFilter) {
      rows = rows.filter(r => r.status.toLowerCase() === statusFilter.toLowerCase());
    }

    if (query) {
      rows = rows.filter(r => 
        r.title.toLowerCase().includes(query) ||
        r.folderName.toLowerCase().includes(query) ||
        r.status.toLowerCase().includes(query) ||
        r.priority.toLowerCase().includes(query)
      );
    }

    const dir = this.sortDirection() === 'asc' ? 1 : -1;
    const sortKey = this.sortBy();

    return [...rows].sort((a, b) => {
      if (sortKey === 'title') return a.title.localeCompare(b.title) * dir;
      if (sortKey === 'updatedAt') return (a.updatedAt - b.updatedAt) * dir;
      if (sortKey === 'status') return a.status.localeCompare(b.status) * dir;
      if (sortKey === 'priority') return a.priority.localeCompare(b.priority) * dir;
      return 0;
    });
  });

  setMainViewMode(mode: MainViewMode): void {
    this.mainViewMode.set(mode);
  }

  async updateProperty(docId: string, key: string, value: any): Promise<void> {
    const doc = this.store.documents().find(d => d.id === docId);
    if (!doc) return;

    const newContent = this.frontmatterService.updateProperty(doc.content, key, value);
    const updated: Document = {
      ...doc,
      content: newContent,
      updatedAt: Date.now()
    };

    // Update in store and persistence repository
    this.store.documents.update(docs => docs.map(d => d.id === docId ? updated : d));
    await this.repository.saveDocument(updated);

    // If active tab matches this document, sync tab content
    const activeTab = this.store.activeTab();
    if (activeTab && (activeTab.documentId === docId || activeTab.id === docId)) {
      this.store.updateContent(newContent);
    }
  }

  async createNoteWithMetadata(status = 'To Do', folderId: string | null = null): Promise<string> {
    const title = `Task ${Date.now().toString().slice(-4)}.md`;
    const initialContent = `---\ntitle: ${title}\nstatus: ${status}\npriority: Medium\ntags: [task]\n---\n\n# ${title.replace('.md', '')}\n\nTask details...`;

    const tabId = this.store.createNewTab(title, initialContent);
    const tab = this.store.tabs().find(t => t.id === tabId);

    if (tab && folderId) {
      await this.workspaceService.moveDocumentToFolder(tab.documentId, folderId);
    }

    return tabId;
  }
}
