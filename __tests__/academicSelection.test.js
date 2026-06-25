const {
  formatAcademicSelection,
  normalizeAcademicSelection,
  validateAcademicSelection,
} = require('../frontend/public/js/academic-selection');

describe('academic selection helper', () => {
  test.each([
    [['PGS', 'TS'], 'PGS. TS.'],
    [['TS', 'PGS'], 'PGS. TS.'],
    [['GS', 'TS'], 'GS. TS.'],
    [['TS', 'GS'], 'GS. TS.'],
    ['TS, PGS', 'PGS. TS.'],
    ['TS, GS', 'GS. TS.'],
    ['TS', 'TS.'],
    ['ThS', 'ThS.'],
    ['Cử nhân', 'Cử nhân'],
    ['Khác', 'Khác'],
  ])('formats %p as %s', (input, expected) => {
    expect(formatAcademicSelection(input)).toBe(expected);
    expect(normalizeAcademicSelection(input).value).toBe(expected);
  });

  test.each([
    [['GS', 'PGS', 'TS'], 'Không thể chọn đồng thời GS. và PGS.'],
    [['Cử nhân', 'ThS'], 'Chỉ được chọn một học vị: Cử nhân, ThS. hoặc TS.'],
    [['ThS', 'TS'], 'Chỉ được chọn một học vị: Cử nhân, ThS. hoặc TS.'],
    [['Cử nhân', 'TS'], 'Chỉ được chọn một học vị: Cử nhân, ThS. hoặc TS.'],
    [['PGS'], 'Nếu chọn GS./PGS. thì học vị phải là TS.'],
    [['GS'], 'Nếu chọn GS./PGS. thì học vị phải là TS.'],
    [['Khác', 'TS'], 'Không thể chọn Khác đồng thời với học hàm/học vị chuẩn.'],
  ])('rejects invalid academic selection %p', (input, expected) => {
    const result = validateAcademicSelection(input);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(expected);
  });
});
