import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentStoreService } from '../../core/services/document-store.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="status-bar h-7 border-t px-3 flex items-center justify-between text-[11px] select-none z-20" style="background-color: var(--bg-secondary); border-color: var(--border-color); color: var(--text-muted);">
      <!-- Left: Auto-save & Status -->
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1.5" title="Changes are automatically persisted in your browser">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span class="text-slate-300">Auto-saved</span>
        </div>

        <div class="h-3 w-px bg-slate-800 hidden sm:block"></div>

        <div class="hidden sm:flex items-center gap-1 text-slate-500">
          <span>Mode:</span>
          <span class="text-slate-300 uppercase font-mono text-[10px]">{{ store.viewMode() }}</span>
        </div>
      </div>

      <!-- Right: Detailed Live Stats -->
      <div class="flex items-center gap-3 font-mono">
        <div class="flex items-center gap-1" title="Estimated reading time">
          <svg class="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="text-slate-300">{{ store.stats().readingTimeMin }} min read</span>
        </div>

        <div class="h-3 w-px bg-slate-800"></div>

        <div class="text-slate-300">
          <span>{{ store.stats().words }}</span> <span class="text-slate-500">words</span>
        </div>

        <div class="h-3 w-px bg-slate-800 hidden xs:block"></div>

        <div class="text-slate-300 hidden xs:block">
          <span>{{ store.stats().chars }}</span> <span class="text-slate-500">chars</span>
        </div>

        <div class="h-3 w-px bg-slate-800 hidden md:block"></div>

        <div class="text-slate-300 hidden md:block">
          <span>{{ store.stats().lines }}</span> <span class="text-slate-500">lines</span>
        </div>

        <div class="h-3 w-px bg-slate-800 hidden lg:block"></div>

        <!-- Cloudflare Pages Edge Badge -->
        <div class="hidden lg:flex items-center gap-1 text-sky-400/80 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20 text-[10px]" title="Hosted on Cloudflare Pages Global Edge">
          <svg class="w-3 h-3 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
          </svg>
          <span>Cloudflare Edge</span>
        </div>
      </div>
    </footer>
  `
})
export class StatusBarComponent {
  store = inject(DocumentStoreService);
  themeService = inject(ThemeService);
}
