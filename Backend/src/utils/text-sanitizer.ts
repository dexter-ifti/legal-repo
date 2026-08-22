/**
 * Removes characters PostgreSQL rejects in TEXT columns (NUL and other
 * control characters that leak in from binary PDF buffers or OCR output).
 * Newlines, tabs, and carriage returns are preserved.
 */
export function stripInvalidTextChars(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}
