import test from 'node:test';
import assert from 'node:assert';
import { SupabaseStorageProvider } from '../../src/storage/SupabaseStorageProvider.js';

/** Minimal mock of the Supabase storage client surface used by the provider. */
function createMockSupabaseClient() {
  const calls = {
    upload: [] as Array<{ storageKey: string; options: unknown }>,
    remove: [] as string[][],
  };
  let downloadError: { message: string } | null = null;

  const client = {
    storage: {
      from: () => ({
        upload: async (storageKey: string, _buffer: Buffer, options: unknown) => {
          calls.upload.push({ storageKey, options });
          return { error: null };
        },
        createSignedUrl: async (storageKey: string, expiresInSeconds: number) => {
          if (!storageKey) return { error: { message: 'missing key' } };
          return {
            data: { signedUrl: `https://cloud.example.com/signed/${storageKey}?exp=${expiresInSeconds}` },
            error: null,
          };
        },
        remove: async (keys: string[]) => {
          calls.remove.push(keys);
          return { error: null };
        },
        download: async () => {
          if (downloadError) return { data: null, error: downloadError };
          return { data: { arrayBuffer: async () => new TextEncoder().encode('hello').buffer }, error: null };
        },
      }),
    },
    setDownloadError(err: { message: string }) {
      downloadError = err;
    },
    calls,
  };

  return client;
}

test('SupabaseStorageProvider Unit Tests', async (t) => {
  await t.test('rejects construction without cloud credentials', () => {
    assert.throws(
      () =>
        new SupabaseStorageProvider(undefined, undefined, undefined, createMockSupabaseClient() as never),
      /Cloud storage is required/
    );
  });

  await t.test('uploads with strict tenant-scoped keys and correct content type', async () => {
    const mock = createMockSupabaseClient();
    const provider = new SupabaseStorageProvider(
      'https://example.supabase.co',
      'service-key',
      'legal-documents-test',
      mock as never
    );

    const result = await provider.uploadFile({
      organizationId: 'org-abc',
      fileName: 'Client Brief.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test'),
      folder: 'petitions',
    });

    assert.ok(result.storageKey.startsWith('org-abc/petitions/'));
    assert.ok(result.storageKey.endsWith('_Client_Brief.pdf'));
    assert.strictEqual(result.bucket, 'legal-documents-test');
    assert.strictEqual(mock.calls.upload.length, 1);
    assert.deepStrictEqual(mock.calls.upload[0].options, {
      contentType: 'application/pdf',
      upsert: false,
    });
  });

  await t.test('requires tenant organizationId on upload', async () => {
    const mock = createMockSupabaseClient();
    const provider = new SupabaseStorageProvider(
      'https://example.supabase.co',
      'service-key',
      undefined,
      mock as never
    );

    await assert.rejects(
      async () =>
        provider.uploadFile({
          organizationId: '',
          fileName: 'a.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('x'),
        }),
      /organizationId is required/
    );
    assert.strictEqual(mock.calls.upload.length, 0);
  });

  await t.test('generates signed URLs and deletes objects', async (t3) => {
    const mock = createMockSupabaseClient();
    const provider = new SupabaseStorageProvider(
      'https://example.supabase.co',
      'service-key',
      undefined,
      mock as never
    );

    const url = await provider.getSignedUrl('org-1/documents/u_file.pdf', 900);
    assert.ok(url.includes('exp=900'));

    const deleted = await provider.deleteFile('org-1/documents/u_file.pdf');
    assert.strictEqual(deleted, true);
    assert.deepStrictEqual(mock.calls.remove, [['org-1/documents/u_file.pdf']]);

    await t3.test('surfaces errors when download fails', async () => {
      const failingMock = createMockSupabaseClient();
      failingMock.setDownloadError({ message: 'object not found' });
      const failingProvider = new SupabaseStorageProvider(
        'https://example.supabase.co',
        'service-key',
        undefined,
        failingMock as never
      );
      await assert.rejects(
        async () => failingProvider.getFileBuffer('missing/key.pdf'),
        /Failed to download file buffer/
      );
    });
  });
});
