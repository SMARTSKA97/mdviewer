export const SAMPLE_MARKDOWN = `# Welcome to MDViewer 🚀
> **MDViewer** is a high-speed, modern Markdown, Mermaid & Math studio built with Angular 22 & Tailwind CSS, hosted on Cloudflare Pages.

---

## ⚡ Supercharged Features

- [x] **Live Real-time Preview** with synchronized scrolling
- [x] **Mermaid.js v11 Diagrams** (Flowcharts, Sequences, Class Diagrams, State Diagrams)
- [x] **LaTeX Math** via KaTeX ($E = mc^2$ and block equations)
- [x] **Multi-Document Tabs** & Auto-Save
- [x] **Collapsible Outline / TOC** with instant jump-to-section
- [x] **Command Palette** (\`Ctrl+K\`)
- [x] **File System Access API** (Open & Save directly to disk)
- [ ] Real-time Peer-to-Peer Collab (Coming soon)

---

## 📊 Modern Architecture & Mermaid Diagrams

\`\`\`mermaid
flowchart LR
    subgraph Clients["🌐 External Clients & Apps"]
        direction TB
        PUB["📤 RabbitMQ Publisher<br/><small>Event Producer</small>"]
        WEB["🌐 REST Client / Webhook<br/><small>HTTPS Ingestion</small>"]
    end

    subgraph Core["⚡ Core Processing Engine"]
        direction TB
        MQ[("🐇 RabbitMQ Broker")]
        API(["⚡ REST API Gateway"])
        
        subgraph Engine["⚙️ Transaction Engine"]
            direction TB
            V1["• FluentValidation"]
            V2["• PostgreSQL CTE Procs"]
            V3["• Audit & ACK Tracking"]
        end
    end

    PUB <-->|"AMQP Exchanges"| MQ
    WEB <-->|"HTTP POST / GET"| API
    MQ --> Engine
    API --> Engine

    classDef client fill:#1e1e38,stroke:#818cf8,stroke-width:1.5px,color:#e0e7ff;
    classDef broker fill:#064e3b,stroke:#34d399,stroke-width:1.5px,color:#ecfdf5;
    classDef gateway fill:#1e293b,stroke:#38bdf8,stroke-width:1.5px,color:#f0f9ff;
    classDef proc fill:#18181b,stroke:#f59e0b,stroke-width:1.5px,color:#fef3c7;

    class PUB,WEB client;
    class MQ broker;
    class API gateway;
    class V1,V2,V3 proc;
\`\`\`

### 🔄 Interactive Sequence Flow
\`\`\`mermaid
sequenceDiagram
    autonumber
    actor User as 👤 User
    participant Editor as 📝 Editor
    participant Worker as ⚡ Reactive Worker
    participant Preview as 👁️ Live Preview
    
    User->>Editor: Types Markdown & Diagram
    Editor->>Worker: Debounced stream (80ms)
    activate Worker
    Worker->>Preview: Reactive DOM Patch
    deactivate Worker
    Preview-->>User: 60 FPS Visual Update
\`\`\`

---

## 📐 LaTeX Mathematics (KaTeX)

Here is an inline equation: $e^{i\\pi} + 1 = 0$ and the famous Gaussian normal distribution:

$$f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} \\exp\\left( -\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^{\\!2}\\right)$$

And matrix computation:

$$\\begin{bmatrix}
a & b \\\\
c & d
\\end{bmatrix}
\\begin{bmatrix}
x \\\\
y
\\end{bmatrix}
=
\\begin{bmatrix}
ax + by \\\\
cx + dy
\\end{bmatrix}$$

---

## 💡 GitHub Style Callouts

> [!NOTE]
> This editor uses Angular Signals for fine-grained reactivity. No full re-renders!

> [!TIP]
> Press \`Ctrl+K\` to open the command palette, or \`Ctrl+S\` to save directly to your local drive.

> [!IMPORTANT]
> The TOC sidebar on the left automatically discovers your headings and lets you jump anywhere!

> [!WARNING]
> Keep your diagrams valid syntax — if you make a typo, an error badge will guide you.

---

## 💻 Code Highlighting with 1-Click Copy

\`\`\`typescript
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  template: \`<h1>{{ title() }} - Words: {{ wordCount() }}</h1>\`
})
export class AppComponent {
  title = signal('MDViewer');
  content = signal('# Hello world');
  
  wordCount = computed(() => {
    return this.content().trim().split(/\\s+/).length;
  });
}
\`\`\`

\`\`\`python
# Fast Fibonacci with memoization
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n: int) -> int:
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)

print([fib(i) for i in range(10)])
\`\`\`

---

## 📋 Markdown Tables

| Feature | MDViewer | Standard Viewers |
| :--- | :---: | :---: |
| **Speed** | ⚡ Sub-millisecond | 🐢 Laggy |
| **Mermaid Diagrams** | ✅ Built-in v11 | ❌ Rare |
| **LaTeX Math** | ✅ KaTeX GPU-fast | ⚠️ Heavy MathJax |
| **Local File Direct Edit**| ✅ File System API | ❌ Upload only |
| **Edge Hosted** | ✅ Cloudflare Pages | ❌ Slow servers |

---

*Enjoy writing with MDViewer!* ✨
`;
