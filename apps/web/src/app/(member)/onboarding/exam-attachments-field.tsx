'use client';

import { FileIcon, XIcon } from 'lucide-react';
import { FileDropzone } from '@/components/file-dropzone';
import { Field, FieldLabel } from '@/components/ui/field';

export interface Attachment {
  filename: string;
  mimeType: string;
  base64: string;
}

interface ExamAttachmentsFieldProps {
  values: Attachment[];
  onChange: (values: Attachment[]) => void;
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Doubles as the list key, so picking the same file twice must not add a second entry.
function attachmentKey(attachment: Attachment) {
  return `${attachment.filename}:${attachment.base64.length}`;
}

export function ExamAttachmentsField({ values, onChange }: ExamAttachmentsFieldProps) {
  async function handleFiles(files: File[]) {
    if (files.length === 0) return;
    const added = await Promise.all(
      files.map(async (file) => ({
        filename: file.name,
        mimeType: file.type,
        base64: await readAsBase64(file),
      })),
    );
    const known = new Set(values.map(attachmentKey));
    const fresh = added.filter((attachment) => {
      const key = attachmentKey(attachment);
      if (known.has(key)) return false;
      known.add(key);
      return true;
    });
    onChange([...values, ...fresh]);
  }

  return (
    <Field>
      <FieldLabel htmlFor="onboarding-attachments">
        Exam results <span className="font-normal text-muted-foreground">(optional)</span>
      </FieldLabel>
      <FileDropzone
        id="onboarding-attachments"
        accept="image/jpeg,image/png,application/pdf"
        multiple
        hint="Images or PDFs of recent medical exams"
        onFiles={(files) => void handleFiles(files)}
      />
      {values.length > 0 && (
        <ul className="flex flex-col divide-y rounded-md border">
          {values.map((attachment, index) => (
            <li key={attachmentKey(attachment)} className="flex items-center gap-3 py-1.5 pr-1.5 pl-3 text-sm">
              <FileIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{attachment.filename}</span>
              <button
                type="button"
                aria-label={`Remove ${attachment.filename}`}
                className="flex size-8 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-muted hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/45"
                onClick={() => onChange(values.filter((_, i) => i !== index))}
              >
                <XIcon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}
