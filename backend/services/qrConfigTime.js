const FIRST_HH_MM_PATTERN = /\b([01]\d|2[0-3]):([0-5]\d)\b/;
const HH_MM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const DEFAULT_QR_ROTATION_TTL_SECONDS = 30;
const DEFAULT_QR_DURATION_MINUTES = 30;

function parseTimeMinutes(value, pattern = HH_MM_PATTERN) {
  const match = String(value || '').match(pattern);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function getConferenceDateParts(startDate) {
  const date = new Date(startDate);
  if (!Number.isFinite(date.getTime())) return null;
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
  };
}

function vietnamDateTimeToDate(parts, minutes) {
  return new Date(Date.UTC(parts.year, parts.month, parts.day, 0, minutes, 0, 0) - VIETNAM_OFFSET_MS);
}

function defaultAvailableFromAt(startDate, conferenceTime) {
  const parts = getConferenceDateParts(startDate);
  const startMinutes = parseTimeMinutes(conferenceTime, FIRST_HH_MM_PATTERN);
  if (!parts || startMinutes === null) return null;
  return vietnamDateTimeToDate(parts, startMinutes - 15);
}

function dateFromLegacyAvailableFromTime(startDate, availableFromTime) {
  const parts = getConferenceDateParts(startDate);
  const minutes = parseTimeMinutes(availableFromTime);
  if (!parts || minutes === null) return null;
  return vietnamDateTimeToDate(parts, minutes);
}

function positiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function deriveAvailableFromAtWithSource(conference) {
  const qrConfig = conference.qrConfig || {};
  const configured = new Date(qrConfig.availableFromAt);
  if (Number.isFinite(configured.getTime())) {
    return { availableFromAt: configured, source: 'qrConfig.availableFromAt' };
  }

  const legacy = dateFromLegacyAvailableFromTime(conference.startDate, qrConfig.availableFromTime);
  if (legacy) {
    return { availableFromAt: legacy, source: 'legacy.availableFromTime' };
  }

  const fallback = defaultAvailableFromAt(conference.startDate, conference.time);
  return {
    availableFromAt: fallback,
    source: fallback ? 'default.startMinus15' : 'invalid',
  };
}

function deriveAvailableFromAt(conference) {
  return deriveAvailableFromAtWithSource(conference).availableFromAt;
}

function getQrAvailabilityState(conference, now = new Date()) {
  const qrConfig = conference.qrConfig || {};
  const availableFromAt = new Date(qrConfig.availableFromAt);
  const nowAt = now instanceof Date ? now : new Date(now);
  const nowMs = nowAt.getTime();
  const openAt = availableFromAt.getTime();
  const availableDurationMinutes = positiveNumber(
    qrConfig.availableDurationMinutes,
    DEFAULT_QR_DURATION_MINUTES,
  );
  const rotationTtlSeconds = positiveNumber(
    qrConfig.rotationTtlSeconds,
    DEFAULT_QR_ROTATION_TTL_SECONDS,
  );

  if (!Number.isFinite(openAt) || !Number.isFinite(nowMs)) {
    return {
      success: false,
      state: 'invalid_config',
      source: 'invalid',
      availableFromAt: Number.isFinite(openAt) ? availableFromAt : null,
      availableUntilAt: null,
      availableDurationMinutes,
      rotationTtlSeconds,
      message: 'Cấu hình QR Check-in không hợp lệ',
    };
  }

  const availableUntilAt = new Date(openAt + availableDurationMinutes * 60 * 1000);
  let state = 'available';
  if (nowMs < openAt) state = 'not_available_yet';
  if (nowMs > availableUntilAt.getTime()) state = 'window_closed';

  return {
    success: true,
    state,
    source: 'qrConfig.availableFromAt',
    availableFromAt,
    availableUntilAt,
    availableDurationMinutes,
    rotationTtlSeconds,
    message: state === 'not_available_yet'
      ? 'Chưa đến thời gian mở QR Check-in'
      : state === 'window_closed'
        ? 'Đã hết thời gian đăng ký'
        : 'QR Check-in đang khả dụng',
  };
}

function getQrAvailabilityWindow(conference, now = new Date()) {
  return getQrAvailabilityState(conference, now);
}

function parseVietnamDateTimeInput(dateValue, timeValue) {
  const dateMatch = String(dateValue || '').match(DATE_INPUT_PATTERN);
  const minutes = parseTimeMinutes(timeValue);
  if (!dateMatch || minutes === null) return null;
  return vietnamDateTimeToDate({
    year: Number(dateMatch[1]),
    month: Number(dateMatch[2]) - 1,
    day: Number(dateMatch[3]),
  }, minutes);
}

module.exports = {
  DEFAULT_QR_DURATION_MINUTES,
  DEFAULT_QR_ROTATION_TTL_SECONDS,
  defaultAvailableFromAt,
  deriveAvailableFromAt,
  getQrAvailabilityState,
  getQrAvailabilityWindow,
  parseVietnamDateTimeInput,
};
