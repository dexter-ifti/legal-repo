/**
 * Builds a strict tenant-scoped storage key shared by all cloud providers:
 * `${organizationId}/${folderPath}/${uniqueId}_${safeFileName}`
 */
export const buildTenantStorageKey = (
  organizationId: string,
  folder: string | undefined,
  fileName: string,
  uniqueId: string
): string => {
  if (!organizationId) {
    throw new Error('Tenant organizationId is required for storage upload');
  }

  const safeFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const folderPath = folder ? folder.trim() : 'documents';
  return `${organizationId}/${folderPath}/${uniqueId}_${safeFileName}`;
};
