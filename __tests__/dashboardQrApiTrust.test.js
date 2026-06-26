const fs = require('fs');
const path = require('path');

describe('dashboard QR card', () => {
  test('trusts the attendance QR API state instead of recomputing conference timing', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../frontend/components/RealTimeConferenceAnalyticsDashboard.jsx'),
      'utf8',
    );

    expect(source).toContain("qrCodeDataUrl: data.state === 'available'");
    expect(source).toContain("message: getQrStateMessage(data)");
    expect(source).not.toMatch(/startDate.*qr|qr.*startDate|availableFromTime/i);
  });
});
