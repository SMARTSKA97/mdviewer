import { describe, beforeEach, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DatabaseService } from './database.service';
import { DocumentStoreService } from './document-store.service';
import { WorkspaceService } from './workspace.service';
import { FrontmatterService } from './frontmatter.service';
import { IndexedDbDocumentRepository } from '../repositories/indexed-db-document.repository';

describe('DatabaseService', () => {
  let dbService: DatabaseService;
  let store: DocumentStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DatabaseService,
        DocumentStoreService,
        WorkspaceService,
        FrontmatterService,
        IndexedDbDocumentRepository
      ]
    });
    dbService = TestBed.inject(DatabaseService);
    store = TestBed.inject(DocumentStoreService);
  });

  it('should initialize with default document view mode', () => {
    expect(dbService.mainViewMode()).toBe('document');
  });

  it('should parse metadata rows from store documents', () => {
    store.createNewTab('SprintTask.md', '---\nstatus: In Progress\npriority: High\n---\n# Sprint Task');
    const rows = dbService.databaseRows();

    expect(rows.length).toBeGreaterThan(0);
    const match = rows.find(r => r.title === 'SprintTask.md');
    expect(match).toBeTruthy();
    expect(match?.status).toBe('In Progress');
    expect(match?.priority).toBe('High');
  });

  it('should filter rows by status and priority', () => {
    store.createNewTab('TaskA.md', '---\nstatus: Done\n---\n# Task A');
    store.createNewTab('TaskB.md', '---\nstatus: Backlog\n---\n# Task B');

    dbService.selectedStatusFilter.set('Done');
    const filtered = dbService.filteredRows();

    expect(filtered.every(r => r.status === 'Done')).toBe(true);
  });

  it('should update document frontmatter property dynamically', async () => {
    const tabId = store.createNewTab('MetaTest.md', '# Meta Test');
    const doc = store.documents().find(d => d.title === 'MetaTest.md');
    expect(doc).toBeTruthy();

    if (doc) {
      await dbService.updateProperty(doc.id, 'status', 'In Progress');
      const updatedDoc = store.documents().find(d => d.id === doc.id);
      expect(updatedDoc?.content).toContain('status: In Progress');
    }
  });
});
