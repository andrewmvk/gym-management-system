import { createExpressMiddleware } from '@trpc/server/adapters/express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type RequestHandler } from 'express';
import type { Env } from '@api/config/env';
import { requestLogger } from '@api/lib/request-logger';
import { DEFAULT_REQUEST_MAX_BYTES, FILE_REQUEST_MAX_BYTES, FILE_UPLOAD_PROCEDURES } from '@api/lib/uploads';
import { createFilesRouter } from '@api/routes/files';
import { appRouter } from '@api/trpc/app-router';
import { createContext } from '@api/trpc/context';

function createTrpcHandler(maxBodySize: number) {
  return createExpressMiddleware({
    router: appRouter,
    createContext,
    maxBodySize,
    onError: ({ error, path, ctx }) => {
      if (error.code === 'INTERNAL_SERVER_ERROR') {
        ctx?.log.error({ err: error, route: path }, 'unhandled tRPC error');
      }
    },
  });
}

// A batched call names every procedure in the path ("/a.b,c.d"); it gets the larger limit if any of them carries files.
function trpcHandler(): RequestHandler {
  const defaultHandler = createTrpcHandler(DEFAULT_REQUEST_MAX_BYTES);
  const fileHandler = createTrpcHandler(FILE_REQUEST_MAX_BYTES);
  return (req, res, next) => {
    const procedures = req.path.slice(1).split(',');
    const carriesFiles = procedures.some((procedure) => FILE_UPLOAD_PROCEDURES.includes(procedure));
    return (carriesFiles ? fileHandler : defaultHandler)(req, res, next);
  };
}

export function createApp(env: Env) {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(cookieParser());
  app.use(createFilesRouter(env.UPLOADS_DIR));
  app.use('/trpc', trpcHandler());

  return app;
}
