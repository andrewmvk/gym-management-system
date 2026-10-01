'use client';

import type { AppAbility } from '@cadence/shared/auth';
import { AbilityProvider, type CanProps, Can as CaslCan, useAbility } from '@casl/react';

export { AbilityProvider };

export function Can(props: CanProps<AppAbility>) {
  return <CaslCan {...props} />;
}

export function useAppAbility() {
  return useAbility<AppAbility>();
}
