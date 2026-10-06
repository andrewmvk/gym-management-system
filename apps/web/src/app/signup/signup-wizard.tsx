'use client';

import { type BasicInfoInput, CONSENT_VERSION } from '@cadence/shared/schemas/signup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { BasicInfoStep } from '@/app/signup/basic-info-step';
import { ConsentStep } from '@/app/signup/consent-step';
import { PasswordStep } from '@/app/signup/password-step';
import { type CapturedPhoto, PHOTO_REJECTION_MESSAGES, PhotoStep } from '@/app/signup/photo-step';
import { Stepper } from '@/components/stepper';
import { Button } from '@/components/ui/button';
import { useTRPC } from '@/lib/trpc';

type Step = 'basic-info' | 'consent' | 'photo' | 'password';

const STEPS: readonly Step[] = ['basic-info', 'consent', 'photo', 'password'];
const STATIONS = ['Details', 'Consent', 'Photo', 'Password'] as const;

const EMPTY_BASIC_INFO: BasicInfoInput = { name: '', phone: '', email: '', birthdate: '', gender: undefined };

// Everything the person enters lives in this component's state and reaches the backend in the one
// auth.register call of the last step, so abandoning the wizard stores nothing (FR-1). Until then any
// earlier step can be revisited.
export function SignupWizard() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [step, setStep] = useState<Step>('basic-info');
  const [basicInfo, setBasicInfo] = useState<BasicInfoInput>(EMPTY_BASIC_INFO);
  const [consented, setConsented] = useState(false);
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [photoRejection, setPhotoRejection] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const register = useMutation(
    trpc.auth.register.mutationOptions({
      onSuccess: async (result) => {
        if (result.status === 'already_registered') {
          setEmailError('An account already exists for this email. Try signing in instead.');
          setStep('basic-info');
          return;
        }
        if (result.status === 'photo_rejected') {
          setPhoto(null);
          setPhotoRejection(PHOTO_REJECTION_MESSAGES[result.reason]);
          setStep('photo');
          return;
        }
        // The registration set the session cookie: load the session before leaving, so the member guard
        // finds it instead of sending the new member to the login page.
        await queryClient.fetchQuery({ ...trpc.auth.me.queryOptions(), staleTime: 0 });
        router.replace('/onboarding');
      },
      onError: () => toast.error("We couldn't create your account. Try again."),
    }),
  );

  function handleRegister(password: string) {
    if (!consented) return setStep('consent');
    if (!photo) return setStep('photo');
    register.mutate({
      ...basicInfo,
      consented: true,
      consentVersion: CONSENT_VERSION,
      photo: { imageBase64: photo.dataUrl, mimeType: 'image/jpeg' },
      password,
    });
  }

  let content: ReactNode = null;
  if (step === 'basic-info') {
    content = (
      <BasicInfoStep
        defaultValues={basicInfo}
        emailError={emailError}
        onContinue={(values) => {
          setBasicInfo(values);
          setEmailError(null);
          setStep('consent');
        }}
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
        onContinue={() => setStep('password')}
      />
    );
  } else {
    content = <PasswordStep onSubmit={handleRegister} isSubmitting={register.isPending} />;
  }

  const position = STEPS.indexOf(step);
  const previousStep = STEPS[position - 1];

  return (
    <div className="flex flex-col gap-8">
      <Stepper steps={STATIONS} current={position} />
      {previousStep && (
        <Button
          variant="ghost"
          size="sm"
          className="-mt-4 self-start"
          disabled={register.isPending}
          onClick={() => setStep(previousStep)}
        >
          <ArrowLeftIcon />
          Back
        </Button>
      )}
      <div key={step} className="animate-block-in">
        {content}
      </div>
    </div>
  );
}
