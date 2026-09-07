import { Injectable, signal, inject } from '@angular/core';
import { DocumentStoreService } from './document-store.service';
import { WorkspaceService } from './workspace.service';
import { IndexedDbDocumentRepository } from '../repositories/indexed-db-document.repository';
import { Document, Folder } from '../models/document.model';

export interface SyncPayload {
  version: number;
  deviceId: string;
  timestamp: number;
  documents: Document[];
  folders: Folder[];
}

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private store = inject(DocumentStoreService);
  private workspaceService = inject(WorkspaceService);
  private repository = inject(IndexedDbDocumentRepository);

  readonly syncStatus = signal<'synced' | 'pending' | 'syncing' | 'conflict'>('synced');
  readonly lastSyncedAt = signal<number | null>(Date.now());
  readonly deviceId = signal<string>(this.getOrCreateDeviceId());

  private getOrCreateDeviceId(): string {
    let id = localStorage.getItem('mdviewer_device_id');
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'device-' + Date.now();
      localStorage.setItem('mdviewer_device_id', id);
    }
    return id;
  }

  /**
   * Export JSON sync payload
   */
  exportSyncPayload(): string {
    const payload: SyncPayload = {
      version: 1,
      deviceId: this.deviceId(),
      timestamp: Date.now(),
      documents: this.store.documents(),
      folders: this.workspaceService.folders()
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Import external sync payload with Last-Write-Wins (LWW) conflict resolution
   */
  async importSyncPayload(jsonString: string): Promise<{ mergedDocs: number; mergedFolders: number }> {
    this.syncStatus.set('syncing');

    try {
      const payload: SyncPayload = JSON.parse(jsonString);
      if (!payload || !Array.isArray(payload.documents)) {
        throw new Error('Invalid sync payload structure');
      }

      let mergedDocs = 0;
      let mergedFolders = 0;

      // 1. Merge Documents (LWW timestamp comparison)
      const currentDocs = this.store.documents();
      const docMap = new Map<string, Document>();
      currentDocs.forEach(d => docMap.set(d.id, d));

      for (const incoming of payload.documents) {
        const existing = docMap.get(incoming.id);
        if (!existing || incoming.updatedAt > existing.updatedAt) {
          docMap.set(incoming.id, incoming);
          await this.repository.saveDocument(incoming);
          mergedDocs++;
        }
      }

      const updatedDocs = Array.from(docMap.values());
      this.store.documents.set(updatedDocs);

      // 2. Merge Folders
      const currentFolders = this.workspaceService.folders();
      const folderMap = new Map<string, Folder>();
      currentFolders.forEach(f => folderMap.set(f.id, f));

      for (const incomingFolder of (payload.folders || [])) {
        const existing = folderMap.get(incomingFolder.id);
        if (!existing || incomingFolder.updatedAt > existing.updatedAt) {
          folderMap.set(incomingFolder.id, incomingFolder);
          await this.repository.saveFolder(incomingFolder);
          mergedFolders++;
        }
      }

      this.workspaceService.folders.set(Array.from(folderMap.values()));

      this.syncStatus.set('synced');
      this.lastSyncedAt.set(Date.now());

      return { mergedDocs, mergedFolders };
    } catch (err) {
      this.syncStatus.set('conflict');
      throw err;
    }
  }
}
