const ipFilter = require('../backend/middleware/ipFilter');

function createMockRequest(ip, { useXForwardedFor = true, accept = 'application/json' } = {}) {
  return {
    headers: {
      ...(useXForwardedFor ? { 'x-forwarded-for': ip } : {}),
      ...(accept ? { accept } : {}),
    },
    connection: { remoteAddress: ip },
    socket: { remoteAddress: ip },
    ip,
    originalUrl: '/register',
    path: '/register',
  };
}

function createMockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe('IP Filtering Middleware Tests', () => {
  let mockRes;
  let mockNext;
  let logSpy;

  beforeEach(() => {
    mockRes = createMockResponse();
    mockNext = jest.fn();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  describe('IP Extraction', () => {
    test('should extract IP from x-forwarded-for header', () => {
      const req = createMockRequest('203.0.113.5', { useXForwardedFor: true });
      req.connection.remoteAddress = '10.0.0.25';
      const extracted = ipFilter.extractClientIp(req);
      expect(extracted).toBe('203.0.113.5');
    });

    test('should extract first IP from comma-separated list', () => {
      const req = createMockRequest('203.0.113.5, 198.51.100.10, 192.0.2.1', { useXForwardedFor: true });
      const extracted = ipFilter.extractClientIp(req);
      expect(extracted).toBe('203.0.113.5');
    });

    test('should fallback to remoteAddress if no x-forwarded-for', () => {
      const req = createMockRequest(undefined, { useXForwardedFor: false });
      req.headers = { accept: 'application/json' };
      req.connection.remoteAddress = '10.0.0.25';
      const extracted = ipFilter.extractClientIp(req);
      expect(extracted).toBe('10.0.0.25');
    });

    test('should handle IPv6 addresses', () => {
      const ipV6 = '2001:0db8:85a3::8a2e:0370:7334';
      const req = createMockRequest(ipV6, { useXForwardedFor: true });
      const extracted = ipFilter.extractClientIp(req);
      expect(extracted).toBe(ipV6);
    });

    test('should normalize IPv6-mapped IPv4 addresses', () => {
      const req = createMockRequest('::ffff:192.168.1.100', { useXForwardedFor: true });
      const extracted = ipFilter.extractClientIp(req);
      expect(extracted).toBe('192.168.1.100');
    });
  });

  describe('Whitelist - Allowed IPs', () => {
    test('should allow whitelisted single IP', () => {
      const middleware = ipFilter.createIpFilter({ allowedList: ['192.168.1.100'] });
      const req = createMockRequest('192.168.1.100');

      middleware(req, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should allow IPs within allowed subnet range', () => {
      const middleware = ipFilter.createIpFilter({
        allowedList: ['192.168.1.0/24', '10.0.0.0/8', '172.16.50.0/24'],
      });

      const allowedIps = ['192.168.1.1', '192.168.1.255', '10.5.10.50', '172.16.50.100'];

      for (const ip of allowedIps) {
        const res = createMockResponse();
        const next = jest.fn();
        middleware(createMockRequest(ip), res, next);
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
      }
    });

    test('should allow multiple whitelisted IPs', () => {
      const middleware = ipFilter.createIpFilter({
        allowedList: ['192.168.1.100', '192.168.1.101', '10.0.0.50', '172.16.0.10'],
      });

      const allowedIps = ['192.168.1.100', '192.168.1.101', '10.0.0.50', '172.16.0.10'];
      for (const ip of allowedIps) {
        const res = createMockResponse();
        const next = jest.fn();
        middleware(createMockRequest(ip), res, next);
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
      }
    });
  });

  describe('Blacklist - Blocked IPs', () => {
    test('should block external/unknown IP with 403 (JSON)', () => {
      const middleware = ipFilter.createIpFilter({ allowedList: ['192.168.1.100'] });
      const req = createMockRequest('203.0.113.5', { accept: 'application/json' });

      middleware(req, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Truy cập bị từ chối. IP không được phép.',
      });
    });

    test('should block IP outside allowed range', () => {
      const middleware = ipFilter.createIpFilter({ allowedList: ['192.168.1.0/24'] });
      const blockedIps = ['192.168.0.100', '192.168.2.50', '10.0.0.1'];

      for (const ip of blockedIps) {
        const res = createMockResponse();
        const next = jest.fn();
        middleware(createMockRequest(ip, { accept: 'application/json' }), res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Forbidden',
            message: expect.stringContaining('IP'),
          }),
        );
      }
    });

    test('should return HTML response when Accept is not JSON', () => {
      const middleware = ipFilter.createIpFilter({ allowedList: ['192.168.1.100'] });
      const req = createMockRequest('203.0.113.5', { accept: 'text/html' });

      middleware(req, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('Truy cập bị từ chối'));
    });

    test('should handle missing IP address', () => {
      const middleware = ipFilter.createIpFilter({ allowedList: ['192.168.1.100'] });
      const req = {
        headers: { accept: 'application/json' },
        connection: {},
        socket: {},
        originalUrl: '/register',
        path: '/register',
      };

      middleware(req, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
        }),
      );
    });

    test('should handle invalid IP format', () => {
      const middleware = ipFilter.createIpFilter({ allowedList: ['192.168.1.100'] });
      const req = createMockRequest('invalid-ip', { accept: 'application/json' });

      middleware(req, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
        }),
      );
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty x-forwarded-for header', () => {
      const middleware = ipFilter.createIpFilter({ allowedList: ['192.168.1.100'] });
      const req = createMockRequest('', { useXForwardedFor: true, accept: 'application/json' });
      req.connection.remoteAddress = '203.0.113.5';

      middleware(req, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    test('should allow localhost/loopback addresses by default policy', () => {
      const req = createMockRequest('127.0.0.1', { accept: 'application/json' });
      ipFilter(req, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    test('should allow configured IPv6 address by exact match', () => {
      const ipV6 = '2001:0db8:85a3::8a2e:0370:7334';
      const middleware = ipFilter.createIpFilter({ allowedList: [ipV6] });
      const req = createMockRequest(ipV6, { accept: 'application/json' });
      middleware(req, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });
});
