import test from 'node:test';
import assert from 'node:assert';
import { prisma } from '../../src/db/client.js';
import { buildTenantWhereClause } from '../../src/utils/authorization.js';

test('Case Model Database Unit Tests', async (t) => {
  let testOrgId = '';
  let testUserId = '';
  let testCaseId = '';

  await t.test('Setup: Create test Organization and User', async () => {
    const org = await prisma.organization.create({
      data: { name: `Test Chambers ${Date.now()}` },
    });
    testOrgId = org.id;

    const user = await prisma.user.create({
      data: {
        email: `advocate-case-test-${Date.now()}@chambers.com`,
        name: 'Case Test Advocate',
        organizationId: testOrgId,
        role: 'ADVOCATE',
      },
    });
    testUserId = user.id;
  });

  await t.test('Create Case: Inserts valid record with default ACTIVE status', async () => {
    const newCase = await prisma.case.create({
      data: {
        organizationId: testOrgId,
        title: 'State of Maharashtra vs. Rajesh Sharma',
        caseNumber: 'WP/2026/1042',
        cnrNumber: 'MHHC010023452026',
        court: 'Bombay High Court',
        judge: 'Hon. Justice K. R. Vyas',
        clientName: 'Rajesh Sharma',
        opposingParty: 'State of Maharashtra',
        caseType: 'Writ Petition',
        notes: 'Urgent stay application filed',
        createdBy: testUserId,
      },
    });

    testCaseId = newCase.id;
    assert.ok(newCase.id);
    assert.strictEqual(newCase.organizationId, testOrgId);
    assert.strictEqual(newCase.title, 'State of Maharashtra vs. Rajesh Sharma');
    assert.strictEqual(newCase.caseNumber, 'WP/2026/1042');
    assert.strictEqual(newCase.cnrNumber, 'MHHC010023452026');
    assert.strictEqual(newCase.status, 'ACTIVE');
    assert.strictEqual(newCase.createdBy, testUserId);
  });

  await t.test('Query Case: Scoped tenant lookup using buildTenantWhereClause', async () => {
    const whereClause = buildTenantWhereClause(testOrgId, { id: testCaseId });
    const foundCase = await prisma.case.findFirst({
      where: whereClause,
      include: {
        creator: true,
        organization: true,
      },
    });

    assert.ok(foundCase);
    assert.strictEqual(foundCase?.id, testCaseId);
    assert.strictEqual(foundCase?.organization.name.startsWith('Test Chambers'), true);
    assert.strictEqual(foundCase?.creator?.name, 'Case Test Advocate');
  });

  await t.test('Query Case by Case Number & CNR compound indexes', async () => {
    const caseByNumber = await prisma.case.findFirst({
      where: buildTenantWhereClause(testOrgId, { caseNumber: 'WP/2026/1042' }),
    });
    assert.ok(caseByNumber);
    assert.strictEqual(caseByNumber?.id, testCaseId);

    const caseByCNR = await prisma.case.findFirst({
      where: buildTenantWhereClause(testOrgId, { cnrNumber: 'MHHC010023452026' }),
    });
    assert.ok(caseByCNR);
    assert.strictEqual(caseByCNR?.id, testCaseId);
  });

  await t.test('Tenant Isolation: Querying case with another organizationId returns null', async () => {
    const otherOrg = await prisma.organization.create({
      data: { name: `Other Chambers ${Date.now()}` },
    });

    const isolatedResult = await prisma.case.findFirst({
      where: buildTenantWhereClause(otherOrg.id, { id: testCaseId }),
    });

    assert.strictEqual(isolatedResult, null);

    // Cleanup otherOrg
    await prisma.organization.delete({ where: { id: otherOrg.id } });
  });

  await t.test('Teardown: Cascade deletion of Organization removes test case', async () => {
    await prisma.organization.delete({ where: { id: testOrgId } });

    const deletedCase = await prisma.case.findUnique({
      where: { id: testCaseId },
    });
    assert.strictEqual(deletedCase, null);
  });
});
