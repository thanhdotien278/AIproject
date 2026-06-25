const Conference = require('../backend/models/Conference');

describe('Conference expectedParticipants', () => {
  test('defaults expectedParticipants to 0', () => {
    const conference = new Conference({
      code: 'ABCD',
      name: 'Test Conference',
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      endDate: new Date('2026-07-01T00:00:00.000Z'),
      time: '09:00 - 11:00',
      location: '64b000000000000000000001',
      maxAttendees: 100,
    });

    expect(conference.expectedParticipants).toBe(0);
    expect(conference.validateSync()).toBeUndefined();
  });

  test('rejects negative expectedParticipants', () => {
    const conference = new Conference({
      code: 'EFGH',
      name: 'Test Conference',
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      endDate: new Date('2026-07-01T00:00:00.000Z'),
      time: '09:00 - 11:00',
      location: '64b000000000000000000001',
      maxAttendees: 100,
      expectedParticipants: -1,
    });

    const error = conference.validateSync();

    expect(error.errors.expectedParticipants).toBeDefined();
  });
});
