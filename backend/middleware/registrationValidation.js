const PHONE_REGEX = /^0\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OPTIONAL_FIELDS = new Set(['feedback', 'questions']);

const FIELD_LABELS_VI = {
  name: 'Họ và tên',
  email: 'Email',
  phone: 'Số điện thoại',
  studentId: 'Mã số sinh viên/nhân viên',
  employeeId: 'Mã số sinh viên/nhân viên',
  idNumber: 'Mã số sinh viên/nhân viên',
  department: 'Khoa/Lớp',
  className: 'Khoa/Lớp',
  address: 'Địa chỉ',
  nationality: 'Quốc tịch',
  workunit: 'Đơn vị',
  targetAudience: 'Đối tượng',
  rank: 'Cấp bậc',
  academic: 'Học hàm/học vị',
  position: 'Chức vụ',
  speciality: 'Chuyên ngành',
  age: 'Tuổi',
  business: 'Lĩnh vực',
  role: 'Vai trò',
  feedback: 'Góp ý',
  questions: 'Câu hỏi',
  source: 'Nguồn',
};

function toStringOrEmpty(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  return String(value);
}

function sanitizePhone(raw) {
  const v = toStringOrEmpty(raw).trim();
  // Remove common separators but do not transform country codes.
  return v.replace(/[ \t\r\n-]/g, '');
}

function sanitizeEmail(raw) {
  return toStringOrEmpty(raw).trim().toLowerCase();
}

function sanitizeName(raw) {
  return toStringOrEmpty(raw).trim();
}

function labelFor(field) {
  return FIELD_LABELS_VI[field] || field;
}

function validateRequiredField(field, value, errors) {
  const v = toStringOrEmpty(value).trim();
  if (!v) errors[field] = `${labelFor(field)} là trường bắt buộc`;
}

function validatePhone(phone, errors) {
  const raw = sanitizePhone(phone);
  if (!raw) {
    errors.phone = 'Vui lòng nhập số điện thoại';
    return raw;
  }
  if (!/^\d+$/.test(raw)) {
    errors.phone = 'Số điện thoại chỉ được chứa chữ số';
    return raw;
  }
  if (raw.length !== 10) {
    errors.phone = 'Số điện thoại phải có đúng 10 chữ số';
    return raw;
  }
  if (!raw.startsWith('0')) {
    errors.phone = 'Số điện thoại phải bắt đầu bằng số 0';
    return raw;
  }
  if (!PHONE_REGEX.test(raw)) {
    errors.phone = 'Số điện thoại không hợp lệ';
  }
  return raw;
}

function validateEmail(email, errors) {
  const raw = sanitizeEmail(email);
  if (!raw) {
    errors.email = 'Vui lòng nhập email';
    return raw;
  }
  if (!EMAIL_REGEX.test(raw)) {
    errors.email = 'Email không đúng định dạng';
  }
  return raw;
}

function validateRegistrationForm(formData, { requiredFields = [] } = {}) {
  const errors = {};
  const sanitized = { ...formData };

  const name = sanitizeName(formData?.name);
  sanitized.name = name;
  if (!name) errors.name = 'Vui lòng nhập họ và tên';

  const email = validateEmail(formData?.email, errors);
  sanitized.email = email;

  const phone = validatePhone(formData?.phone, errors);
  sanitized.phone = phone;

  for (const field of requiredFields) {
    if (field === 'name' || field === 'email' || field === 'phone') continue;
    if (OPTIONAL_FIELDS.has(field)) continue;
    validateRequiredField(field, formData?.[field], errors);
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  };
}

module.exports = {
  validatePhone,
  validateEmail,
  validateRegistrationForm,
};
