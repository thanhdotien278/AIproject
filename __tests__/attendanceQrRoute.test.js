jest.mock('../backend/models/Conference', () => ({
  findOne: jest.fn(),
}));

jest.mock('qrcode', () => ({
  toBuffer: jest.fn(async () => Buffer.from('qr')),
}));

jest.mock('sharp', () => jest.fn(() => {
  throw new Error('skip logo overlay');
}));

const Conference = require('../backend/models/Conference');
const QRCode = require('qrcode');
const router = require('../backend/routes/attendanceQr');

const attendanceQrHandler = router.stack.find(layer => layer.route?.path === '/api/attendance-qr')
  .route.stack[0].handle;

function buildConference(overrides = {}) {
  return {
    code: 'QR01',
    isActive: true,
    startDate: new Date(2026, 6, 1),
    time: '08:00 - 17:00',
    qrConfig: {
      availableFromTime: '07:45',
      availableDurationMinutes: 1,
      rotationTtlSeconds: 10,
    },
    ...overrides,
  };
}

async function invokeAttendanceQr(query = { code: 'QR01' }) {
  const req = {
    query,
    protocol: 'http',
    get: jest.fn(() => 'localhost:3000'),
  };
  const res = {
    statusCode: 200,
    headers: {},
    set: jest.fn((key, value) => {
      res.headers[key] = value;
      return res;
    }),
    status: jest.fn(code => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn(body => {
      res.body = body;
      return res;
    }),
  };

  await attendanceQrHandler(req, res);
  return res;
}

function localTimeMs(hour, minute, second = 0) {
  return new Date(2026, 6, 1, hour, minute, second).getTime();
}

describe('attendance QR API window behavior', () => {
  const originalBaseUrl = process.env.BASE_URL;

  beforeEach(() => {
    process.env.BASE_URL = 'http://example.test';
    jest.spyOn(Date, 'now').mockReturnValue(localTimeMs(7, 45, 5));
    Conference.findOne.mockResolvedValue(buildConference());
  });

  afterEach(() => {
    Date.now.mockRestore();
    process.env.BASE_URL = originalBaseUrl;
    jest.clearAllMocks();
  });

  test('returns configured rotation metadata and QR payload during the window', async () => {
    const res = await invokeAttendanceQr();

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      state: 'available',
      conferenceCode: 'QR01',
      rotationTtlSeconds: 10,
      ttlMs: 10000,
      ttlSeconds: 10,
    });
    expect(res.body.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(res.body.checkinUrl).toContain('/qr/checkin?token=');
    expect(res.body.token).toBeTruthy();
    expect(QRCode.toBuffer).toHaveBeenCalledTimes(1);
  });

  test('before the window returns not_available_yet and no QR payload', async () => {
    Date.now.mockReturnValue(localTimeMs(7, 44, 59));

    const res = await invokeAttendanceQr();

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      state: 'not_available_yet',
      message: 'Chưa đến thời gian mở QR Check-in',
    });
    expect(res.body).not.toHaveProperty('qrCodeDataUrl');
    expect(res.body).not.toHaveProperty('checkinUrl');
    expect(res.body).not.toHaveProperty('token');
    expect(QRCode.toBuffer).not.toHaveBeenCalled();
  });

  test('after the window returns window_closed and no QR payload', async () => {
    Date.now.mockReturnValue(localTimeMs(7, 46, 1));

    const res = await invokeAttendanceQr();

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      state: 'window_closed',
      message: 'Đã hết thời gian đăng ký',
    });
    expect(res.body).not.toHaveProperty('qrCodeDataUrl');
    expect(res.body).not.toHaveProperty('checkinUrl');
    expect(res.body).not.toHaveProperty('token');
    expect(QRCode.toBuffer).not.toHaveBeenCalled();
  });

  test('unknown conference does not issue QR', async () => {
    Conference.findOne.mockResolvedValue(null);

    const res = await invokeAttendanceQr();

    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({
      success: false,
      state: 'conference_not_found',
    });
    expect(res.body).not.toHaveProperty('qrCodeDataUrl');
    expect(QRCode.toBuffer).not.toHaveBeenCalled();
  });

  test('inactive conference does not issue QR', async () => {
    Conference.findOne.mockResolvedValue(buildConference({ isActive: false }));

    const res = await invokeAttendanceQr();

    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      state: 'conference_inactive',
    });
    expect(res.body).not.toHaveProperty('qrCodeDataUrl');
    expect(QRCode.toBuffer).not.toHaveBeenCalled();
  });

  test('missing rotation config keeps the 30 second default', async () => {
    Conference.findOne.mockResolvedValue(buildConference({ qrConfig: undefined }));

    const res = await invokeAttendanceQr();

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      state: 'available',
      rotationTtlSeconds: 30,
      ttlMs: 30000,
      ttlSeconds: 30,
    });
    expect(res.body.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
  });
});
