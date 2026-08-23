import 'dotenv/config';
import { prisma } from '../src/db/client.js';
const doc = await prisma.document.findFirst({
  where: { pipelineStage: { not: null } },
  orderBy: { updatedAt: 'desc' },
  include: { pages: true },
});
if (!doc) { console.log('no staged doc'); process.exit(0); }
console.log('status:', doc.processingStatus, '| kind:', JSON.parse(doc.discoveryJson || '{}'));
for (const p of doc.pages) {
  console.log(`page ${p.pageNumber}: method=${p.extractionMethod} words=${p.wordCount} printed=${p.printedPageNumber} err=${p.error?.slice(0,60)} raw=${p.rawText?.slice(0,50)}`);
}
await prisma.$disconnect();
