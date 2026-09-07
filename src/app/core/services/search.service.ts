import { Injectable, inject } from '@angular/core';
import { DocumentStoreService } from './document-store.service';
import { WorkspaceService } from './workspace.service';

export interface SearchResult {
  documentId: string;
  title: string;
  matchType: 'title' | 'content' | 'tag';
  snippet: string;
  line?: number;
  folderPath?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private store = inject(DocumentStoreService);
  private workspaceService = inject(WorkspaceService);

  search(rawQuery: string): SearchResult[] {
    const query = rawQuery.trim().toLowerCase();
    if (!query) return [];

    const results: SearchResult[] = [];
    const activeDocs = this.workspaceService.activeDocuments();
    const foldersMap = new Map(this.workspaceService.folders().map(f => [f.id, f.name]));

    for (const doc of activeDocs) {
      const folderName = doc.parentId ? foldersMap.get(doc.parentId) : 'Root';

      // 1. Title Match
      if (doc.title.toLowerCase().includes(query)) {
        results.push({
          documentId: doc.id,
          title: doc.title,
          matchType: 'title',
          snippet: doc.title,
          folderPath: folderName
        });
      }

      // 2. Tag Match
      if (doc.tags && doc.tags.some(t => t.toLowerCase().includes(query))) {
        results.push({
          documentId: doc.id,
          title: doc.title,
          matchType: 'tag',
          snippet: `Tags: ${doc.tags.join(', ')}`,
          folderPath: folderName
        });
      }

      // 3. Content Full-Text Match
      const lines = doc.content.split('\n');
      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const lineText = lines[lineIdx];
        if (lineText.toLowerCase().includes(query)) {
          const start = Math.max(0, lineText.toLowerCase().indexOf(query) - 30);
          const end = Math.min(lineText.length, start + 80);
          const snippet = (start > 0 ? '...' : '') + lineText.substring(start, end) + (end < lineText.length ? '...' : '');

          results.push({
            documentId: doc.id,
            title: doc.title,
            matchType: 'content',
            snippet,
            line: lineIdx + 1,
            folderPath: folderName
          });

          // Limit to max 3 matches per document content
          if (results.filter(r => r.documentId === doc.id && r.matchType === 'content').length >= 3) {
            break;
          }
        }
      }
    }

    return results;
  }
}
