import { Injectable, inject } from '@angular/core';
import { IndexedDbDocumentRepository } from '../repositories/indexed-db-document.repository';
import { Attachment } from '../models/attachment.model';

@Injectable({
  providedIn: 'root'
})
export class AttachmentService {
  private repository = inject(IndexedDbDocumentRepository);

  private objectUrlCache = new Map<string, string>();

  private generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
  }

  /**
   * Save a File/Blob attachment to IndexedDB and return its attachment:// link
   */
  async saveAttachment(file: File | Blob, originalName = 'attachment.png'): Promise<string> {
    const id = this.generateId();
    const name = file instanceof File ? file.name : originalName;
    const mimeType = file.type || 'application/octet-stream';
    const size = file.size;

    const attachment: Attachment = {
      id,
      name,
      mimeType,
      size,
      data: file,
      createdAt: Date.now()
    };

    await this.repository.saveAttachment(attachment);

    // Create object URL for immediate rendering
    const objectUrl = URL.createObjectURL(file);
    this.objectUrlCache.set(id, objectUrl);

    return `attachment://${id}`;
  }

  /**
   * Resolve an attachment://<id> URI into a browser blob: URL
   */
  async resolveAttachmentUri(uri: string): Promise<string> {
    if (!uri || !uri.includes('attachment://')) return uri;

    const match = uri.match(/attachment:\/\/([a-zA-Z0-9_-]+)/);
    if (!match) return uri;

    const id = match[1];
    if (this.objectUrlCache.has(id)) {
      return this.objectUrlCache.get(id)!;
    }

    const attachment = await this.repository.getAttachment(id);
    if (!attachment || !attachment.data) return uri;

    let blob: Blob;
    if (attachment.data instanceof Blob) {
      blob = attachment.data;
    } else {
      blob = new Blob([attachment.data], { type: attachment.mimeType || 'image/png' });
    }

    const objectUrl = URL.createObjectURL(blob);
    this.objectUrlCache.set(id, objectUrl);

    return objectUrl;
  }

  /**
   * Replace all attachment://<id> occurrences in HTML or Markdown with blob: URLs
   */
  async resolveAllAttachmentUrls(content: string): Promise<string> {
    if (!content || !content.includes('attachment://')) return content;

    const regex = /attachment:\/\/([a-zA-Z0-9_-]+)/g;
    let match: RegExpExecArray | null;
    let resolvedContent = content;

    const matches: string[] = [];
    while ((match = regex.exec(content)) !== null) {
      matches.push(match[1]);
    }

    for (const id of matches) {
      const blobUrl = await this.resolveAttachmentUri(`attachment://${id}`);
      resolvedContent = resolvedContent.replaceAll(`attachment://${id}`, blobUrl);
    }

    return resolvedContent;
  }

  /**
   * Get attachment model by ID
   */
  async getAttachment(id: string): Promise<Attachment | null> {
    return this.repository.getAttachment(id);
  }

  /**
   * Clean up cached object URLs on unload
   */
  revokeObjectUrls(): void {
    for (const url of this.objectUrlCache.values()) {
      URL.revokeObjectURL(url);
    }
    this.objectUrlCache.clear();
  }
}
