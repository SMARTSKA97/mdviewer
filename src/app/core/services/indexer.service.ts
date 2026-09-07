import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { DocumentStoreService } from './document-store.service';
import { FrontmatterService } from './frontmatter.service';
import { Document } from '../models/document.model';

export interface BacklinkEntry {
  sourceDocId: string;
  sourceTitle: string;
  targetTitle: string;
  snippet: string;
  line: number;
}

export interface UnlinkedEntry {
  sourceDocId: string;
  sourceTitle: string;
  targetTitle: string;
  snippet: string;
  line: number;
}

export interface TagIndexEntry {
  tag: string;
  count: number;
  documents: Document[];
}

@Injectable({
  providedIn: 'root'
})
export class IndexerService {
  private store = inject(DocumentStoreService);
  private frontmatterService = inject(FrontmatterService);

  // Link index signal derivations
  readonly backlinksIndex = computed<Map<string, BacklinkEntry[]>>(() => {
    const map = new Map<string, BacklinkEntry[]>();
    const docs = this.store.documents();

    for (const doc of docs) {
      if (doc.archived) continue;
      const lines = doc.content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const wikilinkRegex = /\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]/g;
        let match: RegExpExecArray | null;

        while ((match = wikilinkRegex.exec(line)) !== null) {
          const targetTitle = match[1].trim();
          const targetKey = targetTitle.toLowerCase().replace(/\.md$/, '');

          const entry: BacklinkEntry = {
            sourceDocId: doc.id,
            sourceTitle: doc.title,
            targetTitle,
            snippet: line.trim(),
            line: i + 1
          };

          if (!map.has(targetKey)) {
            map.set(targetKey, []);
          }
          map.get(targetKey)!.push(entry);
        }
      }
    }

    return map;
  });

  readonly unlinkedReferencesIndex = computed<Map<string, UnlinkedEntry[]>>(() => {
    const map = new Map<string, UnlinkedEntry[]>();
    const docs = this.store.documents();

    for (const targetDoc of docs) {
      if (targetDoc.archived) continue;
      const targetBaseTitle = targetDoc.title.replace(/\.md$/i, '').trim();
      if (targetBaseTitle.length < 3) continue; // Skip very short titles

      const targetKey = targetBaseTitle.toLowerCase();
      const targetRegex = new RegExp(`\\b${this.escapeRegExp(targetBaseTitle)}\\b`, 'gi');

      for (const sourceDoc of docs) {
        if (sourceDoc.id === targetDoc.id || sourceDoc.archived) continue;

        const lines = sourceDoc.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Skip lines that already contain [[Wikilink]]
          if (line.includes('[[')) continue;

          if (targetRegex.test(line)) {
            const entry: UnlinkedEntry = {
              sourceDocId: sourceDoc.id,
              sourceTitle: sourceDoc.title,
              targetTitle: targetDoc.title,
              snippet: line.trim(),
              line: i + 1
            };

            if (!map.has(targetKey)) {
              map.set(targetKey, []);
            }
            map.get(targetKey)!.push(entry);

            if (map.get(targetKey)!.length >= 5) break;
          }
        }
      }
    }

    return map;
  });

  readonly tagsIndex = computed<TagIndexEntry[]>(() => {
    const map = new Map<string, Document[]>();
    const docs = this.store.documents();

    for (const doc of docs) {
      if (doc.archived) continue;

      // Extract inline #tags (e.g. #project, #notes)
      const tagRegex = /(?:^|\s)#([a-zA-Z0-9_-]+)/g;
      let match: RegExpExecArray | null;
      const extractedTags = new Set<string>();

      while ((match = tagRegex.exec(doc.content)) !== null) {
        extractedTags.add(match[1].toLowerCase());
      }

      // Also parse tags from YAML frontmatter
      const { data } = this.frontmatterService.parse(doc.content);
      if (data && data['tags'] && Array.isArray(data['tags'])) {
        data['tags'].forEach((t: string) => extractedTags.add(String(t).toLowerCase().replace(/^#/, '')));
      }

      for (const tag of extractedTags) {
        if (!map.has(tag)) {
          map.set(tag, []);
        }
        map.get(tag)!.push(doc);
      }
    }

    const entries: TagIndexEntry[] = [];
    for (const [tag, docList] of map.entries()) {
      entries.push({
        tag,
        count: docList.length,
        documents: docList
      });
    }

    return entries.sort((a, b) => b.count - a.count);
  });

  getBacklinksForDocument(docTitle: string): BacklinkEntry[] {
    const key = docTitle.toLowerCase().replace(/\.md$/, '').trim();
    return this.backlinksIndex().get(key) || [];
  }

  getUnlinkedReferencesForDocument(docTitle: string): UnlinkedEntry[] {
    const key = docTitle.toLowerCase().replace(/\.md$/, '').trim();
    return this.unlinkedReferencesIndex().get(key) || [];
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
