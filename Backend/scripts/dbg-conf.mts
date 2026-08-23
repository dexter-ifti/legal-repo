import 'dotenv/config';
import { prisma } from '../src/db/client.js';
import { serializeForJson } from '../src/utils/api-response.js';

const meta = await prisma.documentMetadata.findFirst({
  where: { fieldName: 'case_number', source: { not: null } },
});
if (!meta) { console.log('no row'); process.exit(0); }
console.log('raw confidence:', typeof meta.confidence, meta.confidence?.toString());
const out = serializeForJson({ confidence: meta.confidence });
console.log('serialized:', typeof out.confidence, out.confidence);
console.log('math:', typeof (out.confidence as any * 100));
process.exit(0);
