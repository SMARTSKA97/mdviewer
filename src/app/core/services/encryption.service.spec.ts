import { describe, beforeEach, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EncryptionService]
    });
    service = TestBed.inject(EncryptionService);
  });

  it('should encrypt and decrypt string content using AES-GCM 256', async () => {
    const originalText = '# Confidential Workspace Note\nTop secret content.';
    const password = 'SuperSecretVaultPassword123!';

    const encrypted = await service.encryptText(originalText, password);
    expect(encrypted).not.toBe(originalText);
    expect(encrypted.length).toBeGreaterThan(20);

    const decrypted = await service.decryptText(encrypted, password);
    expect(decrypted).toBe(originalText);
  });

  it('should fail decryption when given wrong password', async () => {
    const originalText = 'Secret note content';
    const password = 'CorrectPassword123';
    const wrongPassword = 'WrongPassword456';

    const encrypted = await service.encryptText(originalText, password);
    
    await expect(service.decryptText(encrypted, wrongPassword)).rejects.toThrow();
  });
});
