'use client';

import { useEffect, useState } from 'react';
import { AptitudeResultStep } from '@/app/signup/aptitude-result-step';
import { BasicInfoStep } from '@/app/signup/basic-info-step';
import { ConsentStep } from '@/app/signup/consent-step';
import { PasswordStep } from '@/app/signup/password-step';
import { PhotoStep } from '@/app/signup/photo-step';
import { QuestionnaireStep } from '@/app/signup/questionnaire-step';
import { useTRPCClient } from '@/lib/trpc';

const STORAGE_KEY = 'cadence-signup-user-id';

type AptitudeOutcome = 'cleared' | 'certificate_required' | 'pending_retry';
type Step = 'basic-info' | 'consent' | 'photo' | 'questionnaire' | 'aptitude-result' | 'password';

// The userId is kept in sessionStorage (not a cookie): there is no session before aptitude clearance
// (FR-9), and this is just a capability letting the browser resume the wizard after a reload.
export function SignupWizard() {
  const trpcClient = useTRPCClient();
  const [step, setStep] = useState<Step>('basic-info');
  const [userId, setUserId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Exclude<AptitudeOutcome, 'cleared'> | null>(null);

  // "cleared" goes straight to the password step (P-09); the other two outcomes render on
  // aptitude-result instead.
  function goToAptitudeStep(status: AptitudeOutcome) {
    if (status === 'cleared') {
      setStep('password');
      return;
    }
    setOutcome(status);
    setStep('aptitude-result');
  }

  // FR-46 / RN-12: a resumed signup goes through consent again by default, since a plain reload can't
  // tell whether photo (and thus consent) already happened. If a questionnaire already exists for this
  // applicant, that's proof photo and consent are both done, so skip straight to its result instead.
  useEffect(() => {
    const storedUserId = sessionStorage.getItem(STORAGE_KEY);
    if (!storedUserId) return;
    setUserId(storedUserId);
    setStep('consent');

    trpcClient.aptitude.getStatus
      .query({ userId: storedUserId })
      .then((result) => {
        if (result.status === 'not_submitted' || result.status === 'unavailable') return;
        goToAptitudeStep(result.status);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trpcClient]);

  function handleResolved(result: { userId: string; nextStep: 'photo' | 'done' }) {
    sessionStorage.setItem(STORAGE_KEY, result.userId);
    setUserId(result.userId);

    if (result.nextStep === 'photo') {
      setStep('consent');
      return;
    }

    // nextStep === 'done': the reference photo (and thus consent) is already saved for this e-mail.
    void trpcClient.aptitude.getStatus.query({ userId: result.userId }).then((status) => {
      if (status.status === 'not_submitted' || status.status === 'unavailable') {
        setStep('questionnaire');
        return;
      }
      goToAptitudeStep(status.status);
    });
  }

  if (step === 'basic-info') return <BasicInfoStep onResolved={handleResolved} />;
  if (step === 'consent' && userId) return <ConsentStep userId={userId} onConsented={() => setStep('photo')} />;
  if (step === 'photo' && userId) return <PhotoStep userId={userId} onSaved={() => setStep('questionnaire')} />;
  if (step === 'questionnaire' && userId) {
    return <QuestionnaireStep userId={userId} onResolved={(result) => goToAptitudeStep(result)} />;
  }
  if (step === 'aptitude-result' && userId && outcome) {
    return <AptitudeResultStep userId={userId} outcome={outcome} onRechecked={(result) => goToAptitudeStep(result)} />;
  }
  if (step === 'password' && userId) return <PasswordStep userId={userId} />;
  return null;
}
