import test from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { prisma } from '../../src/db/client.js';
import { buildTenantWhereClause } from '../../src/utils/authorization.js';

test('Document Model Database Unit Tests', async (t) => {
  let testOrgId = '';
  let testUserId = '';
  let testCaseId = '';
  let testDocumentId = '';

  const sampleSha256 = crypto
    .createHash('sha256')
    .update('Legal Petition Document Content 2026')
    .digest('hex');

  t.before(async () => {
    // Clean up any stale test orgs
    await prisma.organization.deleteMany({
      where: { name: { startsWith: 'Doc Test Org' } },
    });

    const org = await prisma.organization.create({
      data: { name: `Doc Test Org ${Date.now()}` },
    });
    testOrgId = org.id;

    const user = await prisma.user.create({
      data: {
        email: `doc-user-${Date.now()}@chambers.com`,
        name: 'Document Test User',
        role: 'ADMIN',
        organizationId: testOrgId,
      },
    });
    testUserId = user.id;

    const legalCase = await prisma.case.create({
      data: {
        title: 'Sharma vs. Union of India',
        organizationId: testOrgId,
        createdBy: testUserId,
      },
    });
    testCaseId = legalCase.id;
  });

  t.after(async () => {
    if (testOrgId) {
      await prisma.organization.delete({
        where: { id: testOrgId },
      }).catch(() => {});
    }
  });

  await t.test('Create Document: Supports "Upload First" with caseId null', async () => {
    const doc = await prisma.document.create({
      data: {
        organizationId: testOrgId,
        caseId: null, // Initial upload without case selection
        originalFilename: 'Writ_Petition_Draft_v1.pdf',
        storageKey: `${testOrgId}/documents/uuid_Writ_Petition_Draft_v1.pdf`,
        sha256: sampleSha256,
        uploadedBy: testUserId,
        processingStatus: 'UPLOADED',
        matchStatus: 'NOT_STARTED',
      },
    });

    assert.ok(doc.id);
    assert.strictEqual(doc.organizationId, testOrgId);
    assert.strictEqual(doc.caseId, null);
    assert.strictEqual(doc.originalFilename, 'Writ_Petition_Draft_v1.pdf');
    assert.strictEqual(doc.sha256, sampleSha256);
    assert.strictEqual(doc.processingStatus, 'UPLOADED');
    assert.strictEqual(doc.matchStatus, 'NOT_STARTED');

    testDocumentId = doc.id;
  });

  await t.test('Update Document: Associates unassigned document to a specific Case', async () => {
    const updated = await prisma.document.update({
      where: { id: testDocumentId },
      data: {
        caseId: testCaseId,
        processingStatus: 'FILED',
        matchStatus: 'AUTO_MATCHED',
      },
    });

    assert.strictEqual(updated.caseId, testCaseId);
    assert.strictEqual(updated.processingStatus, 'FILED');
    assert.strictEqual(updated.matchStatus, 'AUTO_MATCHED');
  });

  await t.test('Query Document: Fast lookup via compound index [organizationId, sha256]', async () => {
    const where = buildTenantWhereClause(testOrgId, { sha256: sampleSha256 });
    const found = await prisma.document.findFirst({ where });

    assert.ok(found);
    assert.strictEqual(found?.id, testDocumentId);
    assert.strictEqual(found?.sha256, sampleSha256);
  });

  await t.test('Tenant Isolation: Querying document with another organizationId returns null', async () => {
    const otherOrgId = crypto.randomUUID();
    const where = buildTenantWhereClause(otherOrgId, { id: testDocumentId });
    const found = await prisma.document.findFirst({ where });

    assert.strictEqual(found, null);
  });

  await t.test('Teardown: Deleting organization cascade-deletes associated documents', async () => {
    await prisma.organization.delete({
      where: { id: testOrgId },
    });
    testOrgId = '';

    const foundDoc = await prisma.document.findUnique({
      where: { id: testDocumentId },
    });

    assert.strictEqual(foundDoc, null);
  });
});
