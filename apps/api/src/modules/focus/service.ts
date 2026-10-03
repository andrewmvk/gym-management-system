import * as repository from '@api/modules/focus/repository';
import { FOCUS_BIAS_LABELS, type MemberMuscleFocus, type MuscleId, muscleLabel } from '@cadence/shared/schemas/muscles';

export function getFocus(userId: string): Promise<MemberMuscleFocus[]> {
  return repository.findFocusByUserId(userId);
}

// Setting a muscle to the level it already has records nothing, so a double tap never adds a history event.
export async function setFocus(userId: string, { muscle, bias }: MemberMuscleFocus): Promise<MemberMuscleFocus[]> {
  const current = await repository.findFocusByUserId(userId);
  const from = current.find((entry) => entry.muscle === muscle)?.bias ?? 0;
  if (from !== bias) {
    await repository.replaceFocus({
      userId,
      muscle,
      bias,
      from,
      description: describeChange(muscle, from, bias),
    });
  }
  return repository.findFocusByUserId(userId);
}

function describeChange(muscle: MuscleId, from: number, to: number) {
  return `Muscle focus for ${muscleLabel(muscle)} changed from ${FOCUS_BIAS_LABELS[from]} to ${FOCUS_BIAS_LABELS[to]}`;
}
