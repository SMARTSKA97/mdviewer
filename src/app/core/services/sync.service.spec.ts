import { describe, beforeEach, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SyncService } from './sync.service';
import { DocumentStoreService } from './document-store.service';
import { WorkspaceService } from './workspace.service';
import { IndexedDbDocumentRepository } from '../repositories/indexed-db-document.repository';

describe('SyncService', () => {
  let syncService: SyncService;
  let store: DocumentStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SyncService,
        DocumentStoreService,
        WorkspaceService,
        IndexedDbDocumentRepository
      ]
    });
    syncService = TestBed.inject(SyncService);
    store = TestBed.inject(DocumentStoreService);
  });

  it('should export valid JSON sync payload with device ID', () => {
    store.createNewTab('SyncDoc.md', '# Sync Doc Content');
    const payloadJson = syncService.exportSyncPayload();
    const parsed = JSON.parse(payloadJson);

    expect(parsed.version).toBe(1);
    expect(parsed.deviceId).toBeTruthy();
    expect(parsed.documents.length).toBeGreaterThan(0);
  });

  it('should import external sync payload and merge updated documents via LWW', async () => {
    const externalPayload = {
      version: 1,
      deviceId: 'device-test-external',
      timestamp: Date.now(),
      documents: [
        {
          id: 'ext-doc-1',
          title: 'ExternalNote.md',
          content: '# External Note Content',
          parentId: null,
          createdAt: Date.now() - 5000,
          updatedAt: Date.now() + 1000,
          tags: ['remote'],
          aliases: [],
          favorite: false,
          archived: false,
          metadata: {}
        }
      ],
      folders: []
    };

    const res = await syncService.importSyncPayload(JSON.stringify(externalPayload));
    expect(res.mergedDocs).toBeGreaterThan(0);
    expect(store.documents().some(d => d.title === 'ExternalNote.md')).toBe(true);
  });
});
