'use client';

import { Button } from '@/components/ui/button';
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

export function ExamAttachmentsField({ values, onChange }: ExamAttachmentsFieldProps) {
  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const added = await Promise.all(
      Array.from(fileList).map(async (file) => ({
        filename: file.name,
        mimeType: file.type,
        base64: await readAsBase64(file),
      })),
    );
    onChange([...values, ...added]);
  }

  return (
    <Field>
      <FieldLabel htmlFor="onboarding-attachments">Exam attachments (image or PDF, optional)</FieldLabel>
      <input
        id="onboarding-attachments"
        type="file"
        multiple
        accept="image/jpeg,image/png,application/pdf"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {values.length > 0 && (
        <ul className="flex flex-col gap-1">
          {values.map((attachment, index) => (
            <li
              key={`${attachment.filename}-${index}`}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm"
            >
              <span className="truncate">{attachment.filename}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(values.filter((_, i) => i !== index))}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}
