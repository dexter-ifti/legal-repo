import test from 'node:test';
import assert from 'node:assert';
import {
  assertTenantOwnership,
  buildTenantWhereClause,
  hasRolePermission,
  TenantAccessDeniedError,
} from '../../src/utils/authorization.js';

test('Authorization Foundation Unit Tests', async (t) => {
  await t.test('assertTenantOwnership passes when resourceOrgId matches requestOrgId', () => {
    assert.doesNotThrow(() => {
      assertTenantOwnership('org-123', 'org-123', 'Case');
    });
  });

  await t.test('assertTenantOwnership throws TenantAccessDeniedError (404) when tenant mismatch', () => {
    assert.throws(
      () => {
        assertTenantOwnership('org-diff-456', 'org-123', 'Document');
      },
      (err: unknown) => {
        return (
          err instanceof TenantAccessDeniedError &&
          err.statusCode === 404 &&
          err.errorCode === 'NOT_FOUND' &&
          err.message.includes('Document not found')
        );
      }
    );
  });

  await t.test('assertTenantOwnership throws TenantAccessDeniedError (403) when requestOrgId missing', () => {
    assert.throws(
      () => {
        assertTenantOwnership('org-123', '', 'Case');
      },
      (err: unknown) => {
        return (
          err instanceof TenantAccessDeniedError &&
          err.statusCode === 403 &&
          err.errorCode === 'TENANT_REQUIRED'
        );
      }
    );
  });

  await t.test('buildTenantWhereClause injects organizationId into query filter', () => {
    const filter = { caseNumber: 'CAS/2026/001', status: 'ACTIVE' };
    const scopedWhere = buildTenantWhereClause('org-123', filter);

    assert.strictEqual(scopedWhere.organizationId, 'org-123');
    assert.strictEqual(scopedWhere.caseNumber, 'CAS/2026/001');
    assert.strictEqual(scopedWhere.status, 'ACTIVE');
  });

  await t.test('buildTenantWhereClause works with undefined filter', () => {
    const scopedWhere = buildTenantWhereClause('org-123');
    assert.strictEqual(scopedWhere.organizationId, 'org-123');
  });

  await t.test('hasRolePermission evaluates role inclusion correctly', () => {
    assert.strictEqual(hasRolePermission('ADMIN', ['ADMIN', 'ADVOCATE']), true);
    assert.strictEqual(hasRolePermission('CLERK', ['ADMIN', 'ADVOCATE']), false);
    assert.strictEqual(hasRolePermission(undefined, ['ADMIN']), false);
  });
});
