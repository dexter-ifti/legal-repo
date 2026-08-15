import crypto from 'node:crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  IStorageProvider,
  UploadFileOptions,
  StorageObjectReference,
} from './StorageProvider.js';

export class SupabaseStorageProvider implements IStorageProvider {
  private client: SupabaseClient;
  private bucket: string;

  constructor(supabaseUrl?: string, supabaseKey?: string, bucket?: string) {
    const url = supabaseUrl || process.env.SUPABASE_URL || 'https://placeholder-url.supabase.co';
    const key = supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder-key';
    this.bucket = bucket || process.env.STORAGE_BUCKET || 'legal-documents';
    this.client = createClient(url, key);
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

    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(storageKey, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error('[SupabaseStorageProvider] Upload error details:', error);
      throw new Error(`Supabase Storage upload failed: ${error.message}`);
    }

    return {
      storageKey,
      bucket: this.bucket,
      fileName,
      mimeType,
      sizeBytes: buffer.length,
    };
  }

  async getSignedUrl(storageKey: string, expiresInSeconds: number = 3600): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(storageKey, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to generate signed URL for ${storageKey}: ${error?.message || 'Unknown error'}`);
    }

    return data.signedUrl;
  }

  async deleteFile(storageKey: string): Promise<boolean> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([storageKey]);

    if (error) {
      throw new Error(`Supabase Storage deletion failed: ${error.message}`);
    }

    return true;
  }

  async getFileBuffer(storageKey: string): Promise<Buffer> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .download(storageKey);

    if (error || !data) {
      throw new Error(`Failed to download file buffer for ${storageKey}: ${error?.message || 'Unknown error'}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
