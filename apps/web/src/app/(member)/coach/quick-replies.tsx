interface QuickRepliesProps {
  replies: readonly string[];
  isDisabled?: boolean;
  onPick: (reply: string) => void;
}

// The coach's guess at what the member will say next; picking one sends it like a typed message.
export function QuickReplies({ replies, isDisabled, onPick }: QuickRepliesProps) {
  return (
    <fieldset className="m-0 flex min-w-0 animate-block-in flex-wrap gap-2 border-0 p-0">
      <legend className="sr-only">Suggested replies</legend>
      {replies.map((reply) => (
        <button
          key={reply}
          type="button"
          disabled={isDisabled}
          onClick={() => onPick(reply)}
          className="min-h-11 rounded-full border border-input px-4 text-sm transition-colors outline-none hover:border-primary/60 hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring/45 disabled:pointer-events-none disabled:opacity-45"
        >
          {reply}
        </button>
      ))}
    </fieldset>
  );
}
