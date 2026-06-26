const {
  getQrAvailabilityState,
  getQrAvailabilityWindow,
  parseVietnamDateTimeInput,
} = require('../backend/services/qrConfigTime');

function vietnamTime(year, month, day, hour, minute, second = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - 7 * 60 * 60 * 1000);
}

function buildConference(overrides = {}) {
  return {
    code: 'QR01',
    startDate: new Date('2026-07-01T00:00:00.000Z'),
    time: '08:00 - 17:00',
    qrConfig: {
      availableFromAt: vietnamTime(2026, 7, 2, 9, 15),
      availableDurationMinutes: 10,
      rotationTtlSeconds: 5,
    },
    ...overrides,
  };
}

describe('QR availability state helper', () => {
  test('returns not_available_yet before configured availableFromAt', () => {
    const state = getQrAvailabilityState(buildConference(), vietnamTime(2026, 7, 2, 9, 14, 59));

    expect(state).toMatchObject({
      success: true,
      state: 'not_available_yet',
      source: 'qrConfig.availableFromAt',
      message: 'Chưa đến thời gian mở QR Check-in',
      availableDurationMinutes: 10,
      rotationTtlSeconds: 5,
    });
  });

  test('returns available inside the configured window', () => {
    const state = getQrAvailabilityState(buildConference(), vietnamTime(2026, 7, 2, 9, 20));

    expect(state).toMatchObject({
      success: true,
      state: 'available',
      source: 'qrConfig.availableFromAt',
      availableDurationMinutes: 10,
      rotationTtlSeconds: 5,
    });
    expect(state.availableFromAt.toISOString()).toBe(vietnamTime(2026, 7, 2, 9, 15).toISOString());
    expect(state.availableUntilAt.toISOString()).toBe(vietnamTime(2026, 7, 2, 9, 25).toISOString());
  });

  test('returns window_closed after availableFromAt plus duration', () => {
    const state = getQrAvailabilityState(buildConference(), vietnamTime(2026, 7, 2, 9, 25, 1));

    expect(state).toMatchObject({
      success: true,
      state: 'window_closed',
      message: 'Đã hết thời gian đăng ký',
    });
  });

  test('does not fall back to conference start or legacy availableFromTime', () => {
    const state = getQrAvailabilityWindow(buildConference({
      qrConfig: {
        availableFromTime: '09:30',
        availableDurationMinutes: 30,
        rotationTtlSeconds: 30,
      },
    }), vietnamTime(2026, 7, 1, 9, 31));

    expect(state).toMatchObject({
      success: false,
      state: 'invalid_config',
      source: 'invalid',
    });
  });

  test('keeps QR available at the exact availableUntilAt boundary', () => {
    const state = getQrAvailabilityState(buildConference({
      qrConfig: {
        availableFromAt: vietnamTime(2026, 7, 1, 7, 45),
        availableDurationMinutes: 1,
        rotationTtlSeconds: 30,
      },
    }), vietnamTime(2026, 7, 1, 7, 46));

    expect(state.state).toBe('available');
  });

  test('parses admin Vietnam local date and time into a Date', () => {
    expect(parseVietnamDateTimeInput('2026-07-01', '07:45').toISOString())
      .toBe(vietnamTime(2026, 7, 1, 7, 45).toISOString());
  });
});
