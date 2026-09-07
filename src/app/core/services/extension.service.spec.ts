import { describe, beforeEach, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ExtensionService, PluginManifest } from './extension.service';
import { CommandService } from './command.service';
import { DocumentStoreService } from './document-store.service';
import { WorkspaceService } from './workspace.service';
import { IndexedDbDocumentRepository } from '../repositories/indexed-db-document.repository';

describe('ExtensionService', () => {
  let extService: ExtensionService;
  let cmdService: CommandService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ExtensionService,
        CommandService,
        DocumentStoreService,
        WorkspaceService,
        IndexedDbDocumentRepository
      ]
    });
    extService = TestBed.inject(ExtensionService);
    cmdService = TestBed.inject(CommandService);
  });

  it('should register custom extension plugin and hook commands', () => {
    let executed = false;
    const plugin: PluginManifest = {
      id: 'plugin-lorem',
      name: 'Lorem Generator',
      version: '1.0.0',
      commands: [
        {
          id: 'lorem-insert',
          title: 'Insert Lorem Ipsum',
          category: 'Editor',
          icon: '📝',
          action: () => { executed = true; }
        }
      ]
    };

    extService.registerPlugin(plugin);
    expect(extService.plugins().length).toBe(1);

    cmdService.executeCommand('lorem-insert');
    expect(executed).toBe(true);
  });
});
