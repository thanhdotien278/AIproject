const DEFAULT_QR_ROTATION_TTL_SECONDS = 30;
const DEFAULT_QR_DURATION_MINUTES = 30;
const HH_MM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const FIRST_HH_MM_PATTERN = /\b([01]\d|2[0-3]):([0-5]\d)\b/;

function parseTimeMinutes(value, pattern = HH_MM_PATTERN) {
  const match = String(value || '').match(pattern);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatMinutes(totalMinutes) {
  const minutesInDay = 24 * 60;
  const normalized = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
  const hours = String(Math.floor(normalized / 60)).padStart(2, '0');
  const minutes = String(normalized % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function defaultAvailableFromTime(conferenceTime) {
  const startMinutes = parseTimeMinutes(conferenceTime, FIRST_HH_MM_PATTERN);
  return startMinutes === null ? null : formatMinutes(startMinutes - 15);
}

function positiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function windowStartMs(conference, availableFromTime) {
  const minutes = parseTimeMinutes(availableFromTime);
  const startDate = new Date(conference.startDate);
  if (minutes === null || !Number.isFinite(startDate.getTime())) return null;
  startDate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return startDate.getTime();
}

function getAttendanceQrAvailability(conference, now = Date.now()) {
  const qrConfig = conference.qrConfig || {};
  const availableFromTime = qrConfig.availableFromTime || defaultAvailableFromTime(conference.time);
  const openAt = windowStartMs(conference, availableFromTime);
  const availableDurationMinutes = positiveNumber(
    qrConfig.availableDurationMinutes,
    DEFAULT_QR_DURATION_MINUTES,
  );
  const rotationTtlSeconds = positiveNumber(
    qrConfig.rotationTtlSeconds,
    DEFAULT_QR_ROTATION_TTL_SECONDS,
  );

  if (openAt === null) {
    return {
      success: false,
      state: 'invalid_config',
      conferenceCode: conference.code,
      serverNow: now,
      rotationTtlSeconds,
      message: 'Cấu hình QR Check-in không hợp lệ',
    };
  }

  const closeAt = openAt + availableDurationMinutes * 60 * 1000;
  const base = {
    success: true,
    conferenceCode: conference.code,
    serverNow: now,
    openAt,
    closeAt,
    rotationTtlSeconds,
  };

  if (now < openAt) {
    return {
      ...base,
      state: 'not_available_yet',
      message: 'Chưa đến thời gian mở QR Check-in',
    };
  }

  if (now >= closeAt) {
    return {
      ...base,
      state: 'window_closed',
      message: 'Đã hết thời gian đăng ký',
    };
  }

  return {
    ...base,
    state: 'available',
    message: 'QR Check-in đang khả dụng',
  };
}

module.exports = {
  DEFAULT_QR_ROTATION_TTL_SECONDS,
  getAttendanceQrAvailability,
};
