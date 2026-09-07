import { describe, beforeEach, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SearchService } from './search.service';
import { DocumentStoreService } from './document-store.service';
import { WorkspaceService } from './workspace.service';
import { IndexedDbDocumentRepository } from '../repositories/indexed-db-document.repository';

describe('SearchService', () => {
  let service: SearchService;
  let store: DocumentStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SearchService,
        DocumentStoreService,
        WorkspaceService,
        IndexedDbDocumentRepository
      ]
    });
    service = TestBed.inject(SearchService);
    store = TestBed.inject(DocumentStoreService);
  });

  it('should search notes by title', () => {
    store.createNewTab('RabbitMQ Architecture.md', 'Content');
    const results = service.search('RabbitMQ');

    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.title.includes('RabbitMQ'))).toBe(true);
  });

  it('should search notes by full-text content with snippets and line numbers', () => {
    store.createNewTab('Database.md', 'Line 1\nLine 2\nKey concept: UniqueDatabaseKeywordXYZ CTE Stored Procs');
    const results = service.search('UniqueDatabaseKeywordXYZ');

    expect(results.length).toBeGreaterThan(0);
    const match = results.find(r => r.snippet.includes('UniqueDatabaseKeywordXYZ'));
    expect(match).toBeTruthy();
    expect(match?.line).toBe(3);
  });

  it('should return empty array for blank query', () => {
    const results = service.search('   ');
    expect(results.length).toBe(0);
  });
});
