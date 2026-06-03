/**
 * Server-only AES-256-GCM helper for provider key encryption at rest.
 *
 * Wire format inside `provider_keys.key_encrypted` (bytea):
 *   [ 12-byte nonce ][ ciphertext ][ 16-byte auth tag ]
 *
 * The master key lives in env (`PIPELINE_ENCRYPTION_KEY`) as 32 bytes
 * base64-encoded (44 chars). Never log it, never ship it to the browser.
 *
 * Defense-in-depth notes:
 *   • This file MUST never be imported from a Client Component.
 *   • If we ever migrate to a KMS, replace `getMasterKey()` and the
 *     decrypt path stays unchanged.
 *   • Rotating the master key: re-encrypt every active provider_keys row
 *     under the new key, then atomically swap env vars + restart. (Out of
 *     scope for v1 — admin manually rotates per-provider keys instead.)
 */

import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const NONCE_LEN = 12;
const TAG_LEN = 16;

function getMasterKey(): Buffer {
  const b64 = process.env.PIPELINE_ENCRYPTION_KEY;
  if (!b64) {
    throw new Error(
      "PIPELINE_ENCRYPTION_KEY is not set. Generate one with " +
        "`node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"` " +
        "and add it to .env.local + your DO secrets."
    );
  }
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    throw new Error(`PIPELINE_ENCRYPTION_KEY must decode to 32 bytes, got ${key.length}`);
  }
  return key;
}

export function encryptString(plaintext: string): Buffer {
  const key = getMasterKey();
  const nonce = randomBytes(NONCE_LEN);
  const cipher = createCipheriv(ALGO, key, nonce);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([nonce, ct, tag]);
}

export function decryptToString(buf: Buffer | Uint8Array): string {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  if (b.length < NONCE_LEN + TAG_LEN) {
    throw new Error("Ciphertext too short to contain nonce + tag");
  }
  const key = getMasterKey();
  const nonce = b.subarray(0, NONCE_LEN);
  const tag = b.subarray(b.length - TAG_LEN);
  const ct = b.subarray(NONCE_LEN, b.length - TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

/** Convenience: last 4 chars of plaintext for UI display ("****a3f2"). */
export function last4Of(plaintext: string): string {
  return plaintext.length <= 4 ? plaintext : plaintext.slice(-4);
}
