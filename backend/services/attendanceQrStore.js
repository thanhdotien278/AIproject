const crypto = require('crypto');

const TTL_MS = 30_000;
const CLEANUP_INTERVAL_MS = 60_000;
const EXPIRED_GRACE_MS = 2 * 60_000;

// token -> { token, conferenceCode, createdAt, expiresAt }
const tokenStore = new Map();

// conferenceCode:windowStart -> token
const windowIndex = new Map();

function nowMs() {
  return Date.now();
}

function getTtlMs(ttlMs) {
  const parsed = Number(ttlMs);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : TTL_MS;
}

function getWindowStartMs(now = nowMs(), ttlMs = TTL_MS) {
  const activeTtlMs = getTtlMs(ttlMs);
  return Math.floor(now / activeTtlMs) * activeTtlMs;
}

function makeWindowKey(conferenceCode, windowStartMs, ttlMs) {
  return `${conferenceCode || 'all'}:${windowStartMs}:${getTtlMs(ttlMs)}`;
}

function createToken() {
  return crypto.randomBytes(16).toString('hex');
}

function cleanupExpired(now = nowMs()) {
  for (const [token, record] of tokenStore.entries()) {
    if (!record) {
      tokenStore.delete(token);
      continue;
    }
    if (record.expiresAt + EXPIRED_GRACE_MS <= now) tokenStore.delete(token);
  }
  for (const [key, token] of windowIndex.entries()) {
    const record = tokenStore.get(token);
    if (!record || record.expiresAt <= now) windowIndex.delete(key);
  }
}

function getOrCreateActiveToken({
  conferenceCode = 'all',
  now = nowMs(),
  ttlMs = TTL_MS,
  maxExpiresAt,
} = {}) {
  const activeTtlMs = getTtlMs(ttlMs);
  const windowStartMs = getWindowStartMs(now, activeTtlMs);
  const key = makeWindowKey(conferenceCode, windowStartMs, activeTtlMs);
  const existingToken = windowIndex.get(key);
  const existingRecord = existingToken ? tokenStore.get(existingToken) : null;

  if (existingRecord && existingRecord.expiresAt > now) {
    return existingRecord;
  }

  const token = createToken();
  const createdAt = windowStartMs;
  const configuredExpiresAt = windowStartMs + activeTtlMs;
  const expiresAt = Number.isFinite(maxExpiresAt)
    ? Math.min(configuredExpiresAt, maxExpiresAt)
    : configuredExpiresAt;
  const record = { token, conferenceCode, createdAt, expiresAt, ttlMs: activeTtlMs };

  tokenStore.set(token, record);
  windowIndex.set(key, token);
  cleanupExpired(now);

  return record;
}

function validateToken(token, { now = nowMs() } = {}) {
  if (!token || typeof token !== 'string') {
    return { ok: false, code: 'missing_token' };
  }

  const record = tokenStore.get(token);
  if (!record) {
    return { ok: false, code: 'unknown_token' };
  }

  if (record.expiresAt <= now) {
    return { ok: false, code: 'expired', record };
  }

  return { ok: true, record };
}

let cleanupTimerStarted = false;
function startCleanupTimer() {
  if (cleanupTimerStarted) return;
  cleanupTimerStarted = true;
  setInterval(() => cleanupExpired(nowMs()), CLEANUP_INTERVAL_MS).unref?.();
}

module.exports = {
  TTL_MS,
  getOrCreateActiveToken,
  validateToken,
  cleanupExpired,
  startCleanupTimer,
};
