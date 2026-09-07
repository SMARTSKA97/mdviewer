# Master Architecture Roadmap & Multi-Phase Implementation Plan

This document serves as the single source of truth and living memory for evolving `mdviewer` from a standalone Markdown editor into a local-first Personal Knowledge Management (PKM) and Workspace System.

---

## Strategic Core Invariant

> **The Document is the Source of Truth.**
> The tab, editor, preview, sidebar, search, backlink index, export engine, and graph visualization are merely reactive views over the underlying document and workspace data model.

---

## User Review Required & Open Questions

> [!IMPORTANT]
> **Immediate Execution Phase (Phase 0 & Phase 1):**
> 1. **Phase 0 (Core Stabilization)**: Separatating `Document` from `DocumentTab`, implementing `DocumentRepository` (IndexedDB + LocalStorage fallback), per-document history stack, security fixes, UUIDs, duplicate slug handling, and comprehensive unit test coverage.
> 2. **Phase 1 (Local Note Manager)**: Introducing Folder hierarchy (`WorkspaceNode`), local Attachment store (`attachment://`), workspace-wide Search index, Favorites/Trash lifecycle, Templates, and Workspace Backup (ZIP export/import).

> [!NOTE]
> **Sequential Phase Progression:**
> - **Phase 0**: Core Stabilization & Architectural Refactoring
> - **Phase 1**: Local Note Manager & Workspace Foundation (`v0.2`)
> - **Phase 2**: Obsidian Knowledge Layer (Wikilinks, Backlinks, Tags, Properties, Graph) (`v0.3`)
> - **Phase 3**: Power-User Editor & Centralized Command Registry (`v0.4`)
> - **Phase 4**: Notion/AppFlowy Block Tree & Metadata Databases (`v0.5`)
> - **Phase 5**: Local-First Sync, Encryption & Extension API (`v1.0`)

---

## Detailed Phase Specifications

### Phase 0 — Core Stabilization & Architectural Refactoring (Current Focus)

**Goal:** Establish clean separation of concerns, storage repository abstraction, security hardening, and test coverage before expanding features.

#### 1. Domain Model Separation (`Document` vs `DocumentTab`)
- **[NEW] [document.model.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/core/models/document.model.ts)**
  ```ts
  export interface Document {
    id: string;              // UUID
    title: string;
    content: string;
    parentId: string | null; // Folder parent ID
    createdAt: number;
    updatedAt: number;
    tags: string[];
    aliases: string[];
    favorite: boolean;
    archived: boolean;
    metadata: Record<string, unknown>;
  }

  export interface DocumentTab {
    id: string;              // Tab View instance ID
    documentId: string;      // Referenced Document ID
    isDirty: boolean;
    cursorPosition?: number;
    scrollPosition?: number;
  }
  ```

#### 2. Storage Repository Abstraction (`DocumentRepository`)
- **[NEW] [document.repository.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/core/repositories/document.repository.ts)**
  - Define `DocumentRepository` interface (`get`, `list`, `create`, `update`, `delete`, `query`, `saveWorkspaceState`, `loadWorkspaceState`).
- **[NEW] [indexed-db-document.repository.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/core/repositories/indexed-db-document.repository.ts)**
  - Native IndexedDB implementation storing documents, folders, and workspace metadata.
  - Transparent fallback to `LocalStorageDocumentRepository` when IndexedDB is restricted.
  - Automatic `schemaVersion: 1` data migration framework.

#### 3. Per-Document History & State Management
- **[NEW] [editor-history.service.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/core/services/editor-history.service.ts)**
  - Maintain independent undo/redo history stacks keyed by `documentId`.
  - Binds to editor transactions so tab switches retain distinct undo/redo stacks.

#### 4. Security Hardening & DOMPurify Tightening
- **[MODIFY] [markdown.service.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/core/services/markdown.service.ts)**
  - Remove inline `onclick="window.__copyCodeBlock(this)"` event handlers and DOMPurify `' onclick '` attribute exemption.
  - Render code block buttons with `data-action="copy-code"` and `data-code` attributes.
  - Handle duplicate heading slugs (`slugify` counters: `heading`, `heading-1`).
- **[MODIFY] [preview.component.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/features/preview/preview.component.ts)**
  - Delegated click listener inside preview container using `navigator.clipboard.writeText()`.

#### 5. Core Test Harness
- **[NEW] [document-store.service.spec.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/core/services/document-store.service.spec.ts)**
- **[NEW] [markdown.service.spec.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/core/services/markdown.service.spec.ts)**
- **[NEW] [indexed-db-repository.spec.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/core/repositories/indexed-db-repository.spec.ts)**

---

### Phase 1 — Local Note Manager & Workspace Foundation (`v0.2`)

**Goal:** Turn `mdviewer` into a full file/folder workspace notes manager with global search, attachments, and backup.

#### 1. Folder Hierarchy & Workspace Tree
- **[NEW] [folder.model.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/core/models/folder.model.ts)**
  ```ts
  export interface Folder {
    id: string;
    name: string;
    parentId: string | null;
    createdAt: number;
    updatedAt: number;
    isCollapsed: boolean;
  }
  ```
- **[NEW] [workspace.service.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/core/services/workspace.service.ts)**
  - Manage tree structure: `createFolder`, `moveNode`, `renameNode`, `deleteNode`.
  - Implement soft deletion: Move deleted notes/folders to `Trash` system folder before permanent destruction.

#### 2. Workspace Sidebar UI
- **[MODIFY] [sidebar.component.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/features/sidebar/sidebar.component.ts)**
  - Add multi-section navigation panel:
    - ⭐ **Favorites**
    - 🕘 **Recent Notes**
    - 📁 **Workspace Folders & Notes Tree**
    - 🏷️ **Tags Index**
    - 🗑️ **Trash Bin** (Restore / Empty Trash)

#### 3. Global Workspace Search Engine
- **[NEW] [search.service.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/core/services/search.service.ts)**
- **[NEW] [global-search-modal.component.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/features/search/global-search-modal.component.ts)**
  - Key combination `Ctrl+Shift+F` for global search modal.
  - Search across document titles, content text, tags, and folder paths.
  - Display search results with highlighted snippet previews and line numbers.

#### 4. Local Attachment Management
- **[NEW] [attachment.service.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/core/services/attachment.service.ts)**
  - Pasted images or uploaded files store binary Blobs in IndexedDB `attachments` object store.
  - Insert reference in Markdown: `![image](attachment://att-uuid)`.
  - Preview component resolves `attachment://` protocol links dynamically using `URL.createObjectURL()`.

#### 5. Templates & Workspace Backup
- **[NEW] [template.service.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/core/services/template.service.ts)**
  - Standard templates: Daily Note, Meeting Note, Project Plan, Book Notes.
- **[NEW] [backup.service.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/core/services/backup.service.ts)**
  - Export entire workspace to `.zip` file containing `workspace.json` manifest, raw `.md` files, and attachments.
  - Import full workspace `.zip` backup to restore workspace on any machine.

---

### Phase 2 — Obsidian Knowledge Layer (`v0.3`)

**Goal:** Enable inter-note linking, wikilinks, backlinks index, frontmatter metadata, and interactive knowledge graph visualization.

#### 1. Wikilinks Parser & Linking Syntax
- Support standard Obsidian-style wikilinks:
  - `[[Note Title]]` -> Link to note by title
  - `[[Note Title|Custom Display Text]]` -> Display custom text link
  - `[[Note Title#Heading]]` -> Anchor link to specific section inside target note
- Auto-complete popup when typing `[[` in editor.

#### 2. Indexing Layer & Backlink Indexer
- **[NEW] [indexer.service.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/core/services/indexer.service.ts)**
  - Scans document text for wikilinks (`[[...]]`), tags (`#tag`), and frontmatter properties.
  - Maintains in-memory bidirectional link graph (`LinkIndex`):
    - Forward links: Document A -> [Document B, Document C]
    - Backlinks: Document B -> Linked from [Document A]
    - Broken links: References to non-existent notes (clicking offers "Create note").

#### 3. Backlinks Panel & Properties UI
- **[NEW] [backlinks-panel.component.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/features/backlinks/backlinks-panel.component.ts)**
  - Collapsible sidebar panel showing linked references and unlinked context matches for active note.
- **[NEW] [frontmatter.service.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/core/services/frontmatter.service.ts)**
  - Parse YAML frontmatter block (`--- ... ---`).
  - Render interactive document properties panel above note editor (Status, Priority, Due Date, Tags).

#### 4. Interactive Knowledge Graph Visualization
- **[NEW] [graph-view.component.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/features/graph/graph-view.component.ts)**
  - Render interactive 2D graph of workspace notes and relationships using SVG/Canvas.
  - Node color coding by folder or tag; zoom, drag, filter, and click-to-open document.

---

### Phase 3 — Power-User Editor & Centralized Command Registry (`v0.4`)

**Goal:** Centralize command dispatching, expand Markdown authoring efficiency, and introduce slash commands.

#### 1. Centralized Command Registry & Shortcut Registry
- **[NEW] [command.service.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/core/services/command.service.ts)**
  - Standardized command interface (`id`, `title`, `category`, `shortcut`, `execute`, `isEnabled`).
  - Unifies trigger sources: Command Palette, Keyboard Shortcuts, Header Toolbar, Context Menus.
- **[NEW] [shortcut-registry.service.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/core/services/shortcut-registry.service.ts)**
  - Prevents shortcut collisions and allows custom user key bindings.

#### 2. Advanced Editor Capabilities
- **Slash Commands (`/`)**: Typing `/` inside empty editor line opens formatting insert menu (Heading, Bullet list, Code block, Table, Callout, Math, Diagram, Attachment).
- **Auto-Closing Delimiters**: Auto-pair brackets `()`, `[]`, `{}` and quotes `""`, `''`, `` ` ``.
- **Folding Headings**: Collapsible heading blocks in editor/preview.

---

### Phase 4 — Notion/AppFlowy Block Tree & Metadata Databases (`v0.5`)

**Goal:** Provide structured block representation and metadata database views.

#### 1. Block Tree Data Model
- **[NEW] [block.model.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/core/models/block.model.ts)**
  - Convert raw text lines into structured `Block` nodes (`id`, `type`, `content`, `properties`, `children`).
  - Bi-directional Markdown <-> Block serializer.

#### 2. Database Views (Tables & Kanban)
- Render notes in a folder/tag as structured database views using frontmatter properties:
  - **Table View**: Column sorting, inline property editing.
  - **Kanban Board**: Drag-and-drop notes across status columns.

---

### Phase 5 — Local-First Sync, Encryption & Ecosystem (`v1.0`)

**Goal:** Enable multi-device synchronization, client-side encryption, and plugin extensibility.

#### 1. Local-First Sync Engine
- **[NEW] [sync.service.ts](file:///c:/Users/Administrator/Documents/Workspaces/mdviewer/src/app/core/services/sync.service.ts)**
  - Delta change tracking (`revision`, `updatedAt`, `deviceId`, `changeId`).
  - Conflict resolution strategy for offline-first sync.

#### 2. Vault Client-Side Encryption
- Optional AES-GCM 256-bit encryption for workspace documents before persistence or sync.

#### 3. Plugin Architecture
- Extension API exposing command hooks, custom preview renderers, and custom sidebar panels.

---

## Verification Plan

### Phase 0 Verification
- **Automated Unit Tests**:
  ```bash
  npx ng test --watch=false
  ```
  Validate test execution for `DocumentStoreService`, `MarkdownService`, `IndexedDbDocumentRepository`, and `EditorHistoryService`.
- **Manual Verification**:
  1. Confirm tabs isolate distinct undo/redo stacks.
  2. Confirm copy button works via delegated click event without inline script execution.
  3. Confirm duplicate headings generate distinct anchor slugs (`#heading`, `#heading-1`).
  4. Confirm page reload preserves documents via IndexedDB / LocalStorage fallback.

### Subsequent Phase Verifications
- Each phase will have automated service unit tests and interactive UI walkthrough verification.
