import { logger } from '@api/lib/logger';

const log = logger.child({ module: 'auth' });

type RegistrationCompletedSubscriber = (userId: string) => Promise<void> | void;

const subscribers: RegistrationCompletedSubscriber[] = [];

export function subscribeToRegistrationCompleted(subscriber: RegistrationCompletedSubscriber) {
  subscribers.push(subscriber);
}

// A failing subscriber is logged, never thrown: the registration already succeeded by the time this
// runs, so nothing downstream may undo or fail that response.
export async function onRegistrationCompleted(userId: string): Promise<void> {
  await Promise.all(
    subscribers.map(async (subscriber) => {
      try {
        await subscriber(userId);
      } catch (error) {
        log.error({ error, userId }, 'onRegistrationCompleted subscriber failed');
      }
    }),
  );
}
