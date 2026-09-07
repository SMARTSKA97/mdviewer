import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  /**
   * Open a Markdown / text file from user's local disk
   */
  async openLocalFile(): Promise<{ title: string; content: string; handle?: any } | null> {
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'Markdown Files',
              accept: {
                'text/markdown': ['.md', '.markdown', '.mdown', '.mkdn', '.mdx'],
                'text/plain': ['.txt']
              }
            }
          ],
          multiple: false
        });

        const file = await handle.getFile();
        const content = await file.text();
        return {
          title: this.sanitizeFilename(file.name, 'document.md'),
          content,
          handle
        };
      } catch (err: any) {
        if (err.name === 'AbortError') return null;
        console.warn('File picker error, falling back to input:', err);
      }
    }

    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.md,.markdown,.mdown,.txt,.mdx';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        const content = await file.text();
        resolve({
          title: this.sanitizeFilename(file.name, 'document.md'),
          content
        });
      };
      input.click();
    });
  }

  /**
   * Save content directly back to existing file handle or trigger Save As
   */
  async saveFile(content: string, title: string, existingHandle?: any): Promise<{ title: string; handle?: any }> {
    const baseTitle = this.sanitizeFilename(title, 'document');
    const filename = baseTitle.endsWith('.md') ? baseTitle : `${baseTitle}.md`;

    if (existingHandle && 'createWritable' in existingHandle) {
      try {
        const writable = await existingHandle.createWritable();
        await writable.write(content);
        await writable.close();
        return { title: filename, handle: existingHandle };
      } catch (err) {
        console.warn('Direct file save failed, falling back to Save As:', err);
      }
    }

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: 'Markdown Document',
              accept: { 'text/markdown': ['.md'] }
            }
          ]
        });

        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();

        const file = await handle.getFile();
        return { title: this.sanitizeFilename(file.name, filename), handle };
      } catch (err: any) {
        if (err.name === 'AbortError') return { title: filename, handle: existingHandle };
      }
    }

    this.downloadTextFile(filename, content, 'text/markdown;charset=utf-8');
    return { title: filename, handle: existingHandle };
  }

  /**
   * Fetch raw markdown from a URL / GitHub raw link
   */
  async fetchFromUrl(url: string): Promise<string> {
    let fetchUrl = url;
    if (url.includes('github.com') && url.includes('/blob/')) {
      fetchUrl = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }

    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch markdown from URL (HTTP ${response.status})`);
    }
    return await response.text();
  }

  /**
   * Sanitize filename to ASCII safe string without illegal filesystem characters
   */
  sanitizeFilename(name: string, defaultName: string = 'document'): string {
    if (!name || !name.trim()) return defaultName;

    // Extract base name if path
    const base = name.split(/[/\\]/).pop() || name;

    // Normalize unicode characters to safe ASCII
    const normalized = base
      .replace(/[\u2014\u2013]/g, '-')   // em-dash, en-dash -> hyphen
      .replace(/[\u2018\u2019]/g, "'")   // smart single quotes
      .replace(/[\u201C\u201D]/g, '"')   // smart double quotes
      .replace(/[^\x20-\x7E]/g, '')      // keep safe ASCII range only
      .replace(/[\/\\:*?"<>|]/g, '_')    // replace Windows forbidden chars
      .replace(/\s+/g, '_')              // replace whitespace with underscore
      .replace(/^_+|_+$/g, '')           // trim leading/trailing underscores
      .trim();

    return normalized || defaultName;
  }

  /**
   * Universal document saver for Blobs / Binary files (.docx, .pdf, .html, .md):
   * Uses native Windows File System Save Picker when available with guaranteed extension,
   * falling back to anchor download.
   */
  async saveOrDownloadBlob(filename: string, blob: Blob, extension: string, description: string): Promise<void> {
    const cleanName = this.sanitizeFilename(filename, `document${extension}`);

    // 1. Try Native Windows File System Save Picker
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const mimeBase = blob.type.split(';')[0] || 'application/octet-stream';
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: cleanName,
          types: [
            {
              description: description,
              accept: { [mimeBase]: [extension] }
            }
          ]
        });

        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return; // User cancelled
        console.warn('showSaveFilePicker failed, falling back to direct download:', err);
      }
    }

    // 2. Direct anchor download fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cleanName;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 60000);
  }

  /**
   * Download a text/document file to the user's computer with guaranteed filename and extension.
   */
  downloadTextFile(filename: string, content: string, mimeType: string = 'text/markdown;charset=utf-8'): void {
    const blob = new Blob([content], { type: mimeType });
    const extMatch = filename.match(/\.[a-zA-Z0-9]+$/);
    const ext = extMatch ? extMatch[0] : '.txt';
    this.saveOrDownloadBlob(filename, blob, ext, 'Document');
  }
}
