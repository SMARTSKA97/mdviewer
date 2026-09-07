import { describe, beforeEach, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AttachmentService } from './attachment.service';
import { IndexedDbDocumentRepository } from '../repositories/indexed-db-document.repository';

describe('AttachmentService', () => {
  let service: AttachmentService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AttachmentService,
        IndexedDbDocumentRepository
      ]
    });
    service = TestBed.inject(AttachmentService);
  });

  it('should save blob attachment and return attachment:// URI', async () => {
    const dummyBlob = new Blob(['sample data'], { type: 'text/plain' });
    const uri = await service.saveAttachment(dummyBlob, 'test.txt');

    expect(uri).toContain('attachment://');
  });

  it('should resolve attachment:// URIs', async () => {
    const dummyBlob = new Blob(['image data'], { type: 'image/png' });
    const uri = await service.saveAttachment(dummyBlob, 'sample.png');

    const resolved = await service.resolveAttachmentUri(uri);
    expect(resolved).toBeTruthy();
    expect(resolved.startsWith('blob:') || resolved.startsWith('attachment://')).toBe(true);
  });
});
