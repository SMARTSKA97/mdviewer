import { Injectable, inject } from '@angular/core';
import { DocumentStoreService } from './document-store.service';

export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  getContent(): string;
}

@Injectable({
  providedIn: 'root'
})
export class TemplateService {
  private store = inject(DocumentStoreService);

  readonly templates: NoteTemplate[] = [
    {
      id: 'daily',
      name: 'Daily Note',
      description: 'Daily journal, task checklist & notes log',
      icon: '📅',
      getContent: () => {
        const today = new Date().toISOString().split('T')[0];
        return `# Daily Note — ${today}

## 🎯 Today's Top Priorities
- [ ] 

## 📋 Task Checklist
- [ ] Review pending code PRs
- [ ] Update project documentation

## 📝 Notes & Observations

## 💡 Ideas & Reflections
`;
      }
    },
    {
      id: 'meeting',
      name: 'Meeting Note',
      description: 'Structured meeting agenda & action items',
      icon: '🤝',
      getContent: () => {
        const today = new Date().toISOString().split('T')[0];
        return `# Meeting Note: [Topic]

**Date**: ${today}  
**Attendees**:  

---

## 📌 Agenda
1. Architecture Review
2. Next Sprint Commitments

## 📝 Key Discussion Points
- 

## ⚡ Action Items
- [ ] 
`;
      }
    },
    {
      id: 'project',
      name: 'Project Plan',
      description: 'Comprehensive project roadmap & goals',
      icon: '🚀',
      getContent: () => {
        return `# Project Plan: [Project Name]

> **Objective**: High-level goal statement.

---

## 🎯 Key Milestones
- [ ] **Phase 1**: Initial Foundation
- [ ] **Phase 2**: Core Feature Rollout
- [ ] **Phase 3**: Testing & Launch

## 🛠️ Architecture & Tech Stack

## 📊 Risks & Dependencies
`;
      }
    },
    {
      id: 'book',
      name: 'Book Notes',
      description: 'Book summary, key takeaways & quotes',
      icon: '📚',
      getContent: () => {
        return `# Book Notes: [Title]

**Author**:   
**Category**:   
**Rating**: ⭐⭐⭐⭐⭐  

---

## 💡 Key Takeaways
1. 

## 💬 Favorite Quotes
> 

## 📓 Chapter Summaries
### Chapter 1: 
`;
      }
    }
  ];

  createFromTemplate(templateId: string): string {
    const template = this.templates.find(t => t.id === templateId) || this.templates[0];
    const content = template.getContent();
    const title = `${template.name} - ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.md`;
    return this.store.createNewTab(title, content);
  }
}
