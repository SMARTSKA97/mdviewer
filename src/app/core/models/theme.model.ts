export type ThemeId = 'obsidian' | 'github-light' | 'dracula' | 'nord' | 'emerald';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  isDark: boolean;
  accentColor: string;
  bgPreview: string;
  description: string;
}

export const THEMES: ThemeOption[] = [
  {
    id: 'obsidian',
    name: 'Obsidian Dark',
    isDark: true,
    accentColor: '#38bdf8',
    bgPreview: '#090d16',
    description: 'Sleek cyber obsidian dark theme with neon blue accents'
  },
  {
    id: 'github-light',
    name: 'GitHub Light',
    isDark: false,
    accentColor: '#0969da',
    bgPreview: '#ffffff',
    description: 'Clean, crisp GitHub markdown aesthetic'
  },
  {
    id: 'dracula',
    name: 'Dracula',
    isDark: true,
    accentColor: '#ff79c6',
    bgPreview: '#282a36',
    description: 'Classic vampire palette with purple and pink highlights'
  },
  {
    id: 'nord',
    name: 'Nord Frost',
    isDark: true,
    accentColor: '#88c0d0',
    bgPreview: '#2e3440',
    description: 'Arctic, north-bluish clean dark palette'
  },
  {
    id: 'emerald',
    name: 'Emerald Cyber',
    isDark: true,
    accentColor: '#10b981',
    bgPreview: '#061510',
    description: 'Deep matrix emerald green forest vibe'
  }
];
