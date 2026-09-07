import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Document, DocumentTab, DocumentStats, TocItem, ViewMode } from '../models/document.model';
import { SAMPLE_MARKDOWN } from '../models/sample-document';
import { MarkdownService } from './markdown.service';
import { ShareService } from './share.service';
import { IndexedDbDocumentRepository } from '../repositories/indexed-db-document.repository';

@Injectable({
  providedIn: 'root'
})
export class DocumentStoreService {
  private markdownService = inject(MarkdownService);
  private shareService = inject(ShareService);
  private repository = inject(IndexedDbDocumentRepository);

  private readonly TABS_STORAGE_KEY = 'mdviewer_tabs';
  private readonly ACTIVE_TAB_KEY = 'mdviewer_active_tab_id';
  private readonly SIDEBAR_COLLAPSED_KEY = 'mdviewer_sidebar_collapsed';

  // Signals
  readonly documents = signal<Document[]>([]);
  readonly tabs = signal<DocumentTab[]>([]);
  readonly activeTabId = signal<string>('');
  readonly viewMode = signal<ViewMode>('split');
  readonly isSidebarCollapsed = signal<boolean>(this.getInitialSidebarState());
  readonly isZenMode = signal<boolean>(false);
  readonly isScrollSynced = signal<boolean>(true);
  readonly autoSaveEnabled = signal<boolean>(true);
  readonly lastEditedTime = signal<Date | null>(new Date());
  readonly lastSavedTime = signal<Date | null>(new Date()); // Kept for backwards compatibility
  readonly lastPersistedTime = signal<Date | null>(new Date());
  readonly commandPaletteOpen = signal<boolean>(false);
  readonly exportModalOpen = signal<boolean>(false);
  readonly cheatSheetModalOpen = signal<boolean>(false);
  readonly diagramModalState = signal<{ isOpen: boolean; code: string; svg: string } | null>(null);

  // Active tab & content computed
  readonly activeTab = computed(() => {
    const id = this.activeTabId();
    return this.tabs().find(t => t.id === id) || this.tabs()[0] || null;
  });

  readonly activeContent = computed(() => {
    return this.activeTab()?.content ?? '';
  });

  // Rendered HTML computed
  readonly renderedHtml = computed(() => {
    const content = this.activeContent();
    return this.markdownService.render(content);
  });

  // TOC computed
  readonly toc = computed<TocItem[]>(() => {
    return this.markdownService.extractToc(this.activeContent());
  });

  // Stats computed
  readonly stats = computed<DocumentStats>(() => {
    return this.markdownService.calculateStats(this.activeContent());
  });

  constructor() {
    this.initWorkspace();

    // Auto-save & persistence effect
    effect(() => {
      const tabs = this.tabs();
      const docs = this.documents();
      const activeId = this.activeTabId();

      if (this.autoSaveEnabled() && tabs.length > 0) {
        this.persistWorkspaceState(docs, tabs, activeId);
      }
    });

    // Sidebar state persist
    effect(() => {
      try {
        localStorage.setItem(this.SIDEBAR_COLLAPSED_KEY, String(this.isSidebarCollapsed()));
      } catch {}
    });
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
  }

  private async initWorkspace(): Promise<void> {
    // 1. Check if shared doc in URL
    const sharedDoc = this.shareService.getSharedDocFromUrl();
    if (sharedDoc) {
      const docId = this.generateId();
      const tabId = 'tab-' + docId;
      const newDoc: Document = {
        id: docId,
        title: sharedDoc.title,
        content: sharedDoc.content,
        parentId: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      const newTab: DocumentTab = {
        id: tabId,
        documentId: docId,
        title: sharedDoc.title,
        content: sharedDoc.content,
        isDirty: false,
        lastModified: Date.now()
      };

      this.documents.set([newDoc]);
      this.tabs.set([newTab]);
      this.activeTabId.set(tabId);
      this.repository.saveDocument(newDoc);
      return;
    }

    // 2. Load from Repository (IndexedDB with LocalStorage fallback)
    try {
      const state = await this.repository.loadWorkspaceState();
      if (state && state.documents && state.documents.length > 0) {
        const docs = state.documents.map(d => {
          if (d.id === 'welcome-tab' && (d.content.includes('A[📝') || d.content.includes('A["📝') || d.content.includes('C{"Syntactic Type"}'))) {
            return { ...d, content: SAMPLE_MARKDOWN };
          }
          return d;
        });

        const tabs: DocumentTab[] = docs.map(d => ({
          id: 'tab-' + d.id,
          documentId: d.id,
          title: d.title,
          content: d.content,
          isDirty: false,
          lastModified: d.updatedAt,
          fileHandle: d.fileHandle
        }));

        this.documents.set(docs);
        this.tabs.set(tabs);

        const activeTabCandidate = tabs.find(t => t.id === state.activeTabId || t.documentId === state.activeTabId) || tabs[0];
        this.activeTabId.set(activeTabCandidate.id);
        return;
      }
    } catch (err) {
      console.warn('Repository workspace load failed:', err);
    }

    // 3. Fallback: Default Welcome Document
    const defaultDocId = 'welcome-tab';
    const defaultTabId = 'tab-welcome-tab';
    const initialDoc: Document = {
      id: defaultDocId,
      title: 'Welcome.md',
      content: SAMPLE_MARKDOWN,
      parentId: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const initialTab: DocumentTab = {
      id: defaultTabId,
      documentId: defaultDocId,
      title: 'Welcome.md',
      content: SAMPLE_MARKDOWN,
      isDirty: false,
      lastModified: Date.now()
    };

    this.documents.set([initialDoc]);
    this.tabs.set([initialTab]);
    this.activeTabId.set(defaultTabId);
    this.repository.saveDocument(initialDoc);
  }

  updateContent(newContent: string): void {
    const activeId = this.activeTabId();
    const now = Date.now();

    this.tabs.update(tabs =>
      tabs.map(tab => {
        if (tab.id === activeId) {
          return {
            ...tab,
            content: newContent,
            isDirty: true,
            lastModified: now
          };
        }
        return tab;
      })
    );

    const activeTabObj = this.activeTab();
    if (activeTabObj) {
      this.documents.update(docs =>
        docs.map(doc => {
          if (doc.id === activeTabObj.documentId || doc.id === activeTabObj.id) {
            const updatedDoc = { ...doc, content: newContent, updatedAt: now };
            this.repository.saveDocument(updatedDoc);
            return updatedDoc;
          }
          return doc;
        })
      );
    }

    const nowDate = new Date();
    this.lastEditedTime.set(nowDate);
    this.lastSavedTime.set(nowDate);
  }

  createNewTab(title = 'Untitled.md', content = '# New Document\n\nStart writing markdown here...'): string {
    const docId = this.generateId();
    const tabId = 'tab-' + docId;
    const now = Date.now();

    const newDoc: Document = {
      id: docId,
      title,
      content,
      parentId: null,
      createdAt: now,
      updatedAt: now
    };

    const newTab: DocumentTab = {
      id: tabId,
      documentId: docId,
      title,
      content,
      isDirty: false,
      lastModified: now
    };

    this.documents.update(docs => [...docs, newDoc]);
    this.tabs.update(tabs => [...tabs, newTab]);
    this.activeTabId.set(tabId);

    this.repository.saveDocument(newDoc);
    return tabId;
  }

  openDocument(title: string, content: string, fileHandle?: any): void {
    const docId = this.generateId();
    const tabId = 'tab-' + docId;
    const now = Date.now();

    const newDoc: Document = {
      id: docId,
      title,
      content,
      parentId: null,
      createdAt: now,
      updatedAt: now,
      fileHandle
    };

    const newTab: DocumentTab = {
      id: tabId,
      documentId: docId,
      title,
      content,
      isDirty: false,
      lastModified: now,
      fileHandle
    };

    this.documents.update(docs => [...docs, newDoc]);
    this.tabs.update(tabs => [...tabs, newTab]);
    this.activeTabId.set(tabId);

    this.repository.saveDocument(newDoc);
  }

  closeTab(tabId: string, event?: Event): void {
    if (event) event.stopPropagation();

    const currentTabs = this.tabs();
    if (currentTabs.length <= 1) {
      // Reset single tab
      const docId = this.generateId();
      const newTabId = 'tab-' + docId;
      const now = Date.now();
      const initialDoc: Document = {
        id: docId,
        title: 'Untitled.md',
        content: '# Untitled\n\n',
        parentId: null,
        createdAt: now,
        updatedAt: now
      };
      const initialTab: DocumentTab = {
        id: newTabId,
        documentId: docId,
        title: 'Untitled.md',
        content: '# Untitled\n\n',
        isDirty: false,
        lastModified: now
      };

      this.documents.set([initialDoc]);
      this.tabs.set([initialTab]);
      this.activeTabId.set(newTabId);
      this.repository.saveDocument(initialDoc);
      return;
    }

    const index = currentTabs.findIndex(t => t.id === tabId);
    const newTabs = currentTabs.filter(t => t.id !== tabId);
    this.tabs.set(newTabs);

    if (this.activeTabId() === tabId) {
      const nextTab = newTabs[Math.max(0, index - 1)];
      this.activeTabId.set(nextTab.id);
    }
  }

  selectTab(tabId: string): void {
    this.activeTabId.set(tabId);
  }

  renameActiveTab(newTitle: string): void {
    const activeId = this.activeTabId();
    const cleanTitle = newTitle.trim();
    if (!cleanTitle) return;

    this.tabs.update(tabs =>
      tabs.map(tab => {
        if (tab.id === activeId) {
          return { ...tab, title: cleanTitle };
        }
        return tab;
      })
    );

    const activeTabObj = this.activeTab();
    if (activeTabObj) {
      this.documents.update(docs =>
        docs.map(doc => {
          if (doc.id === activeTabObj.documentId || doc.id === activeTabObj.id) {
            const updatedDoc = { ...doc, title: cleanTitle, updatedAt: Date.now() };
            this.repository.saveDocument(updatedDoc);
            return updatedDoc;
          }
          return doc;
        })
      );
    }
  }

  markActiveTabSaved(fileHandle?: any): void {
    const activeId = this.activeTabId();
    this.tabs.update(tabs =>
      tabs.map(tab => {
        if (tab.id === activeId) {
          return {
            ...tab,
            isDirty: false,
            fileHandle: fileHandle || tab.fileHandle
          };
        }
        return tab;
      })
    );

    const activeTabObj = this.activeTab();
    if (activeTabObj) {
      this.documents.update(docs =>
        docs.map(doc => {
          if (doc.id === activeTabObj.documentId || doc.id === activeTabObj.id) {
            const updatedDoc = {
              ...doc,
              fileHandle: fileHandle || doc.fileHandle,
              updatedAt: Date.now()
            };
            this.repository.saveDocument(updatedDoc);
            return updatedDoc;
          }
          return doc;
        })
      );
    }

    const nowDate = new Date();
    this.lastSavedTime.set(nowDate);
    this.lastPersistedTime.set(nowDate);
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed.update(prev => !prev);
  }

  toggleZenMode(): void {
    this.isZenMode.update(prev => !prev);
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  toggleScrollSync(): void {
    this.isScrollSynced.update(prev => !prev);
  }

  openCommandPalette(): void {
    this.commandPaletteOpen.set(true);
  }

  closeCommandPalette(): void {
    this.commandPaletteOpen.set(false);
  }

  openExportModal(): void {
    this.exportModalOpen.set(true);
  }

  closeExportModal(): void {
    this.exportModalOpen.set(false);
  }

  openCheatSheetModal(): void {
    this.cheatSheetModalOpen.set(true);
  }

  closeCheatSheetModal(): void {
    this.cheatSheetModalOpen.set(false);
  }

  openDiagramModal(code: string, svg: string): void {
    this.diagramModalState.set({ isOpen: true, code, svg });
  }

  closeDiagramModal(): void {
    this.diagramModalState.set(null);
  }

  private persistWorkspaceState(documents: Document[], tabs: DocumentTab[], activeId: string): void {
    try {
      this.repository.saveWorkspaceState({
        schemaVersion: 1,
        documents,
        folders: [],
        activeTabId: activeId,
        openTabIds: tabs.map(t => t.id),
        updatedAt: Date.now()
      });

      try {
        localStorage.setItem(this.ACTIVE_TAB_KEY, activeId);
      } catch {}

      this.lastPersistedTime.set(new Date());
    } catch (err) {
      console.warn('Workspace state persistence failed:', err);
    }
  }

  private getInitialSidebarState(): boolean {
    try {
      const saved = localStorage.getItem(this.SIDEBAR_COLLAPSED_KEY);
      if (saved !== null) return saved === 'true';
    } catch {}
    return false;
  }
}
