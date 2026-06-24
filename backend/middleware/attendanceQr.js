const { validateToken } = require('../services/attendanceQrStore');

function requireValidAttendanceQrToken(req, res, next) {
  const token = req.query.token || req.query.t;
  const result = validateToken(token);

  if (!result.ok) {
    const message = result.code === 'expired' ? 'Mã QR đã hết hạn' : 'Mã QR không hợp lệ';
    return res.status(410).render('error', { message, layout: false });
  }

  req.attendanceQr = result.record;
  return next();
}

module.exports = {
  requireValidAttendanceQrToken,
};
