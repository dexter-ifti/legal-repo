import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

// Multer memory storage configuration (Max 50MB per legal document)
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Basic MIME type check
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE: Only PDF documents (.pdf) are supported.'));
    }
  },
}).single('file');

/**
 * Validates PDF file header / magic bytes (%PDF-) from memory buffer.
 */
export function validatePdfMagicBytes(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 5) return false;
  // %PDF- magic header hex representation: 25 50 44 46 2d
  const header = buffer.subarray(0, 5).toString('ascii');
  return header === '%PDF-';
}

/**
 * Express middleware checking single file upload presence & PDF magic bytes.
 */
export function requireValidPdfUpload(req: Request, res: Response, next: NextFunction): void {
  uploadMiddleware(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : 'File upload failed';
      res.status(400).json({
        error: {
          code: 'INVALID_FILE_UPLOAD',
          message,
        },
      });
      return;
    }

    if (!req.file || !req.file.buffer) {
      res.status(400).json({
        error: {
          code: 'MISSING_FILE',
          message: 'No PDF document file provided in request (field name "file" required).',
        },
      });
      return;
    }

    // Verify PDF Magic Bytes (%PDF-)
    if (!validatePdfMagicBytes(req.file.buffer)) {
      res.status(400).json({
        error: {
          code: 'INVALID_PDF_FORMAT',
          message: 'File content failed PDF magic byte validation (%PDF- header missing).',
        },
      });
      return;
    }

    next();
  });
}
