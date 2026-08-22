/**
 * Thrown when a storage object referenced by the database does not exist
 * in cloud storage (e.g. deleted out-of-band or provider-side data loss).
 */
export class StorageObjectNotFoundError extends Error {
  readonly storageKey: string;

  constructor(storageKey: string, details?: string) {
    super(`Storage object not found in cloud storage: ${storageKey}${details ? ` (${details})` : ''}`);
    this.name = 'StorageObjectNotFoundError';
    this.storageKey = storageKey;
  }
}
