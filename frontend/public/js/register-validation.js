(() => {
  const PHONE_REGEX = /^0\d{9}$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const booleanFields = new Set(['speech', 'lunch', 'dinner', 'transport', 'qime']);
  const optionalFields = new Set(['feedback', 'questions']);

  const labels = {
    name: 'Họ và tên',
    email: 'Email',
    phone: 'Số điện thoại',
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

  function labelFor(field) {
    return labels[field] || field;
  }

  function sanitizePhone(value) {
    return String(value ?? '').trim().replace(/[ \t\r\n-]/g, '');
  }

  function sanitizeEmail(value) {
    return String(value ?? '').trim().toLowerCase();
  }

  function getFieldShell(el) {
    if (!el) return null;
    return (
      el.closest('.flex-grow.bg-gray-200') ||
      el.closest('.flex-grow') ||
      el.parentElement ||
      null
    );
  }

  function getErrorEl(form, field) {
    const id = `field-error-${field}`;
    let node = form.querySelector(`#${CSS.escape(id)}`);
    if (node) return node;

    node = document.createElement('div');
    node.id = id;
    node.className = 'mt-1 text-xs text-red-600';
    node.style.display = 'none';

    const target =
      field === 'workunit'
        ? form.querySelector('#workunit-detail') || form.querySelector('#workunit-type')
        : form.querySelector(`[name="${CSS.escape(field)}"]`);
    const row =
      target?.closest('.flex.items-center') ||
      target?.closest('.grid') ||
      target?.parentElement ||
      form;

    row.insertAdjacentElement('afterend', node);
    return node;
  }

  function setFieldState(form, field, el, { valid, message }) {
    const shell = getFieldShell(el);
    const errEl = getErrorEl(form, field);

    if (shell) {
      shell.classList.remove('ring-2', 'ring-red-500', 'ring-green-500');
      if (valid === false) shell.classList.add('ring-2', 'ring-red-500');
      if (valid === true) shell.classList.add('ring-2', 'ring-green-500');
    }

    if (!errEl) return;
    if (!message) {
      errEl.textContent = '';
      errEl.style.display = 'none';
    } else {
      errEl.textContent = message;
      errEl.style.display = '';
    }
  }

  function validateRequired(form, field, el) {
    const value = String(el?.value ?? '').trim();
    if (!value) {
      setFieldState(form, field, el, { valid: false, message: `${labelFor(field)} là trường bắt buộc` });
      return false;
    }
    setFieldState(form, field, el, { valid: true });
    return true;
  }

  function checkPhone(el) {
    const raw = sanitizePhone(el?.value ?? '');
    return {
      raw,
      ok: PHONE_REGEX.test(raw),
      reason: !raw
        ? 'empty'
        : !/^\d+$/.test(raw)
          ? 'nonDigits'
          : raw.length !== 10
            ? 'length'
            : !raw.startsWith('0')
              ? 'start'
              : 'invalid',
    };
  }

  function validatePhoneField(form, el, { silent = false } = {}) {
    const { raw, ok, reason } = checkPhone(el);
    if (el) el.value = raw;
    if (silent) return ok;

    if (ok) {
      setFieldState(form, 'phone', el, { valid: true });
      return true;
    }

    const message =
      reason === 'empty'
        ? 'Vui lòng nhập số điện thoại'
        : reason === 'nonDigits'
          ? 'Số điện thoại chỉ được chứa chữ số'
          : reason === 'length'
            ? 'Số điện thoại phải có đúng 10 chữ số'
            : reason === 'start'
              ? 'Số điện thoại phải bắt đầu bằng số 0'
              : 'Số điện thoại không hợp lệ';

    setFieldState(form, 'phone', el, { valid: false, message });
    return false;
  }

  function checkEmail(el) {
    const raw = sanitizeEmail(el?.value ?? '');
    return { raw, ok: EMAIL_REGEX.test(raw) };
  }

  function validateEmailField(form, el, { silent = false } = {}) {
    const { raw, ok } = checkEmail(el);
    if (el) el.value = raw;
    if (silent) return ok;

    if (!raw) {
      setFieldState(form, 'email', el, { valid: false, message: 'Vui lòng nhập email' });
      return false;
    }
    if (!ok) {
      setFieldState(form, 'email', el, { valid: false, message: 'Email không đúng định dạng (ví dụ: example@email.com)' });
      return false;
    }
    setFieldState(form, 'email', el, { valid: true });
    return true;
  }

  function getConfig() {
    const cfg = window.__REGISTER_VALIDATION_CONFIG || {};
    const registrationFields = Array.isArray(cfg.registrationFields) ? cfg.registrationFields : [];
    const requiredFields = new Set(
      registrationFields.filter(f => typeof f === 'string' && f && !booleanFields.has(f) && !optionalFields.has(f)),
    );
    requiredFields.add('name');
    requiredFields.add('email');
    requiredFields.add('phone');
    return { requiredFields };
  }

  function validateField(form, field, { silent = false } = {}) {
    if (field === 'phone') return validatePhoneField(form, form.querySelector('#phone'), { silent });
    if (field === 'email') return validateEmailField(form, form.querySelector('#email'), { silent });
    if (field === 'academic') {
      const el = form.querySelector('#academic');
      const raw = String(el?.value ?? '').trim();
      if (!raw) {
        if (!silent) setFieldState(form, 'academic', el, { valid: false, message: `${labelFor(field)} là trường bắt buộc` });
        return false;
      }

      const academic = window.__academicSelection?.normalizeAcademicSelection(raw);
      if (academic && !academic.isValid) {
        if (!silent) setFieldState(form, 'academic', el, { valid: false, message: academic.errors[0] });
        return false;
      }

      if (academic && el) el.value = academic.value;
      if (!silent) setFieldState(form, 'academic', el, { valid: true });
      return true;
    }

    // workunit is composed in the UI
    if (field === 'workunit') {
      const typeEl = form.querySelector('#workunit-type');
      const detailEl = form.querySelector('#workunit-detail');
      const okType = typeEl ? (silent ? !!String(typeEl.value ?? '').trim() : validateRequired(form, 'workunit', typeEl)) : true;
      const okDetail = detailEl
        ? (silent ? !!String(detailEl.value ?? '').trim() : validateRequired(form, 'workunit', detailEl))
        : true;
      return okType && okDetail;
    }

    const el = form.querySelector(`[name="${CSS.escape(field)}"]`);
    if (!el) return true;
    if (el.type === 'checkbox') return true;
    if (silent) return !!String(el.value ?? '').trim();
    return validateRequired(form, field, el);
  }

  function validateAll(form, { silent = false } = {}) {
    const { requiredFields } = getConfig();
    let ok = true;
    for (const field of requiredFields) {
      ok = validateField(form, field, { silent }) && ok;
    }
    return ok;
  }

  function focusFirstInvalid(form) {
    const first = form.querySelector('.ring-red-500');
    if (first) {
      const input = first.querySelector('input,select,textarea');
      (input || first).focus?.();
    }
  }

  function updateSubmitState(form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn) return;
    submitBtn.disabled = !validateAll(form, { silent: true });
    submitBtn.classList.toggle('opacity-60', submitBtn.disabled);
    submitBtn.classList.toggle('cursor-not-allowed', submitBtn.disabled);
  }

  function applyServerErrors(form, errors) {
    if (!errors || typeof errors !== 'object') return;
    for (const [field, message] of Object.entries(errors)) {
      const el =
        field === 'workunit' ? form.querySelector('#workunit-detail') : form.querySelector(`[name="${CSS.escape(field)}"]`);
      setFieldState(form, field, el, { valid: false, message });
    }
    focusFirstInvalid(form);
  }

  function init(form) {
    if (!form) return;

    const { requiredFields } = getConfig();
    for (const field of requiredFields) {
      const el =
        field === 'workunit'
          ? form.querySelector('#workunit-detail') || form.querySelector('#workunit-type')
          : form.querySelector(`[name="${CSS.escape(field)}"]`) || form.querySelector(`#${CSS.escape(field)}`);
      if (!el) continue;

      const onBlur = () => {
        validateField(form, field, { silent: false });
        updateSubmitState(form);
      };
      const onInput = () => {
        const errEl = getErrorEl(form, field);
        const hasError = errEl && errEl.style.display !== 'none';
        validateField(form, field, { silent: field !== 'academic' && !hasError });
        updateSubmitState(form);
      };

      el.addEventListener('blur', onBlur);
      el.addEventListener('input', onInput);
      if (el.tagName === 'SELECT') el.addEventListener('change', onInput);
    }

    const phoneEl = form.querySelector('#phone');
    if (phoneEl) {
      phoneEl.addEventListener('blur', () => updateSubmitState(form));
      phoneEl.addEventListener('input', () => updateSubmitState(form));
    }

    const emailEl = form.querySelector('#email');
    if (emailEl) {
      emailEl.addEventListener('blur', () => updateSubmitState(form));
      emailEl.addEventListener('input', () => updateSubmitState(form));
    }

    // initial state
    updateSubmitState(form);
  }

  window.__registerValidation = {
    init,
    validateAllAndReport(form) {
      const ok = validateAll(form, { silent: false });
      if (!ok) focusFirstInvalid(form);
      return ok;
    },
    applyServerErrors,
    updateSubmitState,
  };
})();
