/**
 * Cleanup tool for orphaned document records whose binary files no longer
 * exist in cloud storage (e.g. after the bucket was emptied out-of-band).
 *
 * Dry-run (default): lists every tenant-scoped document whose storage object
 * is missing. No data is modified.
 *
 * Delete mode: `npx tsx scripts/cleanup-missing-documents.ts --delete`
 * permanently removes the orphaned Document rows. DocumentMetadata rows are
 * removed via cascade; AuditEvents are preserved for auditability.
 *
 * Requires a working Supabase Storage configuration (SUPABASE_URL, keys).
 */
import 'dotenv/config';
import { prisma } from '../src/db/client.js';
import { getStorageFileBuffer } from '../src/storage/storage.service.js';
import { StorageObjectNotFoundError } from '../src/storage/errors.js';

const DELETE_MODE = process.argv.includes('--delete');

async function main() {
  const documents = await prisma.document.findMany({
    select: { id: true, organizationId: true, originalFilename: true, storageKey: true, uploadedAt: true },
    orderBy: { uploadedAt: 'desc' },
  });

  console.log(`Checking ${documents.length} document record(s) against cloud storage...\n`);

  const missing: Array<{ id: string; organizationId: string; originalFilename: string; storageKey: string }> = [];

  let verified = 0;
  for (const doc of documents) {
    try {
      // Full download is required because Supabase signed URLs don't verify existence.
      await getStorageFileBuffer(doc.storageKey);
    } catch (err) {
      if (err instanceof StorageObjectNotFoundError) {
        missing.push(doc);
        continue;
      }
      console.warn(
        `[SKIP] Could not verify ${doc.id} (${doc.originalFilename}): ${err instanceof Error ? err.message : err}`
      );
    }
    verified += 1;
    process.stdout.write(`\rVerified: ${verified}/${documents.length}`);
  }

  console.log('\n');

  if (missing.length === 0) {
    console.log('No orphaned documents found. Every DB record has a matching cloud object.');
    return;
  }

  console.log(`Found ${missing.length} orphaned document(s) with missing cloud objects:`);
  for (const doc of missing) {
    console.log(`  - [${doc.organizationId}] ${doc.originalFilename} (id=${doc.id}, key=${doc.storageKey})`);
  }

  if (!DELETE_MODE) {
    console.log('\nDry-run only. Re-run with --delete to remove these records permanently.');
    return;
  }

  let deleted = 0;
  for (const doc of missing) {
    try {
      await prisma.document.delete({ where: { id: doc.id } });
      deleted += 1;
    } catch (err) {
      console.error(`Failed to delete document ${doc.id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\nDeleted ${deleted} orphaned document record(s). Audit events were preserved.`);
}

main()
  .catch((err) => {
    console.error('Cleanup failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
