/**
 * Wipes all rows from every table (children first to respect FK constraints).
 * Intended for local/dev end-to-end testing resets. NEVER point this at
 * production.
 *
 * Usage: npx tsx scripts/wipe-db.ts --yes
 * (--yes confirms; without it the script prints what it would delete)
 */
import 'dotenv/config';
import { prisma } from '../src/db/client.js';

const CONFIRMED = process.argv.includes('--yes');

// Children first to respect FK constraints
const MODELS = [
  'invite',
  'auditEvent',
  'documentMetadata',
  'document',
  'case',
  'user',
  'organization',
] as const;

async function main() {
  if (!CONFIRMED) {
    console.log('Dry-run: this will DELETE ALL ROWS from:', MODELS.join(', '));
    console.log('Run again with --yes to execute.');
    return;
  }

  for (const model of MODELS) {
    const result = await (prisma as unknown as Record<string, { deleteMany: () => Promise<{ count: number }> }>)[
      model
    ].deleteMany({});
    console.log(`${model}: deleted ${result.count}`);
  }

  console.log('All tables wiped.');
}

main()
  .catch((err) => {
    console.error('Wipe failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
