import { createExpressMiddleware } from '@trpc/server/adapters/express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import type { Env } from '@api/config/env';
import { requestLogger } from '@api/lib/request-logger';
import { appRouter } from '@api/trpc/app-router';
import { createContext } from '@api/trpc/context';

export function createApp(env: Env) {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(cookieParser());
  app.use(
    '/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ error, path, ctx }) => {
        if (error.code === 'INTERNAL_SERVER_ERROR') {
          ctx?.log.error({ err: error, route: path }, 'unhandled tRPC error');
        }
      },
    }),
  );

  return app;
}
