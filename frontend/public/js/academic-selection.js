(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.__academicSelection = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const TITLE_VALUES = ['GS', 'PGS'];
  const DEGREE_VALUES = ['TS', 'ThS', 'Cử nhân'];
  const DISPLAY_LABELS = {
    GS: 'GS.',
    PGS: 'PGS.',
    TS: 'TS.',
    ThS: 'ThS.',
    'Cử nhân': 'Cử nhân',
    'Khác': 'Khác',
  };

  function toStringOrEmpty(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    return String(value);
  }

  function foldText(value) {
    return toStringOrEmpty(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function hasWord(value, word) {
    return new RegExp(`(^|[^a-z])${word}([^a-z]|$)`).test(value);
  }

  function segmentMatches(segment) {
    const folded = foldText(segment);
    const values = [];

    if (hasWord(folded, 'gs') || (/\bgiao\s+su\b/.test(folded) && !/\bpho\s+giao\s+su\b/.test(folded))) {
      values.push('GS');
    }
    if (hasWord(folded, 'pgs') || /\bpho\s+giao\s+su\b/.test(folded)) {
      values.push('PGS');
    }
    if (hasWord(folded, 'ts') || /\btien\s+si\b/.test(folded)) {
      values.push('TS');
    }
    if (hasWord(folded, 'ths') || /\bthac\s+si\b/.test(folded)) {
      values.push('ThS');
    }
    if (/\bcu\s+nhan\b/.test(folded)) {
      values.push('Cử nhân');
    }
    if (hasWord(folded, 'khac')) {
      values.push('Khác');
    }

    return values;
  }

  function parseAcademicSelection(input) {
    const selected = new Set();
    const unknown = [];
    const rawItems = Array.isArray(input) ? input : toStringOrEmpty(input).split(/[,;\/\n]+/);

    rawItems.forEach(item => {
      const segment = toStringOrEmpty(item).trim();
      if (!segment) return;

      const matches = segmentMatches(segment);
      if (matches.length === 0) {
        unknown.push(segment);
        return;
      }

      matches.forEach(value => selected.add(value));
    });

    return {
      selected,
      unknown,
      hasTitle: TITLE_VALUES.some(value => selected.has(value)),
      hasDegree: DEGREE_VALUES.some(value => selected.has(value)),
      isEmpty: selected.size === 0 && unknown.length === 0,
    };
  }

  function validateAcademicSelection(input) {
    const parsed = input && input.selected instanceof Set ? input : parseAcademicSelection(input);
    const errors = [];
    const selectedTitles = TITLE_VALUES.filter(value => parsed.selected.has(value));
    const selectedDegrees = DEGREE_VALUES.filter(value => parsed.selected.has(value));
    const hasStandard = selectedTitles.length > 0 || selectedDegrees.length > 0;

    if (selectedTitles.length > 1) {
      errors.push('Không thể chọn đồng thời GS. và PGS.');
    }
    if (selectedDegrees.length > 1) {
      errors.push('Chỉ được chọn một học vị: Cử nhân, ThS. hoặc TS.');
    }
    if (selectedTitles.length > 0 && !parsed.selected.has('TS')) {
      errors.push('Nếu chọn GS./PGS. thì học vị phải là TS.');
    }
    if (parsed.selected.has('Khác') && (hasStandard || parsed.unknown.length > 0)) {
      errors.push('Không thể chọn Khác đồng thời với học hàm/học vị chuẩn.');
    }
    if (parsed.unknown.length > 0 && hasStandard) {
      errors.push('Không thể nhập giá trị khác đồng thời với học hàm/học vị chuẩn.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      parsed,
    };
  }

  function formatAcademicSelection(input) {
    const parsed = input && input.selected instanceof Set ? input : parseAcademicSelection(input);
    const parts = [];

    ['GS', 'PGS', 'TS', 'ThS', 'Cử nhân', 'Khác'].forEach(value => {
      if (parsed.selected.has(value)) parts.push(DISPLAY_LABELS[value]);
    });

    if (parts.length > 0) return parts.join(' ');
    return parsed.unknown.join(', ');
  }

  function normalizeAcademicSelection(input) {
    const parsed = parseAcademicSelection(input);
    const validation = validateAcademicSelection(parsed);
    const formatted = formatAcademicSelection(parsed);

    return {
      isValid: validation.isValid,
      errors: validation.errors,
      parsed,
      formatted,
      value: validation.isValid ? formatted : '',
    };
  }

  return {
    parseAcademicSelection,
    validateAcademicSelection,
    formatAcademicSelection,
    normalizeAcademicSelection,
  };
});
