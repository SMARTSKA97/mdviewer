import { Injectable } from '@angular/core';

export interface ParsedFrontmatter {
  data: Record<string, any>;
  body: string;
  hasFrontmatter: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FrontmatterService {
  /**
   * Parse YAML frontmatter from document text
   */
  parse(content: string): ParsedFrontmatter {
    if (!content || !content.startsWith('---')) {
      return { data: {}, body: content || '', hasFrontmatter: false };
    }

    const endIdx = content.indexOf('\n---', 3);
    if (endIdx === -1) {
      return { data: {}, body: content, hasFrontmatter: false };
    }

    const yamlBlock = content.substring(3, endIdx).trim();
    const body = content.substring(endIdx + 4).trimStart();
    const data: Record<string, any> = {};

    const lines = yamlBlock.split('\n');
    let currentKey: string | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (trimmed.includes(':')) {
        const parts = trimmed.split(':');
        const key = parts[0].trim();
        const rawVal = parts.slice(1).join(':').trim();

        if (rawVal === '') {
          currentKey = key;
          data[key] = [];
        } else if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
          const items = rawVal.substring(1, rawVal.length - 1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
          data[key] = items;
          currentKey = null;
        } else {
          const cleanVal = rawVal.replace(/^['"]|['"]$/g, '');
          data[key] = cleanVal;
          currentKey = null;
        }
      } else if (trimmed.startsWith('- ') && currentKey && Array.isArray(data[currentKey])) {
        const itemVal = trimmed.substring(2).trim().replace(/^['"]|['"]$/g, '');
        data[currentKey].push(itemVal);
      }
    }

    return { data, body, hasFrontmatter: true };
  }

  /**
   * Stringify properties object back into YAML frontmatter + body
   */
  stringify(data: Record<string, any>, body: string): string {
    const keys = Object.keys(data);
    if (keys.length === 0) return body;

    const lines: string[] = ['---'];
    for (const key of keys) {
      const val = data[key];
      if (Array.isArray(val)) {
        lines.push(`${key}:`);
        val.forEach(item => lines.push(`  - ${item}`));
      } else {
        lines.push(`${key}: ${val}`);
      }
    }
    lines.push('---');
    lines.push('');
    lines.push(body.trimStart());

    return lines.join('\n');
  }

  /**
   * Update or insert property into document frontmatter
   */
  updateProperty(content: string, key: string, value: any): string {
    const { data, body } = this.parse(content);
    if (value === undefined || value === null || value === '') {
      delete data[key];
    } else {
      data[key] = value;
    }
    return this.stringify(data, body);
  }
}
