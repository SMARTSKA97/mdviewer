import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentStoreService } from '../../core/services/document-store.service';

type CheatCategory = 'markdown' | 'mermaid' | 'math';

@Component({
  selector: 'app-cheatsheet-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (store.cheatSheetModalOpen()) {
      <div 
        class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        (click)="store.closeCheatSheetModal()"
      >
        <div 
          class="w-full max-w-2xl border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
          style="background-color: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary);"
          (click)="$event.stopPropagation()"
        >
          <!-- Header & Category Switcher -->
          <div class="p-4 border-b border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-100">Cheat Sheet & Syntax Guide</h3>
                <p class="text-[11px] text-slate-400">Click any snippet to insert directly into your document</p>
              </div>
            </div>

            <button 
              (click)="store.closeCheatSheetModal()" 
              class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Category Tabs -->
          <div class="px-4 pt-2 border-b border-slate-800 flex items-center gap-2">
            <button 
              (click)="activeCategory.set('markdown')"
              [class.border-sky-400]="activeCategory() === 'markdown'"
              [class.text-sky-400]="activeCategory() === 'markdown'"
              [class.border-transparent]="activeCategory() !== 'markdown'"
              [class.text-slate-400]="activeCategory() !== 'markdown'"
              class="pb-2 text-xs font-semibold border-b-2 hover:text-slate-200 transition-colors flex items-center gap-1.5"
            >
              <span>📝</span>
              <span>Markdown</span>
            </button>

            <button 
              (click)="activeCategory.set('mermaid')"
              [class.border-purple-400]="activeCategory() === 'mermaid'"
              [class.text-purple-400]="activeCategory() === 'mermaid'"
              [class.border-transparent]="activeCategory() !== 'mermaid'"
              [class.text-slate-400]="activeCategory() !== 'mermaid'"
              class="pb-2 text-xs font-semibold border-b-2 hover:text-slate-200 transition-colors flex items-center gap-1.5"
            >
              <span>🧜</span>
              <span>Mermaid Diagrams</span>
            </button>

            <button 
              (click)="activeCategory.set('math')"
              [class.border-emerald-400]="activeCategory() === 'math'"
              [class.text-emerald-400]="activeCategory() === 'math'"
              [class.border-transparent]="activeCategory() !== 'math'"
              [class.text-slate-400]="activeCategory() !== 'math'"
              class="pb-2 text-xs font-semibold border-b-2 hover:text-slate-200 transition-colors flex items-center gap-1.5"
            >
              <span>📐</span>
              <span>LaTeX Math</span>
            </button>
          </div>

          <!-- Snippet List Body -->
          <div class="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
            @if (activeCategory() === 'markdown') {
              @for (item of markdownCheats; track item.title) {
                <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                  <div class="space-y-1">
                    <div class="text-xs font-bold text-slate-200">{{ item.title }}</div>
                    <pre class="text-[11px] font-mono text-sky-300 bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 whitespace-pre-wrap">{{ item.code }}</pre>
                  </div>
                  <button 
                    (click)="insert(item.code)"
                    class="self-end sm:self-center px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-black font-semibold text-xs transition-all shrink-0"
                  >
                    + Insert
                  </button>
                </div>
              }
            }

            @if (activeCategory() === 'mermaid') {
              @for (item of mermaidCheats; track item.title) {
                <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-purple-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                  <div class="space-y-1 flex-1">
                    <div class="text-xs font-bold text-purple-300">{{ item.title }}</div>
                    <pre class="text-[11px] font-mono text-slate-300 bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 whitespace-pre-wrap">{{ item.code }}</pre>
                  </div>
                  <button 
                    (click)="insert(item.code)"
                    class="self-end sm:self-center px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-black font-semibold text-xs transition-all shrink-0"
                  >
                    + Insert
                  </button>
                </div>
              }
            }

            @if (activeCategory() === 'math') {
              @for (item of mathCheats; track item.title) {
                <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                  <div class="space-y-1 flex-1">
                    <div class="text-xs font-bold text-emerald-300">{{ item.title }}</div>
                    <pre class="text-[11px] font-mono text-emerald-200 bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 whitespace-pre-wrap">{{ item.code }}</pre>
                  </div>
                  <button 
                    (click)="insert(item.code)"
                    class="self-end sm:self-center px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black font-semibold text-xs transition-all shrink-0"
                  >
                    + Insert
                  </button>
                </div>
              }
            }
          </div>

          <!-- Footer -->
          <div class="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
            <button 
              (click)="store.closeCheatSheetModal()" 
              class="px-4 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class CheatsheetModalComponent {
  store = inject(DocumentStoreService);
  activeCategory = signal<CheatCategory>('markdown');

  markdownCheats = [
    { title: 'Headings', code: '# Heading 1\n## Heading 2\n### Heading 3' },
    { title: 'Emphasis', code: '**Bold**  *Italic*  ~~Strikethrough~~  `Inline Code`' },
    { title: 'Checklists', code: '- [x] Completed task\n- [ ] Pending item' },
    { title: 'GitHub Alerts', code: '> [!NOTE]\n> Useful information\n\n> [!TIP]\n> Pro-tip highlight' },
    { title: 'Table', code: '| Feature | Support |\n| :--- | :---: |\n| Markdown | ✅ |\n| Mermaid | ✅ |' }
  ];

  mermaidCheats = [
    {
      title: 'Modern Styled Flowchart',
      code: '```mermaid\nflowchart LR\n    subgraph Ext["🌐 External"]\n        Client["Client App"]\n    end\n    subgraph Core["⚙️ Core Engine"]\n        API(["⚡ REST API"])\n        DB[("🗄️ Database")]\n    end\n    Client --> API\n    API --> DB\n    classDef ext fill:#1e1e38,stroke:#818cf8,stroke-width:1.5px,color:#e0e7ff;\n    class Client ext;\n```'
    },
    {
      title: 'C4 Architecture (Container)',
      code: '```mermaid\nC4Container\n    Person(user, "Customer")\n    System_Boundary(c1, "System Boundary") {\n        Container(spa, "Web App", "Angular")\n        Container(api, "API Layer", "Node/C#")\n        ContainerDb(db, "Database", "PostgreSQL")\n    }\n    Rel(user, spa, "Uses")\n    Rel(spa, api, "Calls", "HTTPS")\n    Rel(api, db, "Reads/Writes")\n```'
    },
    {
      title: 'Node Shapes Gallery',
      code: '```mermaid\nflowchart LR\n    A[Square Card] --> B(Rounded Box)\n    B --> C([Stadium / Pill])\n    C --> D[(Database / Queue)]\n    D --> E[[Subroutine]]\n    E --> F{{Hexagon}}\n```'
    },
    {
      title: 'Sequence Diagram',
      code: '```mermaid\nsequenceDiagram\n    autonumber\n    actor Client\n    participant API as ⚡ API Gateway\n    participant DB as 🗄️ Database\n    Client->>API: HTTP POST /items\n    activate API\n    API->>DB: INSERT item\n    DB-->>API: 201 Created\n    API-->>Client: Success JSON\n    deactivate API\n```'
    },
    {
      title: 'Entity Relationship (ERD)',
      code: '```mermaid\nerDiagram\n    USER ||--o{ ORDER : places\n    USER {\n        string id PK\n        string email\n    }\n    ORDER {\n        int orderId PK\n        decimal total\n    }\n```'
    },
    {
      title: 'State Machine Diagram',
      code: '```mermaid\nstateDiagram-v2\n    [*] --> Idle\n    Idle --> Running: Start Trigger\n    Running --> Paused: Pause\n    Paused --> Running: Resume\n    Running --> [*]: Completed\n```'
    },
    {
      title: 'Mindmap',
      code: '```mermaid\nmindmap\n  root((MDViewer))\n    Features\n      Mermaid Diagrams\n      LaTeX Math\n      Live Preview\n    Themes\n      Obsidian\n      GitHub Light\n      Dracula\n```'
    },
    {
      title: 'In-line Theme Directive',
      code: '```mermaid\n%%{init: {\'theme\': \'neutral\'}}%%\nflowchart LR\n    A[Step 1] --> B[Step 2] --> C[Step 3]\n```'
    }
  ];

  mathCheats = [
    { title: 'Fractions & Roots', code: '$$\nx = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\n$$' },
    { title: 'Summations & Integrals', code: '$$\n\\sum_{i=1}^{\\infty} \\frac{1}{i^2} = \\frac{\\pi^2}{6}, \\quad \\int_{0}^{\\pi} \\sin(x)\\,dx = 2\n$$' },
    { title: 'Matrix Bracket', code: '$$\n\\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}\n$$' }
  ];

  insert(code: string): void {
    const current = this.store.activeContent();
    this.store.updateContent(current + '\n\n' + code + '\n\n');
    this.store.closeCheatSheetModal();
  }
}
