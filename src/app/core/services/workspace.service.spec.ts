import { describe, beforeEach, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { WorkspaceService } from './workspace.service';
import { DocumentStoreService } from './document-store.service';
import { IndexedDbDocumentRepository } from '../repositories/indexed-db-document.repository';

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let store: DocumentStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WorkspaceService,
        DocumentStoreService,
        IndexedDbDocumentRepository
      ]
    });
    service = TestBed.inject(WorkspaceService);
    store = TestBed.inject(DocumentStoreService);
  });

  it('should create and rename folders', async () => {
    const folderId = await service.createFolder('Projects');
    expect(service.folders().some(f => f.id === folderId)).toBe(true);

    await service.renameFolder(folderId, 'Active Projects');
    const folder = service.folders().find(f => f.id === folderId);
    expect(folder?.name).toBe('Active Projects');
  });

  it('should toggle note favorite status', async () => {
    const tabId = store.createNewTab('FavNote.md', 'Content');
    const tab = store.tabs().find(t => t.id === tabId);
    const docId = tab?.documentId || tabId;

    await service.toggleFavorite(docId);
    expect(service.favoriteDocuments().some(d => d.id === docId)).toBe(true);
  });

  it('should move note to Trash and restore it', async () => {
    const tabId = store.createNewTab('TrashMe.md', 'Disposable content');
    const tab = store.tabs().find(t => t.id === tabId);
    const docId = tab?.documentId || tabId;

    await service.moveToTrash(docId);
    expect(service.trashDocuments().some(d => d.id === docId)).toBe(true);

    await service.restoreFromTrash(docId);
    expect(service.trashDocuments().some(d => d.id === docId)).toBe(false);
  });
});
