import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
function encryptionKey(value = process.env.HUB_INTEGRATION_ENCRYPTION_KEY) {
  if (!value || !/^[a-f0-9]{64}$/i.test(value))
    throw new Error("Integration encryption is not configured");
  return Buffer.from(value, "hex");
}
export function seal(value: unknown, key?: string) {
  const nonce = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", encryptionKey(key), nonce);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return [nonce, cipher.getAuthTag(), ciphertext]
    .map((x) => x.toString("base64url"))
    .join(".");
}
export function unseal<T>(value: string, key?: string): T {
  const parts = value.split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted data");
  const [nonce, tag, ciphertext] = parts.map((v) =>
    Buffer.from(v, "base64url"),
  );
  if (nonce.length !== 12 || tag.length !== 16)
    throw new Error("Invalid encrypted data");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(key), nonce);
  decipher.setAuthTag(tag);
  return JSON.parse(
    Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
      "utf8",
    ),
  ) as T;
}
export function nonce() {
  return randomBytes(32).toString("base64url");
}
export function challenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}
export function equalState(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
