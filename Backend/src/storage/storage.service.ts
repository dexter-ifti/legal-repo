import { IStorageProvider } from './StorageProvider.js';
import { SupabaseStorageProvider } from './SupabaseStorageProvider.js';

let activeProviderInstance: IStorageProvider | null = null;

/**
 * Returns the configured cloud storage provider (Supabase Storage).
 * Local disk storage is not supported: all legal documents must be
 * stored in private cloud object storage.
 */
export const getStorageProvider = (): IStorageProvider => {
  if (activeProviderInstance) {
    return activeProviderInstance;
  }

  const providerType = (process.env.STORAGE_PROVIDER || 'supabase').toLowerCase();
  if (providerType !== 'supabase') {
    throw new Error(
      `Unsupported STORAGE_PROVIDER "${providerType}". Only Supabase Storage ("supabase") is supported.`
    );
  }

  // Throws a clear configuration error if Supabase env vars are missing.
  activeProviderInstance = new SupabaseStorageProvider();

  return activeProviderInstance;
};

/**
 * Override the active storage provider (useful for testing or switching drivers at runtime).
 */
export const setStorageProvider = (provider: IStorageProvider | null): void => {
  activeProviderInstance = provider;
};

const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/**
 * Uploads a legal document buffer to private tenant object storage.
 * Fails closed on any storage error — there is no local fallback.
 */
export const uploadStorageObject = async (options: Parameters<IStorageProvider['uploadFile']>[0]) => {
  try {
    return await getStorageProvider().uploadFile(options);
  } catch (err: unknown) {
    throw new Error(`Storage upload failed on configured storage provider: ${errorMessage(err)}`);
  }
};

/**
 * Generates a private signed download URL with temporary expiration.
 */
export const getStorageSignedUrl = async (
  storageKey: string,
  expiresInSeconds?: number
): Promise<string> => {
  try {
    return await getStorageProvider().getSignedUrl(storageKey, expiresInSeconds);
  } catch (err: unknown) {
    throw new Error(
      `Storage signed URL generation failed on configured storage provider: ${errorMessage(err)}`
    );
  }
};

/**
 * Deletes an object from private storage.
 */
export const deleteStorageObject = async (storageKey: string): Promise<boolean> => {
  try {
    return await getStorageProvider().deleteFile(storageKey);
  } catch (err: unknown) {
    throw new Error(
      `Storage deletion failed on configured storage provider: ${errorMessage(err)}`
    );
  }
};

/**
 * Retrieves file buffer from private storage.
 */
export const getStorageFileBuffer = async (storageKey: string): Promise<Buffer> => {
  try {
    return await getStorageProvider().getFileBuffer(storageKey);
  } catch (err: unknown) {
    throw new Error(
      `Storage file retrieval failed on configured storage provider: ${errorMessage(err)}`
    );
  }
};
