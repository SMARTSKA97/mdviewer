import { Injectable, signal, computed, inject } from '@angular/core';
import { Document, Folder } from '../models/document.model';
import { IndexedDbDocumentRepository } from '../repositories/indexed-db-document.repository';
import { DocumentStoreService } from './document-store.service';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {
  private repository = inject(IndexedDbDocumentRepository);
  private store = inject(DocumentStoreService);

  readonly folders = signal<Folder[]>([]);

  // Computed views
  readonly activeDocuments = computed(() => {
    return this.store.documents().filter(d => !d.archived);
  });

  readonly favoriteDocuments = computed(() => {
    return this.activeDocuments().filter(d => d.favorite);
  });

  readonly recentDocuments = computed(() => {
    return [...this.activeDocuments()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8);
  });

  readonly trashDocuments = computed(() => {
    return this.store.documents().filter(d => d.archived);
  });

  readonly trashFolders = computed(() => {
    return this.folders().filter(f => f.isCollapsed === undefined ? false : false); // Folder archiving hook
  });

  constructor() {
    this.initFolders();
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'folder-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
  }

  private async initFolders(): Promise<void> {
    try {
      const folders = await this.repository.getAllFolders();
      this.folders.set(folders || []);
    } catch (err) {
      console.warn('Load folders failed:', err);
    }
  }

  async createFolder(name = 'New Folder', parentId: string | null = null): Promise<string> {
    const id = this.generateId();
    const now = Date.now();

    const folder: Folder = {
      id,
      name: name.trim(),
      parentId,
      createdAt: now,
      updatedAt: now,
      isCollapsed: false
    };

    this.folders.update(items => [...items, folder]);
    await this.repository.saveFolder(folder);
    return id;
  }

  async renameFolder(id: string, newName: string): Promise<void> {
    const cleanName = newName.trim();
    if (!cleanName) return;

    this.folders.update(items =>
      items.map(f => {
        if (f.id === id) {
          const updated = { ...f, name: cleanName, updatedAt: Date.now() };
          this.repository.saveFolder(updated);
          return updated;
        }
        return f;
      })
    );
  }

  async toggleFolderCollapsed(id: string): Promise<void> {
    this.folders.update(items =>
      items.map(f => {
        if (f.id === id) {
          const updated = { ...f, isCollapsed: !f.isCollapsed };
          this.repository.saveFolder(updated);
          return updated;
        }
        return f;
      })
    );
  }

  async moveDocumentToFolder(documentId: string, folderId: string | null): Promise<void> {
    this.store.documents.update(docs =>
      docs.map(d => {
        if (d.id === documentId) {
          const updated = { ...d, parentId: folderId, updatedAt: Date.now() };
          this.repository.saveDocument(updated);
          return updated;
        }
        return d;
      })
    );
  }

  async toggleFavorite(documentId: string): Promise<void> {
    this.store.documents.update(docs =>
      docs.map(d => {
        if (d.id === documentId) {
          const updated = { ...d, favorite: !d.favorite, updatedAt: Date.now() };
          this.repository.saveDocument(updated);
          return updated;
        }
        return d;
      })
    );
  }

  async moveToTrash(documentId: string): Promise<void> {
    this.store.documents.update(docs =>
      docs.map(d => {
        if (d.id === documentId) {
          const updated = { ...d, archived: true, updatedAt: Date.now() };
          this.repository.saveDocument(updated);
          return updated;
        }
        return d;
      })
    );
  }

  async restoreFromTrash(documentId: string): Promise<void> {
    this.store.documents.update(docs =>
      docs.map(d => {
        if (d.id === documentId) {
          const updated = { ...d, archived: false, updatedAt: Date.now() };
          this.repository.saveDocument(updated);
          return updated;
        }
        return d;
      })
    );
  }

  async deletePermanently(documentId: string): Promise<void> {
    this.store.documents.update(docs => docs.filter(d => d.id !== documentId));
    await this.repository.deleteDocument(documentId);
  }

  async emptyTrash(): Promise<void> {
    const trash = this.trashDocuments();
    for (const doc of trash) {
      await this.deletePermanently(doc.id);
    }
  }
}
