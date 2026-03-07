// interceptero/logger.js

const loggerMiddleware = (req, res, next) => {
  if (process.env.DEBUG_LOGGING !== 'false') {
    const start = Date.now();
    const { method, url, body, query } = req;

    console.log(`\n--- 📥 [INCOMING] ${method} ${url} ---`);
    if (Object.keys(query).length) console.log("🔍 Query Params:", JSON.stringify(query, null, 2));
    if (Object.keys(body).length) console.log("📦 Payload:", JSON.stringify(body, null, 2));

    const originalSend = res.send;
    res.send = function (data) {
      const duration = Date.now() - start;
      console.log(`--- 📤 [OUTGOING] ${res.statusCode} (${duration}ms) ---`);
      try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        console.log("📄 Response:", JSON.stringify(parsedData, null, 2));
      } catch (e) {
        console.log("📄 Response (raw):", data);
      }
      console.log("------------------------------------------\n");
      return originalSend.apply(res, arguments);
    };
  }
  next();
};

module.exports = loggerMiddleware;
