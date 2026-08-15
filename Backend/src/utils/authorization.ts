export class TenantAccessDeniedError extends Error {
  public statusCode: number;
  public errorCode: string;

  constructor(message = 'Access denied: tenant mismatch or insufficient permissions', statusCode = 403, errorCode = 'FORBIDDEN') {
    super(message);
    this.name = 'TenantAccessDeniedError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export function assertTenantOwnership(
  resourceOrgId: string | null | undefined,
  requestOrgId: string | null | undefined,
  resourceName = 'Resource'
): void {
  if (!requestOrgId) {
    throw new TenantAccessDeniedError('Organization identity missing in request', 403, 'TENANT_REQUIRED');
  }

  if (!resourceOrgId || resourceOrgId !== requestOrgId) {
    throw new TenantAccessDeniedError(`${resourceName} not found or access denied`, 404, 'NOT_FOUND');
  }
}

export function buildTenantWhereClause<T extends Record<string, unknown>>(
  requestOrgId: string,
  filter?: T
): T & { organizationId: string } {
  if (!requestOrgId) {
    throw new TenantAccessDeniedError('Organization identity required for database query', 403, 'TENANT_REQUIRED');
  }

  return {
    ...(filter || ({} as T)),
    organizationId: requestOrgId,
  };
}

export function hasRolePermission(userRole: string | undefined, allowedRoles: string[]): boolean {
  if (!userRole) {
    return false;
  }
  return allowedRoles.includes(userRole);
}
