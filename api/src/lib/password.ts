import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

const SCRYPT_KEYLEN = 64

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN)
  const hash = derived.toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password: string, storedHash: string) {
  const [scheme, salt, hash] = storedHash.split('$')
  if (scheme !== 'scrypt' || !salt || !hash) {
    return false
  }
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN)
  const hashBuffer = Buffer.from(hash, 'hex')
  if (hashBuffer.length !== derived.length) {
    return false
  }
  return timingSafeEqual(hashBuffer, derived)
}
