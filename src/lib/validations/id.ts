// Strict CUID validator. Use BEFORE composing filenames or any other path-sensitive
// operation. Prisma cuid() generates 24-char [a-z0-9] strings prefixed with 'c'.
const CUID_RE = /^c[a-z0-9]{20,28}$/i;

export function isValidCuid(s: unknown): s is string {
  return typeof s === "string" && CUID_RE.test(s);
}

// Sanitize a filename component — strips anything that's not alnum/dot/dash/underscore.
// Use as defense-in-depth even when the source was a CUID.
export function safeFilenameComponent(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64);
}
