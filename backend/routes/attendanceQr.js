const express = require('express');
const path = require('path');
const QRCode = require('qrcode');
const sharp = require('sharp');
const os = require('os');

const Conference = require('../models/Conference');
const { getOrCreateActiveToken, startCleanupTimer } = require('../services/attendanceQrStore');
const { getAttendanceQrAvailability } = require('../services/attendanceQrWindow');
const { requireValidAttendanceQrToken } = require('../middleware/attendanceQr');

const router = express.Router();

startCleanupTimer();

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const config of iface) {
      if (config.family === 'IPv4' && !config.internal) {
        return config.address;
      }
    }
  }
  return 'localhost';
}

async function generateQrDataUrl({ url, logoPath }) {
  const qrCodeBuffer = await QRCode.toBuffer(url, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });

  try {
    const logoSize = 60;
    const faviconBuffer = await sharp(logoPath).resize(logoSize, logoSize).png().toBuffer();
    const finalQRCode = await sharp(qrCodeBuffer)
      .composite([
        {
          input: faviconBuffer,
          top: Math.floor((300 - logoSize) / 2),
          left: Math.floor((300 - logoSize) / 2),
        },
      ])
      .png()
      .toBuffer();
    return `data:image/png;base64,${finalQRCode.toString('base64')}`;
  } catch (_e) {
    return `data:image/png;base64,${qrCodeBuffer.toString('base64')}`;
  }
}

// GET /api/attendance-qr?code=CONF
router.get('/api/attendance-qr', async (req, res) => {
  try {
    const conferenceCode = String(req.query.code || '').trim().toUpperCase();
    res.set('Cache-Control', 'no-store');

    if (!conferenceCode || conferenceCode === 'ALL') {
      return res.status(400).json({
        success: false,
        state: 'conference_required',
        message: 'Vui lòng chọn hội nghị',
      });
    }

    const conference = await Conference.findOne({ code: conferenceCode });
    if (!conference) {
      return res.status(404).json({
        success: false,
        state: 'conference_not_found',
        conferenceCode,
        message: 'Không tìm thấy hội nghị',
      });
    }

    if (!conference.isActive) {
      return res.status(403).json({
        success: false,
        state: 'conference_inactive',
        conferenceCode,
        message: 'Hội nghị chưa được kích hoạt',
      });
    }

    const availability = getAttendanceQrAvailability(conference);
    if (!availability.success) {
      return res.status(400).json(availability);
    }

    if (availability.state !== 'available') {
      return res.json(availability);
    }

    const ttlMs = availability.rotationTtlSeconds * 1000;
    const record = getOrCreateActiveToken({
      conferenceCode,
      now: availability.serverNow,
      ttlMs,
      maxExpiresAt: availability.closeAt,
    });

    // Use BASE_URL from env if available, otherwise construct from request
    let baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
      const port = process.env.PORT || 3000;
      // In production/cloud, req.get('host') is usually the domain name
      // In local dev, we might still want to try to find the local IP if accessing from mobile on same wifi
      if (process.env.NODE_ENV === 'production') {
        baseUrl = `${req.protocol}://${req.get('host')}`;
      } else {
        const ip = getLocalIpAddress();
        baseUrl = `http://${ip}:${port}`;
      }
    }
    // Remove trailing slash if present
    baseUrl = baseUrl.replace(/\/$/, '');

    const checkinUrl = `${baseUrl}/qr/checkin?token=${encodeURIComponent(record.token)}&code=${encodeURIComponent(
      conferenceCode,
    )}&ts=${record.createdAt}`;

    const logoPath = path.join(__dirname, '../../frontend/public/images/favicon.png');
    const qrCodeDataUrl = await generateQrDataUrl({ url: checkinUrl, logoPath });

    return res.json({
      ...availability,
      success: true,
      qrCodeDataUrl,
      token: record.token,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      ttlMs: record.ttlMs,
      ttlSeconds: availability.rotationTtlSeconds,
      checkinUrl,
    });
  } catch (error) {
    console.error('Error generating attendance QR:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate QR code' });
  }
});

// GET /qr/checkin?token=...&code=...
router.get('/qr/checkin', requireValidAttendanceQrToken, (req, res) => {
  const conferenceCode = req.attendanceQr?.conferenceCode || req.query.code;
  const codeParam = conferenceCode && conferenceCode !== 'all' ? `?code=${encodeURIComponent(conferenceCode)}` : '';
  return res.redirect(302, `/register${codeParam}`);
});

module.exports = router;
