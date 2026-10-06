'use client';

import { cn } from 'cn';
import { ClockIcon } from 'lucide-react';
import {
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

const VISIBLE_ROWS = 5;
const WHEEL_ROW_PX = 80;
const WHEEL_LINES_PER_ROW = 3;
const SNAP_IDLE_MS = 120;
const EASE_MS = 70;
const DRAG_THRESHOLD_PX = 4;
const DRAG_COAST_MS = 120;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

interface WheelOption {
  value: number;
  label: string;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function mod(value: number, count: number) {
  return ((value % count) + count) % count;
}

function parseTime(value: string) {
  const [hour = 0, minute = 0] = value.split(':').map(Number);
  return { hour, minute };
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Every row sits at its wrapped distance from the centre, so the list loops forever, and size and opacity fall away
// with that distance: the numbers fade out above and below the centre row.
function paintWheel(column: HTMLElement, position: number) {
  const count = column.children.length;
  const rowHeight = column.clientHeight / VISIBLE_ROWS;
  for (const [index, child] of Array.from(column.children).entries()) {
    if (!(child instanceof HTMLElement)) continue;
    const distance = mod(index - position + count / 2, count) - count / 2;
    const reach = Math.abs(distance);
    const isVisible = reach <= VISIBLE_ROWS / 2;
    child.style.transform = `translateY(${distance * rowHeight}px) scale(${Math.max(0.5, 1 - 0.22 * reach)})`;
    child.style.opacity = String(isVisible ? Math.max(0.06, 0.42 ** reach) : 0);
    child.style.visibility = isVisible ? 'visible' : 'hidden';
    child.dataset.active = String(reach < 0.5);
  }
}

interface WheelProps {
  label: string;
  options: WheelOption[];
  value: number;
  onSelect: (value: number) => void;
  onKeyNavigate: (key: 'ArrowLeft' | 'ArrowRight') => void;
  ref?: Ref<HTMLDivElement>;
}

function Wheel({ label, options, value, onSelect, onKeyNavigate, ref }: WheelProps) {
  const columnRef = useRef<HTMLDivElement | null>(null);
  const [initialIndex] = useState(() =>
    Math.max(
      0,
      options.findIndex((option) => option.value === value),
    ),
  );
  const motion = useRef({
    position: initialIndex,
    target: initialIndex,
    reportedIndex: initialIndex,
    lastFrame: 0,
    frame: undefined as number | undefined,
    idleTimer: undefined as number | undefined,
  });
  const drag = useRef<{
    startY: number;
    startPosition: number;
    lastPosition: number;
    lastTime: number;
    velocity: number;
    isDragging: boolean;
  } | null>(null);
  const shouldSuppressClick = useRef(false);

  function paint() {
    if (columnRef.current) paintWheel(columnRef.current, motion.current.position);
  }

  function step(time: number) {
    const current = motion.current;
    const elapsed = Math.min(time - current.lastFrame, 64);
    current.lastFrame = time;
    const gap = current.target - current.position;
    if (Math.abs(gap) < 0.002) {
      current.position = current.target;
      current.frame = undefined;
    } else {
      current.position += gap * (1 - Math.exp(-elapsed / EASE_MS));
      current.frame = requestAnimationFrame(step);
    }
    paint();
  }

  function moveTo(target: number, isInstant = false) {
    const current = motion.current;
    current.target = target;
    const index = mod(Math.round(target), options.length);
    const option = options[index];
    if (option && index !== current.reportedIndex) {
      current.reportedIndex = index;
      onSelect(option.value);
    }
    if (isInstant || prefersReducedMotion()) {
      current.position = target;
      paint();
    } else if (current.frame === undefined) {
      current.lastFrame = performance.now();
      current.frame = requestAnimationFrame(step);
    }
  }

  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    const current = motion.current;
    const rows = event.deltaMode === 0 ? event.deltaY / WHEEL_ROW_PX : event.deltaY / WHEEL_LINES_PER_ROW;
    moveTo(current.target + rows);
    window.clearTimeout(current.idleTimer);
    current.idleTimer = window.setTimeout(() => moveTo(Math.round(current.target)), SNAP_IDLE_MS);
  }

  const wheelHandler = useRef(handleWheel);
  useLayoutEffect(() => {
    wheelHandler.current = handleWheel;
  });

  useLayoutEffect(() => {
    const column = columnRef.current;
    if (!column) return;
    paintWheel(column, motion.current.position);
    const onWheel = (event: WheelEvent) => wheelHandler.current(event);
    column.addEventListener('wheel', onWheel, { passive: false });
    return () => column.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const current = motion.current;
    return () => {
      window.clearTimeout(current.idleTimer);
      if (current.frame !== undefined) cancelAnimationFrame(current.frame);
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const steps: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, PageUp: -3, PageDown: 3 };
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      onKeyNavigate(event.key);
      return;
    }
    const delta = steps[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    moveTo(Math.round(motion.current.target) + delta);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const { position } = motion.current;
    drag.current = {
      startY: event.clientY,
      startPosition: position,
      lastPosition: position,
      lastTime: event.timeStamp,
      velocity: 0,
      isDragging: false,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const column = columnRef.current;
    const current = drag.current;
    if (!current || !column) return;
    const delta = current.startY - event.clientY;
    if (!current.isDragging && Math.abs(delta) > DRAG_THRESHOLD_PX) {
      current.isDragging = true;
      column.setPointerCapture(event.pointerId);
    }
    if (!current.isDragging) return;
    const position = current.startPosition + delta / (column.clientHeight / VISIBLE_ROWS);
    const elapsed = event.timeStamp - current.lastTime;
    if (elapsed > 0) current.velocity = (position - current.lastPosition) / elapsed;
    current.lastPosition = position;
    current.lastTime = event.timeStamp;
    moveTo(position, true);
  }

  function handlePointerEnd() {
    const current = drag.current;
    drag.current = null;
    if (!current?.isDragging) return;
    shouldSuppressClick.current = true;
    window.setTimeout(() => {
      shouldSuppressClick.current = false;
    });
    moveTo(Math.round(motion.current.position + current.velocity * DRAG_COAST_MS));
  }

  function handleOptionClick(index: number) {
    if (shouldSuppressClick.current) return;
    const { position } = motion.current;
    const count = options.length;
    const distance = mod(index - position + count / 2, count) - count / 2;
    moveTo(Math.round(position + distance));
  }

  return (
    <div
      ref={(node) => {
        columnRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      role="listbox"
      aria-label={label}
      aria-activedescendant={`${label}-${value}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      className="group relative h-60 w-20 touch-none overflow-hidden outline-none select-none"
    >
      {options.map((option, index) => (
        // biome-ignore lint/a11y/useKeyWithClickEvents: the focused listbox owns the keyboard, an option is only a pointer target
        <div
          key={option.value}
          id={`${label}-${option.value}`}
          role="option"
          aria-selected={option.value === value}
          tabIndex={-1}
          onClick={() => handleOptionClick(index)}
          className="numerals absolute inset-x-0 top-24 flex h-12 items-center justify-center text-4xl font-bold text-muted-foreground transition-colors duration-100 data-[active=true]:text-primary group-focus-visible:data-[active=true]:underline group-focus-visible:data-[active=true]:decoration-2 group-focus-visible:data-[active=true]:underline-offset-8"
        >
          {option.label}
        </div>
      ))}
    </div>
  );
}

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  minuteStep?: number;
  id?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
  disabled?: boolean;
  className?: string;
}

function TimePicker({
  value,
  onChange,
  onBlur,
  minuteStep = 5,
  id,
  'aria-label': ariaLabel = 'Time',
  'aria-invalid': isInvalid,
  disabled,
  className,
}: TimePickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hourColumnRef = useRef<HTMLDivElement>(null);
  const minuteColumnRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState(() => parseTime(value));
  const isOpen = anchor !== null;

  const hourOptions = useMemo<WheelOption[]>(
    () => Array.from({ length: HOURS_PER_DAY }, (_, hour) => ({ value: hour, label: pad(hour) })),
    [],
  );
  const minuteOptions = useMemo<WheelOption[]>(() => {
    const minutes = new Set<number>();
    for (let minute = 0; minute < MINUTES_PER_HOUR; minute += minuteStep) minutes.add(minute);
    minutes.add(parseTime(value).minute);
    return [...minutes].sort((a, b) => a - b).map((minute) => ({ value: minute, label: pad(minute) }));
  }, [minuteStep, value]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    hourColumnRef.current?.focus({ preventScroll: true });
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, [isOpen]);

  function open() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDraft(parseTime(value));
    setAnchor({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }

  function close() {
    setAnchor(null);
    triggerRef.current?.focus();
    onBlur?.();
  }

  function commit() {
    const next = `${pad(draft.hour)}:${pad(draft.minute)}`;
    if (next !== value) onChange(next);
    close();
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Enter' || event.key === ' ' || event.key === 'Tab') {
      event.preventDefault();
      commit();
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={`${ariaLabel}, ${value}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-invalid={isInvalid}
        data-state={isOpen ? 'open' : 'closed'}
        onClick={open}
        className={cn(
          'numerals flex h-10 w-32 items-center justify-between rounded-md border border-input bg-card pr-2.5 pl-3 text-lg transition-[border-color,box-shadow] outline-none hover:border-foreground/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15 data-[state=open]:border-ring data-[state=open]:text-transparent dark:bg-input/10',
          className,
        )}
      >
        {value}
        <ClockIcon className="pointer-events-none size-4 text-muted-foreground" aria-hidden />
      </button>
      {anchor &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            onKeyDown={handleDialogKeyDown}
            className="fixed inset-0 z-50"
          >
            <button
              type="button"
              tabIndex={-1}
              aria-label="Confirm time"
              onClick={commit}
              className="absolute inset-0 cursor-default bg-background/90 duration-150 animate-in fade-in-0 motion-reduce:animate-none"
            />
            <div
              style={{
                left: `clamp(7rem, ${anchor.x}px, calc(100% - 7rem))`,
                top: `clamp(8rem, ${anchor.y}px, calc(100% - 8rem))`,
              }}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center duration-150 animate-in fade-in-0 zoom-in-95 motion-reduce:animate-none"
            >
              <Wheel
                ref={hourColumnRef}
                label="Hour"
                options={hourOptions}
                value={draft.hour}
                onSelect={(hour) => setDraft((previous) => ({ ...previous, hour }))}
                onKeyNavigate={(key) => key === 'ArrowRight' && minuteColumnRef.current?.focus({ preventScroll: true })}
              />
              <span aria-hidden className="numerals -mx-2 pb-1 text-4xl font-bold text-muted-foreground">
                :
              </span>
              <Wheel
                ref={minuteColumnRef}
                label="Minute"
                options={minuteOptions}
                value={draft.minute}
                onSelect={(minute) => setDraft((previous) => ({ ...previous, minute }))}
                onKeyNavigate={(key) => key === 'ArrowLeft' && hourColumnRef.current?.focus({ preventScroll: true })}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export { TimePicker };
