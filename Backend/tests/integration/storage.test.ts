import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs/promises';
import { LocalStorageProvider } from '../../src/storage/LocalStorageProvider.js';

test('Storage Provider Multi-Tenant Isolation Integration Tests', async (t) => {
  const testBaseDir = path.join(process.cwd(), '.integration-storage');
  const provider = new LocalStorageProvider(testBaseDir, 'legal-documents-test');

  t.after(async () => {
    try {
      await fs.rm(testBaseDir, { recursive: true, force: true });
    } catch {
      // Cleanup fallback
    }
  });

  await t.test('Upload requires tenant organizationId', async () => {
    await assert.rejects(
      async () =>
        provider.uploadFile({
          organizationId: '',
          fileName: 'test.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('No Org ID'),
        }),
      /Tenant organizationId is required/
    );
  });

  await t.test('Multi-Tenant Isolation: Files stored in separate tenant directory hierarchies', async () => {
    const orgA = 'tenant-org-alpha';
    const orgB = 'tenant-org-beta';

    const fileA = await provider.uploadFile({
      organizationId: orgA,
      fileName: 'Alpha_Brief.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Alpha Secret Client Brief'),
    });

    const fileB = await provider.uploadFile({
      organizationId: orgB,
      fileName: 'Beta_Agreement.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Beta Secret Contract'),
    });

    assert.ok(fileA.storageKey.startsWith(`${orgA}/`));
    assert.ok(fileB.storageKey.startsWith(`${orgB}/`));
    assert.notStrictEqual(fileA.storageKey.split('/')[0], fileB.storageKey.split('/')[0]);

    const bufferA = await provider.getFileBuffer(fileA.storageKey);
    const bufferB = await provider.getFileBuffer(fileB.storageKey);

    assert.strictEqual(bufferA.toString(), 'Alpha Secret Client Brief');
    assert.strictEqual(bufferB.toString(), 'Beta Secret Contract');
  });
});
