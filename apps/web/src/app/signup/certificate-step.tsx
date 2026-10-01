'use client';

import { useMutation } from '@tanstack/react-query';
import { FileTextIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { FileDropzone } from '@/components/file-dropzone';
import { StepPanel } from '@/components/step-panel';
import { Button } from '@/components/ui/button';
import { useTRPC } from '@/lib/trpc';

interface CertificateStepProps {
  userId: string;
  onUploaded: () => void;
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function CertificateStep({ userId, onUploaded }: CertificateStepProps) {
  const trpc = useTRPC();
  const [file, setFile] = useState<{ filename: string; mimeType: string; base64: string } | null>(null);

  const upload = useMutation(
    trpc.certificates.upload.mutationOptions({
      onSuccess: (result) => {
        if (result.status === 'unavailable') {
          toast.error("We couldn't upload your certificate right now. Try again.");
          return;
        }
        onUploaded();
      },
      onError: () => toast.error("We couldn't upload your certificate. Try again."),
    }),
  );

  async function handleFiles(files: File[]) {
    const selected = files[0];
    if (!selected) return;
    const base64 = await readAsBase64(selected);
    setFile({ filename: selected.name, mimeType: selected.type, base64 });
  }

  return (
    <StepPanel
      icon={FileTextIcon}
      title="Medical certificate"
      description="Your answers mean we need a medical certificate before you train. Upload a photo of it. A gym admin reviews every certificate."
    >
      {file ? (
        <figure className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={file.base64}
            alt="Certificate preview"
            className="max-h-72 w-full rounded-lg border bg-muted object-contain"
          />
          <figcaption className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-muted-foreground">{file.filename}</span>
            <Button variant="link" size="sm" onClick={() => setFile(null)} disabled={upload.isPending}>
              Choose another
            </Button>
          </figcaption>
        </figure>
      ) : (
        <FileDropzone
          id="certificate-file"
          accept="image/jpeg,image/png"
          hint="JPEG or PNG photo of the certificate"
          onFiles={(files) => void handleFiles(files)}
        />
      )}
      <Button
        size="lg"
        className="w-full"
        disabled={!file || upload.isPending}
        onClick={() =>
          file && upload.mutate({ userId, filename: file.filename, mimeType: file.mimeType, base64: file.base64 })
        }
      >
        {upload.isPending ? 'Uploading...' : 'Upload certificate'}
      </Button>
    </StepPanel>
  );
}
