import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`)
  ),
  transports: [
    new winston.transports.Console()
  ]
});

const loggerMiddleware = (req, res, next) => {
  if (process.env.DEBUG_LOGGING !== 'false') {
    const start = Date.now();
    const { method, url, body, query } = req;
    logger.info(`INCOMING ${method} ${url}`);
    if (Object.keys(query).length) logger.info(`Query Params: ${JSON.stringify(query)}`);
    if (Object.keys(body).length) logger.info(`Payload: ${JSON.stringify(body)}`);
    const originalSend = res.send;
    res.send = function (data) {
      const duration = Date.now() - start;
      logger.info(`OUTGOING ${res.statusCode} (${duration}ms)`);
      try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        logger.info(`Response: ${JSON.stringify(parsedData)}`);
      } catch (e) {
        logger.info(`Response (raw): ${data}`);
      }
      return originalSend.apply(res, arguments);
    };
  }
  next();
};

export { logger, loggerMiddleware };
