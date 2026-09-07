export interface Document {
  id: string;
  title: string;
  content: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  aliases?: string[];
  favorite?: boolean;
  archived?: boolean;
  metadata?: Record<string, unknown>;
  fileHandle?: any; // FileSystemFileHandle
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
  isCollapsed?: boolean;
}

export interface DocumentTab {
  id: string;
  documentId: string;
  title: string;
  content: string;
  isDirty: boolean;
  lastModified: number;
  cursorPosition?: number;
  scrollPosition?: number;
  fileHandle?: any; // FileSystemFileHandle
}

export type WorkspaceNode =
  | ({ type: 'document' } & Document)
  | ({ type: 'folder' } & Folder);

export interface PersistedWorkspace {
  schemaVersion: number;
  documents: Document[];
  folders: Folder[];
  activeTabId: string;
  openTabIds: string[];
  updatedAt: number;
}

export interface DocumentStats {
  words: number;
  chars: number;
  lines: number;
  readingTimeMin: number;
  headingsCount: number;
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
  line?: number;
}

export type ViewMode = 'split' | 'editor' | 'preview' | 'presentation';

export interface CommandItem {
  id: string;
  title: string;
  description?: string;
  category: 'action' | 'insert' | 'theme' | 'view';
  icon?: string;
  shortcut?: string;
  action: () => void;
}

