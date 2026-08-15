import { IStorageProvider } from './StorageProvider.js';
import { LocalStorageProvider } from './LocalStorageProvider.js';
import { SupabaseStorageProvider } from './SupabaseStorageProvider.js';

let activeProviderInstance: IStorageProvider | null = null;

export const getStorageProvider = (): IStorageProvider => {
  if (activeProviderInstance) {
    return activeProviderInstance;
  }

  const providerType = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();

  if (providerType === 'supabase') {
    activeProviderInstance = new SupabaseStorageProvider();
  } else {
    activeProviderInstance = new LocalStorageProvider();
  }

  return activeProviderInstance;
};

/**
 * Override the active storage provider (useful for testing or switching drivers at runtime).
 */
export const setStorageProvider = (provider: IStorageProvider | null): void => {
  activeProviderInstance = provider;
};

/**
 * Uploads a legal document buffer to private tenant object storage.
 */
export const uploadStorageObject = (options: Parameters<IStorageProvider['uploadFile']>[0]) => {
  const provider = getStorageProvider();
  return provider.uploadFile(options);
};

/**
 * Generates a private signed download URL with temporary expiration.
 */
export const getStorageSignedUrl = (storageKey: string, expiresInSeconds?: number) => {
  const provider = getStorageProvider();
  return provider.getSignedUrl(storageKey, expiresInSeconds);
};

/**
 * Deletes an object from private storage.
 */
export const deleteStorageObject = (storageKey: string) => {
  const provider = getStorageProvider();
  return provider.deleteFile(storageKey);
};

/**
 * Retrieves file buffer from private storage.
 */
export const getStorageFileBuffer = (storageKey: string) => {
  const provider = getStorageProvider();
  return provider.getFileBuffer(storageKey);
};
