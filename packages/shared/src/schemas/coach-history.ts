import { COACH_HISTORY_TURNS, type CoachBlock, type HistoryTurn } from '@shared/schemas/coach';
import { diffDraft } from '@shared/schemas/coach-draft';
import { muscleLabel } from '@shared/schemas/muscles';

const TURN_MAX_LENGTH = 1500;

function numbers({ sets, reps, load }: { sets: number; reps: number; load: number | null }) {
  return `${sets}x${reps}${load ? ` ${load} kg` : ''}`;
}

// One line per component the coach showed, written for the coach to read back: what was offered, and that a
// proposal waits for the member to apply it. Without this a later "yes, add it" has nothing to refer to.
export function summarizeBlock(block: CoachBlock): string | null {
  switch (block.type) {
    case 'plan_proposal': {
      const diff = diffDraft(block.before, block.after);
      const parts = [
        ...diff.rows
          .filter((entry) => entry.change === 'added')
          .map((entry) => `adds ${entry.row.name} ${numbers(entry.row)}`),
        ...diff.rows
          .filter((entry) => entry.change === 'changed' && entry.previous)
          .map((entry) => `changes ${entry.row.name} from ${numbers(entry.previous!)} to ${numbers(entry.row)}`),
        ...diff.removed.map((row) => `removes ${row.name}`),
      ];
      return `[Showed a proposal for ${block.date} that ${parts.join('; ') || 'changes nothing'}. It applies only when the member taps Apply.]`;
    }
    case 'exercise_picker':
      return `[Showed options for ${muscleLabel(block.muscle)} with an Add button: ${block.options.map((option) => `${option.name} ${numbers(option)}`).join(', ')}.]`;
    case 'exercise_explainer':
      return `[Explained ${block.exercise.name}.]`;
    case 'safety_warning':
      return `[Warned about ${block.exercise.name}: ${block.reason}${block.alternatives.length > 0 ? ` and offered ${block.alternatives.map((option) => option.name).join(', ')}` : ''}.]`;
    case 'facts':
      return `[Asked the member whether to remember: ${block.facts.map((fact) => fact.description).join('; ')}.]`;
    case 'quick_replies':
      return null;
  }
}

interface HistoryMessage {
  role: 'member' | 'assistant';
  text: string;
  blocks: readonly CoachBlock[];
}

// The last turns of the conversation, oldest first, for the next message. Empty turns (a reply that never
// started) are left out.
export function buildHistory(messages: readonly HistoryMessage[]): HistoryTurn[] {
  const turns = messages.flatMap((message): HistoryTurn[] => {
    const summaries = message.blocks.map(summarizeBlock).filter((line): line is string => line !== null);
    const text = [message.text.trim(), ...summaries].filter(Boolean).join(' ').slice(0, TURN_MAX_LENGTH);
    return text ? [{ role: message.role, text }] : [];
  });
  return turns.slice(-COACH_HISTORY_TURNS);
}
