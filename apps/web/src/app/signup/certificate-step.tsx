'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

  async function handleFileChange(selected: File | undefined) {
    if (!selected) return;
    const base64 = await readAsBase64(selected);
    setFile({ filename: selected.name, mimeType: selected.type, base64 });
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Upload a medical certificate</CardTitle>
        <CardDescription>
          Your questionnaire indicates you need a medical certificate before training. Upload a photo of it (JPEG or PNG).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <input
          type="file"
          accept="image/jpeg,image/png"
          onChange={(e) => void handleFileChange(e.target.files?.[0])}
        />
        {file && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={file.base64} alt="Certificate preview" className="max-h-64 w-full rounded-lg object-contain" />
        )}
        <Button
          className="w-full"
          disabled={!file || upload.isPending}
          onClick={() =>
            file &&
            upload.mutate({ userId, filename: file.filename, mimeType: file.mimeType, base64: file.base64 })
          }
        >
          {upload.isPending ? 'Uploading...' : 'Upload certificate'}
        </Button>
      </CardContent>
    </Card>
  );
}
