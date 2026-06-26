const {
  DEFAULT_QR_ROTATION_TTL_SECONDS,
  getQrAvailabilityState,
} = require('./qrConfigTime');

function getAttendanceQrAvailability(conference, now = Date.now()) {
  const serverNow = now instanceof Date ? now.getTime() : now;
  const window = getQrAvailabilityState(conference, new Date(serverNow));

  if (!window.success) {
    return {
      ...window,
      conferenceCode: conference.code,
      serverNow,
    };
  }

  return {
    ...window,
    success: true,
    conferenceCode: conference.code,
    serverNow,
    openAt: window.availableFromAt.getTime(),
    closeAt: window.availableUntilAt.getTime(),
    availableFromAt: window.availableFromAt.toISOString(),
    availableUntilAt: window.availableUntilAt.toISOString(),
  };
}

module.exports = {
  DEFAULT_QR_ROTATION_TTL_SECONDS,
  getAttendanceQrAvailability,
};
