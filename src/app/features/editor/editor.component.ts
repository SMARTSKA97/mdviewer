import { Component, ElementRef, ViewChild, inject, signal, computed, Output, EventEmitter, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentStoreService } from '../../core/services/document-store.service';
import { FileService } from '../../core/services/file.service';
import { EditorHistoryService } from '../../core/services/editor-history.service';
import { AttachmentService } from '../../core/services/attachment.service';
import { FormatAction } from '../toolbar/toolbar.component';
export interface SlashItem {
  id: string;
  title: string;
  category?: string;
  icon: string;
  snippet: string;
  content: string;
}

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div 
      class="app-editor h-full flex flex-col relative overflow-hidden select-text"
      style="background-color: var(--bg-primary);"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onFileDrop($event)"
    >
      <!-- Dropzone Overlay -->
      @if (isDraggingFile()) {
        <div class="absolute inset-0 z-40 bg-sky-950/80 backdrop-blur-sm border-2 border-dashed border-sky-400 m-3 rounded-2xl flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-150">
          <div class="w-16 h-16 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-3">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
          </div>
          <h3 class="text-lg font-bold text-white mb-1">Drop Markdown File Here</h3>
          <p class="text-xs text-sky-200">Release to open and live preview immediately</p>
        </div>
      }

      <!-- Editor Container with Synchronized Line Numbers -->
      <div class="flex-1 flex overflow-hidden relative">
        <!-- Line Numbers Column -->
        <div 
          #lineNumbersRef
          class="editor-line-numbers w-12 py-3 text-right pr-2 select-none font-mono text-xs overflow-hidden shrink-0 border-r"
          style="background-color: var(--bg-secondary); border-color: var(--border-color); color: var(--text-muted);"
        >
          @for (lineNum of lineNumbers(); track lineNum) {
            <div class="h-6 leading-6 text-[11px]">{{ lineNum }}</div>
          }
        </div>

        <!-- Main Textarea -->
        <textarea
          #textareaRef
          [ngModel]="store.activeContent()"
          (ngModelChange)="onContentChange($event)"
          (scroll)="onEditorScroll()"
          (keydown)="onKeyDown($event)"
          (paste)="onPaste($event)"
          placeholder="Type or paste your Markdown here, or drag & drop .md files... (Type / for quick actions)"
          spellcheck="false"
          class="editor-textarea flex-1 h-full font-mono text-sm leading-6 py-3 px-4 resize-none outline-none overflow-y-auto custom-scrollbar whitespace-pre-wrap select-text"
          style="background-color: var(--bg-primary); color: var(--text-primary);"
        ></textarea>
      </div>

      <!-- Floating Slash Commands Popup Menu -->
      @if (showSlashMenu()) {
        <div 
          class="absolute z-50 rounded-2xl shadow-2xl border overflow-hidden w-72 animate-in zoom-in-95 duration-100 p-1.5 backdrop-blur-md"
          style="background-color: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary);"
          [style.left.px]="slashMenuPos().x"
          [style.top.px]="slashMenuPos().y"
        >
          <div class="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider border-b mb-1 flex items-center justify-between" style="border-color: var(--border-subtle); color: var(--text-muted);">
            <span>Quick Syntaxes & Diagrams</span>
            @if (slashSearchQuery()) {
              <span class="font-mono font-bold" style="color: var(--accent);">/{{ slashSearchQuery() }}</span>
            }
          </div>
          <div #slashListRef class="max-h-64 overflow-y-auto custom-scrollbar space-y-0.5">
            @for (cmd of filteredSlashItems(); track cmd.id; let i = $index) {
              <button 
                (click)="executeSlashCommand(cmd)"
                (mouseenter)="slashMenuIndex.set(i)"
                class="w-full text-left px-2.5 py-1.5 rounded-xl flex items-center gap-2.5 text-xs transition-colors"
                [style.backgroundColor]="slashMenuIndex() === i ? 'var(--selection-bg)' : 'transparent'"
                [style.color]="slashMenuIndex() === i ? 'var(--accent)' : 'var(--text-primary)'"
              >
                <span class="text-sm shrink-0 font-mono font-bold">{{ cmd.icon }}</span>
                <div class="truncate">
                  <div class="font-medium truncate flex items-center justify-between gap-1">
                    <span class="truncate">{{ cmd.title }}</span>
                    @if (cmd.category) {
                      <span class="text-[9px] px-1 py-0.2 rounded font-mono shrink-0 opacity-70" style="background-color: var(--bg-tertiary); color: var(--text-secondary);">{{ cmd.category }}</span>
                    }
                  </div>
                  <div class="text-[10px] truncate font-mono opacity-70">{{ cmd.snippet }}</div>
                </div>
              </button>
            } @empty {
              <div class="px-3 py-2 text-xs font-mono text-center opacity-60">No matching syntaxes</div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class EditorComponent {
  store = inject(DocumentStoreService);
  fileService = inject(FileService);
  editorHistory = inject(EditorHistoryService);
  attachmentService = inject(AttachmentService);

  @ViewChild('textareaRef') textareaRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('lineNumbersRef') lineNumbersRef!: ElementRef<HTMLDivElement>;
  @ViewChild('slashListRef') slashListRef?: ElementRef<HTMLDivElement>;

  @Output() editorScrolled = new EventEmitter<{ scrollTop: number; scrollRatio: number }>();

  isDraggingFile = signal<boolean>(false);
  showSlashMenu = signal<boolean>(false);
  slashMenuIndex = signal<number>(0);
  slashMenuPos = signal<{ x: number; y: number }>({ x: 60, y: 40 });
  slashSearchQuery = signal<string>('');

  private isHistoryAction = false;

  readonly slashItems: SlashItem[] = [
    // --- Headings ---
    { id: 'h1', title: 'Heading 1', category: 'Headings', icon: 'H1', snippet: '# Heading 1', content: '# ' },
    { id: 'h2', title: 'Heading 2', category: 'Headings', icon: 'H2', snippet: '## Heading 2', content: '## ' },
    { id: 'h3', title: 'Heading 3', category: 'Headings', icon: 'H3', snippet: '### Heading 3', content: '### ' },
    { id: 'h4', title: 'Heading 4', category: 'Headings', icon: 'H4', snippet: '#### Heading 4', content: '#### ' },
    { id: 'h5', title: 'Heading 5', category: 'Headings', icon: 'H5', snippet: '##### Heading 5', content: '##### ' },
    { id: 'h6', title: 'Heading 6', category: 'Headings', icon: 'H6', snippet: '###### Heading 6', content: '###### ' },

    // --- Inline Formatting ---
    { id: 'bold', title: 'Bold Text', category: 'Format', icon: 'B', snippet: '**bold text**', content: '**bold text**' },
    { id: 'italic', title: 'Italic Text', category: 'Format', icon: 'I', snippet: '*italic text*', content: '*italic text*' },
    { id: 'strike', title: 'Strikethrough', category: 'Format', icon: 'S', snippet: '~~strikethrough~~', content: '~~strikethrough~~' },
    { id: 'highlight', title: 'Highlight Text', category: 'Format', icon: '🖍️', snippet: '==highlighted text==', content: '==highlighted text==' },
    { id: 'underline', title: 'Underline Text', category: 'Format', icon: 'U', snippet: '<u>underlined text</u>', content: '<u>underlined text</u>' },
    { id: 'subscript', title: 'Subscript', category: 'Format', icon: 'X₂', snippet: '<sub>subscript</sub>', content: '<sub>subscript</sub>' },
    { id: 'superscript', title: 'Superscript', category: 'Format', icon: 'X²', snippet: '<sup>superscript</sup>', content: '<sup>superscript</sup>' },
    { id: 'inline-code', title: 'Inline Code', category: 'Format', icon: '`', snippet: '`code`', content: '`code` font' },
    { id: 'kbd', title: 'Keyboard Key Badge', category: 'Format', icon: '⌨️', snippet: '<kbd>Key</kbd>', content: '<kbd>Ctrl</kbd> + <kbd>C</kbd>' },

    // --- Lists & Blocks ---
    { id: 'bullet', title: 'Bullet List', category: 'Lists', icon: '•', snippet: '- Bullet item', content: '- ' },
    { id: 'num', title: 'Numbered List', category: 'Lists', icon: '1.', snippet: '1. Numbered item', content: '1. ' },
    { id: 'task', title: 'Task Checkbox', category: 'Lists', icon: '☑️', snippet: '- [ ] Task item', content: '- [ ] ' },
    { id: 'quote', title: 'Blockquote', category: 'Blocks', icon: '💬', snippet: '> Quote line', content: '> ' },
    { id: 'quote-author', title: 'Quote with Attribution', category: 'Blocks', icon: '✍️', snippet: '> Quote\n> — Author', content: '> "The best way to predict the future is to invent it."\n> — Alan Kay\n' },
    { id: 'table', title: 'Data Table', category: 'Blocks', icon: '📊', snippet: '| Col 1 | Col 2 |', content: '| Feature | Support |\n| --- | :---: |\n| Live Preview | ✅ |\n| Mermaid v11 | ✅ |\n' },
    { id: 'details', title: 'Collapsible Accordion', category: 'Blocks', icon: '🔽', snippet: '<details><summary>...</summary></details>', content: '<details>\n<summary>Click to expand content</summary>\n\nHidden detailed markdown content goes here.\n\n</details>\n' },
    { id: 'hr', title: 'Horizontal Divider', category: 'Blocks', icon: '➖', snippet: '---', content: '---\n' },
    { id: 'link', title: 'Hyperlink URL', category: 'Links', icon: '🔗', snippet: '[Title](url)', content: '[Link Title](https://example.com)' },
    { id: 'image', title: 'Image Embed', category: 'Media', icon: '🖼️', snippet: '![Alt](url)', content: '![Sample Image](https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800 "Sample Image")' },
    { id: 'wikilink', title: 'Wikilink Reference', category: 'Links', icon: '🪢', snippet: '[[Note Title]]', content: '[[Note Title]]' },
    { id: 'footnote', title: 'Footnote Reference', category: 'Links', icon: '🦶', snippet: '[^1] & [^1]: description', content: 'Here is a footnote reference[^1].\n\n[^1]: Footnote details description.\n' },
    { id: 'def-list', title: 'Definition List', category: 'Lists', icon: '📖', snippet: 'Term\n: Definition', content: 'Markdown\n: A lightweight markup language with plain text formatting syntax.\n' },
    { id: 'frontmatter', title: 'YAML Frontmatter Header', category: 'Metadata', icon: '🏷️', snippet: '--- title: ... ---', content: '---\ntitle: Document Title\ntags: [note, docs]\nstatus: Active\n---\n' },

    // --- GitHub Alerts / Callouts ---
    { id: 'alert-note', title: 'GitHub Alert Note', category: 'Callouts', icon: 'ℹ️', snippet: '> [!NOTE]', content: '> [!NOTE]\n> Useful information and reference notes.\n' },
    { id: 'alert-tip', title: 'GitHub Alert Tip', category: 'Callouts', icon: '💡', snippet: '> [!TIP]', content: '> [!TIP]\n> Pro tips and efficiency recommendations.\n' },
    { id: 'alert-important', title: 'GitHub Alert Important', category: 'Callouts', icon: '🟣', snippet: '> [!IMPORTANT]', content: '> [!IMPORTANT]\n> Crucial information to keep in mind.\n' },
    { id: 'alert-warning', title: 'GitHub Alert Warning', category: 'Callouts', icon: '⚠️', snippet: '> [!WARNING]', content: '> [!WARNING]\n> Warning details and cautions.\n' },
    { id: 'alert-caution', title: 'GitHub Alert Caution', category: 'Callouts', icon: '🚨', snippet: '> [!CAUTION]', content: '> [!CAUTION]\n> High-risk actions that require extra care.\n' },

    // --- Code Blocks & Math ---
    { id: 'code-ts', title: 'Code Block TypeScript', category: 'Code', icon: '⚡', snippet: '```typescript```', content: '```typescript\nimport { signal } from \'@angular/core\';\n\nconst count = signal(0);\n```\n' },
    { id: 'code-js', title: 'Code Block JavaScript', category: 'Code', icon: '🟨', snippet: '```javascript```', content: '```javascript\nconsole.log("Hello from JavaScript");\n```\n' },
    { id: 'code-py', title: 'Code Block Python', category: 'Code', icon: '🐍', snippet: '```python```', content: '```python\ndef greet(name: str) -> str:\n    return f"Hello, {name}!"\n```\n' },
    { id: 'code-sql', title: 'Code Block SQL', category: 'Code', icon: '🛢️', snippet: '```sql```', content: '```sql\nSELECT id, title, created_at FROM documents WHERE status = \'active\';\n```\n' },
    { id: 'code-bash', title: 'Code Block Shell', category: 'Code', icon: '💻', snippet: '```bash```', content: '```bash\nnpm run build\n```\n' },
    { id: 'math-inline', title: 'LaTeX Math Inline', category: 'Math', icon: '➗', snippet: '$E = mc^2$', content: '$E = mc^2$' },
    { id: 'math-block', title: 'LaTeX Math Block', category: 'Math', icon: '📐', snippet: '$$ Math Block $$', content: '$$\nf(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} \\exp\\left( -\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^{\\!2}\\right)\n$$\n' },

    // --- Mermaid Diagrams (All 18 Types) ---
    { id: 'mermaid-flow-lr', title: 'Mermaid Flowchart (Left-Right)', category: 'Mermaid', icon: '➡️', snippet: '```mermaid flowchart LR```', content: '```mermaid\nflowchart LR\n    A[Start] --> B(Process)\n    B --> C{Decision}\n    C -->|Yes| D[Result 1]\n    C -->|No| E[Result 2]\n```\n' },
    { id: 'mermaid-flow-td', title: 'Mermaid Flowchart (Top-Down)', category: 'Mermaid', icon: '⬇️', snippet: '```mermaid flowchart TD```', content: '```mermaid\nflowchart TD\n    Client[🌐 Client] --> Gateway[⚡ API Gateway]\n    Gateway --> Service[⚙️ Microservice]\n    Service --> Database[(🛢️ PostgreSQL)]\n```\n' },
    { id: 'mermaid-seq', title: 'Mermaid Sequence Diagram', category: 'Mermaid', icon: '🔄', snippet: '```mermaid sequenceDiagram```', content: '```mermaid\nsequenceDiagram\n    autonumber\n    actor User as 👤 User\n    participant App as 📱 Client App\n    participant Server as ⚡ API Server\n    User->>App: Click Action\n    App->>Server: HTTP POST /data\n    Server-->>App: 200 OK (JSON)\n    App-->>User: Render UI Update\n```\n' },
    { id: 'mermaid-class', title: 'Mermaid Class Diagram', category: 'Mermaid', icon: '📦', snippet: '```mermaid classDiagram```', content: '```mermaid\nclassDiagram\n    class Document {\n        +String id\n        +String title\n        +String content\n        +save()\n    }\n    class User {\n        +String name\n        +login()\n    }\n    User "1" -- "*" Document : owns\n```\n' },
    { id: 'mermaid-state', title: 'Mermaid State Diagram', category: 'Mermaid', icon: '🔀', snippet: '```mermaid stateDiagram```', content: '```mermaid\nstateDiagram-v2\n    [*] --> Idle\n    Idle --> Processing: Event Triggered\n    Processing --> Success: Validation Passed\n    Processing --> Failed: Error Occurred\n    Success --> [*]\n    Failed --> Idle: Retry\n```\n' },
    { id: 'mermaid-er', title: 'Mermaid ER Diagram', category: 'Mermaid', icon: '🗄️', snippet: '```mermaid erDiagram```', content: '```mermaid\nerDiagram\n    CUSTOMER ||--o{ ORDER : places\n    ORDER ||--|{ LINE-ITEM : contains\n    PRODUCT ||--o{ LINE-ITEM : includes\n```\n' },
    { id: 'mermaid-gantt', title: 'Mermaid Gantt Chart', category: 'Mermaid', icon: '📅', snippet: '```mermaid gantt```', content: '```mermaid\ngantt\n    title Project Roadmap 2026\n    dateFormat YYYY-MM-DD\n    section Design\n    UI Mockups       :a1, 2026-09-01, 7d\n    section Development\n    Core Features    :a2, after a1, 10d\n    Testing & QA     :after a2, 5d\n```\n' },
    { id: 'mermaid-pie', title: 'Mermaid Pie Chart', category: 'Mermaid', icon: '🥧', snippet: '```mermaid pie```', content: '```mermaid\npie title Tech Stack Distribution\n    "TypeScript" : 45\n    "HTML/CSS" : 25\n    "Rust" : 20\n    "Other" : 10\n```\n' },
    { id: 'mermaid-git', title: 'Mermaid Git Graph', category: 'Mermaid', icon: '🌿', snippet: '```mermaid gitGraph```', content: '```mermaid\ngitGraph\n    commit id: "Initial"\n    branch feature\n    checkout feature\n    commit id: "Feature Work"\n    checkout main\n    merge feature\n    commit id: "v1.0 Release"\n```\n' },
    { id: 'mermaid-mindmap', title: 'Mermaid Mindmap', category: 'Mermaid', icon: '🧠', snippet: '```mermaid mindmap```', content: '```mermaid\nmindmap\n  root((MDViewer Studio))\n    Features\n      Mermaid Diagrams\n      LaTeX Math\n      Live Preview\n    Themes\n      Obsidian\n      GitHub Light\n      Dracula\n      Nord\n      Emerald\n```\n' },
    { id: 'mermaid-timeline', title: 'Mermaid Timeline', category: 'Mermaid', icon: '⌛', snippet: '```mermaid timeline```', content: '```mermaid\ntimeline\n    title Product Timeline\n    2024 : v1.0 Launch : Core Markdown\n    2025 : v2.0 Update : Mermaid & Math Studio\n    2026 : v3.0 Pro : Advanced Analytics & Vault\n```\n' },
    { id: 'mermaid-journey', title: 'Mermaid User Journey', category: 'Mermaid', icon: '🚀', snippet: '```mermaid journey```', content: '```mermaid\njourney\n    title User Onboarding Experience\n    section Setup\n      Open App: 5: User\n      Select Theme: 4: User\n    section Writing\n      Create Note: 5: User\n      Use Slash Commands: 5: User\n```\n' },
    { id: 'mermaid-quadrant', title: 'Mermaid Quadrant Chart', category: 'Mermaid', icon: '🎯', snippet: '```mermaid quadrantChart```', content: '```mermaid\nquadrantChart\n    title Feature Matrix\n    x-axis Low Effort --> High Effort\n    y-axis Low Impact --> High Impact\n    quadrant-1 Quick Wins\n    quadrant-2 Major Projects\n    quadrant-3 Fill-ins\n    quadrant-4 Thankless Tasks\n    "Slash Commands": [0.2, 0.9]\n    "P2P Sync": [0.8, 0.85]\n```\n' },
    { id: 'mermaid-req', title: 'Mermaid Requirement Diagram', category: 'Mermaid', icon: '📋', snippet: '```mermaid requirementDiagram```', content: '```mermaid\nrequirementDiagram\n    requirement req_realtime {\n        id: 1\n        text: System shall render live preview in sub-milliseconds.\n        risk: low\n        verifymethod: test\n    }\n```\n' },
    { id: 'mermaid-arch', title: 'Mermaid Architecture Diagram', category: 'Mermaid', icon: '🏛️', snippet: '```mermaid architecture-beta```', content: '```mermaid\narchitecture-beta\n    group api(cloud)[API Gateway]\n    service db(database)[Database]\n    service cache(disk)[Redis Cache]\n    api:L -- R:db\n    api:B -- T:cache\n```\n' },
    { id: 'mermaid-c4', title: 'Mermaid C4 Context', category: 'Mermaid', icon: '🏢', snippet: '```mermaid C4Context```', content: '```mermaid\nC4Context\n    title System Context Diagram\n    Person(user, "User", "Markdown Author")\n    System(app, "MDViewer", "Live Studio App")\n    Rel(user, app, "Edits documents & diagrams")\n```\n' },
    { id: 'mermaid-xy', title: 'Mermaid XY Chart', category: 'Mermaid', icon: '📈', snippet: '```mermaid xychart-beta```', content: '```mermaid\nxychart-beta\n    title "Performance Metrics 2026"\n    x-axis [Jan, Feb, Mar, Apr, May, Jun]\n    y-axis "Latency (ms)" 0 --> 100\n    bar [20, 35, 55, 40, 25, 15]\n    line [25, 40, 60, 45, 30, 20]\n```\n' },
    { id: 'mermaid-sankey', title: 'Mermaid Sankey Diagram', category: 'Mermaid', icon: '🌊', snippet: '```mermaid sankey-beta```', content: '```mermaid\nsankey-beta\n    Energy Source,Power Plant,100\n    Power Plant,Grid Supply,80\n    Power Plant,Heat Loss,20\n    Grid Supply,Homes,50\n    Grid Supply,Industry,30\n```\n' },
    { id: 'mermaid-block', title: 'Mermaid Block Diagram', category: 'Mermaid', icon: '🧩', snippet: '```mermaid block-beta```', content: '```mermaid\nblock-beta\n    columns 3\n    db(("Database")):2\n    enc["Security Engine"]\n    block:group1:3\n        columns 2\n        a["Module A"] b["Module B"]\n    end\n```\n' }
  ];

  filteredSlashItems = computed(() => {
    const q = this.slashSearchQuery().toLowerCase().trim();
    if (!q) return this.slashItems;
    return this.slashItems.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.snippet.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      (item.category && item.category.toLowerCase().includes(q))
    );
  });

  lineNumbers = computed(() => {
    const content = this.store.activeContent();
    const count = Math.max(1, content.split('\n').length);
    return Array.from({ length: count }, (_, i) => i + 1);
  });

  private scrollToSlashItem(): void {
    setTimeout(() => {
      const container = this.slashListRef?.nativeElement;
      if (!container) return;
      const index = this.slashMenuIndex();
      const child = container.children[index] as HTMLElement;
      if (child) {
        const top = child.offsetTop;
        const bottom = top + child.offsetHeight;
        if (top < container.scrollTop) {
          container.scrollTop = top;
        } else if (bottom > container.scrollTop + container.clientHeight) {
          container.scrollTop = bottom - container.clientHeight;
        }
      }
    }, 10);
  }

  private updateSlashSearchFromCursor(): void {
    if (!this.showSlashMenu() || !this.textareaRef) return;
    const textarea = this.textareaRef.nativeElement;
    const { selectionStart, value } = textarea;

    const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
    const currentLineBeforeCursor = value.substring(lineStart, selectionStart);
    const slashIndex = currentLineBeforeCursor.indexOf('/');

    if (slashIndex !== -1) {
      const query = currentLineBeforeCursor.substring(slashIndex + 1);
      this.slashSearchQuery.set(query);
      this.slashMenuIndex.set(0);
    } else {
      this.showSlashMenu.set(false);
    }
  }

  executeSlashCommand(item: SlashItem): void {
    this.showSlashMenu.set(false);
    const textarea = this.textareaRef.nativeElement;
    const { selectionStart, selectionEnd, value } = textarea;

    const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
    const currentLineBeforeCursor = value.substring(lineStart, selectionStart);
    const slashIndex = currentLineBeforeCursor.indexOf('/');

    let replaceStart = lineStart;
    if (slashIndex !== -1) {
      replaceStart = lineStart + slashIndex;
    }

    const before = value.substring(0, replaceStart);
    const after = value.substring(selectionEnd);

    const newValue = before + item.content + after;
    this.onContentChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = replaceStart + item.content.length;
      textarea.selectionStart = textarea.selectionEnd = newCursorPos;
    });
  }

  onContentChange(newContent: string): void {
    const activeTab = this.store.activeTab();
    const docId = activeTab?.documentId || activeTab?.id || '';
    const oldContent = this.store.activeContent();

    if (!this.isHistoryAction && docId) {
      this.editorHistory.pushState(docId, oldContent, newContent);
    }
    this.isHistoryAction = false;
    this.store.updateContent(newContent);

    if (this.showSlashMenu()) {
      setTimeout(() => this.updateSlashSearchFromCursor(), 0);
    }
  }

  onEditorScroll(): void {
    if (!this.textareaRef) return;
    const el = this.textareaRef.nativeElement;

    // Sync line numbers scroll
    if (this.lineNumbersRef) {
      this.lineNumbersRef.nativeElement.scrollTop = el.scrollTop;
    }

    // Emit scroll ratio for preview sync
    const maxScroll = el.scrollHeight - el.clientHeight;
    const scrollRatio = maxScroll > 0 ? el.scrollTop / maxScroll : 0;
    this.editorScrolled.emit({ scrollTop: el.scrollTop, scrollRatio });
  }

  scrollToRatio(ratio: number): void {
    if (!this.textareaRef) return;
    const el = this.textareaRef.nativeElement;
    const maxScroll = el.scrollHeight - el.clientHeight;
    el.scrollTop = ratio * maxScroll;
  }

  onKeyDown(event: KeyboardEvent): void {
    const textarea = this.textareaRef.nativeElement;
    const { selectionStart, selectionEnd, value } = textarea;

    // Handle slash commands menu navigation if open
    if (this.showSlashMenu()) {
      const items = this.filteredSlashItems();
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.slashMenuIndex.update(i => (i + 1) % Math.max(1, items.length));
        this.scrollToSlashItem();
        return;
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.slashMenuIndex.update(i => (i - 1 + items.length) % Math.max(1, items.length));
        this.scrollToSlashItem();
        return;
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const selected = items[this.slashMenuIndex()];
        if (selected) this.executeSlashCommand(selected);
        return;
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.showSlashMenu.set(false);
        return;
      }
    }

    // Slash trigger `/`
    if (event.key === '/') {
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const currentLineBeforeCursor = value.substring(lineStart, selectionStart);

      if (currentLineBeforeCursor.trim() === '') {
        this.showSlashMenu.set(true);
        this.slashMenuIndex.set(0);
        this.slashSearchQuery.set('');
        this.slashMenuPos.set({ x: 60, y: Math.min(250, Math.max(40, selectionStart % 300)) });
      }
    }

    // Smart List Continuation on Enter Key
    if (event.key === 'Enter' && !event.shiftKey) {
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const currentLine = value.substring(lineStart, selectionStart);

      const taskMatch = currentLine.match(/^(\s*)([-*+]\s+\[[ xX]\])\s*(.*)/);
      const numMatch = currentLine.match(/^(\s*)(\d+)\.\s*(.*)/);
      const bulletMatch = currentLine.match(/^(\s*)([-*+])\s*(.*)/);

      let nextPrefix = '';
      let isLineEmpty = false;

      if (taskMatch) {
        if (!taskMatch[3].trim()) { isLineEmpty = true; }
        else { nextPrefix = `${taskMatch[1]}- [ ] `; }
      } else if (numMatch) {
        if (!numMatch[3].trim()) { isLineEmpty = true; }
        else { nextPrefix = `${numMatch[1]}${parseInt(numMatch[2], 10) + 1}. `; }
      } else if (bulletMatch) {
        if (!bulletMatch[3].trim()) { isLineEmpty = true; }
        else { nextPrefix = `${bulletMatch[1]}${bulletMatch[2]} `; }
      }

      if (isLineEmpty) {
        event.preventDefault();
        const beforeLine = value.substring(0, lineStart);
        const afterLine = value.substring(selectionEnd);
        const newValue = beforeLine + afterLine;
        this.onContentChange(newValue);
        setTimeout(() => { textarea.selectionStart = textarea.selectionEnd = lineStart; });
        return;
      } else if (nextPrefix) {
        event.preventDefault();
        const before = value.substring(0, selectionStart);
        const after = value.substring(selectionEnd);
        const newValue = before + '\n' + nextPrefix + after;
        this.onContentChange(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + 1 + nextPrefix.length;
        });
        return;
      }
    }

    // Tab key: Insert 2 spaces
    if (event.key === 'Tab') {
      event.preventDefault();
      const indent = '  ';
      const before = value.substring(0, selectionStart);
      const after = value.substring(selectionEnd);

      const newValue = before + indent + after;
      this.onContentChange(newValue);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + indent.length;
      });
      return;
    }

    // Ctrl+S: Save
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      const tab = this.store.activeTab();
      if (tab) {
        this.fileService.saveFile(tab.content, tab.title, tab.fileHandle).then(res => {
          this.store.markActiveTabSaved(res.handle);
        });
      }
      return;
    }

    // Ctrl+B: Bold
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
      event.preventDefault();
      this.applyFormat({ type: 'wrap', prefix: '**', suffix: '**', defaultText: 'bold text' });
      return;
    }

    // Ctrl+I: Italic
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'i') {
      event.preventDefault();
      this.applyFormat({ type: 'wrap', prefix: '*', suffix: '*', defaultText: 'italic text' });
      return;
    }

    // Ctrl+P: Print
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') {
      event.preventDefault();
      window.print();
      return;
    }

    // Ctrl+K: Command Palette
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.store.openCommandPalette();
      return;
    }

    // Auto-close brackets and quotes
    const pairs: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}',
      '`': '`',
      '"': '"',
      "'": "'"
    };

    if (pairs[event.key] && selectionStart === selectionEnd) {
      const closing = pairs[event.key];
      // Insert both and place cursor inside
      event.preventDefault();
      const before = value.substring(0, selectionStart);
      const after = value.substring(selectionEnd);
      const newValue = before + event.key + closing + after;
      this.onContentChange(newValue);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
      });
    }
  }

  onPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        event.preventDefault();
        const blob = item.getAsFile();
        if (!blob) continue;

        this.attachmentService.saveAttachment(blob, 'pasted-image.png').then(attachmentUrl => {
          this.applyFormat({
            type: 'insert',
            prefix: `\n![Pasted Image](${attachmentUrl})\n`,
            suffix: ''
          });
        });
      }
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingFile.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingFile.set(false);
  }

  async onFileDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingFile.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      const text = await file.text();
      this.store.openDocument(file.name, text);
    }
  }

  applyFormat(format: FormatAction): void {
    const textarea = this.textareaRef.nativeElement;
    const { selectionStart, selectionEnd, value } = textarea;
    const selectedText = value.substring(selectionStart, selectionEnd);

    let replacement = '';
    let newCursorPos = selectionStart;

    if (format.type === 'wrap') {
      const innerText = selectedText || format.defaultText || '';
      replacement = format.prefix + innerText + format.suffix;
      newCursorPos = selectionStart + format.prefix.length + innerText.length;
    } else if (format.type === 'line') {
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const beforeLine = value.substring(0, lineStart);
      const afterLine = value.substring(lineStart);
      const newValue = beforeLine + format.prefix + afterLine;
      this.onContentChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + format.prefix.length;
      });
      return;
    } else if (format.type === 'insert') {
      replacement = format.prefix;
      newCursorPos = selectionStart + replacement.length;
    }

    const before = value.substring(0, selectionStart);
    const after = value.substring(selectionEnd);
    const newValue = before + replacement + after;

    this.onContentChange(newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = newCursorPos;
    });
  }

  undo(): void {
    const activeTab = this.store.activeTab();
    if (!activeTab) return;
    const docId = activeTab.documentId || activeTab.id;
    const currentContent = this.store.activeContent();

    const previous = this.editorHistory.undo(docId, currentContent);
    if (previous !== null) {
      this.isHistoryAction = true;
      this.store.updateContent(previous);
    }
  }

  redo(): void {
    const activeTab = this.store.activeTab();
    if (!activeTab) return;
    const docId = activeTab.documentId || activeTab.id;
    const currentContent = this.store.activeContent();

    const next = this.editorHistory.redo(docId, currentContent);
    if (next !== null) {
      this.isHistoryAction = true;
      this.store.updateContent(next);
    }
  }
}
