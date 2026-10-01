'use client';

import { UploadIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
  id: string;
  accept: string;
  multiple?: boolean;
  hint: ReactNode;
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export function FileDropzone({ id, accept, multiple, hint, onFiles, disabled }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <label
      htmlFor={id}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        if (!disabled) onFiles(Array.from(event.dataTransfer.files));
      }}
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-input px-4 py-8 text-center transition-colors hover:border-primary/60 hover:bg-accent/40 has-focus-visible:ring-3 has-focus-visible:ring-ring/40',
        isDragging && 'border-primary bg-accent/60',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
        <UploadIcon className="size-5" />
      </span>
      <span className="font-display text-lg font-bold tracking-wide uppercase">
        Drop {multiple ? 'files' : 'a file'} or <span className="text-primary">browse</span>
      </span>
      <span className="text-sm text-muted-foreground">{hint}</span>
      <input
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
    </label>
  );
}
