import { describe, beforeEach, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CommandService, CommandItem } from './command.service';
import { DocumentStoreService } from './document-store.service';
import { WorkspaceService } from './workspace.service';
import { IndexedDbDocumentRepository } from '../repositories/indexed-db-document.repository';

describe('CommandService', () => {
  let service: CommandService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CommandService,
        DocumentStoreService,
        WorkspaceService,
        IndexedDbDocumentRepository
      ]
    });
    service = TestBed.inject(CommandService);
  });

  it('should register default system commands', () => {
    const commands = service.commands();
    expect(commands.length).toBeGreaterThan(5);
    expect(commands.some(c => c.id === 'new-document')).toBe(true);
    expect(commands.some(c => c.id === 'global-search')).toBe(true);
  });

  it('should register custom command and allow execution', () => {
    let executed = false;
    const customCmd: CommandItem = {
      id: 'test-custom',
      title: 'Custom Command',
      category: 'Workspace',
      icon: '⚙️',
      action: () => { executed = true; }
    };

    service.registerCommand(customCmd);
    expect(service.commands().some(c => c.id === 'test-custom')).toBe(true);

    service.executeCommand('test-custom');
    expect(executed).toBe(true);
  });

  it('should search commands by title and category', () => {
    const results = service.searchCommands('Zen');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('toggle-zen-mode');
  });
});
