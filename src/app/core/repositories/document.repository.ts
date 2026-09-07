import { Document, Folder, PersistedWorkspace } from '../models/document.model';
import { Attachment } from '../models/attachment.model';

export interface DocumentRepository {
  getDocument(id: string): Promise<Document | null>;
  getAllDocuments(): Promise<Document[]>;
  saveDocument(doc: Document): Promise<void>;
  deleteDocument(id: string): Promise<void>;

  getFolder(id: string): Promise<Folder | null>;
  getAllFolders(): Promise<Folder[]>;
  saveFolder(folder: Folder): Promise<void>;
  deleteFolder(id: string): Promise<void>;

  getAttachment(id: string): Promise<Attachment | null>;
  getAllAttachments(): Promise<Attachment[]>;
  saveAttachment(attachment: Attachment): Promise<void>;
  deleteAttachment(id: string): Promise<void>;

  loadWorkspaceState(): Promise<PersistedWorkspace | null>;
  saveWorkspaceState(state: PersistedWorkspace): Promise<void>;

  clearAllData(): Promise<void>;
}
