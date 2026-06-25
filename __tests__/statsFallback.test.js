describe('stats API participant/manual fallback', () => {
  function loadController({ participants = [], count, conference } = {}) {
    jest.resetModules();

    const leanParticipants = jest.fn().mockResolvedValue(participants);
    const leanConference = jest.fn().mockResolvedValue(conference || null);
    const Participant = {
      find: jest.fn().mockReturnValue({ lean: leanParticipants }),
      countDocuments: jest.fn().mockResolvedValue(count ?? participants.length),
    };
    const Conference = {
      findOne: jest.fn().mockReturnValue({ lean: leanConference }),
    };

    jest.doMock('../backend/models/Participant', () => Participant);
    jest.doMock('../backend/models/Conference', () => Conference);
    jest.doMock('../backend/models/Counter', () => ({}));
    jest.doMock('nodemailer', () => ({
      createTransport: jest.fn(() => ({ sendMail: jest.fn() })),
    }));

    const controller = require('../backend/controllers/registerController');
    return { controller, Participant, Conference };
  }

  function mockResponse() {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    return res;
  }

  test('uses Participant count when records exist', async () => {
    const { controller, Participant } = loadController({
      participants: [
        { lunch: true, dinner: false, transport: true, workunit: 'Học viện KTQS', attendance: true },
        { lunch: false, dinner: true, transport: false, workunit: 'Đơn vị ngoài', attendance: false },
      ],
      count: 2,
      conference: { code: 'CONF', expectedParticipants: 20, maxAttendees: 100 },
    });
    const res = mockResponse();

    await controller.getStatsApi({ query: { conferenceCode: 'conf' } }, res);

    expect(Participant.countDocuments).toHaveBeenCalledWith({ conferenceCode: 'CONF' });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      totalRegisteredFromParticipants: 2,
      expectedParticipants: 20,
      maxAttendees: 100,
      totalParticipants: 2,
      totalSource: 'participants',
      checkedInCount: 1,
      notCheckedInCount: 1,
    }));
  });

  test('falls back to expectedParticipants when no Participant records exist', async () => {
    const { controller } = loadController({
      participants: [],
      count: 0,
      conference: { code: 'CONF', expectedParticipants: 42, maxAttendees: 100 },
    });
    const res = mockResponse();

    await controller.getStatsApi({ query: { conferenceCode: 'CONF' } }, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      totalRegisteredFromParticipants: 0,
      expectedParticipants: 42,
      maxAttendees: 100,
      totalParticipants: 42,
      totalSource: 'manual',
      checkedInCount: 0,
      notCheckedInCount: 42,
      hocVienCount: 0,
      donViNgoaiCount: 0,
    }));
  });

  test('returns zero counts without NaN when expectedParticipants is 0', async () => {
    const { controller } = loadController({
      participants: [],
      count: 0,
      conference: { code: 'CONF', expectedParticipants: 0, maxAttendees: 100 },
    });
    const res = mockResponse();

    await controller.getStatsApi({ query: { conferenceCode: 'CONF' } }, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.totalParticipants).toBe(0);
    expect(payload.checkedInCount).toBe(0);
    expect(payload.notCheckedInCount).toBe(0);
    expect(JSON.stringify(payload)).not.toContain('NaN');
  });

  test('defaults stats API to the active conference', async () => {
    const { controller, Participant, Conference } = loadController({
      participants: [],
      count: 0,
      conference: { code: 'LIVE', expectedParticipants: 10, maxAttendees: 50 },
    });
    const res = mockResponse();

    await controller.getStatsApi({ query: {} }, res);

    expect(Conference.findOne).toHaveBeenCalledWith({ isActive: true });
    expect(Participant.countDocuments).toHaveBeenCalledWith({ conferenceCode: 'LIVE' });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      conferenceCode: 'LIVE',
      totalParticipants: 10,
    }));
  });
});
