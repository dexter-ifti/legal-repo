import test from 'node:test';
import assert from 'node:assert';
import { S3Client } from '@aws-sdk/client-s3';
import { R2StorageProvider } from '../../src/storage/R2StorageProvider.js';
import { StorageObjectNotFoundError } from '../../src/storage/errors.js';

/**
 * Real S3Client (needed by the presigner's config introspection) with a
 * stubbed `send` — no network access happens in these tests.
 */
function createMockS3Client() {
  const sent: Array<{ type: string; input: Record<string, unknown> }> = [];
  let getObjectError: { name?: string; message?: string } | null = null;

  const client: S3Client = new S3Client({
    region: 'auto',
    endpoint: 'https://test-account.r2.cloudflarestorage.com',
    credentials: { accessKeyId: 'test-key', secretAccessKey: 'test-secret' },
  });

  (client as unknown as { send: unknown }).send = async (
    command: { constructor: { name: string }; input: Record<string, unknown> }
  ) => {
    const type = command.constructor.name;
    sent.push({ type, input: command.input });

    if (type === 'GetObjectCommand') {
      if (getObjectError) throw getObjectError;
      return {
        Body: { transformToByteArray: async () => Array.from(new TextEncoder().encode('hello r2')) },
      };
    }
    return {};
  };

  return {
    client,
    setError(err: { name?: string; message?: string } | null) {
      getObjectError = err;
    },
    sent,
  };
}

const VALID_CONFIG = {
  accountId: 'test-account',
  accessKeyId: 'test-key',
  secretAccessKey: 'test-secret',
};

test('R2StorageProvider Unit Tests', async (t) => {
  await t.test('rejects construction without cloud credentials', () => {
    assert.throws(
      () => new R2StorageProvider({}, createMockS3Client().client as never),
      /R2_ACCOUNT_ID \/ R2_ACCESS_KEY_ID \/ R2_SECRET_ACCESS_KEY are not configured/
    );
  });

  await t.test('uploads with strict tenant-scoped keys and correct content type', async () => {
    const mock = createMockS3Client();
    const provider = new R2StorageProvider(VALID_CONFIG, mock.client as never);

    const result = await provider.uploadFile({
      organizationId: 'org-abc',
      fileName: 'Client Brief.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test'),
      folder: 'petitions',
    });

    assert.ok(result.storageKey.startsWith('org-abc/petitions/'));
    assert.ok(result.storageKey.endsWith('_Client_Brief.pdf'));
    assert.strictEqual(result.bucket, 'legal-documents');
    assert.strictEqual(result.mimeType, 'application/pdf');

    assert.strictEqual(mock.sent.length, 1);
    assert.strictEqual(mock.sent[0].type, 'PutObjectCommand');
    assert.strictEqual(mock.sent[0].input.ContentType, 'application/pdf');
    assert.strictEqual(mock.sent[0].input.Key, result.storageKey);
  });

  await t.test('requires tenant organizationId on upload', async () => {
    const mock = createMockS3Client();
    const provider = new R2StorageProvider(VALID_CONFIG, mock.client as never);

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
    assert.strictEqual(mock.sent.length, 0);
  });

  await t.test('generates presigned URLs with requested expiry', async () => {
    const mock = createMockS3Client();
    const provider = new R2StorageProvider(VALID_CONFIG, mock.client as never);

    const url = await provider.getSignedUrl('org-1/documents/u_file.pdf', 900);
    assert.ok(url.includes('org-1/documents/u_file.pdf'), `unexpected url: ${url}`);
    assert.ok(url.includes('X-Amz-Expires=900') || url.includes('exp'));
  });

  await t.test('deletes objects', async () => {
    const mock = createMockS3Client();
    const provider = new R2StorageProvider(VALID_CONFIG, mock.client as never);

    const deleted = await provider.deleteFile('org-1/documents/u_file.pdf');
    assert.strictEqual(deleted, true);
    assert.strictEqual(mock.sent[0].type, 'DeleteObjectCommand');
    assert.strictEqual(mock.sent[0].input.Key, 'org-1/documents/u_file.pdf');
  });

  await t.test('reads file buffers', async () => {
    const mock = createMockS3Client();
    const provider = new R2StorageProvider(VALID_CONFIG, mock.client as never);

    const buf = await provider.getFileBuffer('org-1/documents/u_file.pdf');
    assert.ok(buf.length > 0);
  });

  await t.test('throws StorageObjectNotFoundError for missing objects (NoSuchKey)', async () => {
    const mock = createMockS3Client();
    mock.setError({ name: 'NoSuchKey', message: 'The specified key does not exist.' });
    const provider = new R2StorageProvider(VALID_CONFIG, mock.client as never);

    try {
      await provider.getFileBuffer('org-1/documents/gone.pdf');
      assert.fail('Expected StorageObjectNotFoundError');
    } catch (err) {
      assert.ok(err instanceof StorageObjectNotFoundError);
      assert.strictEqual((err as StorageObjectNotFoundError).storageKey, 'org-1/documents/gone.pdf');
    }
  });

  await t.test('wraps other download errors as generic storage failures', async () => {
    const mock = createMockS3Client();
    mock.setError({ name: 'AccessDenied', message: ' Access Denied' });
    const provider = new R2StorageProvider(VALID_CONFIG, mock.client as never);

    await assert.rejects(
      async () => provider.getFileBuffer('missing/key.pdf'),
      /Failed to download file buffer/
    );
    await assert.rejects(
      async () => provider.getFileBuffer('missing/key.pdf'),
      (err: unknown) => !(err instanceof StorageObjectNotFoundError)
    );
  });
});
