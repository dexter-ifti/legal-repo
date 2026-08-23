import crypto from 'node:crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as s3GetSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  IStorageProvider,
  UploadFileOptions,
  StorageObjectReference,
} from './StorageProvider.js';
import { buildTenantStorageKey } from './storage-keys.js';
import { StorageObjectNotFoundError } from './errors.js';

/**
 * Cloudflare R2 storage provider (S3-compatible API).
 *
 * Required environment:
 *   R2_ACCOUNT_ID       — Cloudflare account ID (builds the endpoint)
 *   R2_ACCESS_KEY_ID    — R2 API token access key
 *   R2_SECRET_ACCESS_KEY— R2 API token secret
 *   R2_BUCKET           — bucket name (default: legal-documents)
 */
export class R2StorageProvider implements IStorageProvider {
  private client: S3Client;
  private bucket: string;
  private readonly presignExpiryDefault = 3600;

  constructor(
    config?: { accountId?: string; accessKeyId?: string; secretAccessKey?: string; bucket?: string },
    client?: S3Client
  ) {
    const accountId = config?.accountId || process.env.R2_ACCOUNT_ID;
    const accessKeyId = config?.accessKeyId || process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = config?.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY;
    this.bucket = config?.bucket || process.env.R2_BUCKET || 'legal-documents';

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'Cloud storage is required but R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY are not configured.'
      );
    }

    this.client =
      client ??
      new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
  }

  async uploadFile(options: UploadFileOptions): Promise<StorageObjectReference> {
    const { organizationId, fileName, mimeType, buffer, folder } = options;

    // Strict tenant-scoped storage key: `${organizationId}/${folder}/${uuid}_${safeName}`
    const storageKey = buildTenantStorageKey(organizationId, folder, fileName, crypto.randomUUID());

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType,
      })
    );

    return {
      storageKey,
      bucket: this.bucket,
      fileName,
      mimeType,
      sizeBytes: buffer.length,
    };
  }

  async getSignedUrl(storageKey: string, expiresInSeconds: number = this.presignExpiryDefault): Promise<string> {
    try {
      return await s3GetSignedUrl(
        this.client,
        new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }),
        { expiresIn: expiresInSeconds }
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to generate signed URL for ${storageKey}: ${message}`);
    }
  }

  async deleteFile(storageKey: string): Promise<boolean> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey })
    );
    return true;
  }

  async getFileBuffer(storageKey: string): Promise<Buffer> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: storageKey })
      );

      if (!result.Body) {
        throw new Error('Empty response body');
      }

      const bytes = await result.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch (err: unknown) {
      const name = (err as { name?: string }).name;
      // AWS SDK signals missing objects with the NoSuchKey error name.
      if (name === 'NoSuchKey') {
        throw new StorageObjectNotFoundError(storageKey);
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to download file buffer for ${storageKey}: ${message}`);
    }
  }
}
