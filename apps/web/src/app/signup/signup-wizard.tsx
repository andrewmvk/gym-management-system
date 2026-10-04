'use client';

import { QUESTIONNAIRE_V1 } from '@cadence/shared/schemas/aptitude';
import { type BasicInfoInput, CONSENT_VERSION } from '@cadence/shared/schemas/signup';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeftIcon } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AptitudeResultStep } from '@/app/signup/aptitude-result-step';
import { BasicInfoStep } from '@/app/signup/basic-info-step';
import { CertificateStep } from '@/app/signup/certificate-step';
import { CertificateWaitingStep } from '@/app/signup/certificate-waiting-step';
import { ConsentStep } from '@/app/signup/consent-step';
import { PasswordStep } from '@/app/signup/password-step';
import { type CapturedPhoto, PHOTO_REJECTION_MESSAGES, PhotoStep } from '@/app/signup/photo-step';
import { type AnswerState, initialAnswers, QuestionnaireStep } from '@/app/signup/questionnaire-step';
import { RejectedStep } from '@/app/signup/rejected-step';
import { Stepper } from '@/components/stepper';
import { Button } from '@/components/ui/button';
import { useTRPC, useTRPCClient } from '@/lib/trpc';

const STORAGE_KEY = 'cadence-signup-user-id';

// The wider set getStatus can report on resume; submitSignup/recheck only ever return the first
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

// Only the steps before the health check can be revisited: nothing is stored until the questionnaire is
// submitted, and once it is its answers are final, so later steps have no way back.
const PREVIOUS_STEP: Partial<Record<Step, Step>> = {
  consent: 'basic-info',
  photo: 'consent',
  questionnaire: 'photo',
};

const EMPTY_BASIC_INFO: BasicInfoInput = { name: '', phone: '', email: '', birthdate: '', gender: undefined };

// Everything the applicant enters before the health check lives in this component's state and reaches the
// backend in one submitSignup call, so abandoning the wizard stores nothing (FR-1). Only after that call
// does the userId exist; it is kept in sessionStorage (not a cookie): there is no session before aptitude
// clearance (FR-9), and this is just a capability letting the browser resume the wizard after a reload.
export function SignupWizard() {
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const [step, setStep] = useState<Step>('basic-info');
  const [userId, setUserId] = useState<string | null>(null);
  const [basicInfo, setBasicInfo] = useState<BasicInfoInput>(EMPTY_BASIC_INFO);
  const [consented, setConsented] = useState(false);
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [photoRejection, setPhotoRejection] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerState>(initialAnswers);
  const [hasSkippedRetry, setHasSkippedRetry] = useState(false);

  // The stored id can outlive its signup (a finished account, a reset database); drop it and start over.
  function restart() {
    sessionStorage.removeItem(STORAGE_KEY);
    setUserId(null);
    setStep('basic-info');
  }

  // Once submitted the answers are final and the raw photo is the backend's alone: don't keep either.
  function clearDraft() {
    setPhoto(null);
    setAnswers(initialAnswers());
  }

  function goToAptitudeStep(status: ResumeStatus) {
    setHasSkippedRetry(false);
    if (status === 'cleared') return setStep('password');
    if (status === 'rejected') return setStep('rejected');
    if (status === 'certificate_required') return setStep('certificate-upload');
    if (status === 'certificate_pending_review') return setStep('certificate-waiting');
    setStep('aptitude-result');
  }

  // Routes a returning applicant (a reload, or an email whose questionnaire was already submitted) to
  // wherever their verdict left them. A row with no questionnaire is not resumable: start over.
  function resume(resumedUserId: string) {
    sessionStorage.setItem(STORAGE_KEY, resumedUserId);
    setUserId(resumedUserId);
    clearDraft();

    trpcClient.aptitude.getStatus
      .query({ userId: resumedUserId })
      .then((result) => {
        if (result.status === 'unavailable' || result.status === 'not_submitted') return restart();
        goToAptitudeStep(result.status);
      })
      .catch(() => {});
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per client; resume only calls stable setters.
  useEffect(() => {
    const storedUserId = sessionStorage.getItem(STORAGE_KEY);
    if (storedUserId) resume(storedUserId);
  }, [trpcClient]);

  const submitSignup = useMutation(
    trpc.aptitude.submitSignup.mutationOptions({
      onSuccess: (result) => {
        if (result.status === 'email_blocked') {
          toast.error("This email can't be used to sign up.");
          setStep('basic-info');
          return;
        }
        if (result.status === 'already_registered') {
          toast.error('An account already exists for this email. Try signing in instead.');
          setStep('basic-info');
          return;
        }
        if (result.status === 'photo_rejected') {
          setPhoto(null);
          setPhotoRejection(PHOTO_REJECTION_MESSAGES[result.reason]);
          setStep('photo');
          return;
        }
        if (result.status === 'resumed') {
          toast.message('Welcome back! Picking up where you left off.');
          resume(result.userId);
          return;
        }
        sessionStorage.setItem(STORAGE_KEY, result.userId);
        setUserId(result.userId);
        clearDraft();
        goToAptitudeStep(result.outcome);
      },
      onError: () => toast.error("We couldn't submit your signup. Try again."),
    }),
  );

  function handleSubmit() {
    if (!consented) return setStep('consent');
    if (!photo) return setStep('photo');
    submitSignup.mutate({
      ...basicInfo,
      consented: true,
      consentVersion: CONSENT_VERSION,
      photo: { imageBase64: photo.dataUrl, mimeType: 'image/jpeg' },
      answers: QUESTIONNAIRE_V1.map((q) => ({
        questionId: q.id,
        answer: answers[q.id]!.answer!,
        detail: answers[q.id]!.detail.trim() || undefined,
      })),
    });
  }

  let content: ReactNode = null;
  if (step === 'basic-info') {
    content = (
      <BasicInfoStep
        defaultValues={basicInfo}
        onContinue={(values) => {
          setBasicInfo(values);
          setStep('consent');
        }}
        onResume={resume}
      />
    );
  } else if (step === 'consent') {
    content = (
      <ConsentStep
        initialAgreed={consented}
        onConsented={() => {
          setConsented(true);
          setStep('photo');
        }}
      />
    );
  } else if (step === 'photo') {
    content = (
      <PhotoStep
        photo={photo}
        onPhotoChange={(next) => {
          setPhoto(next);
          if (next) setPhotoRejection(null);
        }}
        rejection={photoRejection}
        onContinue={() => setStep('questionnaire')}
      />
    );
  } else if (step === 'questionnaire') {
    content = (
      <QuestionnaireStep
        answers={answers}
        onAnswersChange={setAnswers}
        onSubmit={handleSubmit}
        isSubmitting={submitSignup.isPending}
      />
    );
  } else if (step === 'aptitude-result' && userId) {
    content = (
      <AptitudeResultStep
        userId={userId}
        onRechecked={(result) => goToAptitudeStep(result)}
        onUseCertificate={() => {
          setHasSkippedRetry(true);
          setStep('certificate-upload');
        }}
      />
    );
  } else if (step === 'certificate-upload' && userId) {
    content = <CertificateStep userId={userId} onUploaded={() => setStep('certificate-waiting')} />;
  } else if (step === 'certificate-waiting' && userId) {
    content = <CertificateWaitingStep userId={userId} onStatusChanged={(result) => goToAptitudeStep(result)} />;
  } else if (step === 'rejected') content = <RejectedStep />;
  else if (step === 'password' && userId) {
    content = <PasswordStep userId={userId} onActivated={() => sessionStorage.removeItem(STORAGE_KEY)} />;
  }

  // A certificate chosen while the automatic check is down can be backed out of; one the verdict demanded cannot.
  const previousStep = step === 'certificate-upload' && hasSkippedRetry ? 'aptitude-result' : PREVIOUS_STEP[step];

  return (
    <div className="flex flex-col gap-8">
      <Stepper steps={STATIONS} current={STATION_OF_STEP[step]} />
      {previousStep && (
        <Button
          variant="ghost"
          size="sm"
          className="-mt-4 self-start"
          disabled={submitSignup.isPending}
          onClick={() => setStep(previousStep)}
        >
          <ArrowLeftIcon />
          Back
        </Button>
      )}
      {content}
    </div>
  );
}
