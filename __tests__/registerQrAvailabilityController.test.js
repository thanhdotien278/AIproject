describe('register QR availability gating', () => {
  function vietnamTime(year, month, day, hour, minute, second = 0) {
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - 7 * 60 * 60 * 1000);
  }

  function buildConference(overrides = {}) {
    return {
      code: 'CONF',
      name: 'Hội nghị kiểm thử',
      isActive: true,
      startDate: vietnamTime(2026, 7, 1, 8, 0),
      endDate: vietnamTime(2026, 7, 1, 17, 0),
      registrationFields: ['name', 'email', 'phone'],
      qrConfig: {
        availableFromAt: vietnamTime(2026, 7, 1, 9, 0),
        availableDurationMinutes: 30,
        rotationTtlSeconds: 30,
      },
      ...overrides,
    };
  }

  function loadController() {
    jest.resetModules();

    const Participant = jest.fn();
    Participant.findOne = jest.fn();
    Participant.find = jest.fn();
    Participant.countDocuments = jest.fn();
    const Conference = {
      findOne: jest.fn(),
    };
    const Counter = {
      getNextSequenceValue: jest.fn(),
    };

    jest.doMock('../backend/models/Participant', () => Participant);
    jest.doMock('../backend/models/Conference', () => Conference);
    jest.doMock('../backend/models/Counter', () => Counter);
    jest.doMock('nodemailer', () => ({
      createTransport: jest.fn(() => ({ sendMail: jest.fn() })),
    }));

    const controller = require('../backend/controllers/registerController');
    return { controller, Conference, Participant, Counter };
  }

  function mockResponse() {
    return {
      status: jest.fn().mockReturnThis(),
      render: jest.fn(),
      json: jest.fn(),
    };
  }

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.dontMock('../backend/models/Participant');
    jest.dontMock('../backend/models/Conference');
    jest.dontMock('../backend/models/Counter');
    jest.dontMock('nodemailer');
  });

  test('GET /register?code=CONF renders registration_closed before QR window', async () => {
    jest.useFakeTimers().setSystemTime(vietnamTime(2026, 7, 1, 8, 59));
    const { controller, Conference } = loadController();
    const conference = buildConference();
    Conference.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(conference),
    });
    const res = mockResponse();

    await controller.showRegisterForm({
      params: {},
      query: { code: 'conf' },
      body: {},
    }, res);

    expect(Conference.findOne).toHaveBeenCalledWith({ code: 'CONF' });
    expect(res.render).toHaveBeenCalledWith('registration_closed', expect.objectContaining({
      message: 'Chưa đến thời gian mở QR Check-in',
      conference,
    }));
    expect(res.render).not.toHaveBeenCalledWith('register', expect.anything());
  });

  test('POST /register outside QR window is blocked before creating Participant', async () => {
    jest.useFakeTimers().setSystemTime(vietnamTime(2026, 7, 1, 9, 31));
    const { controller, Conference, Participant } = loadController();
    Conference.findOne.mockResolvedValue(buildConference());
    const res = mockResponse();

    await controller.registerParticipant({
      params: {},
      query: {},
      body: {
        conferenceCode: 'conf',
        name: 'Nguyen Van A',
        email: 'a@example.com',
        phone: '0900000000',
      },
    }, res);

    expect(Conference.findOne).toHaveBeenCalledWith({ code: 'CONF' });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      state: 'window_closed',
      message: 'Đã hết thời gian đăng ký',
      conferenceCode: 'CONF',
    }));
    expect(Participant).not.toHaveBeenCalled();
  });

  test('POST /register success saves session and returns thankyou redirect', async () => {
    jest.useFakeTimers().setSystemTime(vietnamTime(2026, 7, 1, 9, 10));
    const { controller, Conference, Participant, Counter } = loadController();
    const conference = buildConference();
    const conferenceDoc = {
      ...conference,
      lean: jest.fn().mockResolvedValue(conference),
    };
    const participantDoc = {
      _id: { toString: () => 'participant-mongo-id' },
      save: jest.fn().mockResolvedValue(undefined),
      conferenceCode: 'CONF',
      lunch: false,
      dinner: false,
      transport: false,
    };
    Conference.findOne.mockReturnValue(conferenceDoc);
    Participant.findOne.mockResolvedValue(null);
    Participant.mockImplementation(data => Object.assign(participantDoc, data));
    Participant.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([participantDoc]) });
    Participant.countDocuments.mockResolvedValue(1);
    Counter.getNextSequenceValue.mockResolvedValue(7);
    const req = {
      params: {},
      query: {},
      body: {
        conferenceCode: 'conf',
        name: 'Nguyen Van A',
        email: 'a@example.com',
        phone: '0900000000',
      },
      session: {
        save: jest.fn(callback => callback()),
      },
    };
    const res = mockResponse();

    await controller.registerParticipant(req, res);

    expect(participantDoc.save).toHaveBeenCalled();
    expect(req.session.participantMongoId).toBe('participant-mongo-id');
    expect(req.session.save).toHaveBeenCalledTimes(1);
    expect(req.session.save.mock.invocationCallOrder[0]).toBeLessThan(res.json.mock.invocationCallOrder[0]);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      redirectUrl: '/thankyou',
    }));
    expect(res.json.mock.calls[0][0].redirectUrl).not.toBe('/');
  });
});
