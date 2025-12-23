import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly keyLength = 32;
  private readonly encryptionAlgorithm = 'aes-256-cbc';
  private readonly logger = new Logger(EncryptionService.name);
  private readonly encryptionKey: string;


  constructor(private readonly configService: ConfigService) {
    this.encryptionKey = this.configService.getOrThrow<string>('ENCRYPTION_KEY');
  }

  async encrypt(text: string): Promise<string> {
    if (!text) {
      throw new Error('Text to encrypt cannot be empty');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.encryptionAlgorithm,
      Buffer.from(this.encryptionKey.padEnd(32, '0').substring(0, 32)),
      iv,
    );

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  async decrypt(encryptedText: string): Promise<string> {
    if (!encryptedText) {
      return '';
    }

    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');

    const decipher = crypto.createDecipheriv(
      this.encryptionAlgorithm,
      Buffer.from(this.encryptionKey.padEnd(32, '0').substring(0, 32)),
      iv,
    );

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate a secure random key for encryption
   * This is a utility method for generating encryption keys
   */
  generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a value using SHA-256 (for non-reversible hashing)
   */
  hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}