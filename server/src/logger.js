// Structured logger built on Pino.
// Dev: pretty-printed, single-line, coloured.
// Prod: JSON, ready for log aggregators (Datadog / Loki / Logtail).
import 'dotenv/config';
import pino from 'pino';
import pinoHttp from 'pino-http';
import crypto from 'node:crypto';

const isProd = process.env.NODE_ENV === 'production';
const level = process.env.LOG_LEVEL || (isProd ? 'info' : 'debug');

export const logger = pino({
  level,
  base: { service: 'pmb-api' },
  // PII redaction — never log raw phone numbers / OTP codes / payment IDs in plaintext
  redact: {
    paths: [
      '*.password',
      '*.password_hash',
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.otp',
      'req.body.code',
      'req.body.razorpay_payment_id',
      'req.body.razorpay_signature',
    ],
    censor: '[redacted]',
  },
  ...(isProd ? {} : {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname,service,req,res,reqId',
        colorize: true,
        singleLine: true,
      },
    },
  }),
});

// Per-request HTTP logger middleware. Attaches a unique request ID and logs
// method / path / status / duration on completion.
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-request-id'] || crypto.randomBytes(8).toString('hex'),
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} → ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} → ${res.statusCode} ${err.message}`,
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url, ip: req.ip }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
