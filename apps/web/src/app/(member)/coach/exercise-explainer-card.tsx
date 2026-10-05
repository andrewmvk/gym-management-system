import type { CoachBlock } from '@cadence/shared/schemas/coach';
import { muscleLabel } from '@cadence/shared/schemas/muscles';

type ExplainerBlock = Extract<CoachBlock, { type: 'exercise_explainer' }>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h4 className="font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">{title}</h4>
      {children}
    </div>
  );
}

// How to do an exercise and why it is worth doing, written for this member. Technique reads as numbered steps.
export function ExerciseExplainerCard({ block }: { block: ExplainerBlock }) {
  const primary = block.exercise.muscles
    .filter((entry) => entry.role === 'primary')
    .map((entry) => muscleLabel(entry.muscle));

  return (
    <section
      aria-label={`About ${block.exercise.name}`}
      className="animate-block-in flex flex-col gap-3 rounded-lg border bg-card p-3 text-card-foreground"
    >
      <div className="flex flex-col gap-0.5">
        <h3 className="font-display text-lg leading-tight font-bold tracking-wide uppercase">{block.exercise.name}</h3>
        {primary.length > 0 && (
          <p className="font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {primary.join(', ')}
          </p>
        )}
        <p className="text-sm text-pretty">{block.summary}</p>
      </div>

      {block.technique.length > 0 && (
        <Section title="How to do it">
          <ol className="flex flex-col gap-1">
            {block.technique.map((step, index) => (
              <li key={step} className="flex gap-2 text-sm text-pretty">
                <span className="numerals w-4 shrink-0 text-base leading-5 font-bold text-muted-foreground">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {block.benefits.length > 0 && (
        <Section title="What it does for you">
          <ul className="flex list-disc flex-col gap-0.5 pl-4 text-sm marker:text-muted-foreground">
            {block.benefits.map((benefit) => (
              <li key={benefit} className="text-pretty">
                {benefit}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {block.mistakes.length > 0 && (
        <Section title="Common mistakes">
          <ul className="flex list-disc flex-col gap-0.5 pl-4 text-sm marker:text-muted-foreground">
            {block.mistakes.map((mistake) => (
              <li key={mistake} className="text-pretty">
                {mistake}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {block.personalNote && (
        <p className="rounded-sm bg-accent/60 px-3 py-2 text-sm text-pretty text-accent-foreground">
          <span className="font-semibold">For you: </span>
          {block.personalNote}
        </p>
      )}
    </section>
  );
}
