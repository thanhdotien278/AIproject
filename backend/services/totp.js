const crypto = require('crypto');

const TIME_STEP_MS = 30_000;
const DIGITS = 6;

function getCurrentTimeWindow(now = Date.now()) {
  return Math.floor(now / TIME_STEP_MS);
}

function toCounterBuffer(counter) {
  const buf = Buffer.alloc(8);
  let value = BigInt(counter);
  for (let i = 7; i >= 0; i -= 1) {
    buf[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  return buf;
}

function hotp(secret, counter) {
  const key = Buffer.from(String(secret || ''), 'utf8');
  const msg = toCounterBuffer(counter);
  const hmac = crypto.createHmac('sha1', key).update(msg).digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const mod = 10 ** DIGITS;
  return String(binCode % mod).padStart(DIGITS, '0');
}

/**
 * Generate a 6-digit TOTP code (RFC6238-style, 30s step).
 * @param {string} secret
 * @param {object} [opts]
 * @param {number} [opts.now] - override current time (ms)
 * @returns {string}
 */
function generateTOTP(secret, opts = {}) {
  const now = Number.isFinite(opts.now) ? opts.now : Date.now();
  const window = getCurrentTimeWindow(now);
  return hotp(secret, window);
}

/**
 * Validate a TOTP code.
 * - Accepts only the *current* 30s window.
 * - If the code matches the previous window, returns expired error.
 * @param {string} code
 * @param {string} secret
 * @param {object} [opts]
 * @param {number} [opts.now] - override current time (ms)
 * @returns {{valid: boolean, error?: string}}
 */
function validateTOTP(code, secret, opts = {}) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return { valid: false };
  }

  const now = Number.isFinite(opts.now) ? opts.now : Date.now();
  const currentWindow = getCurrentTimeWindow(now);
  const current = hotp(secret, currentWindow);
  if (code === current) return { valid: true };

  const previous = hotp(secret, currentWindow - 1);
  if (code === previous) return { valid: false, error: 'Mã QR đã hết hạn' };

  return { valid: false };
}

module.exports = {
  TIME_STEP_MS,
  DIGITS,
  getCurrentTimeWindow,
  generateTOTP,
  validateTOTP,
};
