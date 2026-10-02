'use client';

import { useQuery } from '@tanstack/react-query';
import { CameraIcon, ImageUpIcon } from 'lucide-react';
import { fetchDevMembers } from '@/app/kiosk/kiosk-api';
import type { KioskSource } from '@/app/kiosk/kiosk-status';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

interface KioskSourceToggleProps {
  source: KioskSource;
  onChange: (source: KioskSource) => void;
}

// A production panel only ever reads the camera; the image source exists so recognition can be tried without one.
export function KioskSourceToggle({ source, onChange }: KioskSourceToggleProps) {
  if (IS_PRODUCTION) return null;

  return (
    <fieldset aria-label="Photo source" className="flex gap-1">
      <Button
        size="sm"
        variant={source === 'camera' ? 'secondary' : 'ghost'}
        aria-pressed={source === 'camera'}
        onClick={() => onChange('camera')}
      >
        <CameraIcon data-icon="inline-start" />
        Camera
      </Button>
      <Button
        size="sm"
        variant={source === 'image' ? 'secondary' : 'ghost'}
        aria-pressed={source === 'image'}
        onClick={() => onChange('image')}
      >
        <ImageUpIcon data-icon="inline-start" />
        Image
      </Button>
    </fieldset>
  );
}

interface DevSimulationProps {
  disabled: boolean;
  onSimulate: (memberId: string) => void;
}

// One control in the header row: picking a member checks them in, so there is no second step to place or style.
export function DevSimulation({ disabled, onSimulate }: DevSimulationProps) {
  const members = useQuery({ queryKey: ['kiosk', 'dev-members'], queryFn: fetchDevMembers, enabled: !IS_PRODUCTION });

  if (IS_PRODUCTION) return null;

  const placeholder = members.isError
    ? 'Members unavailable'
    : members.isPending
      ? 'Loading members'
      : 'Simulate a member';

  return (
    <Select value="" onValueChange={onSimulate} disabled={disabled || !members.data?.length}>
      <SelectTrigger
        size="sm"
        aria-label="Simulate a member's check-in"
        className="w-56 border-kit-line bg-transparent text-kit-muted"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {members.data?.map((member) => (
          <SelectItem key={member.memberId} value={member.memberId}>
            {member.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
