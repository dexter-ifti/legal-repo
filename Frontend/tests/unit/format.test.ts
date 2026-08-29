import { describe, it, expect } from 'vitest';
import { formatFileSize, statusLabel, priorityLabel } from '../../lib/format';

describe('Frontend Formatting Utilities', () => {
  it('formatFileSize formats byte count correctly', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(2048)).toBe('2 KB');
    expect(formatFileSize(5242880)).toBe('5.0 MB');
  });

  it('statusLabel returns human-readable document status', () => {
    expect(statusLabel('uploaded')).toBe('Just uploaded');
    expect(statusLabel('processing')).toBe('Processing');
    expect(statusLabel('review')).toBe('Needs your review');
    expect(statusLabel('filed')).toBe('Filed automatically');
    expect(statusLabel('rejected')).toBe('Rejected');
  });

  it('priorityLabel capitalizes document priority', () => {
    expect(priorityLabel('high')).toBe('High');
    expect(priorityLabel('urgent')).toBe('Urgent');
  });
});
