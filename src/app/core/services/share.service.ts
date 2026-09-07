import { Injectable } from '@angular/core';
import LZString from 'lz-string';

@Injectable({
  providedIn: 'root'
})
export class ShareService {
  private readonly HASH_PREFIX = '#doc=';

  /**
   * Compress markdown into a shareable URL hash
   */
  generateShareUrl(markdown: string, title?: string): string {
    const payload = JSON.stringify({
      t: title || 'Untitled',
      c: markdown
    });

    const compressed = LZString.compressToEncodedURIComponent(payload);
    const url = new URL(window.location.href);
    url.hash = `doc=${compressed}`;
    return url.toString();
  }

  /**
   * Decode shared document from URL hash if present
   */
  getSharedDocFromUrl(): { title: string; content: string } | null {
    if (typeof window === 'undefined') return null;

    const hash = window.location.hash;
    if (!hash || !hash.includes('doc=')) return null;

    try {
      const param = hash.split('doc=')[1];
      if (!param) return null;

      const decompressed = LZString.decompressFromEncodedURIComponent(param);
      if (!decompressed) return null;

      const parsed = JSON.parse(decompressed);
      return {
        title: parsed.t || 'Shared Document',
        content: parsed.c || ''
      };
    } catch (err) {
      console.warn('Failed to parse document from URL hash:', err);
      return null;
    }
  }

  /**
   * Clear the share hash from current URL without reloading
   */
  clearShareHash(): void {
    if (typeof window === 'undefined') return;
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}
