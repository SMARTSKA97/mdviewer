import { Injectable, signal, inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class EncryptionService {
  readonly isVaultEncrypted = signal<boolean>(false);
  readonly isVaultLocked = signal<boolean>(false);
  readonly vaultPassword = signal<string | null>(null);

  private autoLockTimer: any = null;

  constructor() {
    this.checkVaultState();
    this.setupInactivityListener();
  }

  private checkVaultState(): void {
    const saved = localStorage.getItem('mdviewer_vault_encrypted');
    if (saved === 'true') {
      this.isVaultEncrypted.set(true);
      this.isVaultLocked.set(true);
    }
  }

  /**
   * Derive AES-GCM key from password using PBKDF2
   */
  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt text using AES-GCM 256
   */
  async encryptText(text: string, password: string): Promise<string> {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(password, salt);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(text)
    );

    const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Decrypt AES-GCM ciphertext
   */
  async decryptText(encryptedBase64: string, password: string): Promise<string> {
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const data = combined.slice(28);

    const key = await this.deriveKey(password, salt);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return new TextDecoder().decode(decrypted);
  }

  /**
   * Set master password and enable vault encryption
   */
  async enableVaultEncryption(password: string): Promise<void> {
    this.vaultPassword.set(password);
    this.isVaultEncrypted.set(true);
    this.isVaultLocked.set(false);
    localStorage.setItem('mdviewer_vault_encrypted', 'true');
    this.resetAutoLockTimer();
  }

  /**
   * Unlock vault with master password
   */
  async unlockVault(password: string): Promise<boolean> {
    try {
      // Test password derivation
      const testEnc = await this.encryptText('vault-test-token', password);
      const testDec = await this.decryptText(testEnc, password);

      if (testDec === 'vault-test-token') {
        this.vaultPassword.set(password);
        this.isVaultLocked.set(false);
        this.resetAutoLockTimer();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Lock vault manually
   */
  lockVault(): void {
    this.vaultPassword.set(null);
    if (this.isVaultEncrypted()) {
      this.isVaultLocked.set(true);
    }
  }

  private resetAutoLockTimer(): void {
    if (this.autoLockTimer) clearTimeout(this.autoLockTimer);
    if (this.isVaultEncrypted() && !this.isVaultLocked()) {
      // Auto lock after 5 minutes (300,000 ms)
      this.autoLockTimer = setTimeout(() => {
        this.lockVault();
      }, 300000);
    }
  }

  private setupInactivityListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', () => this.resetAutoLockTimer());
      window.addEventListener('keydown', () => this.resetAutoLockTimer());
    }
  }
}
