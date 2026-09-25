import type { Logger } from '@api/lib/logger';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      log: Logger;
    }
  }
}

export {};
