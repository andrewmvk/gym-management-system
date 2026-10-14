'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type PwaInstallState =
  | { status: 'installed' }
  | { status: 'promptable'; install: () => Promise<void> }
  | { status: 'ios-manual' }
  | { status: 'unavailable' };

const UNAVAILABLE: PwaInstallState = { status: 'unavailable' };

function isStandalone() {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

function isIosSafari() {
  const nav = window.navigator;
  const isIos = /iphone|ipad|ipod/i.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  return isIos && /safari/i.test(nav.userAgent) && !/crios|fxios|edgios/i.test(nav.userAgent);
}

// iOS Safari never fires beforeinstallprompt, so its manual Share -> Add to Home Screen path is detected instead
// of offered as a dead button. Detection runs in an effect, never during render, so the server and the first
// client paint both render nothing and the real state only appears after mount, with no hydration mismatch.
export function usePwaInstall(): PwaInstallState {
  const [state, setState] = useState<PwaInstallState>(UNAVAILABLE);

  useEffect(() => {
    if (isStandalone()) {
      setState({ status: 'installed' });
      return;
    }
    if (isIosSafari()) setState({ status: 'ios-manual' });

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setState({
        status: 'promptable',
        install: async () => {
          await promptEvent.prompt();
          const { outcome } = await promptEvent.userChoice;
          setState(outcome === 'accepted' ? { status: 'installed' } : UNAVAILABLE);
        },
      });
    };
    const handleAppInstalled = () => setState({ status: 'installed' });

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return state;
}
