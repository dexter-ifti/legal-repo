export interface UploadFileOptions {
  organizationId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  folder?: string;
}

export interface StorageObjectReference {
  storageKey: string;
  bucket: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface IStorageProvider {
  /**
   * Uploads a file buffer to private object storage.
   * Key format: `${organizationId}/${folder || 'documents'}/${uuid}_${fileName}`
   */
  uploadFile(options: UploadFileOptions): Promise<StorageObjectReference>;

  /**
   * Generates a temporary signed download URL for private object access.
   * Access requires valid tenant authorization prior to calling this method.
   */
  getSignedUrl(storageKey: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Deletes an object from private object storage.
   */
  deleteFile(storageKey: string): Promise<boolean>;

  /**
   * Fetches raw object file buffer from storage.
   */
  getFileBuffer(storageKey: string): Promise<Buffer>;
}
