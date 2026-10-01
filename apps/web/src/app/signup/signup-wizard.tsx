'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { AptitudeResultStep } from '@/app/signup/aptitude-result-step';
import { BasicInfoStep } from '@/app/signup/basic-info-step';
import { CertificateStep } from '@/app/signup/certificate-step';
import { CertificateWaitingStep } from '@/app/signup/certificate-waiting-step';
import { ConsentStep } from '@/app/signup/consent-step';
import { PasswordStep } from '@/app/signup/password-step';
import { PhotoStep } from '@/app/signup/photo-step';
import { QuestionnaireStep } from '@/app/signup/questionnaire-step';
import { RejectedStep } from '@/app/signup/rejected-step';
import { Stepper } from '@/components/stepper';
import { useTRPCClient } from '@/lib/trpc';

const STORAGE_KEY = 'cadence-signup-user-id';

// The wider set getStatus can report on resume; submitQuestionnaire/recheck only ever return the first
// three (a certificate can't exist yet at that point).
type ResumeStatus = 'cleared' | 'certificate_required' | 'pending_retry' | 'certificate_pending_review' | 'rejected';
type Step =
  | 'basic-info'
  | 'consent'
  | 'photo'
  | 'questionnaire'
  | 'aptitude-result'
  | 'certificate-upload'
  | 'certificate-waiting'
  | 'rejected'
  | 'password';

const STATIONS = ['Details', 'Consent', 'Photo', 'Health check', 'Password'] as const;

const STATION_OF_STEP: Record<Step, number> = {
  'basic-info': 0,
  consent: 1,
  photo: 2,
  questionnaire: 3,
  'aptitude-result': 3,
  'certificate-upload': 3,
  'certificate-waiting': 3,
  rejected: 3,
  password: 4,
};

// The userId is kept in sessionStorage (not a cookie): there is no session before aptitude clearance
// (FR-9), and this is just a capability letting the browser resume the wizard after a reload.
export function SignupWizard() {
  const trpcClient = useTRPCClient();
  const [step, setStep] = useState<Step>('basic-info');
  const [userId, setUserId] = useState<string | null>(null);

  function goToAptitudeStep(status: ResumeStatus) {
    if (status === 'cleared') return setStep('password');
    if (status === 'rejected') return setStep('rejected');
    if (status === 'certificate_required') return setStep('certificate-upload');
    if (status === 'certificate_pending_review') return setStep('certificate-waiting');
    setStep('aptitude-result');
  }

  // FR-46 / RN-12: a resumed signup goes through consent again by default, since a plain reload can't
  // tell whether photo (and thus consent) already happened. If a questionnaire already exists for this
  // applicant, that's proof photo and consent are both done, so skip straight to its result instead.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per client; goToAptitudeStep only calls the stable setStep.
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

  let content: ReactNode = null;
  if (step === 'basic-info') content = <BasicInfoStep onResolved={handleResolved} />;
  else if (step === 'consent' && userId) content = <ConsentStep userId={userId} onConsented={() => setStep('photo')} />;
  else if (step === 'photo' && userId) content = <PhotoStep userId={userId} onSaved={() => setStep('questionnaire')} />;
  else if (step === 'questionnaire' && userId) {
    content = <QuestionnaireStep userId={userId} onResolved={(result) => goToAptitudeStep(result)} />;
  } else if (step === 'aptitude-result' && userId) {
    content = <AptitudeResultStep userId={userId} onRechecked={(result) => goToAptitudeStep(result)} />;
  } else if (step === 'certificate-upload' && userId) {
    content = <CertificateStep userId={userId} onUploaded={() => setStep('certificate-waiting')} />;
  } else if (step === 'certificate-waiting' && userId) {
    content = <CertificateWaitingStep userId={userId} onStatusChanged={(result) => goToAptitudeStep(result)} />;
  } else if (step === 'rejected') content = <RejectedStep />;
  else if (step === 'password' && userId) content = <PasswordStep userId={userId} />;

  return (
    <div className="flex flex-col gap-8">
      <Stepper steps={STATIONS} current={STATION_OF_STEP[step]} />
      {content}
    </div>
  );
}
