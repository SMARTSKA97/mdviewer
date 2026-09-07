import { Injectable, inject } from '@angular/core';
import { IndexedDbDocumentRepository } from '../repositories/indexed-db-document.repository';
import { DocumentStoreService } from './document-store.service';
import { WorkspaceService } from './workspace.service';

export interface WorkspaceBackup {
  schemaVersion: number;
  exportedAt: number;
  documents: any[];
  folders: any[];
  attachments: any[];
}

@Injectable({
  providedIn: 'root'
})
export class BackupService {
  private repository = inject(IndexedDbDocumentRepository);
  private store = inject(DocumentStoreService);
  private workspaceService = inject(WorkspaceService);

  /**
   * Export complete workspace data into a downloadable JSON backup
   */
  async exportWorkspaceBackup(): Promise<void> {
    const docs = await this.repository.getAllDocuments();
    const folders = await this.repository.getAllFolders();
    const attachments = await this.repository.getAllAttachments();

    const backup: WorkspaceBackup = {
      schemaVersion: 1,
      exportedAt: Date.now(),
      documents: docs,
      folders: folders,
      attachments: attachments
    };

    const jsonString = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `mdviewer-workspace-backup-${dateStr}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import workspace backup JSON payload into IndexedDB repository
   */
  async importWorkspaceBackup(jsonContent: string): Promise<boolean> {
    try {
      const parsed: WorkspaceBackup = JSON.parse(jsonContent);
      if (!parsed || !Array.isArray(parsed.documents)) {
        throw new Error('Invalid workspace backup format');
      }

      for (const doc of parsed.documents) {
        await this.repository.saveDocument(doc);
      }

      if (Array.isArray(parsed.folders)) {
        for (const folder of parsed.folders) {
          await this.repository.saveFolder(folder);
        }
      }

      if (Array.isArray(parsed.attachments)) {
        for (const att of parsed.attachments) {
          await this.repository.saveAttachment(att);
        }
      }

      // Reload workspace state in memory
      window.location.reload();
      return true;
    } catch (err) {
      console.error('Import workspace backup failed:', err);
      return false;
    }
  }
}
