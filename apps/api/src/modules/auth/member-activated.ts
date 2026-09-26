import { logger } from '@api/lib/logger';

const log = logger.child({ module: 'auth' });

type MemberActivatedSubscriber = (userId: string) => Promise<void> | void;

const subscribers: MemberActivatedSubscriber[] = [];

// P-12 (the onboarding invite e-mail) subscribes here once it exists; there are no subscribers yet.
export function subscribeToMemberActivated(subscriber: MemberActivatedSubscriber) {
  subscribers.push(subscriber);
}

// A failing subscriber is logged, never thrown: FR-9's activation already succeeded by the time this
// runs, so nothing downstream may undo or fail that response.
export async function onMemberActivated(userId: string): Promise<void> {
  await Promise.all(
    subscribers.map(async (subscriber) => {
      try {
        await subscriber(userId);
      } catch (error) {
        log.error({ error, userId }, 'onMemberActivated subscriber failed');
      }
    }),
  );
}
