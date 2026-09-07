import { describe, beforeEach, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { IndexerService } from './indexer.service';
import { DocumentStoreService } from './document-store.service';
import { FrontmatterService } from './frontmatter.service';
import { WorkspaceService } from './workspace.service';
import { IndexedDbDocumentRepository } from '../repositories/indexed-db-document.repository';

describe('IndexerService', () => {
  let indexer: IndexerService;
  let store: DocumentStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        IndexerService,
        FrontmatterService,
        DocumentStoreService,
        WorkspaceService,
        IndexedDbDocumentRepository
      ]
    });
    indexer = TestBed.inject(IndexerService);
    store = TestBed.inject(DocumentStoreService);
  });

  it('should generate backlinks map from wikilinks', () => {
    store.createNewTab('TargetNote.md', '# Target Note Content');
    store.createNewTab('SourceNote.md', 'Check out [[TargetNote]] for more info.');

    const backlinks = indexer.getBacklinksForDocument('TargetNote.md');
    expect(backlinks.length).toBe(1);
    expect(backlinks[0].sourceTitle).toBe('SourceNote.md');
    expect(backlinks[0].snippet).toContain('[[TargetNote]]');
  });

  it('should find unlinked references when title is mentioned without wikilinks', () => {
    store.createNewTab('QuantumSupercomputing.md', '# Quantum Supercomputing Note');
    store.createNewTab('ProjectDoc.md', 'We need to design the QuantumSupercomputing before coding.');

    const unlinked = indexer.getUnlinkedReferencesForDocument('QuantumSupercomputing.md');
    expect(unlinked.length).toBeGreaterThan(0);
    expect(unlinked[0].sourceTitle).toBe('ProjectDoc.md');
    expect(unlinked[0].snippet).toContain('QuantumSupercomputing');
  });

  it('should index inline and frontmatter tags correctly', () => {
    store.createNewTab('TaggedDoc1.md', '--- \ntags: [frontend, pkms]\n---\nLearning #angular in depth.');
    
    const tagsIndex = indexer.tagsIndex();
    const tagNames = tagsIndex.map(t => t.tag);

    expect(tagNames).toContain('frontend');
    expect(tagNames).toContain('pkms');
    expect(tagNames).toContain('angular');
  });
});
