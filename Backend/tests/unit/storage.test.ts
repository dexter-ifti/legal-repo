import test from 'node:test';
import assert from 'node:assert';
import { buildTenantStorageKey } from '../../src/storage/storage-keys.js';
import {
  setStorageProvider,
  uploadStorageObject,
  getStorageSignedUrl,
  deleteStorageObject,
  getStorageFileBuffer,
} from '../../src/storage/storage.service.js';
import type {
  IStorageProvider,
  UploadFileOptions,
  StorageObjectReference,
} from '../../src/storage/StorageProvider.js';

/** In-memory fake provider used to test the storage facade without cloud access. */
class InMemoryStorageProvider implements IStorageProvider {
  private objects = new Map<string, Buffer>();

  async uploadFile(options: UploadFileOptions): Promise<StorageObjectReference> {
    const { organizationId, fileName, mimeType, buffer, folder } = options;
    if (!organizationId) {
      throw new Error('Tenant organizationId is required for storage upload');
    }
    const storageKey = buildTenantStorageKey(organizationId, folder, fileName, 'fixed-uuid');
    this.objects.set(storageKey, buffer);
    return { storageKey, bucket: 'test-bucket', fileName, mimeType, sizeBytes: buffer.length };
  }

  async getSignedUrl(storageKey: string): Promise<string> {
    if (!this.objects.has(storageKey)) throw new Error(`Storage object not found: ${storageKey}`);
    return `https://cloud.example.com/signed/${encodeURIComponent(storageKey)}?token=t&expires=123`;
  }

  async deleteFile(storageKey: string): Promise<boolean> {
    return this.objects.delete(storageKey);
  }

  async getFileBuffer(storageKey: string): Promise<Buffer> {
    const buf = this.objects.get(storageKey);
    if (!buf) throw new Error(`Storage object not found: ${storageKey}`);
    return buf;
  }
}

test('buildTenantStorageKey Unit Tests', () => {
  const key = buildTenantStorageKey('org-1', 'petitions', 'My Legal Doc.pdf', 'uuid-123');
  assert.strictEqual(key, 'org-1/petitions/uuid-123_My_Legal_Doc.pdf');

  // Defaults folder to documents and sanitizes unsafe filename characters
  assert.strictEqual(
    buildTenantStorageKey('org-1', undefined, '../../etc/passwd', 'u1'),
    'org-1/documents/u1_.._.._etc_passwd'
  );

  assert.throws(() => buildTenantStorageKey('', 'docs', 'a.pdf', 'u1'), /organizationId is required/);
});

test('storage.service facade (cloud-only) Unit Tests', async (t) => {
  const provider = new InMemoryStorageProvider();

  t.after(async () => {
    setStorageProvider(null);
  });

  await t.test('uses the active provider instance for all operations', async () => {
    setStorageProvider(provider);

    const upload = await uploadStorageObject({
      organizationId: 'org-facade-99',
      fileName: 'Order.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Facade Order'),
    });
    assert.ok(upload.storageKey.startsWith('org-facade-99/documents/'));

    const signedUrl = await getStorageSignedUrl(upload.storageKey);
    assert.ok(signedUrl.includes('token='));

    const buffer = await getStorageFileBuffer(upload.storageKey);
    assert.strictEqual(buffer.toString(), 'Facade Order');

    const deleted = await deleteStorageObject(upload.storageKey);
    assert.strictEqual(deleted, true);
  });

  await t.test('fails closed on provider errors with no local fallback', async () => {
    setStorageProvider(provider);

    await assert.rejects(
      async () => getStorageFileBuffer('missing/key.pdf'),
      /Storage file retrieval failed on configured storage provider/
    );
    await assert.rejects(
      async () => getStorageSignedUrl('missing/key.pdf'),
      /Storage signed URL generation failed/
    );
  });
});
