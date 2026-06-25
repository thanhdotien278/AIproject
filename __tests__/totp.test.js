const { generateTOTP, validateTOTP, getCurrentTimeWindow, TIME_STEP_MS } = require('../backend/services/totp');

describe('TOTP Mechanism Tests', () => {
  const secret = 'test-secret';

  describe('Code Generation', () => {
    test('should generate 6-digit code', () => {
      const code = generateTOTP(secret, { now: 0 });
      expect(code).toBeDefined();
      expect(typeof code).toBe('string');
      expect(code).toHaveLength(6);
    });

    test('should generate numeric-only code', () => {
      const code = generateTOTP(secret, { now: 0 });
      expect(code).toMatch(/^\d{6}$/);
    });
  });

  describe('Time-Based Rotation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(0));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should generate different code after 30 seconds', () => {
      const code1 = generateTOTP(secret);
      jest.advanceTimersByTime(TIME_STEP_MS);
      const code2 = generateTOTP(secret);
      expect(code1).not.toBe(code2);
    });

    test('should keep same code within 30-second window (T+29s)', () => {
      const code1 = generateTOTP(secret);
      jest.advanceTimersByTime(TIME_STEP_MS - 1000);
      const code2 = generateTOTP(secret);
      expect(code2).toBe(code1);
    });

    test('should change code at boundary (T+30s) and remain same at T+31s', () => {
      const code1 = generateTOTP(secret);
      jest.advanceTimersByTime(TIME_STEP_MS);
      const code2 = generateTOTP(secret);
      expect(code2).not.toBe(code1);

      jest.advanceTimersByTime(1000);
      const code3 = generateTOTP(secret);
      expect(code3).toBe(code2);
    });

    test('should rotate continuously across multiple windows', () => {
      const codes = [];
      for (let i = 0; i < 5; i += 1) {
        codes.push(generateTOTP(secret));
        jest.advanceTimersByTime(TIME_STEP_MS);
      }

      // Each window should produce a different code for this fixed secret and fixed times.
      // This makes the test deterministic and guards against accidental caching bugs.
      for (let i = 1; i < codes.length; i += 1) {
        expect(codes[i]).not.toBe(codes[i - 1]);
      }
    });
  });

  describe('Code Validation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(0));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should accept valid current code', () => {
      const code = generateTOTP(secret);
      const resultNow = validateTOTP(code, secret);
      expect(resultNow).toEqual({ valid: true });

      // Still within the same 30-second window.
      jest.advanceTimersByTime(15_000);
      const resultLater = validateTOTP(code, secret);
      expect(resultLater).toEqual({ valid: true });
    });

    test('should reject expired code (>30s) with message', () => {
      const oldCode = generateTOTP(secret);
      jest.advanceTimersByTime(31_000);
      const result = validateTOTP(oldCode, secret);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Mã QR đã hết hạn');
    });

    test('should reject wrong 6-digit code (well-formed but invalid)', () => {
      const now = 0;
      const current = generateTOTP(secret, { now });
      const invalid = current === '000000' ? '111111' : '000000';
      const result = validateTOTP(invalid, secret, { now });
      expect(result).toEqual({ valid: false });
    });

    test('should reject invalid format codes', () => {
      const cases = [
        undefined,
        null,
        '',
        '12345',
        '1234567',
        'abc123',
        '12-34-56',
        '      ',
      ];

      for (const code of cases) {
        const result = validateTOTP(code, secret);
        expect(result.valid).toBe(false);
      }
    });
  });

  describe('Time Window Helper', () => {
    test('should compute correct 30-second window number', () => {
      expect(getCurrentTimeWindow(0)).toBe(0);
      expect(getCurrentTimeWindow(29_999)).toBe(0);
      expect(getCurrentTimeWindow(30_000)).toBe(1);
      expect(getCurrentTimeWindow(60_000)).toBe(2);
    });
  });
});
