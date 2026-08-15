import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs/promises';
import { LocalStorageProvider } from '../../src/storage/LocalStorageProvider.js';
import {
  getStorageProvider,
  setStorageProvider,
  uploadStorageObject,
  getStorageSignedUrl,
  deleteStorageObject,
} from '../../src/storage/storage.service.js';

test('Object Storage Abstraction Unit Tests', async (t) => {
  const testBaseDir = path.join(process.cwd(), '.test-storage');
  const provider = new LocalStorageProvider(testBaseDir, 'test-bucket');

  t.after(async () => {
    setStorageProvider(null);
    try {
      await fs.rm(testBaseDir, { recursive: true, force: true });
    } catch {
      // Cleanup fallback
    }
  });

  await t.test('LocalStorageProvider uploads file and enforces tenant-scoped key format', async () => {
    const orgId = 'org-tenant-12345';
    const sampleBuffer = Buffer.from('Legal Document Content Mock PDF');

    const result = await provider.uploadFile({
      organizationId: orgId,
      fileName: 'Petition_Draft.pdf',
      mimeType: 'application/pdf',
      buffer: sampleBuffer,
      folder: 'petitions',
    });

    assert.strictEqual(result.bucket, 'test-bucket');
    assert.strictEqual(result.fileName, 'Petition_Draft.pdf');
    assert.strictEqual(result.mimeType, 'application/pdf');
    assert.strictEqual(result.sizeBytes, sampleBuffer.length);
    assert.ok(result.storageKey.startsWith(`${orgId}/petitions/`));
    assert.ok(result.storageKey.endsWith('_Petition_Draft.pdf'));
  });

  await t.test('LocalStorageProvider generates temporary signed download URL', async () => {
    const orgId = 'org-tenant-12345';
    const sampleBuffer = Buffer.from('Affidavit Content');

    const upload = await provider.uploadFile({
      organizationId: orgId,
      fileName: 'Affidavit.pdf',
      mimeType: 'application/pdf',
      buffer: sampleBuffer,
    });

    const signedUrl = await provider.getSignedUrl(upload.storageKey, 1800);
    assert.ok(signedUrl.includes('/api/v1/storage/download/'));
    assert.ok(signedUrl.includes('token='));
    assert.ok(signedUrl.includes('expires='));
  });

  await t.test('LocalStorageProvider deletes uploaded file from disk', async () => {
    const orgId = 'org-tenant-12345';
    const sampleBuffer = Buffer.from('To Be Deleted');

    const upload = await provider.uploadFile({
      organizationId: orgId,
      fileName: 'Temp_Notice.pdf',
      mimeType: 'application/pdf',
      buffer: sampleBuffer,
    });

    const deleted = await provider.deleteFile(upload.storageKey);
    assert.strictEqual(deleted, true);

    await assert.rejects(
      async () => provider.getFileBuffer(upload.storageKey),
      /Storage object not found/
    );
  });

  await t.test('storage.service facade uses active provider instance', async () => {
    setStorageProvider(provider);
    assert.strictEqual(getStorageProvider(), provider);

    const upload = await uploadStorageObject({
      organizationId: 'org-facade-99',
      fileName: 'Order.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Facade Order'),
    });

    assert.ok(upload.storageKey.startsWith('org-facade-99/documents/'));

    const signedUrl = await getStorageSignedUrl(upload.storageKey);
    assert.ok(signedUrl.includes('token='));

    const deleted = await deleteStorageObject(upload.storageKey);
    assert.strictEqual(deleted, true);
  });
});
