import { z } from 'zod';

// Index matches Date#getDay(), so a local date maps straight to its weekday.
export const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const TimeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use the 24-hour HH:MM format');

export const DayHoursSchema = z
  .object({ open: TimeOfDaySchema, close: TimeOfDaySchema })
  .refine((hours) => hours.open < hours.close, { message: 'The gym must close after it opens', path: ['close'] });
export type DayHours = z.infer<typeof DayHoursSchema>;

// A closed day is null, so "open 00:00 to 00:00" never has to stand in for it.
export const OpeningHoursSchema = z.object({
  sunday: DayHoursSchema.nullable(),
  monday: DayHoursSchema.nullable(),
  tuesday: DayHoursSchema.nullable(),
  wednesday: DayHoursSchema.nullable(),
  thursday: DayHoursSchema.nullable(),
  friday: DayHoursSchema.nullable(),
  saturday: DayHoursSchema.nullable(),
});
export type OpeningHours = z.infer<typeof OpeningHoursSchema>;

const WEEKDAY_HOURS: DayHours = { open: '06:00', close: '22:00' };

export const DEFAULT_OPENING_HOURS: OpeningHours = {
  sunday: null,
  monday: WEEKDAY_HOURS,
  tuesday: WEEKDAY_HOURS,
  wednesday: WEEKDAY_HOURS,
  thursday: WEEKDAY_HOURS,
  friday: WEEKDAY_HOURS,
  saturday: { open: '08:00', close: '14:00' },
};

// There is no checkout event, so occupancy counts check-ins in this trailing window (FR-37).
export const OCCUPANCY_WINDOW_MINUTES = 90;
