import {
  type BinaryLike,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const CLIENT_SECRET_PREFIX = "ab_cs_";
const CLIENT_SECRET_RANDOM_BYTES = 32;
const CLIENT_SECRET_SALT_BYTES = 16;
const CLIENT_SECRET_KEY_BYTES = 64;
const CLIENT_SECRET_MAX_BYTES = 256;
const CLIENT_SECRET_HASH_VERSION = "scrypt-v1";

const scryptAsync = promisify<BinaryLike, BinaryLike, number, Buffer>(scrypt);

export function generateOAuthClientId() {
  return randomUUID();
}

export function generateOAuthClientSecret() {
  return `${CLIENT_SECRET_PREFIX}${randomBytes(
    CLIENT_SECRET_RANDOM_BYTES,
  ).toString("base64url")}`;
}

export async function hashOAuthClientSecret(secret: string) {
  const salt = randomBytes(CLIENT_SECRET_SALT_BYTES);
  const derivedKey = await scryptAsync(secret, salt, CLIENT_SECRET_KEY_BYTES);

  return [
    CLIENT_SECRET_HASH_VERSION,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyOAuthClientSecret(
  secret: string,
  secretHash: string,
) {
  if (Buffer.byteLength(secret, "utf8") > CLIENT_SECRET_MAX_BYTES) {
    return false;
  }

  const parts = secretHash.split("$");
  if (parts.length !== 3 || parts[0] !== CLIENT_SECRET_HASH_VERSION) {
    return false;
  }

  const saltPart = parts[1];
  const keyPart = parts[2];
  if (!saltPart || !keyPart) {
    return false;
  }

  const salt = Buffer.from(saltPart, "base64url");
  const expectedKey = Buffer.from(keyPart, "base64url");
  if (
    salt.length !== CLIENT_SECRET_SALT_BYTES ||
    expectedKey.length !== CLIENT_SECRET_KEY_BYTES
  ) {
    return false;
  }

  const actualKey = await scryptAsync(secret, salt, CLIENT_SECRET_KEY_BYTES);
  return timingSafeEqual(expectedKey, actualKey);
}
