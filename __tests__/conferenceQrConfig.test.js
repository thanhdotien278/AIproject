const Conference = require('../backend/models/Conference');

function vietnamDateTimeIso(year, month, day, hour, minute) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - 7 * 60 * 60 * 1000).toISOString();
}

function buildConference(overrides = {}) {
  return new Conference({
    code: 'QR01',
    name: 'QR Test Conference',
    startDate: new Date('2026-07-01T00:00:00.000Z'),
    endDate: new Date('2026-07-01T00:00:00.000Z'),
    time: '08:00 - 17:00',
    location: '64b000000000000000000001',
    maxAttendees: 100,
    ...overrides,
  });
}

async function getValidationError(conference) {
  try {
    await conference.validate();
    return null;
  } catch (error) {
    return error;
  }
}

describe('Conference qrConfig', () => {
  test('defaults QR timing from the conference start time', async () => {
    const conference = buildConference();

    await expect(conference.validate()).resolves.toBeUndefined();
    expect(conference.qrConfig.availableFromAt.toISOString()).toBe(vietnamDateTimeIso(2026, 7, 1, 7, 45));
    expect(conference.qrConfig.availableDurationMinutes).toBe(30);
    expect(conference.qrConfig.rotationTtlSeconds).toBe(30);
  });

  test('accepts a configured QR available datetime', async () => {
    const availableFromAt = new Date(vietnamDateTimeIso(2026, 7, 1, 8, 15));
    const conference = buildConference({
      qrConfig: {
        availableFromAt,
        availableDurationMinutes: 30,
        rotationTtlSeconds: 30,
      },
    });

    await expect(conference.validate()).resolves.toBeUndefined();
    expect(conference.qrConfig.availableFromAt.toISOString()).toBe(availableFromAt.toISOString());
  });

  test('rejects invalid availableFromAt', async () => {
    const conference = buildConference({
      qrConfig: {
        availableFromAt: 'not-a-date',
        availableDurationMinutes: 30,
        rotationTtlSeconds: 30,
      },
    });

    const error = await getValidationError(conference);

    expect(error.errors['qrConfig.availableFromAt']).toBeDefined();
  });

  test('rejects non-positive availableDurationMinutes', async () => {
    const conference = buildConference({
      qrConfig: {
        availableFromAt: new Date(vietnamDateTimeIso(2026, 7, 1, 7, 45)),
        availableDurationMinutes: 0,
        rotationTtlSeconds: 30,
      },
    });

    const error = await getValidationError(conference);

    expect(error.errors['qrConfig.availableDurationMinutes']).toBeDefined();
  });

  test('rejects non-numeric availableDurationMinutes', async () => {
    const conference = buildConference({
      qrConfig: {
        availableFromAt: new Date(vietnamDateTimeIso(2026, 7, 1, 7, 45)),
        availableDurationMinutes: 'abc',
        rotationTtlSeconds: 30,
      },
    });

    const error = await getValidationError(conference);

    expect(error.errors['qrConfig.availableDurationMinutes']).toBeDefined();
  });

  test('rejects non-positive rotationTtlSeconds', async () => {
    const conference = buildConference({
      qrConfig: {
        availableFromAt: new Date(vietnamDateTimeIso(2026, 7, 1, 7, 45)),
        availableDurationMinutes: 30,
        rotationTtlSeconds: -1,
      },
    });

    const error = await getValidationError(conference);

    expect(error.errors['qrConfig.rotationTtlSeconds']).toBeDefined();
  });

  test('rejects non-numeric rotationTtlSeconds', async () => {
    const conference = buildConference({
      qrConfig: {
        availableFromAt: new Date(vietnamDateTimeIso(2026, 7, 1, 7, 45)),
        availableDurationMinutes: 30,
        rotationTtlSeconds: 'abc',
      },
    });

    const error = await getValidationError(conference);

    expect(error.errors['qrConfig.rotationTtlSeconds']).toBeDefined();
  });

  test('rejects rotation TTL greater than the availability window', async () => {
    const conference = buildConference({
      qrConfig: {
        availableFromAt: new Date(vietnamDateTimeIso(2026, 7, 1, 7, 45)),
        availableDurationMinutes: 1,
        rotationTtlSeconds: 61,
      },
    });

    const error = await getValidationError(conference);

    expect(error.errors['qrConfig.rotationTtlSeconds']).toBeDefined();
  });

  test('rejects missing availableFromAt when conference time has no HH:mm start', async () => {
    const conference = buildConference({
      time: 'Morning session',
    });

    const error = await getValidationError(conference);

    expect(error.errors['qrConfig.availableFromAt']).toBeDefined();
  });

  test('derives availableFromAt from legacy availableFromTime', async () => {
    const conference = buildConference({
      qrConfig: {
        availableFromTime: '09:30',
        availableDurationMinutes: 30,
        rotationTtlSeconds: 30,
      },
    });

    await expect(conference.validate()).resolves.toBeUndefined();
    expect(conference.qrConfig.availableFromAt.toISOString()).toBe(vietnamDateTimeIso(2026, 7, 1, 9, 30));
  });

  test('defaults QR timing to the previous day when start time is after midnight', async () => {
    const conference = buildConference({
      startDate: new Date('2026-06-26T00:00:00.000Z'),
      endDate: new Date('2026-06-26T00:00:00.000Z'),
      time: '00:10 - 02:00',
    });

    await expect(conference.validate()).resolves.toBeUndefined();
    expect(conference.qrConfig.availableFromAt.toISOString()).toBe(vietnamDateTimeIso(2026, 6, 25, 23, 55));
  });

  test('validates qrConfig after update-style mutation', async () => {
    const conference = buildConference();
    await expect(conference.validate()).resolves.toBeUndefined();

    conference.qrConfig = {
      availableFromAt: new Date(vietnamDateTimeIso(2026, 7, 1, 7, 45)),
      availableDurationMinutes: 1,
      rotationTtlSeconds: 90,
    };

    const error = await getValidationError(conference);

    expect(error.errors['qrConfig.rotationTtlSeconds']).toBeDefined();
  });
});
