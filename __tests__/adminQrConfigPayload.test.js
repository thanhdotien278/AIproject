jest.mock('../backend/models/Participant', () => ({}));
jest.mock('../backend/models/User', () => ({}));
jest.mock('../backend/models/Conference', () => ({}));
jest.mock('../backend/models/Location', () => ({}));
jest.mock('nodemailer', () => ({ createTransport: jest.fn(() => ({})) }));
jest.mock('xlsx', () => ({}));

const { _normalizeQrConfig } = require('../backend/controllers/adminController');

function vietnamTimeIso(year, month, day, hour, minute) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - 7 * 60 * 60 * 1000).toISOString();
}

describe('admin conference QR config payload', () => {
  test('edit conference payload persists availableFromAt from Vietnam local date and time', () => {
    const qrConfig = _normalizeQrConfig({
      qrConfig: {
        availableFromDate: '2026-07-01',
        availableFromTime: '07:45',
        availableDurationMinutes: '30',
        rotationTtlSeconds: '30',
      },
    });

    expect(qrConfig.availableFromAt).toBeInstanceOf(Date);
    expect(qrConfig.availableFromAt.toISOString()).toBe(vietnamTimeIso(2026, 7, 1, 7, 45));
    expect(qrConfig).not.toHaveProperty('availableFromTime');
  });
});
