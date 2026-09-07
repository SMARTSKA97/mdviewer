import { describe, beforeEach, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { IndexedDbDocumentRepository } from './indexed-db-document.repository';
import { Document } from '../models/document.model';

describe('IndexedDbDocumentRepository', () => {
  let repository: IndexedDbDocumentRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [IndexedDbDocumentRepository]
    });
    repository = TestBed.inject(IndexedDbDocumentRepository);
  });

  it('should save and retrieve documents', async () => {
    const doc: Document = {
      id: 'test-doc-1',
      title: 'Repository Test Note',
      content: 'Sample content inside repository test',
      parentId: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await repository.saveDocument(doc);
    const retrieved = await repository.getDocument('test-doc-1');

    expect(retrieved).toBeTruthy();
    expect(retrieved?.title).toBe('Repository Test Note');
    expect(retrieved?.content).toBe('Sample content inside repository test');
  });

  it('should delete document by ID', async () => {
    const doc: Document = {
      id: 'test-doc-to-delete',
      title: 'Delete Test',
      content: 'Content',
      parentId: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await repository.saveDocument(doc);
    await repository.deleteDocument('test-doc-to-delete');

    const retrieved = await repository.getDocument('test-doc-to-delete');
    expect(retrieved).toBeNull();
  });
});
