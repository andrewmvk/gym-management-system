import { pino } from 'pino';
import { env } from '@api/config/env';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  base: { service: 'api' },
  redact: ['req.headers.cookie', 'req.headers.authorization', 'req.headers["x-kiosk-key"]'],
});

export type Logger = typeof logger;
