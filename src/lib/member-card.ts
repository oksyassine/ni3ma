// Membership card QR payload. Encodes the minimal info the attendance
// kiosk needs to identify the member without a network round-trip
// (the kiosk scans and the server-side validator re-resolves the
// member id from the signed token). The token is signed with HMAC-SHA256
// over the payload, so a member can't forge a card for someone else.
//
// Format: {tenantId}.{memberId}.{registrationNumber}.{hmac16}
// - tenantId: which tenant (for cross-tenant safety on the kiosk)
// - memberId + registrationNumber (so the kiosk can show name instantly)
// - hmac16: first 16 bytes of HMAC-SHA256(payload, CARD_SIGNING_SECRET)
//   hex-encoded. 16 bytes (32 hex chars) is plenty to prevent brute-force
//   at kiosk scale (each scan is local + offline-capable).

import { createHash, createHmac } from "node:crypto";

export function buildCardQrPayload(input: {
  memberId: string;
  registrationNumber: number;
  name: string;
  // Tenant id is derived from the request host at sign time by callers
  // — we don't have access to the prisma facade here. Pass via opts.
  tenantId?: string;
}): string {
  const tenantId = input.tenantId ?? "0";
  const payload = `${tenantId}.${input.memberId}.${input.registrationNumber}`;
  const secret = process.env.CARD_SIGNING_SECRET ?? "ni3ma-dev-card-secret-change-me";
  const sig = createHmac("sha256", secret).update(payload).digest("hex").slice(0, 32);
  return `${payload}.${sig}`;
}

/** Validate a card QR payload's signature. Returns the parsed fields or null. */
export function verifyCardQrPayload(payload: string): {
  tenantId: string;
  memberId: string;
  registrationNumber: number;
} | null {
  const parts = payload.split(".");
  if (parts.length !== 4) return null;
  const [tenantId, memberId, regStr, sig] = parts;
  const expectedSig = createHmac("sha256", process.env.CARD_SIGNING_SECRET ?? "ni3ma-dev-card-secret-change-me")
    .update(`${tenantId}.${memberId}.${regStr}`)
    .digest("hex")
    .slice(0, 32);
  // Constant-time comparison on hex strings (same length enforced).
  if (sig.length !== expectedSig.length) return null;
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  if (mismatch !== 0) return null;
  const registrationNumber = Number(regStr);
  if (!Number.isInteger(registrationNumber)) return null;
  return { tenantId, memberId, registrationNumber };
}

/** Quick visual check for the card designer (1-letter hash for the avatar). */
export function avatarInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed[0].toUpperCase();
}

/** Stable short hash for color generation in the card. */
export function colorFromId(id: string): string {
  const h = createHash("sha1").update(id).digest("hex").slice(0, 6);
  return `#${h}`;
}
