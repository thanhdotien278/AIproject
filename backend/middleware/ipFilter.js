const DEFAULT_ALLOWED = [
  '127.0.0.1',
  '::1',
  '192.168.0.0/24',
  '172.20.10.0/24',
  '192.168.63.0/24',
  '192.168.62.0/24',
  '192.168.34.0/24',
  '192.168.2.0/24',
  '192.168.1.0/24',
];

function isIpv4(value) {
  return typeof value === 'string' && /^\d{1,3}(\.\d{1,3}){3}$/.test(value);
}

function ipv4ToInt(ip) {
  if (!isIpv4(ip)) return null;
  const parts = ip.split('.').map(Number);
  if (parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function cidrContains(ip, cidr) {
  if (typeof cidr !== 'string' || !cidr.includes('/')) return false;
  const [base, maskStr] = cidr.split('/');
  const maskBits = Number(maskStr);
  if (!Number.isInteger(maskBits) || maskBits < 0 || maskBits > 32) return false;

  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(base);
  if (ipInt === null || baseInt === null) return false;

  const mask = maskBits === 0 ? 0 : ((0xffffffff << (32 - maskBits)) >>> 0);
  return (ipInt & mask) === (baseInt & mask);
}

function normalizeIp(raw) {
  if (typeof raw !== 'string') return null;
  let ip = raw.trim();
  if (!ip) return null;

  // x-forwarded-for can be a comma-separated list: "client, proxy1, proxy2"
  if (ip.includes(',')) ip = ip.split(',')[0].trim();

  // Handle IPv6-mapped IPv4 addresses (e.g., ::ffff:192.168.0.1)
  if (ip.includes('::ffff:')) ip = ip.split(':').pop();

  // Strip IPv4 port suffix if present (e.g., 203.0.113.5:1234)
  if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.split(':')[0];

  return ip || null;
}

function extractClientIp(req) {
  return (
    normalizeIp(req?.headers?.['x-forwarded-for']) ||
    normalizeIp(req?.connection?.remoteAddress) ||
    normalizeIp(req?.socket?.remoteAddress) ||
    normalizeIp(req?.connection?.socket?.remoteAddress) ||
    normalizeIp(req?.ip) ||
    null
  );
}

function isIpAllowed(clientIp, allowedList) {
  if (!clientIp) return false;
  const list = Array.isArray(allowedList) ? allowedList : [];

  return list.some(entry => {
    if (!entry) return false;
    if (entry instanceof RegExp) return entry.test(clientIp);
    if (typeof entry !== 'string') return false;

    if (entry.includes('/')) return cidrContains(clientIp, entry);
    return entry === clientIp;
  });
}

function renderDeniedHtml() {
  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Truy cập bị từ chối</title>
      <style>
        body {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          font-family: sans-serif;
          background-color: #f0f0f0;
          color: #333;
          text-align: center;
          padding: 20px;
        }
        .message-container {
          background-color: #fff;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        h1 {
          font-size: 1.8em;
          color: #d9534f;
          margin-bottom: 15px;
        }
        p {
          font-size: 1.2em;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      <div class="message-container">
        <h1>Truy cập bị từ chối</h1>
        <p>Chỉ truy cập được khi có mặt tại hội trường.<br>Xin hãy kết nối wifi <strong>HVQY-hoinghi</strong>!</p>
      </div>
    </body>
    </html>
  `;
}

function createIpFilter(options = {}) {
  const allowedList = Array.isArray(options.allowedList) ? options.allowedList : DEFAULT_ALLOWED;
  const denyMessageVi = options.denyMessageVi || 'Truy cập bị từ chối. IP không được phép.';

  return (req, res, next) => {
    const clientIp = extractClientIp(req);
    const allowed = isIpAllowed(clientIp, allowedList);

    if (allowed) return next();

    console.log(`Access denied for IP: ${clientIp}`);

    const acceptHeader = typeof req?.headers?.accept === 'string' ? req.headers.accept : '';
    const wantsJson =
      acceptHeader.includes('application/json') ||
      (typeof req?.originalUrl === 'string' && req.originalUrl.startsWith('/api')) ||
      (typeof req?.path === 'string' && req.path.startsWith('/api'));

    if (wantsJson) {
      return res.status(403).json({ error: 'Forbidden', message: denyMessageVi });
    }

    return res.status(403).send(renderDeniedHtml());
  };
}

const ipFilter = createIpFilter();
ipFilter.createIpFilter = createIpFilter;
ipFilter.extractClientIp = extractClientIp;
ipFilter.isIpAllowed = isIpAllowed;
ipFilter._testOnly = { normalizeIp, cidrContains, ipv4ToInt, isIpv4, DEFAULT_ALLOWED };

module.exports = ipFilter;
