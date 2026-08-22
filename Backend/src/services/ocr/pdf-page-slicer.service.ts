import { PDFDocument } from 'pdf-lib';

/**
 * Slices a PDF buffer to its first `maxPages` pages.
 *
 * Used to bound OCR cost: legal documents carry their identifying
 * metadata (court, case number, parties) in the opening pages.
 * Never throws — on any slicing failure the original buffer is
 * returned so processing can proceed unblocked.
 */
export async function sliceFirstPages(pdfBuffer: Buffer, maxPages: number): Promise<Buffer> {
  if (!Number.isInteger(maxPages) || maxPages < 1 || !pdfBuffer || pdfBuffer.length === 0) {
    return pdfBuffer;
  }

  try {
    const source = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });

    if (source.getPageCount() <= maxPages) {
      return pdfBuffer;
    }

    const target = await PDFDocument.create();
    const pageIndices = Array.from({ length: maxPages }, (_, i) => i);
    const copiedPages = await target.copyPages(source, pageIndices);
    copiedPages.forEach((page) => target.addPage(page));

    const bytes = await target.save();
    return Buffer.from(bytes);
  } catch (err: unknown) {
    console.warn(
      '[PdfPageSlicer] Failed to slice PDF, falling back to full document:',
      err instanceof Error ? err.message : err
    );
    return pdfBuffer;
  }
}
