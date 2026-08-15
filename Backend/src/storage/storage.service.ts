import { IStorageProvider } from './StorageProvider.js';
import { LocalStorageProvider } from './LocalStorageProvider.js';
import { SupabaseStorageProvider } from './SupabaseStorageProvider.js';

let activeProviderInstance: IStorageProvider | null = null;
let fallbackProviderInstance: LocalStorageProvider | null = null;

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

const getFallbackProvider = (): LocalStorageProvider => {
  if (!fallbackProviderInstance) {
    fallbackProviderInstance = new LocalStorageProvider();
  }
  return fallbackProviderInstance;
};

/**
 * Override the active storage provider (useful for testing or switching drivers at runtime).
 */
export const setStorageProvider = (provider: IStorageProvider | null): void => {
  activeProviderInstance = provider;
};

/**
 * Uploads a legal document buffer to private tenant object storage.
 * Falls back to local storage if Supabase upload fails (e.g. offline/network issue).
 */
export const uploadStorageObject = async (options: Parameters<IStorageProvider['uploadFile']>[0]) => {
  const provider = getStorageProvider();
  try {
    return await provider.uploadFile(options);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[StorageService] Primary storage upload failed: ${errorMsg}. Falling back to LocalStorageProvider.`);
    return await getFallbackProvider().uploadFile(options);
  }
};

/**
 * Generates a private signed download URL with temporary expiration.
 */
export const getStorageSignedUrl = async (storageKey: string, expiresInSeconds?: number) => {
  const provider = getStorageProvider();
  try {
    return await provider.getSignedUrl(storageKey, expiresInSeconds);
  } catch (err: unknown) {
    console.warn(`[StorageService] Primary getSignedUrl failed for ${storageKey}. Attempting fallback.`);
    return await getFallbackProvider().getSignedUrl(storageKey, expiresInSeconds);
  }
};

/**
 * Deletes an object from private storage.
 */
export const deleteStorageObject = async (storageKey: string) => {
  const provider = getStorageProvider();
  try {
    return await provider.deleteFile(storageKey);
  } catch (err: unknown) {
    return await getFallbackProvider().deleteFile(storageKey);
  }
};

/**
 * Retrieves file buffer from private storage.
 */
export const getStorageFileBuffer = async (storageKey: string) => {
  const provider = getStorageProvider();
  try {
    return await provider.getFileBuffer(storageKey);
  } catch (err: unknown) {
    console.warn(`[StorageService] Primary getFileBuffer failed for ${storageKey}. Attempting fallback.`);
    return await getFallbackProvider().getFileBuffer(storageKey);
  }
};
