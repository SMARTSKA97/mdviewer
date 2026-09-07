import { describe, beforeEach, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DocumentStoreService } from './document-store.service';
import { MarkdownService } from './markdown.service';
import { ShareService } from './share.service';
import { IndexedDbDocumentRepository } from '../repositories/indexed-db-document.repository';

describe('DocumentStoreService', () => {
  let service: DocumentStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DocumentStoreService,
        MarkdownService,
        ShareService,
        IndexedDbDocumentRepository
      ]
    });
    service = TestBed.inject(DocumentStoreService);
  });

  it('should initialize with default welcome document', () => {
    expect(service.tabs().length).toBeGreaterThan(0);
    expect(service.activeTab()).toBeTruthy();
    expect(service.activeContent()).toBeTruthy();
  });

  it('should create new tab and switch active tab', () => {
    const initialCount = service.tabs().length;
    const newTabId = service.createNewTab('TestNote.md', '# Test Note Content');

    expect(service.tabs().length).toBe(initialCount + 1);
    expect(service.activeTabId()).toBe(newTabId);
    expect(service.activeTab()?.title).toBe('TestNote.md');
    expect(service.activeContent()).toBe('# Test Note Content');
  });

  it('should update active content and set dirty flag', () => {
    service.createNewTab('Note.md', 'Initial');
    service.updateContent('Updated content string');

    expect(service.activeContent()).toBe('Updated content string');
    expect(service.activeTab()?.isDirty).toBe(true);
  });

  it('should rename active tab', () => {
    service.createNewTab('OldName.md', 'Content');
    service.renameActiveTab('RenamedNote.md');

    expect(service.activeTab()?.title).toBe('RenamedNote.md');
  });

  it('should close tab and automatically select adjacent tab', () => {
    const tab1 = service.createNewTab('Tab1.md', 'Content 1');
    const tab2 = service.createNewTab('Tab2.md', 'Content 2');

    expect(service.activeTabId()).toBe(tab2);
    service.closeTab(tab2);

    expect(service.tabs().some(t => t.id === tab2)).toBe(false);
    expect(service.activeTabId()).toBe(tab1);
  });

  it('should toggle view modes and modals', () => {
    service.setViewMode('preview');
    expect(service.viewMode()).toBe('preview');

    service.openCommandPalette();
    expect(service.commandPaletteOpen()).toBe(true);

    service.closeCommandPalette();
    expect(service.commandPaletteOpen()).toBe(false);

    service.toggleZenMode();
    expect(service.isZenMode()).toBe(true);
  });
});
