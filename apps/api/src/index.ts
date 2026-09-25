import { createApp } from '@api/app';
import { env } from '@api/config/env';
import { logger } from '@api/lib/logger';

const server = createApp(env).listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT, nodeEnv: env.NODE_ENV }, 'api listening');
});

function shutdown(signal: NodeJS.Signals) {
  logger.info({ signal }, 'shutting down');
  server.close(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
