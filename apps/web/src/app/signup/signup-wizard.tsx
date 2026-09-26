'use client';

import { useEffect, useState } from 'react';
import { BasicInfoStep } from '@/app/signup/basic-info-step';
import { PhotoStep } from '@/app/signup/photo-step';

const STORAGE_KEY = 'cadence-signup-user-id';

type Step = 'basic-info' | 'photo' | 'unavailable';

// The userId is kept in sessionStorage (not a cookie): there is no session before aptitude clearance
// (FR-9), and this is just a capability letting the browser resume the wizard after a reload.
export function SignupWizard() {
  const [step, setStep] = useState<Step>('basic-info');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const storedUserId = sessionStorage.getItem(STORAGE_KEY);
    if (storedUserId) {
      setUserId(storedUserId);
      setStep('photo');
    }
  }, []);

  function handleResolved(result: { userId: string; nextStep: 'photo' | 'done' }) {
    sessionStorage.setItem(STORAGE_KEY, result.userId);
    setUserId(result.userId);
    setStep(result.nextStep === 'photo' ? 'photo' : 'unavailable');
  }

  if (step === 'basic-info') return <BasicInfoStep onResolved={handleResolved} />;
  if (step === 'photo' && userId) return <PhotoStep userId={userId} />;
  return (
    <p className="max-w-sm text-center text-sm text-muted-foreground">
      Your basic information and photo are already saved. The next step of the signup flow is coming soon.
    </p>
  );
}
