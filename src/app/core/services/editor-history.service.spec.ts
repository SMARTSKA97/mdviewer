import { describe, beforeEach, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { EditorHistoryService } from './editor-history.service';

describe('EditorHistoryService', () => {
  let service: EditorHistoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EditorHistoryService]
    });
    service = TestBed.inject(EditorHistoryService);
  });

  it('should push states and perform undo/redo for a document', () => {
    const docId = 'doc-1';
    service.pushState(docId, 'Initial', 'Step 1');
    service.pushState(docId, 'Step 1', 'Step 2');

    expect(service.canUndo(docId)).toBe(true);
    expect(service.canRedo(docId)).toBe(false);

    const undo1 = service.undo(docId, 'Step 2');
    expect(undo1).toBe('Step 1');

    const redo1 = service.redo(docId, 'Step 1');
    expect(redo1).toBe('Step 2');
  });

  it('should maintain independent history stacks for different documents', () => {
    const docA = 'doc-A';
    const docB = 'doc-B';

    service.pushState(docA, 'Doc A Version 1', 'Doc A Version 2');
    service.pushState(docB, 'Doc B Version 1', 'Doc B Version 2');

    expect(service.undo(docA, 'Doc A Version 2')).toBe('Doc A Version 1');
    expect(service.canUndo(docB)).toBe(true);

    const undoB = service.undo(docB, 'Doc B Version 2');
    expect(undoB).toBe('Doc B Version 1');
  });

  it('should cap history stack depth at 100 entries', () => {
    const docId = 'doc-deep';
    for (let i = 0; i < 150; i++) {
      service.pushState(docId, `State ${i}`, `State ${i + 1}`);
    }

    let undoCount = 0;
    let current = 'State 150';
    while (service.canUndo(docId)) {
      const prev = service.undo(docId, current);
      if (prev === null) break;
      current = prev;
      undoCount++;
    }

    expect(undoCount).toBeLessThanOrEqual(100);
  });
});
