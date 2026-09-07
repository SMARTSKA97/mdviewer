import { Injectable, signal, effect } from '@angular/core';
import { ThemeId, THEMES, ThemeOption } from '../models/theme.model';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'mdviewer_theme';
  
  readonly themes = THEMES;
  readonly currentTheme = signal<ThemeId>(this.getInitialTheme());

  constructor() {
    // Apply theme changes to document root
    effect(() => {
      const theme = this.currentTheme();
      this.applyTheme(theme);
    });
  }

  setTheme(theme: ThemeId): void {
    this.currentTheme.set(theme);
    try {
      localStorage.setItem(this.STORAGE_KEY, theme);
    } catch {
      // Ignore localStorage errors
    }
  }

  getThemeOption(id: ThemeId): ThemeOption {
    return this.themes.find(t => t.id === id) || this.themes[0];
  }

  private getInitialTheme(): ThemeId {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY) as ThemeId;
      if (saved && this.themes.some(t => t.id === saved)) {
        return saved;
      }
    } catch {
      // Fallback
    }
    return 'obsidian';
  }

  private applyTheme(theme: ThemeId): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    
    const themeOpt = this.getThemeOption(theme);
    if (themeOpt.isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }
}
