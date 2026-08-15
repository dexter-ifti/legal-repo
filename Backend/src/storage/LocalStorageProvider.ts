import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  IStorageProvider,
  UploadFileOptions,
  StorageObjectReference,
} from './StorageProvider.js';

export class LocalStorageProvider implements IStorageProvider {
  private baseDir: string;
  private bucket: string;

  constructor(baseDir?: string, bucket?: string) {
    this.baseDir = baseDir || path.join(process.cwd(), '.storage');
    this.bucket = bucket || process.env.STORAGE_BUCKET || 'legal-documents-dev';
  }

  private getFilePath(storageKey: string): string {
    // Sanitize storage key to prevent directory traversal
    const safeKey = storageKey.replace(/\.\./g, '');
    return path.join(this.baseDir, this.bucket, safeKey);
  }

  async uploadFile(options: UploadFileOptions): Promise<StorageObjectReference> {
    const { organizationId, fileName, mimeType, buffer, folder } = options;

    if (!organizationId) {
      throw new Error('Tenant organizationId is required for storage upload');
    }

    const uniqueId = crypto.randomUUID();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const folderPath = folder ? folder.trim() : 'documents';
    
    // Strict tenant-scoped storage key format: `${organizationId}/${folderPath}/${uniqueId}_${safeFileName}`
    const storageKey = `${organizationId}/${folderPath}/${uniqueId}_${safeFileName}`;
    const filePath = this.getFilePath(storageKey);

    // Ensure parent directories exist
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Write file buffer to private disk location
    await fs.writeFile(filePath, buffer);

    return {
      storageKey,
      bucket: this.bucket,
      fileName,
      mimeType,
      sizeBytes: buffer.length,
    };
  }

  async getSignedUrl(storageKey: string, expiresInSeconds: number = 3600): Promise<string> {
    const filePath = this.getFilePath(storageKey);
    try {
      await fs.access(filePath);
    } catch {
      throw new Error(`Storage object not found: ${storageKey}`);
    }

    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    
    // Return simulated private signed URL for local development/test
    return `http://localhost:${process.env.PORT || 5000}/api/v1/storage/download/${encodeURIComponent(
      storageKey
    )}?token=${token}&expires=${expiresAt}`;
  }

  async deleteFile(storageKey: string): Promise<boolean> {
    const filePath = this.getFilePath(storageKey);
    try {
      await fs.unlink(filePath);
      return true;
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code === 'ENOENT') {
        return false;
      }
      throw err;
    }
  }

  async getFileBuffer(storageKey: string): Promise<Buffer> {
    const filePath = this.getFilePath(storageKey);
    try {
      return await fs.readFile(filePath);
    } catch {
      throw new Error(`Storage object not found: ${storageKey}`);
    }
  }
}
