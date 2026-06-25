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

  test('uses Participant count as checked-in count when records exist', async () => {
    const { controller, Participant } = loadController({
      participants: [
        { lunch: true, dinner: false, transport: true, workunit: 'Học viện KTQS', attendance: true },
        { lunch: false, dinner: true, transport: false, workunit: 'Đơn vị ngoài', attendance: false },
        { lunch: true, dinner: true, transport: false, workUnit: 'Học viện Quân y', attendance: false },
        { lunch: false, dinner: false, transport: true, workunit: 'Bệnh viện ngoài', attendance: false },
        { lunch: false, dinner: false, transport: false, workunit: 'Công ty ngoài', attendance: false },
      ],
      count: 5,
      conference: { code: 'CONF', expectedParticipants: 200, maxAttendees: 300 },
    });
    const res = mockResponse();

    await controller.getStatsApi({ query: { conferenceCode: 'conf' } }, res);

    expect(Participant.countDocuments).toHaveBeenCalledWith({ conferenceCode: 'CONF' });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      totalRegisteredFromParticipants: 5,
      expectedParticipants: 200,
      maxAttendees: 300,
      totalParticipants: 5,
      totalSource: 'participants',
      checkedInCount: 5,
      notCheckedInCount: 195,
      checkedInPercent: 3,
      notCheckedInPercent: 98,
      internalCount: 2,
      externalCount: 3,
      selectedConferenceCode: 'CONF',
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
      checkedInPercent: 0,
      notCheckedInPercent: 100,
      hocVienCount: 0,
      donViNgoaiCount: 0,
    }));
  });

  test('does not return negative notCheckedInCount when participant count exceeds expected', async () => {
    const { controller } = loadController({
      participants: Array.from({ length: 8 }, () => ({ workunit: 'Đơn vị ngoài' })),
      count: 8,
      conference: { code: 'CONF', expectedParticipants: 5, maxAttendees: 100 },
    });
    const res = mockResponse();

    await controller.getStatsApi({ query: { conferenceCode: 'CONF' } }, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      expectedParticipants: 5,
      checkedInCount: 8,
      notCheckedInCount: 0,
      checkedInPercent: 160,
      notCheckedInPercent: 0,
      internalCount: 0,
      externalCount: 8,
    }));
  });

  test('uses maxAttendees only when expectedParticipants is missing', async () => {
    const { controller } = loadController({
      participants: [],
      count: 0,
      conference: { code: 'CONF', maxAttendees: 15 },
    });
    const res = mockResponse();

    await controller.getStatsApi({ query: { conferenceCode: 'CONF' } }, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      expectedParticipants: 15,
      checkedInCount: 0,
      notCheckedInCount: 15,
    }));
  });

  test('returns five newest recent participants without contact fields', async () => {
    const participants = Array.from({ length: 6 }, (_, index) => ({
      _id: `p${index + 1}`,
      name: `Nguyễn Văn ${index + 1}`,
      rank: index === 5 ? 'Đại tá' : '',
      academic: index === 5 ? 'PGS.TS.' : '',
      position: index === 5 ? 'Chủ nhiệm khoa' : '',
      workunit: index === 5 ? 'Học viện Quân y' : 'Đơn vị ngoài',
      lunch: index === 5,
      dinner: false,
      transport: index === 4,
      conferenceCode: 'CONF',
      registrationDate: new Date(`2026-01-0${index + 1}T08:00:00.000Z`),
      email: `person${index + 1}@example.com`,
      phone: '0900000000',
    }));
    const { controller } = loadController({
      participants,
      count: 6,
      conference: { code: 'CONF', expectedParticipants: 20 },
    });
    const res = mockResponse();

    await controller.getStatsApi({ query: { conferenceCode: 'CONF' } }, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.recentCheckIns).toHaveLength(5);
    expect(payload.recentCheckIns[0]).toMatchObject({
      id: 'p6',
      rank: 'Đại tá',
      academic: 'PGS.TS.',
      fullName: 'Nguyễn Văn 6',
      position: 'Chủ nhiệm khoa',
      type: 'Nội bộ',
      services: { lunch: true, dinner: false, transport: false },
      conferenceCode: 'CONF',
    });
    expect(payload.recentCheckIns.map(p => p.id)).toEqual(['p6', 'p5', 'p4', 'p3', 'p2']);
    expect(JSON.stringify(payload.recentCheckIns)).not.toContain('person6@example.com');
    expect(JSON.stringify(payload.recentCheckIns)).not.toContain('0900000000');
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
      selectedConferenceCode: 'LIVE',
    }));
  });
});
