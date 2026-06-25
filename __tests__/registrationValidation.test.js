const {
  validateEmail,
  validatePhone,
  validateRegistrationForm,
} = require('../backend/middleware/registrationValidation');

describe('registration validation', () => {
  test('does not require feedback or questions when the conference displays them', () => {
    const result = validateRegistrationForm(
      {
        name: 'Nguyen Van A',
        email: 'a@example.com',
        phone: '0123456789',
        feedback: '',
        questions: '',
        source: '',
      },
      { requiredFields: ['feedback', 'questions', 'source'] },
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.feedback).toBeUndefined();
    expect(result.errors.questions).toBeUndefined();
    expect(result.errors.source).toBe('Nguồn là trường bắt buộc');
  });

  test('reports phone validation errors for invalid input shapes', () => {
    const cases = [
      ['', 'Vui lòng nhập số điện thoại'],
      ['0123abcd89', 'Số điện thoại chỉ được chứa chữ số'],
      ['012345678', 'Số điện thoại phải có đúng 10 chữ số'],
      ['1123456789', 'Số điện thoại phải bắt đầu bằng số 0'],
    ];

    for (const [phone, message] of cases) {
      const errors = {};
      validatePhone(phone, errors);
      expect(errors.phone).toBe(message);
    }
  });

  test('normalizes non-string core fields and labels unknown required fields', () => {
    const result = validateRegistrationForm(
      {
        name: 123,
        email: ' PERSON@EXAMPLE.COM ',
        phone: '012 345-6789',
        customField: '',
      },
      { requiredFields: ['name', 'email', 'phone', 'customField'] },
    );

    expect(result.sanitized).toEqual(expect.objectContaining({
      name: '123',
      email: 'person@example.com',
      phone: '0123456789',
    }));
    expect(result.errors.customField).toBe('customField là trường bắt buộc');
  });

  test('reports email validation errors', () => {
    const emptyErrors = {};
    validateEmail('', emptyErrors);
    expect(emptyErrors.email).toBe('Vui lòng nhập email');

    const formatErrors = {};
    validateEmail('not-an-email', formatErrors);
    expect(formatErrors.email).toBe('Email không đúng định dạng');
  });
});
