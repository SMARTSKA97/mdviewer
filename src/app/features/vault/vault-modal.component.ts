import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EncryptionService } from '../../core/services/encryption.service';
import { SyncService } from '../../core/services/sync.service';

@Component({
  selector: 'app-vault-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
      <div 
        class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        (click)="closeModal()"
      >
        <div 
          class="w-full max-w-lg border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col select-none"
          style="background-color: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary);"
          (click)="$event.stopPropagation()"
        >
          <!-- Header Tabs (Vault Security / Local-First Sync) -->
          <div class="p-3 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <button 
                (click)="activeTab.set('vault')"
                [class.bg-slate-800]="activeTab() === 'vault'"
                [class.text-amber-400]="activeTab() === 'vault'"
                [class.text-slate-400]="activeTab() !== 'vault'"
                class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <span>🔒</span>
                <span>Vault Encryption</span>
              </button>

              <button 
                (click)="activeTab.set('sync')"
                [class.bg-slate-800]="activeTab() === 'sync'"
                [class.text-sky-400]="activeTab() === 'sync'"
                [class.text-slate-400]="activeTab() !== 'sync'"
                class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <span>🔄</span>
                <span>Local-First Sync</span>
              </button>
            </div>

            <button 
              (click)="closeModal()"
              class="text-slate-400 hover:text-white p-1 rounded-lg transition-colors text-xs font-mono"
            >
              ✕ ESC
            </button>
          </div>

          <!-- Body Container -->
          <div class="p-6 overflow-y-auto custom-scrollbar space-y-4">
            
            <!-- 1. VAULT ENCRYPTION TAB -->
            @if (activeTab() === 'vault') {
              <div class="space-y-4">
                <div class="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                  <span class="text-xl">🛡️</span>
                  <div>
                    <div class="font-bold">AES-256 Web Crypto Vault Protection</div>
                    <div class="text-[11px] text-amber-200/80">Encrypt your markdown notes with a master password directly in your browser.</div>
                  </div>
                </div>

                @if (!encryptionService.isVaultEncrypted()) {
                  <!-- Setup Password -->
                  <div class="space-y-3 pt-2">
                    <h4 class="text-xs font-bold text-slate-200">Set Master Vault Password</h4>
                    
                    <input 
                      type="password" 
                      [(ngModel)]="passwordInput" 
                      placeholder="Enter master password..."
                      class="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400"
                    />

                    <input 
                      type="password" 
                      [(ngModel)]="confirmPasswordInput" 
                      placeholder="Confirm master password..."
                      class="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400"
                    />

                    @if (errorMessage()) {
                      <div class="text-xs text-rose-400 font-mono">{{ errorMessage() }}</div>
                    }

                    <button 
                      (click)="setupVault()"
                      class="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow-lg transition-all"
                    >
                      Enable Vault Protection
                    </button>
                  </div>
                } @else if (encryptionService.isVaultLocked()) {
                  <!-- Unlock Vault -->
                  <div class="space-y-3 pt-2">
                    <h4 class="text-xs font-bold text-slate-200">Vault is Locked 🔒</h4>
                    <p class="text-xs text-slate-400">Enter master password to unlock vault contents.</p>

                    <input 
                      type="password" 
                      [(ngModel)]="passwordInput" 
                      (keydown.enter)="unlockVault()"
                      placeholder="Enter master password..."
                      class="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400"
                    />

                    @if (errorMessage()) {
                      <div class="text-xs text-rose-400 font-mono">{{ errorMessage() }}</div>
                    }

                    <button 
                      (click)="unlockVault()"
                      class="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow-lg transition-all"
                    >
                      Unlock Vault
                    </button>
                  </div>
                } @else {
                  <!-- Vault Active & Unlocked -->
                  <div class="space-y-4 pt-2">
                    <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span>🟢</span>
                        <span class="font-bold">Vault Unlocked & Active</span>
                      </div>
                      <span class="text-[10px] text-slate-400 font-mono">Auto-locks in 5 min idle</span>
                    </div>

                    <button 
                      (click)="encryptionService.lockVault()"
                      class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold text-xs rounded-xl border border-slate-700 transition-all"
                    >
                      Lock Vault Now 🔒
                    </button>
                  </div>
                }
              </div>
            }

            <!-- 2. LOCAL-FIRST SYNC TAB -->
            @if (activeTab() === 'sync') {
              <div class="space-y-4">
                <div class="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs flex items-center justify-between">
                  <div>
                    <div class="font-bold">Local-First Delta Sync Engine</div>
                    <div class="text-[10px] text-slate-400 font-mono mt-0.5">Device ID: {{ syncService.deviceId() }}</div>
                  </div>
                  <span class="px-2 py-1 rounded bg-sky-500/20 text-sky-300 text-[10px] font-mono uppercase font-bold border border-sky-500/30">
                    {{ syncService.syncStatus() }}
                  </span>
                </div>

                <!-- Export Sync Payload -->
                <div class="space-y-2">
                  <h4 class="text-xs font-bold text-slate-200">Export Device Sync Payload</h4>
                  <p class="text-[11px] text-slate-400">Generate JSON sync payload to sync notes across devices.</p>
                  
                  <button 
                    (click)="copySyncPayload()"
                    class="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all"
                  >
                    Copy Sync Payload JSON
                  </button>
                </div>

                <!-- Import Sync Payload -->
                <div class="space-y-2 pt-2 border-t border-slate-800">
                  <h4 class="text-xs font-bold text-slate-200">Import Remote Sync Payload</h4>
                  
                  <textarea 
                    [(ngModel)]="syncJsonInput" 
                    placeholder="Paste sync payload JSON here..."
                    class="w-full h-24 bg-slate-950 border border-slate-700/80 rounded-xl p-2.5 text-xs font-mono text-slate-200 placeholder-slate-600 outline-none focus:border-sky-500 resize-none"
                  ></textarea>

                  @if (syncMessage()) {
                    <div class="text-xs font-mono" [class.text-emerald-400]="!syncError()" [class.text-rose-400]="syncError()">
                      {{ syncMessage() }}
                    </div>
                  }

                  <button 
                    (click)="importSyncPayload()"
                    class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold text-xs rounded-xl border border-slate-700 transition-all"
                  >
                    Merge External Sync Payload (LWW Resolution)
                  </button>
                </div>
              </div>
            }

          </div>
        </div>
      </div>
    }
  `
})
export class VaultModalComponent {
  encryptionService = inject(EncryptionService);
  syncService = inject(SyncService);

  isOpen = signal<boolean>(false);
  activeTab = signal<'vault' | 'sync'>('vault');

  passwordInput = '';
  confirmPasswordInput = '';
  errorMessage = signal<string>('');

  syncJsonInput = '';
  syncMessage = signal<string>('');
  syncError = signal<boolean>(false);

  openModal(tab: 'vault' | 'sync' = 'vault'): void {
    this.activeTab.set(tab);
    this.isOpen.set(true);
    this.errorMessage.set('');
    this.syncMessage.set('');
    this.passwordInput = '';
    this.confirmPasswordInput = '';
  }

  closeModal(): void {
    this.isOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {
      this.closeModal();
    }
  }

  async setupVault(): Promise<void> {
    if (!this.passwordInput || this.passwordInput.length < 6) {
      this.errorMessage.set('Password must be at least 6 characters.');
      return;
    }

    if (this.passwordInput !== this.confirmPasswordInput) {
      this.errorMessage.set('Passwords do not match.');
      return;
    }

    await this.encryptionService.enableVaultEncryption(this.passwordInput);
    this.errorMessage.set('');
    this.closeModal();
  }

  async unlockVault(): Promise<void> {
    if (!this.passwordInput) {
      this.errorMessage.set('Please enter master password.');
      return;
    }

    const success = await this.encryptionService.unlockVault(this.passwordInput);
    if (success) {
      this.errorMessage.set('');
      this.closeModal();
    } else {
      this.errorMessage.set('Invalid master password.');
    }
  }

  copySyncPayload(): void {
    const json = this.syncService.exportSyncPayload();
    navigator.clipboard.writeText(json).then(() => {
      this.syncError.set(false);
      this.syncMessage.set('Sync payload copied to clipboard!');
    });
  }

  async importSyncPayload(): Promise<void> {
    if (!this.syncJsonInput.trim()) {
      this.syncError.set(true);
      this.syncMessage.set('Please paste JSON sync payload.');
      return;
    }

    try {
      const res = await this.syncService.importSyncPayload(this.syncJsonInput.trim());
      this.syncError.set(false);
      this.syncMessage.set(`Successfully merged ${res.mergedDocs} docs and ${res.mergedFolders} folders!`);
      this.syncJsonInput = '';
    } catch {
      this.syncError.set(true);
      this.syncMessage.set('Failed to parse or merge sync payload.');
    }
  }
}
