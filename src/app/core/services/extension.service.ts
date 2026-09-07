import { Injectable, signal, computed, inject } from '@angular/core';
import { CommandService, CommandItem } from './command.service';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  commands?: CommandItem[];
}

@Injectable({
  providedIn: 'root'
})
export class ExtensionService {
  private commandService = inject(CommandService);

  private registry = signal<PluginManifest[]>([]);

  readonly plugins = computed(() => this.registry());

  registerPlugin(plugin: PluginManifest): void {
    const current = this.registry();
    if (current.some(p => p.id === plugin.id)) return;

    this.registry.set([...current, plugin]);

    // Register plugin commands into global CommandService
    if (plugin.commands && plugin.commands.length > 0) {
      plugin.commands.forEach(cmd => this.commandService.registerCommand(cmd));
    }
  }

  unregisterPlugin(id: string): void {
    this.registry.set(this.registry().filter(p => p.id !== id));
  }
}
