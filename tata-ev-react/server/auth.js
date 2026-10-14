// Password hashing (scrypt) and cookie login sessions. No extra packages.
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto'
import { db } from './db.js'

const SESSION_DAYS = 7
export const COOKIE = 'tev_sid'

export function hashPassword(pw) {
  const salt = randomBytes(16)
  const hash = scryptSync(pw, salt, 64)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

export function verifyPassword(pw, stored) {
  const [, saltHex, hashHex] = String(stored).split('$')
  if (!saltHex || !hashHex) return false
  const hash = scryptSync(pw, Buffer.from(saltHex, 'hex'), 64)
  const want = Buffer.from(hashHex, 'hex')
  return want.length === hash.length && timingSafeEqual(hash, want)
}

export function upsertUser({ email, password, role = 'viewer', name = null }) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    db.prepare('UPDATE users SET password_hash = ?, role = ?, name = coalesce(?, name) WHERE id = ?').run(hashPassword(password), role, name, existing.id)
    return 'updated'
  }
  db.prepare('INSERT INTO users (email, name, role, password_hash) VALUES (?, ?, ?, ?)').run(email, name, role, hashPassword(password))
  return 'created'
}

export function createLoginSession(userId) {
  const token = randomBytes(32).toString('hex')
  db.prepare('INSERT INTO login_sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, Date.now() + SESSION_DAYS * 864e5)
  return { token, maxAge: SESSION_DAYS * 864e5 }
}

export function userFromToken(token) {
  if (!token) return null
  const row = db.prepare(`
    SELECT u.id, u.email, u.name, u.role, s.expires_at FROM login_sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`).get(token)
  if (!row) return null
  if (row.expires_at < Date.now()) { db.prepare('DELETE FROM login_sessions WHERE token = ?').run(token); return null }
  return { id: row.id, email: row.email, name: row.name, role: row.role }
}

export function endLoginSession(token) {
  if (token) db.prepare('DELETE FROM login_sessions WHERE token = ?').run(token)
}

export function readCookie(req, name) {
  const h = req.headers.cookie || ''
  for (const part of h.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return null
}

// Basic brute-force protection: 8 failed logins per IP per 10 minutes
const fails = new Map()
export function tooManyAttempts(ip) {
  const now = Date.now()
  const list = (fails.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000)
  fails.set(ip, list)
  return list.length >= 8
}
export function noteFailure(ip) { fails.set(ip, [...(fails.get(ip) || []), Date.now()]) }
export function clearFailures(ip) { fails.delete(ip) }

// First start with no users: create an admin so you can sign in
if (db.prepare('SELECT count(*) AS n FROM users').get().n === 0) {
  const email = process.env.ADMIN_EMAIL || 'admin@tataev.local'
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe@123'
  upsertUser({ email, password, role: 'admin', name: 'Administrator' })
  console.log(`\n  Created first admin user:\n    email:    ${email}\n    password: ${password}\n  Change it with:  npm run user -- ${email} <new-password> admin\n`)
}
