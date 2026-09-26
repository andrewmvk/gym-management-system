import { describe, expect, it, vi } from 'vitest';
import { onMemberActivated, subscribeToMemberActivated } from '@api/modules/auth/member-activated';

describe('member-activated', () => {
  it('calls every subscriber with the activated userId', async () => {
    const subscriber = vi.fn();
    subscribeToMemberActivated(subscriber);

    await onMemberActivated('user-1');

    expect(subscriber).toHaveBeenCalledWith('user-1');
  });

  it('does not let a throwing subscriber break the others or reject', async () => {
    const failing = vi.fn(() => {
      throw new Error('boom');
    });
    const succeeding = vi.fn();
    subscribeToMemberActivated(failing);
    subscribeToMemberActivated(succeeding);

    await expect(onMemberActivated('user-2')).resolves.toBeUndefined();

    expect(failing).toHaveBeenCalledWith('user-2');
    expect(succeeding).toHaveBeenCalledWith('user-2');
  });
});
