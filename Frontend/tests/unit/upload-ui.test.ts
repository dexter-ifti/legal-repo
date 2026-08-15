import { describe, it, expect } from 'vitest';

export function validateUploadFile(file: { type: string; size: number; name: string }) {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    return { valid: false, error: 'INVALID_TYPE', message: 'Only PDF legal documents (.pdf) are supported.' };
  }

  const isUnderLimit = file.size <= 50 * 1024 * 1024;
  if (!isUnderLimit) {
    return { valid: false, error: 'FILE_TOO_LARGE', message: 'File exceeds maximum 50MB limit.' };
  }

  return { valid: true, error: null, message: 'Valid file' };
}

export function formatUploadPayload(file: File, caseId?: string, documentType?: string) {
  const formData = new Map<string, unknown>();
  formData.set('file', file.name);

  // Upload First principle: caseId is optional
  if (caseId && caseId !== 'unassigned') {
    formData.set('caseId', caseId);
  }

  if (documentType) {
    formData.set('documentType', documentType);
  }

  return {
    hasCase: formData.has('caseId'),
    targetCaseId: formData.get('caseId') || null,
    documentType: formData.get('documentType') || 'UNCLASSIFIED',
  };
}

describe('Frontend Upload UI Component Logic Tests', () => {
  it('validateUploadFile accepts valid PDF files under 50MB', () => {
    const validFile = { name: 'Court_Notice_2026.pdf', type: 'application/pdf', size: 2 * 1024 * 1024 };
    const res = validateUploadFile(validFile);
    expect(res.valid).toBe(true);
    expect(res.error).toBeNull();
  });

  it('validateUploadFile rejects non-PDF file formats', () => {
    const txtFile = { name: 'Legal_Brief.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1024 };
    const res = validateUploadFile(txtFile);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('INVALID_TYPE');
  });

  it('validateUploadFile rejects PDF files exceeding 50MB limit', () => {
    const hugeFile = { name: 'Heavy_Evidence_Scan.pdf', type: 'application/pdf', size: 55 * 1024 * 1024 };
    const res = validateUploadFile(hugeFile);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('FILE_TOO_LARGE');
  });

  it('formatUploadPayload enforces Upload First principle (unassigned caseId)', () => {
    const fakeFile = new File(['%PDF-1.4'], 'Unassigned_Brief.pdf', { type: 'application/pdf' });
    const payload = formatUploadPayload(fakeFile, 'unassigned', 'PETITION');

    expect(payload.hasCase).toBe(false);
    expect(payload.targetCaseId).toBeNull();
    expect(payload.documentType).toBe('PETITION');
  });

  it('formatUploadPayload correctly attaches optional target caseId when selected', () => {
    const fakeFile = new File(['%PDF-1.4'], 'Case_Assigned_Brief.pdf', { type: 'application/pdf' });
    const payload = formatUploadPayload(fakeFile, 'case-uuid-123', 'NOTICE');

    expect(payload.hasCase).toBe(true);
    expect(payload.targetCaseId).toBe('case-uuid-123');
  });
});
