const ipFilter = (req, res, next) => {
  let clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || (req.connection.socket ? req.connection.socket.remoteAddress : null);

  // Handle IPv6-mapped IPv4 addresses (e.g., ::ffff:192.168.0.1)
  if (clientIp && clientIp.includes('::ffff:')) {
    clientIp = clientIp.split(':').pop();
  }

  const allowedIpRanges = [
    /^127\.0\.0\.1$/,
    /^::1$/,
    /^192\.168\.0\.\d{1,3}$/,
    /^172\.20\.10\.\d{1,3}$/,
    /^192\.168\.2\.\d{1,3}$/,
    /^192\.168\.1\.\d{1,3}$/
  ];

  const isAllowed = clientIp && allowedIpRanges.some(regex => regex.test(clientIp));

  if (isAllowed) {
    next();
  } else {
    console.log(`Access denied for IP: ${clientIp}`);
    const htmlMessage = `
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
            font-size: 1.8em; /* Increased font size */
            color: #d9534f;
            margin-bottom: 15px;
          }
          p {
            font-size: 1.2em; /* Increased font size */
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
    res.status(403).send(htmlMessage);
  }
};

module.exports = ipFilter; 