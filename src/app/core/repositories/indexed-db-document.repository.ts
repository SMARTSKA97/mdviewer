import { Injectable } from '@angular/core';
import { Document, Folder, PersistedWorkspace } from '../models/document.model';
import { Attachment } from '../models/attachment.model';
import { DocumentRepository } from './document.repository';

@Injectable({
  providedIn: 'root'
})
export class IndexedDbDocumentRepository implements DocumentRepository {
  private readonly DB_NAME = 'mdviewer_db';
  private readonly DB_VERSION = 2;
  private readonly TABS_STORAGE_KEY = 'mdviewer_tabs';
  private readonly ACTIVE_TAB_KEY = 'mdviewer_active_tab_id';
  private readonly WORKSPACE_META_KEY = 'workspace_state';

  private dbPromise: Promise<IDBDatabase | null> | null = null;

  constructor() {
    this.initDb();
  }

  private initDb(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.warn('IndexedDB not supported, falling back to LocalStorage repository');
        resolve(null);
        return;
      }

      try {
        const request = window.indexedDB.open(this.DB_NAME, this.DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains('documents')) {
            db.createObjectStore('documents', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('folders')) {
            db.createObjectStore('folders', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('workspace_meta')) {
            db.createObjectStore('workspace_meta', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('attachments')) {
            db.createObjectStore('attachments', { keyPath: 'id' });
          }
        };

        request.onsuccess = (event: Event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          resolve(db);
        };

        request.onerror = (err) => {
          console.warn('IndexedDB opening failed, using LocalStorage fallback:', err);
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB opening threw error, using LocalStorage fallback:', err);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  async getDocument(id: string): Promise<Document | null> {
    const db = await this.initDb();
    if (!db) return this.getLocalStorageDocument(id);

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('documents', 'readonly');
        const store = tx.objectStore('documents');
        const req = store.get(id);

        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(this.getLocalStorageDocument(id));
      } catch {
        resolve(this.getLocalStorageDocument(id));
      }
    });
  }

  async getAllDocuments(): Promise<Document[]> {
    const db = await this.initDb();
    if (!db) return this.getLocalStorageAllDocuments();

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('documents', 'readonly');
        const store = tx.objectStore('documents');
        const req = store.getAll();

        req.onsuccess = () => {
          const docs: Document[] = req.result || [];
          if (docs.length === 0) {
            // Check for legacy LocalStorage migration
            const migrated = this.migrateLegacyLocalStorageTabs();
            if (migrated.length > 0) {
              migrated.forEach(d => this.saveDocument(d));
              resolve(migrated);
              return;
            }
          }
          resolve(docs);
        };
        req.onerror = () => resolve(this.getLocalStorageAllDocuments());
      } catch {
        resolve(this.getLocalStorageAllDocuments());
      }
    });
  }

  async saveDocument(doc: Document): Promise<void> {
    const db = await this.initDb();
    if (!db) {
      this.saveLocalStorageDocument(doc);
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('documents', 'readwrite');
        const store = tx.objectStore('documents');
        store.put(doc);
        tx.oncomplete = () => resolve();
        tx.onerror = () => {
          this.saveLocalStorageDocument(doc);
          resolve();
        };
      } catch {
        this.saveLocalStorageDocument(doc);
        resolve();
      }
    });
  }

  async deleteDocument(id: string): Promise<void> {
    const db = await this.initDb();
    if (!db) {
      this.deleteLocalStorageDocument(id);
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('documents', 'readwrite');
        const store = tx.objectStore('documents');
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => {
          this.deleteLocalStorageDocument(id);
          resolve();
        };
      } catch {
        this.deleteLocalStorageDocument(id);
        resolve();
      }
    });
  }

  async getFolder(id: string): Promise<Folder | null> {
    const db = await this.initDb();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('folders', 'readonly');
        const store = tx.objectStore('folders');
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async getAllFolders(): Promise<Folder[]> {
    const db = await this.initDb();
    if (!db) return [];

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('folders', 'readonly');
        const store = tx.objectStore('folders');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  async saveFolder(folder: Folder): Promise<void> {
    const db = await this.initDb();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('folders', 'readwrite');
        const store = tx.objectStore('folders');
        store.put(folder);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async deleteFolder(id: string): Promise<void> {
    const db = await this.initDb();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('folders', 'readwrite');
        const store = tx.objectStore('folders');
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async getAttachment(id: string): Promise<Attachment | null> {
    const db = await this.initDb();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('attachments', 'readonly');
        const store = tx.objectStore('attachments');
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async getAllAttachments(): Promise<Attachment[]> {
    const db = await this.initDb();
    if (!db) return [];

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('attachments', 'readonly');
        const store = tx.objectStore('attachments');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  async saveAttachment(attachment: Attachment): Promise<void> {
    const db = await this.initDb();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('attachments', 'readwrite');
        const store = tx.objectStore('attachments');
        store.put(attachment);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async deleteAttachment(id: string): Promise<void> {
    const db = await this.initDb();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('attachments', 'readwrite');
        const store = tx.objectStore('attachments');
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async loadWorkspaceState(): Promise<PersistedWorkspace | null> {
    const db = await this.initDb();

    if (!db) return this.getLocalStorageWorkspaceState();

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('workspace_meta', 'readonly');
        const store = tx.objectStore('workspace_meta');
        const req = store.get(this.WORKSPACE_META_KEY);

        req.onsuccess = async () => {
          if (req.result) {
            resolve(req.result);
          } else {
            // Reconstruct workspace state from DB documents
            const docs = await this.getAllDocuments();
            const folders = await this.getAllFolders();
            if (docs.length > 0) {
              const activeId = localStorage.getItem(this.ACTIVE_TAB_KEY) || docs[0].id;
              const state: PersistedWorkspace = {
                schemaVersion: 1,
                documents: docs,
                folders: folders,
                activeTabId: activeId,
                openTabIds: docs.map(d => d.id),
                updatedAt: Date.now()
              };
              resolve(state);
            } else {
              resolve(null);
            }
          }
        };
        req.onerror = () => resolve(this.getLocalStorageWorkspaceState());
      } catch {
        resolve(this.getLocalStorageWorkspaceState());
      }
    });
  }

  async saveWorkspaceState(state: PersistedWorkspace): Promise<void> {
    const db = await this.initDb();
    if (!db) {
      this.saveLocalStorageWorkspaceState(state);
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('workspace_meta', 'readwrite');
        const store = tx.objectStore('workspace_meta');
        store.put({ id: this.WORKSPACE_META_KEY, ...state });
        tx.oncomplete = () => resolve();
        tx.onerror = () => {
          this.saveLocalStorageWorkspaceState(state);
          resolve();
        };
      } catch {
        this.saveLocalStorageWorkspaceState(state);
        resolve();
      }
    });
  }

  async clearAllData(): Promise<void> {
    const db = await this.initDb();
    try {
      localStorage.removeItem(this.TABS_STORAGE_KEY);
      localStorage.removeItem(this.ACTIVE_TAB_KEY);
      localStorage.removeItem(this.WORKSPACE_META_KEY);
    } catch {}

    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(['documents', 'folders', 'workspace_meta'], 'readwrite');
        tx.objectStore('documents').clear();
        tx.objectStore('folders').clear();
        tx.objectStore('workspace_meta').clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // Legacy LocalStorage migration helper
  private migrateLegacyLocalStorageTabs(): Document[] {
    try {
      const raw = localStorage.getItem(this.TABS_STORAGE_KEY);
      if (!raw) return [];
      const tabs = JSON.parse(raw);
      if (!Array.isArray(tabs)) return [];

      return tabs.map((t: any) => ({
        id: t.id || 'doc-' + Date.now(),
        title: t.title || 'Untitled.md',
        content: t.content || '',
        parentId: null,
        createdAt: t.lastModified || Date.now(),
        updatedAt: t.lastModified || Date.now()
      }));
    } catch {
      return [];
    }
  }

  // LocalStorage Fallback implementations (Used ONLY if IndexedDB is unavailable or fails)
  private getLocalStorageDocument(id: string): Document | null {
    const docs = this.getLocalStorageAllDocuments();
    return docs.find(d => d.id === id) || null;
  }

  private getLocalStorageAllDocuments(): Document[] {
    try {
      const rawMeta = localStorage.getItem(this.WORKSPACE_META_KEY);
      if (rawMeta) {
        const parsed = JSON.parse(rawMeta);
        if (parsed && Array.isArray(parsed.documents)) return parsed.documents;
      }
      return this.migrateLegacyLocalStorageTabs();
    } catch {
      return [];
    }
  }

  private saveLocalStorageDocument(doc: Document): void {
    try {
      const docs = this.getLocalStorageAllDocuments();
      const idx = docs.findIndex(d => d.id === doc.id);
      if (idx >= 0) {
        docs[idx] = doc;
      } else {
        docs.push(doc);
      }
      const activeId = localStorage.getItem(this.ACTIVE_TAB_KEY) || doc.id;
      const state: PersistedWorkspace = {
        schemaVersion: 1,
        documents: docs,
        folders: [],
        activeTabId: activeId,
        openTabIds: docs.map(d => d.id),
        updatedAt: Date.now()
      };
      localStorage.setItem(this.WORKSPACE_META_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('LocalStorage document save failed:', err);
    }
  }

  private deleteLocalStorageDocument(id: string): void {
    try {
      const docs = this.getLocalStorageAllDocuments().filter(d => d.id !== id);
      const activeId = localStorage.getItem(this.ACTIVE_TAB_KEY) || (docs[0]?.id ?? '');
      const state: PersistedWorkspace = {
        schemaVersion: 1,
        documents: docs,
        folders: [],
        activeTabId: activeId,
        openTabIds: docs.map(d => d.id),
        updatedAt: Date.now()
      };
      localStorage.setItem(this.WORKSPACE_META_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('LocalStorage document delete failed:', err);
    }
  }

  private getLocalStorageWorkspaceState(): PersistedWorkspace | null {
    try {
      const raw = localStorage.getItem(this.WORKSPACE_META_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}

    const docs = this.getLocalStorageAllDocuments();
    if (docs.length === 0) return null;

    return {
      schemaVersion: 1,
      documents: docs,
      folders: [],
      activeTabId: docs[0].id,
      openTabIds: docs.map(d => d.id),
      updatedAt: Date.now()
    };
  }

  private saveLocalStorageWorkspaceState(state: PersistedWorkspace): void {
    try {
      localStorage.setItem(this.WORKSPACE_META_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('LocalStorage workspace state save failed:', err);
    }
  }
}
