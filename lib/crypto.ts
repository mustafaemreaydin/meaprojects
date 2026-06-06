import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "SETTINGS_ENCRYPTION_KEY tanımlı değil veya 32 byte (64 hex karakter) değil."
    );
  }
  return Buffer.from(hex, "hex");
}

export function encryptString(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decryptString(payload: string): string {
  const key = getKey();
  const [ivB, tagB, encB] = payload.split(":");
  if (!ivB || !tagB || !encB) throw new Error("Bozuk şifreli payload.");
  const iv = Buffer.from(ivB, "base64");
  const tag = Buffer.from(tagB, "base64");
  const enc = Buffer.from(encB, "base64");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

export function encryptJSON<T>(value: T): string {
  return encryptString(JSON.stringify(value));
}

export function decryptJSON<T>(payload: string): T {
  return JSON.parse(decryptString(payload)) as T;
}
