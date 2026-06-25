const Conference = require('../backend/models/Conference');

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
    expect(conference.qrConfig.availableFromTime).toBe('07:45');
    expect(conference.qrConfig.availableDurationMinutes).toBe(30);
    expect(conference.qrConfig.rotationTtlSeconds).toBe(30);
  });

  test('rejects invalid availableFromTime format', async () => {
    const conference = buildConference({
      qrConfig: {
        availableFromTime: '8am',
        availableDurationMinutes: 30,
        rotationTtlSeconds: 30,
      },
    });

    const error = await getValidationError(conference);

    expect(error.errors['qrConfig.availableFromTime']).toBeDefined();
  });

  test('rejects non-positive availableDurationMinutes', async () => {
    const conference = buildConference({
      qrConfig: {
        availableFromTime: '07:45',
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
        availableFromTime: '07:45',
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
        availableFromTime: '07:45',
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
        availableFromTime: '07:45',
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
        availableFromTime: '07:45',
        availableDurationMinutes: 1,
        rotationTtlSeconds: 61,
      },
    });

    const error = await getValidationError(conference);

    expect(error.errors['qrConfig.rotationTtlSeconds']).toBeDefined();
  });

  test('rejects missing availableFromTime when conference time has no HH:mm start', async () => {
    const conference = buildConference({
      time: 'Morning session',
    });

    const error = await getValidationError(conference);

    expect(error.errors['qrConfig.availableFromTime']).toBeDefined();
  });

  test('validates qrConfig after update-style mutation', async () => {
    const conference = buildConference();
    await expect(conference.validate()).resolves.toBeUndefined();

    conference.qrConfig = {
      availableFromTime: '07:45',
      availableDurationMinutes: 1,
      rotationTtlSeconds: 90,
    };

    const error = await getValidationError(conference);

    expect(error.errors['qrConfig.rotationTtlSeconds']).toBeDefined();
  });
});
