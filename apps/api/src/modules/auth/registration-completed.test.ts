import { onRegistrationCompleted, subscribeToRegistrationCompleted } from '@api/modules/auth/registration-completed';
import { describe, expect, it, vi } from 'vitest';

describe('registration-completed', () => {
  it('calls every subscriber with the registered userId', async () => {
    const subscriber = vi.fn();
    subscribeToRegistrationCompleted(subscriber);

    await onRegistrationCompleted('user-1');

    expect(subscriber).toHaveBeenCalledWith('user-1');
  });

  it('does not let a throwing subscriber break the others or reject', async () => {
    const failing = vi.fn(() => {
      throw new Error('boom');
    });
    const succeeding = vi.fn();
    subscribeToRegistrationCompleted(failing);
    subscribeToRegistrationCompleted(succeeding);

    await expect(onRegistrationCompleted('user-2')).resolves.toBeUndefined();

    expect(failing).toHaveBeenCalledWith('user-2');
    expect(succeeding).toHaveBeenCalledWith('user-2');
  });
});
