---
name: Cadence
description: Club Kit, the visual system for a single gym's face check-in and AI training-plan app
colors:
  kit-cobalt: "oklch(0.5 0.25 266)"
  kit-cobalt-on: "oklch(0.99 0.003 95)"
  stripe-cobalt: "oklch(0.56 0.24 266)"
  pace-tape: "oklch(0.87 0.165 92)"
  pace-tape-on: "oklch(0.2 0.03 80)"
  locker-ink: "oklch(0.18 0.014 265)"
  locker-ink-on: "oklch(0.974 0.003 95)"
  locker-ink-muted: "oklch(0.74 0.012 265)"
  chalk: "oklch(0.974 0.003 95)"
  card-white: "oklch(1 0 0)"
  bench-gray: "oklch(0.945 0.005 265)"
  bench-gray-text: "oklch(0.46 0.016 265)"
  cobalt-wash: "oklch(0.94 0.03 266)"
  cobalt-wash-text: "oklch(0.38 0.2 266)"
  hairline: "oklch(0.89 0.006 265)"
  field-stroke: "oklch(0.83 0.008 265)"
  cleared-green: "oklch(0.5 0.13 155)"
  stop-red: "oklch(0.54 0.21 27)"
  heat-0: "oklch(0.915 0.006 265)"
  heat-1: "oklch(0.82 0.01 265)"
  heat-2: "oklch(0.7 0.012 265)"
  heat-3: "oklch(0.55 0.014 265)"
  heat-4: "oklch(0.38 0.014 265)"
  heat-5: "oklch(0.22 0.014 265)"
typography:
  display:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "normal"
  headline:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "normal"
  title:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.025em"
  numerals:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tnum, lnum"
  body:
    fontFamily: "Barlow, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "ss01"
  label:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.1em"
  control:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.05em"
rounded:
  xs: "2px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  gutter-mobile: "16px"
  gutter: "24px"
  card-mobile: "20px"
  card: "24px"
  section: "32px"
  header: "64px"
components:
  button-primary:
    backgroundColor: "{colors.kit-cobalt}"
    textColor: "{colors.kit-cobalt-on}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-outline:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.locker-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-tape:
    backgroundColor: "{colors.pace-tape}"
    textColor: "{colors.pace-tape-on}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  input:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.locker-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "40px"
  card:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.locker-ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card}"
  kit-panel:
    backgroundColor: "{colors.locker-ink}"
    textColor: "{colors.locker-ink-on}"
    rounded: "{rounded.lg}"
    padding: "16px 80px 12px 24px"
  header:
    backgroundColor: "{colors.locker-ink}"
    textColor: "{colors.locker-ink-on}"
    height: "{spacing.header}"
  badge-live:
    backgroundColor: "{colors.cleared-green}"
    textColor: "{colors.kit-cobalt-on}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    height: "24px"
  badge-negative:
    backgroundColor: "{colors.stop-red}"
    textColor: "{colors.kit-cobalt-on}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    height: "24px"
  badge-tape:
    backgroundColor: "{colors.pace-tape}"
    textColor: "{colors.pace-tape-on}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    height: "24px"
---

# Design System: Cadence

## Overview

**Creative North Star: "The Club Kit"**

Cadence is the gym's club, and every screen wears its kit. The system borrows from athletic department identity programs: one team color (Kit Cobalt), dark Locker Ink panels against Chalk ground, and a flash of Pace Tape yellow wherever something needs a second look. Headings, labels, buttons and every number are set in a condensed athletic face, uppercase, so a plan reads like a jersey numeral: 3 × 10 @ 20 kg, legible from across the gym floor.

It is an Operate system, so expression never beats the task. Reading fields stay achromatic and calm; color is spent on actions, live state, and the kit elements that tell you you're in Cadence (the ink header, the brand mark's two slanted bars, and the angled sleeve stripes cut into the corner of ink panels). Density is moderate: generous card padding, clear rows, one strong number per row. Light and dark themes ship together and follow the system preference by default.

Confirmed rejections: the neon-on-black fitness app, the white SaaS card grid, and full-width double stripes (the earlier "tape under the header" read as an esports site and was removed).

**Key Characteristics:**
- Condensed uppercase display type and tabular numerals carry the energy; the body face stays quiet.
- One team color (Kit Cobalt) for actions and live state; Pace Tape only for attention.
- Locker Ink panels for kit moments: the header, the Home hero, the plan header of the chosen day, the auth card top, the kiosk.
- Status is carried by form as well as hue: solid, dashed, struck.
- Tight, confident corners (4 to 8px), flat surfaces, shadows only for things that float.

## Colors

A restrained team palette: one saturated cobalt, one ink, one yellow, on cool neutrals. The frontmatter holds the light-theme values; the dark theme (class `.dark`) redefines each role, listed below.

### Primary
- **Kit Cobalt**: primary buttons, the active tab underline, selected chips and calendar days, checked checkboxes, the completed-exercise fill, progress segments, focus rings. Dark theme lifts it to a lighter cobalt (oklch(0.72 0.15 266)) with ink text on it.
- **Stripe Cobalt**: the cobalt band in the brand mark and in the corner sleeve stripes only. Slightly brighter than Kit Cobalt so it reads on ink.

### Secondary
- **Pace Tape**: attention, never action. "Edited by a trainer" and "Edited the plan", the user's initials disc, the current step in the registration stepper, the active nav underline in the header, the "Join" call to action on the public header, the yellow band in the sleeve stripes.

### Tertiary
- **Cleared Green**: settled positive states only (access granted, active, available, the turnstile opened).
- **Stop Red**: settled negative determinations and destructive actions (access not available, deactivate a membership). As a dashed border it marks technical failure (see the Form-Not-Hue Rule).

### Neutral
- **Locker Ink**: body text in light theme; the header and every kit panel in both themes (dark theme uses a deeper oklch(0.12 0.01 265) so panels stay darker than the page).
- **Chalk**: the page ground in light theme. Dark theme ground is oklch(0.16 0.012 265).
- **Card White**: cards, inputs, popovers. Dark theme: oklch(0.2 0.014 265).
- **Bench Gray** / **Bench Gray Text**: muted fills (hover rows, chips, segmented filter track) and secondary text.
- **Cobalt Wash** / **Cobalt Wash Text**: tinted info surfaces (notes, the chat's "Remembered" strip, icon tiles, checked option cards).
- **Hairline** / **Field Stroke**: dividers and card borders / input outlines.
- **Locker Ink Muted**: secondary text on ink panels.
- **Heat 0 to Heat 5**: the muscle map ramp (`--heat-0` to `--heat-5`), six achromatic steps from "no work" up to the busiest muscle. Light theme runs from a pale gray to near Locker Ink (above); dark theme reverses direction so more work is lighter: oklch(0.29 0.013 265), oklch(0.4 0.014 265), oklch(0.52 0.014 265), oklch(0.67 0.012 265), oklch(0.82 0.01 265), oklch(0.96 0.006 265).

### Named Rules
**The Team Color Rule.** Kit Cobalt marks what you can do or what is live. If an element is neither an action nor live state, it doesn't get cobalt.

**The Tape Means Look Rule.** Pace Tape is reserved for "notice this": edits by someone else, where you are in a sequence, who you are, a plan that must be reviewed because an exercise in it cannot be done or because the member accepted a safety warning (the Must Review badge, the plan notice and the review banner), a safety warning on an exercise, and a muscle the member reported as injured. Never use it for a primary action inside the app, except the one "Apply" that commits a coach proposal.

**The Achromatic Reading Field Rule.** Paragraphs, tables and forms sit on Chalk or Card White with ink and gray text. Color lives at the edges: badges, buttons, kit panels.

**The Form-Not-Hue Rule.** Status is carried by form as well as hue: solid is a settled determination, dashed is pending or a technical failure, struck is unavailable. A technical failure (a turnstile that did not open, a request that failed) is never drawn as a settled negative.

**The Quiet Heat Rule.** Data heat is never colored. The muscle map ramp is ink on gray in both themes, so Kit Cobalt stays reserved for what you can do (hover, select, set a focus) and a heat step is never mistaken for an action.

## Typography

**Display Font:** Barlow Condensed (with sans-serif)
**Body Font:** Barlow (with sans-serif)

**Character:** Barlow Condensed is the jersey: tall, tight, uppercase, built for numbers. Barlow is its plain-spoken teammate, a DIN-flavored workhorse with stylistic set 01 on for the body.

### Hierarchy
- **Display** (800, 3.75rem up to 6rem on wide screens, line-height 1, uppercase): landing headline only.
- **Headline** (800, 2.25rem, 3rem from sm, line-height 1, uppercase): one page title per page, plus the auth tagline.
- **Title** (700, 1.25rem, tracking 0.025em, uppercase): card titles, section titles, empty-state titles, dialog titles.
- **Numerals** (700 to 800, 1.875rem in rows, 3rem in panel tallies, tabular lining figures): sets × reps, done counts, the staff Overview counts, plan counts in the demand card, calendar days, pagination.
- **Body** (400, 1rem; inputs drop to 0.875rem from md): prose, descriptions, table cells. Keep paragraphs within 65 to 75ch (`max-w-prose`).
- **Label** (600, 0.75rem, tracking 0.1em, uppercase): table headers, muscle-group tags, eyebrow lines inside kit panels, badges.
- **Control** (600, 1rem, tracking 0.05em, uppercase): every button except the `link` variant, tab triggers, segmented filters.

### Named Rules
**The Jersey Number Rule.** Any count, measure or date component the user scans is set as numerals (condensed, tabular). Never set sets/reps/load in the body face.

**The Scale-Only Rule.** Sizes, tracking and leading come from the Tailwind scale (`text-xs`, `tracking-widest`, `leading-none`), never bracket values. One-off sizes are how a system stops looking like one.

## Layout

One frame for every page: the header and page content share the same centered container (max width 72rem, `max-w-6xl`) with a 16px gutter on phones and 24px from sm. Pages stack sections with a 32px gap and leave 96px at the bottom so the floating coach button never covers content.

Two-column pages (catalog, review detail, member Home) use a 3-column grid on large screens: the main content spans two columns, the side panel one. The member plan page is the exception: one full-width stack. Its head row holds the page heading and, from lg, the day strip at its right (32rem wide, bottom edges aligned); below lg the strip stacks under the heading. The plan card follows at full width, with the muscle map inside it. A side panel never sits inside a column that is already a third of the page, so a map is never squeezed, and a grid is never nested inside another grid column. The staff Overview is the exception: it is a single full-width stack.
- **Member Home (the Now screen):** a full-width ink hero first (the date as a numeral, "Let's go, name", the done tally, and two facts: today's check-in and the gym's open state). Directly under it, only while the plan needs it, the Must-Review Notice. Then one 3-column grid: the next exercise as a focus card and the day's list in the main two columns; the Week Strip and the trainer-note panel (only when a trainer wrote a note or edited the plan) in the side column.
- **Staff Overview:** the summary lines first, then the full-width "Today's demand" card. The lines sit in one bordered, divided list, up to three, each a row with a big numeral, a Title-type name, one sentence and a chevron, opening the page that owns the detail: Must review, Trainer edits and notes (the plans a trainer touched in the last 7 days, the window stated in the sentence) and, for an admin, Turnstile (failed check-ins today). The Today's demand card is described under Components.
- **Review detail:** the member's name as the page title, previous and next plan controls under it, then the 3-column grid: the exercise editor in the two-column main, and the "What the AI knew" card, the muscle balance preview and the review history stacked in the side column. On a phone the order is context, exercises, muscles, history, so what the AI knew sits above the exercises.
- **Health profile (onboarding):** five columns split 2/3 once the member has a profile: the current profile on the left, "What your coach remembers" on the right. The update form replaces the pair while it is open.

Everything collapses to a single column below lg.

Sign-in and sign-up have no app header: a single centered card (max width 32rem) on the page ground, brand inside the card's ink top, the switch-page link under the card.

The header is 64px tall and sticky. With `scrollbar-gutter: stable`, the root background paints the ink band into the gutter so the header always reads full width.

Tables scroll horizontally inside their card rather than breaking the page; low-priority columns hide below sm or lg. Search and filters for a list live above its card in the Filter Bar, not inside the card.

## Elevation & Depth

Flat by default. Cards and panels are separated from the ground by a 1px Hairline border and tonal contrast (Card White on Chalk, Locker Ink on either), not by shadow. Shadows appear only on things that float above the page or need to read as pressable.

### Shadow Vocabulary
- **Raised** (`box-shadow: 0 1px 2px oklch(0 0 0 / 0.16)`): primary buttons and the active segment of a segmented filter.
- **Popover** (`box-shadow: 0 12px 32px -12px oklch(0 0 0 / 0.35)`): dropdown menus, selects, the date picker, tooltips, toasts.
- **Overlay** (`box-shadow: 0 24px 64px -16px oklch(0 0 0 / 0.42)`): sheets, alert dialogs, the coach chat panel.
- **Showcase** (`box-shadow: 0 24px 48px -24px oklch(0.2 0.05 266 / 0.4)`): the auth card and the landing sample plan, the two places the kit is presented rather than used.
- **FAB** (`box-shadow: 0 12px 32px -8px oklch(0.3 0.2 266 / 0.55)`): the floating "Coach" button.
- **Baseline** (`box-shadow: inset 0 -1px 0 hairline`): the tabs list baseline, drawn as an inset so the active underline can sit on it.

### Named Rules
**The Float-Only Shadow Rule.** If it doesn't float, it doesn't cast. A card on the page uses a border, never a shadow.

## Shapes

Tight, confident corners. Cards, panels and dialogs use 8px; buttons, inputs, selects and menus 6px; small buttons, badges, chips, checkboxes and skeletons 4px; stepper and progress segments 2px. The only fully round things are the user initials disc, switches, radios, the coach button and the chat's suggestion pills. Chat bubbles use 8px with the corner nearest the speaker squared to 4px.

The recurring silhouette is the **slant**: the brand mark is two parallelograms leaning right, and the same 107° lean repeats in the sleeve stripes, the stepper and progress segments (`-skew-x-12`), and the active marker in the mobile nav.

Dashed strokes are semantic, not decorative: they mean pending, empty, or a technical failure such as failed-to-load or a turnstile that did not open (see the Form-Not-Hue Rule). On the muscle map a dashed outline means no exercise trains that muscle, and a dashed cobalt outline means the member asked for less of it; a diagonal hatch means lost to unavailable equipment, the same grammar as struck.

## Components

### Buttons
Confident and kit-sharp: uppercase condensed labels, solid fills, no gloss.
- **Shape:** gently squared (6px), 4px on `sm`/`xs`.
- **Sizes:** 40px default, 32px sm, 48px lg (lg uses 1.125rem labels), square icon buttons at 28/32/40/48px.
- **Primary:** Kit Cobalt fill, raised shadow. Hover mixes 12% black into it (12% white in dark).
- **Outline:** Card White with a Field Stroke border; hover darkens the border and fills Bench Gray.
- **Secondary / Ghost:** Bench Gray fill / transparent, both hover to a light tint.
- **Success / Destructive:** solid Cleared Green / Stop Red. Destructive is for the confirmed destructive step ("Deactivate" a membership, sign out); Success has no current use and exists for a future settled positive action.
- **Tape:** Pace Tape fill with dark text; the public "Join" button and the coach panel's "Apply to plan for <date>" action.
- **Link:** the only lowercase, body-face variant.
- **States:** focus shows a 3px cobalt ring at 45%; pressing nudges down 1px; disabled drops to 45% opacity. A running action disables the button, swaps its label to what is happening ("Saving...", "Building your plan...") and sets the Coach Mark in motion. A button never changes state through its text alone.

### Coach Mark (the AI at work)
The icon of everything the coach does, and the loading cue of every button whose action takes time. Three slanted bars in the brand's lean (the cadence of a set), stepped in height, with a four-point spark above them. Still, it is the leading icon of the floating Coach button, "Build my plan" and the other coach actions. Active, the bars rise and fall in turn like reps (1.1s, expo-out, 150ms apart) and the spark breathes, scaling up and turning a quarter. The `tempo` variant drops the spark for work that is not the AI (saving a fact, applying a proposal), so the spark always means "the coach is involved". The mark takes the button's text color. Under reduced motion it stays still and the changed label carries the state.

### Badges (status)
- **Style:** 24px tall, 4px corners, label typography.
- **Live:** solid Cleared Green ("Available", "Active", "Opened").
- **Negative:** solid Stop Red, for a settled negative state. No screen uses it today; the kiosk's solid red "Access not available" is its form on the wall.
- **Pending:** transparent with a dashed ink border ("Upcoming", "Estimate", a membership "None").
- **Retry:** transparent with a dashed Stop Red border and red text ("Did not open" for a check-in whose turnstile did not respond, "Couldn't refresh"). This is for technical failure, never a real determination.
- **Unavailable:** outlined, gray, struck through. Its copy is always "Out of service" for equipment, on the catalog, in the demand table, in the exercise picker and in the plan editor (the internal term stays `unavailable`). Exercise rows use a plain outlined gray badge instead, because their numerals are already struck.
- **Tape:** solid Pace Tape ("Edited by a trainer" on a member's plan, "Trainer edited" in staff lists, "Edited the plan" on a single note, "Must review", "Sample plan").
- **Secondary:** a quiet gray fill for plain facts that need no attention. "Trainer note" marks a plan with a trainer's note but no edit, because a note changes nothing in the plan. "Inactive" marks a membership staff switched off: it is a setting, not a settled negative, so it is never red and never struck.

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** Card White (dark: oklch(0.2 0.014 265)).
- **Shadow Strategy:** none; see Elevation.
- **Border:** 1px Hairline.
- **Internal Padding:** 20px on phones, 24px from sm. Footers sit on Bench Gray at 60% with a top border.
- **Titles:** Title typography, uppercase.

### Kit Panel (signature)
The ink header strip on today's plan, the Home hero, the landing sample plan and the auth card top. Locker Ink fill, Locker Ink Muted eyebrow label, a big tabular tally, and the **sleeve stripes**: two bands at 107° (Stripe Cobalt then Pace Tape) in a 6rem-wide strip at the top-right corner. The text row is padded 80px on the right so the title, tally and badges never sit on the stripes. The one thing that does is the plan head's progress segments: they sit under the title and tally across the full width, on top of the stripes, which run the whole height of the head.

The stripes are a small detail, not a surface. They belong only on a compact ink strip (a header or card top roughly 8rem tall or less), once per screen, in its top-right corner. They never go on a page or full-screen background, on a tall panel, or behind content. If a surface is big enough that the stripes would dominate it, it gets none: the brand mark carries the kit.

### Kiosk Panel
The wall-mounted check-in screen is the one surface with its own layout, because it is read from a few metres away, not used up close. A full-viewport Locker Ink page with no stripes and no app header: a slim row with the brand mark (and the dev-only simulation control), then two columns from lg (3/5 and 2/5) that stack below it, camera first.
- **Step highlight:** each card has an inset outline (it never moves the content) in three weights, 1px, 2px, 4px, that rises as its own step progresses and is not synced with the other card. The camera stage is 1px until the camera is on or an image is chosen, 2px while it watches, 4px once a face is in. The status panel is 1px until recognition starts, 2px while it runs, 4px once it has an answer. The highlight walks from the camera to the status.
- **Camera stage:** fills the column's full height, mirrored, with an outline that takes the state's color (cobalt while scanning, solid green, tape or red for a result, dashed for a miss or a failure). While scanning, a dashed oval shows where to stand.
- **Status panel:** the peak of the screen. An outlined 8px panel holding a 5rem to 6rem icon, a Display-weight uppercase title (up to 6rem), and a 1.5 to 1.875rem sentence. A result that grants entry fills the whole panel: Cleared Green for "Access granted", Pace Tape for "Please wait" when the turnstile did not respond (the sentence says a staff member will open the door, and a small line below it tells staff the check-in is recorded). Every other result keeps the ink panel and is told by its outline alone, so form carries the meaning: a solid red outline for a settled decision ("Access not available", "Membership inactive", both sending the person to the front desk), a dashed outline for anything that is not a decision about the person ("Try again" after a missed match, "Please see the front desk" after three misses in a row, and "Check-in unavailable" in dashed red when the request itself failed and nothing was recorded). A slanted bar drains across its bottom edge during the 5 second cooldown.
- **Wording:** the panel never names a member and never shows developer text on the wall (file paths and key names appear only in a dev build, under "Dev only"). Failures speak to the person in plain sentences and point to the front desk.
- **Scanning:** the panel stays quiet, with three slanted cobalt segments pulsing in turn.

### Inputs / Fields
- **Style:** 40px tall, Card White fill, 1px Field Stroke border, 6px corners; textareas grow with content from 80px.
- **Hover:** border darkens to ink at 30%.
- **Focus:** border turns cobalt plus a 3px cobalt ring at 25%.
- **Error:** Stop Red border and a soft red ring; the message sits under the field in red.
- **Disabled:** Bench Gray fill at 60% opacity.
- **Checkbox / Radio:** 20px with a 2px border, filling Kit Cobalt when checked; option cards that wrap one tint to Cobalt Wash when checked.
- **Date picker:** an input-styled trigger with a calendar icon opening a 288px month grid (40px day cells, numerals, today underlined in cobalt, selection filled cobalt), month/year selects for birthdates, Today/Clear in the footer.
- **Date range picker:** the same input-styled trigger, showing the preset name when the range matches one (otherwise just the dates). It opens a popover with a column of presets (Today, Last 7 days, Last 30 days, This month, Last 3 months, Last 6 months, This year, Last 12 months; a scrollable row above the grid on phones) next to the same month grid. A preset applies and closes at once; on the grid the first click sets the start, the second completes the range, and the days between are tinted. Both ends are filled cobalt like a single selection.
- **File dropzone:** a 2px dashed field that tints Cobalt Wash on hover and drag.
- **Select:** an input-styled trigger (the same border, hover, 25% cobalt focus ring) with a chevron that turns over while open, and the border and ring stay cobalt for as long as the menu is open. The menu opens below the trigger, never over it, at least as wide as the trigger, in a Popover-shadow panel with 4px padding. Rows are at least 36px tall; the row under the pointer or keyboard is Bench Gray, the selected row is Cobalt Wash with a cobalt check on the right.
- **Time picker:** the opening-hours times. An input-styled trigger with a clock icon and the time in numerals. Opening it floats an hours and a minutes wheel (minutes in steps of 5) over the trigger with no card or popover, on a flat Chalk wash at 90% that hides the page behind it, with no blur. Both columns loop, so 23 is followed by 00 and 55 by 00. The centre number is large and Kit Cobalt; the ones above and below shrink and fade out to nothing. The wheel moves with the mouse wheel, a drag or touch, a click on a number and the arrow keys (up and down move, left and right switch column). Clicking outside, Enter, Space or Tab confirms; Escape cancels. With reduced motion the numbers jump instead of easing.
- **Searchable exercise picker:** the catalog is too long for a plain select, so the staff plan editor adds an exercise from an input-styled trigger ("Add an exercise from the catalog") that opens a popover with a search field above a scrollable list (max 16rem tall). The list filters as the trainer types, and an exercise that is out of service stays pickable but muted, with its "Out of service" badge.

### Filter Bar
Every page that is a filterable list (Members, Check-ins, Reviews, the catalog's Exercises, Policies' Users) puts its controls in one free row above the list, never inside the list's card. Below lg the controls stack at full width; from lg they sit in one row with 12px gaps: the search field (288px) first, then any selects, and the segmented filters pushed to the right edge as a trailing group. A page with a single filter and no search keeps it at the left. Below the row comes the list in its own bordered card (a table or a divided list), and the pagination under that, 16px apart. A search or filter with no match shows its empty state in the same bordered card, so the row never moves. The skeleton is the same stack: the row's blocks (a segmented filter is 42px tall, a field 40px), then the list card. The row is the shared `FilterBar` component, with `FilterBar.Trailing` for the right-hand group.

### Navigation
- **Header:** a 64px sticky Locker Ink bar with the brand on the left, then nav links in Control typography at 1rem. Inactive links are Locker Ink Muted; the active one is full white with a 3px Pace Tape underline that grows from the left. Theme menu and user menu sit on the right. The user menu carries the membership badge ("Plan · Active", or "Plan · Inactive" in the neutral Secondary form, never struck). The member header lists Home, My plan, Metrics, Gym info and Health profile.
- **Public header:** the same ink bar with the brand on the left and, on the right, the theme toggle, a ghost "Gym info" link (hidden below sm), "Sign in" and the tape "Join" button. Gym info is public by design.
- **Grouped pages:** when an area has more pages than fit one line (staff), related pages sit in a group, shown as a trigger with a chevron. The staff header has five top-level entries: Overview and Plan reviews as plain links, then three groups: Gym (Gym info, Check-ins, Catalog), People (Members, Policies) and Setup (Turnstile, Opening hours). The group opens on hover (and on click or keyboard) as a Locker Ink panel below the trigger, with a hairline kit border and the popover shadow. Each row is Control typography with a slanted marker on the left: Pace Tape on the current page, a muted marker on the others. The trigger carries the tape underline when any page in the group is current. Links never wrap: a page name stays on one line. A group left with one page by permissions is shown as that page's link.
- **Mobile:** a hamburger opens a left sheet (80% width, max 24rem) in Locker Ink with 2xl uppercase links and a slanted tape marker on the active one. Groups are flattened into the same list under small uppercase group labels.
- **Tabs:** uppercase Control labels on an inset hairline baseline; the active tab gets a 3px Kit Cobalt underline. Horizontal overflow scrolls without a visible scrollbar.
- **Pagination:** "1-10 of 34 plans" in numerals on the left, ghost page buttons on the right, the current page filled cobalt.

### Signup Stepper
The registration flow, done in person at the gym after staff have decided. "Step 3 of 4 · Photo" in label type, over a row of four slanted segments (Details, Consent, Photo, Password): done segments solid cobalt, the current one Pace Tape, upcoming ones dashed. A Back control stays available on every step until the final Password submission, and nothing is stored before it, so there is no lock line and no point of no return to mark.

### Exercise Row (signature interaction)
The checkbox, the order number, the name and its muscles (the primary muscles in the label type, the supporting ones after a plus in the body face), and sets × reps (with load under it) as right-aligned numerals. Completing it fills the checkbox cobalt, draws a line through the name from left to right (420ms, expo-out), dims the numerals, and ticks the panel's tally and progress segments. Exercises that can't be done strike their numerals and show an outlined gray badge naming the equipment ("Leg press is out of service", or just "Out of service"). Only today's plan can be ticked. A past day renders the same box read-only (cobalt when done, dashed when not), and a day that has not come yet shows the checkbox switched off, labeled "can be ticked on the day". While a muscle is selected on the muscle map, the rows that do not train it dim to 45%.

One quiet interaction lives on the row, with no permanent buttons added: the numerals are the inputs (today and later, not once ticked, not for an exercise that cannot be done): sets and reps are number fields drawn exactly as the numerals they replace, with the weight in kilograms under them, so reading and editing are one layout and nothing moves. Each field keeps a fixed width sized for its largest value (20 sets, 100 reps, 1000 kg), so 9 becoming 10 never pushes its neighbor. At rest it is plain numerals; hovering tints the field Bench Gray and focusing rings it in cobalt, and the ring is a shadow, so the box never changes. Only digits can be typed. The weight is always a number of kilograms and the unit "kg" is always drawn beside the field, never typed and never part of the value; an exercise with no weight shows the field empty with a faint 0. The change is saved when the field loses focus or Enter is pressed, Escape puts the stored value back, a value outside what a plan accepts is put back too, nothing is written when the numbers are unchanged, and a toast says the coach will remember the change, because the coach reads every hand edit as a sign of what the member could or could not do. The same fields (a smaller size) are the numbers of every row in the Proposal Panel and a weight field with the unit inside it is used wherever staff edit a plan. While the member is pointing the coach at the page (see Pointing), the whole row becomes one target: a dashed Kit Cobalt outline inside the row, a full-cover button that makes the checkbox and the fields inert, and, once picked, a solid cobalt outline, a Cobalt Wash fill and a "Pointed at" tag. Nothing on the row changes otherwise.

### Pointing
The one way to ask the coach about something on the page, with no coach button on any row, muscle or chart. It has two entries that end in the same chips above the message box. The **@ menu**: the @ button beside the message box, or typing "@", opens a list above the composer (Card-colored, Hairline border, Popover shadow, 16rem tall at most) of everything referenceable, grouped under label-type headings (Today's plan, Muscle groups, Muscles) and narrowed by what follows the "@"; the arrow keys, Enter and Tab pick, Escape closes the list and not the chat. Its first row, shown while the screen has something to point at, is "Pick from the page". **Pointing mode**: choosing it closes the chat and lights up every pointable thing on the screen with a dashed Kit Cobalt frame (an exercise row, the muscle map and the radar, the Muscle Map panel head for the whole distribution); a tap toggles it into the message, a picked one turns solid cobalt with a "Pointed at" tag, and while it lasts the floating Coach button gives way to a Locker Ink bar fixed near the bottom (centered from sm) that says "Pick what to ask about", holds the chips picked so far and a light "Back to chat" button with their count in numerals. Escape also goes back, and the half-written message survives the trip. Pointing never sends anything: once something is picked, a few suggested questions for it appear as round pills above the message box and only fill it, so the member reads, changes and sends the message themselves.

### Tooltip
Explains a label without a visible second line. Always use the shared HelpTip (`components/help-tip.tsx`), never a one-off tooltip. Opens on hover and keyboard focus after 150ms from a small icon-only trigger: a help (`?`) icon, 28px square, muted until hovered, with the same text as its accessible name. The bubble is a Card-colored popover with a Hairline border, the Popover shadow, 6px corners, caption-sized text and a 15rem maximum width. Use `?` to explain what something is; reserve `!` for a warning, which belongs in a badge or message instead. Never put information users need to act on only in a tooltip, because a tap on a phone may not open it.

### Group Matrix (signature table)
The policies-by-groups comparison on the policy screen's second tab: one row per policy, one column per group, a Kit Cobalt tick where the group includes it and a faint dash where it doesn't. Group headers are Title typography with a help tooltip for the description and the group's tally in numerals ("8 of 18") underneath; the first header, "Policy", is the same size and vertically centered with them. Rows holding the same set of groups sit together, widest first, and a 4px Bench Gray rule marks each new cluster, so every group reads as a block of ticks down its column. Each row leads with the policy's description and, under it, its permission in caption type. Each cell has an off-screen label for screen readers. It scrolls horizontally inside its card on a phone.

### Chart
Data is drawn with shadcn's Chart component (`components/ui/chart.tsx`, Recharts underneath), never hand-built bars. The check-ins-per-hour bar chart on the gym page, shown only to people who can read check-ins (admins), is the pattern and the only chart on that page: a `ChartContainer` 12rem tall inside a card section, horizontal Hairline grid lines only, no axis lines or tick marks, count labels on the left and hour labels every six hours at the bottom, in the muted gray and numerals. Bars have 2px top corners and are Locker Ink at 60% for past hours; the current hour is Kit Cobalt, because it is live state. The tooltip is the Popover pattern (Card-colored, Hairline border, Popover shadow) and gives "07:00 to 07:59" with the count, on hover, tap and keyboard focus (`accessibilityLayer`). A one-line summary in body type above the chart (the busiest hour and how many members checked in, each member counted once per hour) carries the reading for anyone who skips the graphic. Rankings of names are not time series, so they are not charts: the equipment demand on the staff Overview is a table with a quiet CSS bar, and the gym page has no demand lists at all. A heat map of muscles is not a chart: it is the Muscle Map below. The radar of the six muscle groups beside it is a chart, a `ChartContainer` with a `RadarChart` 4:3 and at most 20rem wide: a Hairline polygon grid, the group names in label type on the spokes, and a polygon of Locker Ink at 28% (the heat ramp's `--heat-4` in both themes), because it is data and so never colored. A point turns Kit Cobalt when the group, or one of its muscles, is hovered, selected or picked, and every point is a `ChartTooltip` in the Popover pattern with the group name and its weighted sets in numerals. It is pointer-only and hidden from assistive technology, its focus box is switched off, and the muscles' ranked list stays in the page, visually hidden, as its text.

### Muscle Map (signature visualization)
A front and a back body drawn from inline SVG, one shape group per muscle (22 muscles; left and right are never told apart, so both sides are painted, hovered and selected as one, and a muscle seen from both sides looks the same on both). Each muscle is filled with one of six achromatic steps, `--heat-0` for no work up to `--heat-5` for the busiest muscle in that view, with a 1.5px Card-colored stroke so neighbors separate. The fill eases for 300ms (expo-out) when the data changes, the one authored motion. The ramp is Locker Ink on gray, never colored (The Quiet Heat Rule).
- **Cobalt is interaction only:** hovering a muscle, on the body or through the radar, draws a 2px Kit Cobalt outline (all the muscles of a hovered group together), the selected muscle a 3px one, and a muscle or group picked while pointing the coach at the page keeps the outline until it is taken off. The outlined muscle is drawn last so no neighbor covers it. Hovering a muscle also shows a tooltip at the pointer (the Popover pattern) with its name, its value in numerals and, when it applies, the injury chip.
- **Form carries status:** a diagonal hatch over the fill means lost to unavailable equipment, and a dashed Locker Ink outline means no exercise trains that muscle. An injury the member reported to the coach is a 3px Pace Tape outline with a Pace Tape hatch that leans the other way (-45 degrees) from the equipment hatch, so the two never read as the same thing; the hover tooltip carries a tape alert chip and the muscle's row in the hidden ranked list says "injured", so the state does not depend on color. The legend explains the ramp and shows the hatch, the dashed swatch and the injury swatch only when the view uses them.
- **Layout:** the two bodies sit side by side from `sm` inside their card; on a phone one body shows behind a Front/Back segmented control. A narrow form column asks for the single view at every size, and a compact panel asks for both bodies at every size, scaled to 18rem tall so the map never takes more than a screen. The map and its breakdown sit side by side when their container is 36rem wide or more (a container query, not the viewport) and stack below that. The breakdown is the radar of the six muscle groups above (member views) or a ranked list of the muscles (a swatch, the name, the value in numerals) where the exact per-muscle number is the point, as in the staff demand card. Beside the radar the ranked list stays in the page, visually hidden: it is the text summary, the keyboard and screen-reader path (every muscle is a button, and focusing one lights up the body and the radar), and where a selected muscle's detail opens, a hairline-bordered block with its exercises, never a nested card. The shapes themselves are hidden from assistive technology.
- **Loading:** a skeleton is the real silhouette in 7% ink, pulsing, behind the usual 200ms delay.
- **Hover:** it is read from the one svg, not from each muscle, because lighting a muscle reorders the shapes under the pointer and a node that moves loses its pointerleave. Leaving the map, the radar or the whole view, scrolling and the window losing focus all drop the hover and the tooltip, so neither can stay behind.
- **Variants:** the plan page (heat is weighted sets of the chosen day, plus the member's injuries on a day that can still be done, and the radar; it is a block inside the plan card between the progress segments and the exercises, a hairline-bordered section with a Title-type head that is the pointing target for the whole distribution, and the body and the radar sit side by side because the card is wide; a past day draws no injuries and has no pointing) for today, past days and days ahead alike, and metrics (read-only), the plan review preview (the plan as the trainer edits it, or what the member completed in the last 14 days, with the member's reported injuries outlined so a trainer judges the exercises against the body), the demand map on the staff Overview (see Today's Demand), the catalog Coverage tab (catalog, available now, lost; selecting out-of-service equipment redraws only the muscles it hurts, hatched), and the add-exercise body selector (a tap steps a muscle through primary at the top step, supporting at a lower one, and off). Demand is not a public variant: the gym page has no muscle map.

### Must-Review Notice
A plan that holds an exercise that cannot be done (equipment out of service) says so with Pace Tape, because it means "look at this". On the member's plan page and Home it is a tape-tinted strip that names the exercises and the equipment that is down and offers "Rebuild today without them". A plain rebuild runs at once: the confirmation appears only when the server says the plan holds something worth protecting, either a trainer edit ("A trainer already adjusted this plan", with "Keep trainer's plan" and "Replace edits") or exercises the member already ticked ("You've already started this plan", with "Keep this plan" and "Rebuild plan"; the ticks on exercises that stay are kept). The same dialog guards a chat plan adjustment. For staff it is the same tape badge, "Must review", in the queue (filterable, flagged plans first), a banner on the plan review page, and the first summary line of the Overview, a count with one sentence naming the next plan and linking to the queue filtered to must-review plans. It is a notice, never a block: it uses no red and no strikethrough (those mean a settled negative or an unavailable exercise), and it disappears when the plan no longer needs it. When nothing needs review the Overview line says so in one calm sentence.

A plan also needs review when the member saw a safety warning in the coach and applied the change anyway. For staff it is the same tape language: a "Safety warning accepted" badge in the queue (beside "Must review" when both apply), the reasons listed in the Overview's must-review lines, and a tape banner on the plan review page naming the exercise and the warning, saying the plan is already published and that a note or an edit clears the flag. It is a fact, not a verdict, and it never blocks publication.

### Change Log (staff)
"Changed through the coach", in the review detail's side column above the review history: one entry per change the member made without a trainer, oldest first. Each has a quiet icon tile (the coach sparkle or a pencil), a Secondary "Coach change" or "Member edit" badge, the time in numerals, the member's request in quotes and a compact diff (added rows with the "Added" badge, changed rows as the old numerals, an arrow and the new ones, removed rows struck). When the member accepted a safety warning, a Pace Tape strip under the diff names the exercise and the reason.

### Plan Build
While a plan is being written, whether from "Build my plan", a rebuild, the Home card or after the Health profile is saved, it appears row by row instead of behind a blank panel: a bordered list in the page's own layout where each exercise (name, primary muscles in label type, sets and reps as numerals) settles in with the block-in rise, 60ms after the one before it. Nothing in it is saved until the whole plan has been written; a build that breaks off ends in the usual retry state with no partial plan. The Health profile shows the same list under "Building your plan" with the animated Coach Mark.

### Week Strip
Seven slanted segments, Monday to Sunday, in the stepper's lean (`-skew-x-12`, 2px corners): a day with a check-in is solid Kit Cobalt, a day without one is Bench Gray, and a day yet to come is dashed. The weekday initial sits under each segment in label type and today's segment keeps a 2px ink outline. It is a row of facts about the member's own visits, so each segment has the date and "checked in" or "no check-in" as its accessible name.

### Today's Demand
The full-width card under the Overview's summary lines, so trainers are not surprised by missing or crowded equipment. Everything in it is counted in plans (distinct plans, never exercise rows or sets), and each number says what it counts. It refreshes every 60 seconds. A one-line summary sits across the top ("N plans dated today, M of them from members already in the gym"), then two columns from md.
- **Muscles (left):** a segmented filter, "All plans today" or "Already checked in", each with its plan count, above the Muscle Map. The value is how many of the selected plans train each muscle through an exercise that can be done now. The map has its legend ("Fewer plans" to "More plans", a dashed swatch for "No plan trains it"), a note saying what the numbers count, and the ranked list with the numbers beside it, with the muscles no plan trains folded under "Other muscles". It states facts only: no judgement is drawn on it.
- **Equipment (right):** a table of every piece, out of service first and then busiest first, with two numeric columns. "Plans" is how many of today's plans need the piece ("4 of 12" in numerals) with a quiet bar under it, Locker Ink at 60% on a Bench Gray track and scaled to the busiest piece, never colored. "In the gym" is how many of those plans belong to members who have already checked in. A piece that is out of service is struck through, links to the catalog Equipment tab and carries the "Out of service" badge. A plan counts toward a down piece only through an exercise with no working alternative. The header says how many pieces are out of service and links to the same tab.
- **Fit:** the table takes the height of the muscle column, so a long list scrolls inside the card with a sticky header and never makes it taller than the map. Below md it stacks under the map with a capped height.
- **Empty:** with no plan dated today the card shows a calm "No plans dated today yet" empty state.

### Remembered Facts
What the coach remembers, on the Health profile page beside the current profile: a card whose rows are grouped by fact type under label-type headers. Facts the coach picked up in the chat and the member has not saved yet come first, in a "Waiting for your confirmation" group: each row is dashed (Form-Not-Hue: not settled yet, never red) with a "Not confirmed yet" pending badge, the fact, the muscles an injury affects, the member's own words, and Confirm (primary), Edit ("Save and confirm") and Dismiss. They shape no plan until confirmed, and they are not counted among the remembered facts. Each row is the fact in body semibold, its date in numerals, and the member's own words ("You said: ...") in a quiet quote, with one outline button on the right, "No longer true". A resolved fact moves to a "No longer true" group at the bottom, struck and muted, with the button reading "Applies again". The change applies at once and a toast confirms it. Staff read the same list on the member page with the resolved facts muted and struck, and injuries and medication changes marked with a warning icon and listed first.

### Coach Chat
The "Coach" floating action button (the Coach Mark and the word) opens a modal dialog: full screen on a phone, a 24rem panel anchored above the button from sm, with the Overlay shadow. It traps focus, closes on Escape, and puts focus in the message field. An ink head carries the title with the Coach Mark and one line saying that the coach remembers what matters, asks before saving an injury or a medication, and that the chat itself is not stored. A confirmation dialog opening on top of the chat does not close it.

**Thread.** The member's messages are cobalt bubbles with their chips above; the coach's reply streams in as text, then each component the coach chose settles in below it (a short rise, 420ms, expo-out). While it works, a status line carries the animated Coach Mark and says so ("Your coach is working on it..."); a reply that breaks off keeps what arrived and shows a dashed red strip with "Try again", never a half-finished success. The coach picks from a fixed set of blocks and the app draws every one of them, so nothing the model writes is ever markup:
- **Plan proposal card:** the change at a glance, the day, the coach's one-line summary, the number of changes in numerals, the first three rows (new rows marked, changed rows as the old numbers struck then the new ones), a tape "Safety warning" badge when one applies and "Review and edit", which opens the Proposal Panel. It says "Applied" once applied and "Not applied" once replaced or discarded.
- **Exercise picker:** 3 to 5 options the coach chose for a muscle the member pointed at, each with its reason, its sets and reps and an "Add to my plan" action that puts it in the draft. An option that touches a reported injury carries a tape strip.
- **Exercise explainer:** the exercise, its primary muscles, a one-line summary, numbered technique steps, what it does for this member, common mistakes and a "For you" note in Cobalt Wash.
- **Safety warning:** a Pace Tape card naming the exercise and why, with safer alternatives and a "Swap in" action for each.
- **Facts to remember:** a dashed Cobalt Wash card ("Remember this?"), only for an injury or a medication change; every other fact is remembered at once and never interrupts the thread. Each fact shows its type and the muscles an injury affects, a dashed "Not saved yet" badge, and "Save it" (primary), "Edit" and "Not right". Saved facts turn solid green, dismissed ones are struck. Nothing in the card is remembered, and nothing reaches a plan, until it is saved; whatever is left waits on the Health profile.
- **Suggested replies:** two or three round pills under the latest reply, sent like a typed message. The empty state's starters are the same pills, built from today's plan.

**Chips.** Pointing (see Pointing) at an exercise (a row on the plan, a row in the proposal), a muscle, a muscle group or the whole distribution adds a chip with an at sign above the message box: a 28px Cobalt Wash tag with the name (a muscle or group chip also says "muscle" or "group", so "Back" the group and "Lats" the muscle never blur) and a remove control. The coach receives the exact exercise, muscle, group or distribution, so "make it 3 reps" cannot be taken for a similar exercise. The message box has the @ button on its left and the send button on its right, sends with Enter, and while a reply streams the send button shows the animated Coach Mark.

**Proposal Panel.** The editable version of a proposal. From lg it docks beside the chat (the dialog grows to 48rem, the chat keeps its place on the right); below lg it covers the chat with a back control labelled "Chat". Its head has the day, the coach's summary and the number of changes in numerals. Each row has the exercise name (tap to point at it for the coach), its primary muscles with a "New" or "Changed" tag in cobalt, the sets, reps and weight as the inline number fields described under Exercise Row (a changed row says "was 4x10 20 kg" in its tag line, so the numbers never move), the coach's reason in one line, and a remove control. A row with a safety warning gets a Pace Tape strip with the reason, a checkbox "I understand and want this exercise anyway" and "Ask for a safer swap". Taken-out rows move to a "Taken out" group, struck, with "Put back". It opens with its own slide from the left edge of the chat (320ms, expo-out) and the dialog itself never animates its size, so the chat does not move. The footer holds the tape "Apply to plan for <date>" (disabled while any warning is unaccepted or the plan is empty, with a line saying why) and "Discard". Applying uses the same confirmation dialog as a rebuild when the plan holds a trainer edit or ticked exercises. The panel edits a draft that lives only in the browser: every message carries it to the coach, and nothing is written until Apply. On a phone a proposal never covers the reply as it arrives: a Cobalt Wash bar above the composer ("Draft for <date>", the number of changes in numerals, "Review and apply") keeps the draft one tap away whenever the panel is closed, including a draft started by adding an exercise from a picker.

### Trainer Notes
The member's own view of what trainers wrote, on Home (a panel titled "Your trainer changed this plan" or "A note from your trainer") and on the plan, above the exercises. One entry per note or edit, oldest first: the author in semibold, the time in numerals, a tape "Edited the plan" badge when that entry changed the exercises, then the note's full text. It exists only when there is a note; there is no empty placeholder. The plan's header badge is the tape "Edited by a trainer" or, for a note alone, the quieter Secondary "Trainer note".

### Day Strip
The plan page has no tabs and the strip has no card: a row of circles picks the day the plan below shows. From lg it sits at the right of the page heading, 32rem wide with its bottom edge aligned to the heading's; below lg it stacks under the heading at up to 36rem, left-aligned. A fixed row of weekday names (Mon to Sun, label type, Bench Gray Text, today's column in ink) heads seven columns, and one row of circles under it shows the week of the chosen day. There are no week arrows, no "Today" button and no date picker.
- **Circle:** 40px, 48px from sm, with the day as a numeral (1.125rem, 1.25rem from sm, semibold) inside. The chosen day is a solid Kit Cobalt disc. Today, when not chosen, is a Pace Tape disc, and a chosen today carries a small slanted Pace Tape tick under it, so today is always marked. Hover on the others is a Bench Gray disc. A day with no plan is only its number in muted text, so every day takes the same room.
- **The ring:** the circle's border is the plan, one arc per exercise (at most eight, 3px thick, small gaps), Kit Cobalt when done and ink at 20% when not, so a ring is full only when the whole plan is done. A day that has not come shows empty arcs and no count (the Form-Not-Hue Rule: pending is never drawn as done). A small Pace Tape slant on the circle's corner means a trainer edited that plan. The ring is drawn with a CSS conic gradient, a 2px gap of the surface colour separating it from the disc.
- **Month:** a "Show October" outline pill straddles the strip's bottom edge, so it adds no height. On a device with a mouse it is invisible until the strip is hovered or something in it has keyboard focus, and it stays while the popover is open; on a touch screen it is always visible. It opens a Popover as wide as the strip, so its columns sit under the same names: the month and year as a Title, then every week of today's month, with days of the neighbouring months dimmed. It floats over the page and takes no room; choosing a day selects it and closes it. It scales and fades in from its top center.
- **Loading:** the names and numbers render at once and each circle shows a ring-shaped skeleton after the usual 200ms delay, so a tick or a reload never blinks.
- **Below the strip:** the chosen day's plan card. Its Kit Panel head names the day ("Today, Monday 5 October") and carries the tally: done of total in numerals, or "N planned" for a day ahead, with a status line ("3 to go", "All done. Nice work.", "Ticks open on the day"). The progress segments sit in the head under the title and tally, over the sleeve stripes: chalk when done, chalk at 20% when not, dashed chalk outlines for a day ahead. Then come the muscle map and the exercises. Today's ticks work, a past day is read-only and a day ahead locks them.

### Exercise Note
An exercise's own note is a 28px Cobalt Wash icon tile (a sticky-note icon) beside its name, so the row keeps its rhythm and a row without a note has no tile. A mouse peeks at the note by hovering, and a click, a tap or Enter keeps it open until the next click, Escape or a press elsewhere; the note is a Popover-pattern bubble (Popover shadow) up to 18rem wide, opening on the tile's own state rather than a tooltip's, because a tooltip cannot be kept or selected and a hover card has no touch or keyboard path. While open the tile fills Kit Cobalt.

### What the AI Knew
The top card of the review detail's side column, so a trainer can judge safety next to the exercises. A plain card with the member's name and age, then labeled blocks: the health profile (physical information, goals, medications, physical conditions, exams, other notes, its submission time in numerals) and the facts remembered from chat, injuries and medication changes first with a warning icon, each with its date and the member's words. A link opens the full member page for anyone who can read members. It states the inputs as they stand now and draws no conclusion of its own.

### Check-in Strip
Thirty slanted segments on the member page, oldest to newest, in the Week Strip's lean (`-skew-x-12`, 2px corners): a day with a check-in is solid Kit Cobalt, a day without one is Bench Gray. A sentence above it counts the days. Each segment has the date and "checked in" or "no check-in" as its accessible name.

### Check-in Log
The admin's table of recent check-ins, in a card with a segmented filter ("All" or "Did not open", each with its count) and numeric pagination. Columns: member, time in numerals, turnstile result and a reason. "Opened" is the Live badge and "Did not open" is the dashed red Retry badge, because a turnstile that did not respond is a technical failure, not a decision about the member. The reason column (not configured, timed out, answered with an error, could not be reached, unknown) hides below sm and moves under the badge. It refreshes every 60 seconds.

### Membership Control
A Switch beside the membership badge, on each Members row and on the member page, for anyone allowed to change memberships; everyone else sees only the badge. Activating is one click and a toast confirms it. Deactivating opens a confirmation first because it signs the member out: "Deactivate <name>?", saying the member cannot log in until staff reactivate and that plans and history stay, with a destructive "Deactivate" button.

### Opening-Hours Form
A card list, Monday to Sunday, one row per day: the day in Title type, a "Closed" switch and, when open, two time pickers (see Inputs / Fields) in numerals with "to" between. A closed day reads "Closed all day". Errors (a close before the open) sit under the row. A "Save opening hours" button stays disabled until something changes, and a line beside it says the times use the gym's local clock and that the public gym page follows them.

### Loading
Skeletons are 4px blocks at 7% ink, pulsing, sized exactly like the content they replace. They wait 200ms before appearing, so fast loads never flash. When a parameter changes (a history date), the previous result stays until the new one arrives or 200ms pass.

## Do's and Don'ts

### Do:
- **Do** set every scannable number (sets, reps, counts, days) in Barlow Condensed with tabular figures.
- **Do** keep page titles one per page, Headline size, uppercase, with the description in body gray underneath.
- **Do** use the shared tokens for depth and hover (`shadow-popover`, `bg-primary-hover`); add a new token in `globals.css` if the system genuinely needs one.
- **Do** give every state its own form: solid for settled, dashed for pending or failed, struck for unavailable.
- **Do** keep every page in the same 72rem container as the header.
- **Do** design both themes at once; every color is a role token that `.dark` redefines.
- **Do** build charts with the shadcn Chart component and the role tokens (`var(--primary)`, ink at 60%), and give each one a text summary.
- **Do** draw any muscle visual with the shared Muscle Map and the `--heat-*` tokens, and keep the ranked list in the page (visible, or visually hidden beside the radar) so it works without pointing at a shape.
- **Do** say what a count counts, in the number's own sentence or header (plans, members, check-ins), and count the same unit across a card.
- **Do** say "Out of service" for unavailable equipment, everywhere a person reads it.
- **Do** explain a label with the shared HelpTip rather than a one-off tooltip.
- **Do** show AI work with the Coach Mark and a label that says what is happening, and let the result arrive in parts (the reply, then each block; each exercise of a plan) instead of behind one wait.
- **Do** keep coach controls out of the rows: a row is selected, then one bar offers the action.
- **Do** put a list's search and filters in the Filter Bar above its card, and use the Time picker for times of day.

### Don't:
- **Don't** run stripes or tape across the full width of the header or a panel; the kit appears as the corner sleeve stripes and the brand mark only.
- **Don't** use the sleeve stripes as a background or on a large surface (the kiosk page has none); they are a subtle corner detail of a compact ink strip, once per screen. The plan head's progress segments drawn over them are the only content allowed on the stripes.
- **Don't** use bracket values for size, tracking, leading, radius or borders (`text-[10px]`, `tracking-[0.04em]`); use the Tailwind scale.
- **Don't** show a technical failure (a failed turnstile call, a failed request, a run of missed face matches) with a solid red form; solid red is for a settled decision such as "Access not available".
- **Don't** show a membership that staff switched off as struck or red; "Inactive" is the neutral Secondary badge.
- **Don't** show another person's name on the kiosk, or any developer text on the wall.
- **Don't** put a shadow on a card that sits on the page.
- **Don't** use Pace Tape for a primary in-app action, or Kit Cobalt for decoration.
- **Don't** show the app header on sign-in or sign-up, or a theme toggle there; those pages follow the system theme.
- **Don't** use spinners or "Loading..." text for data; use matching skeletons behind the 200ms delay. A running action uses the Coach Mark in its button, never a spinner.
- **Don't** let the coach write to a plan or remember a fact on its own: it proposes, the member applies or saves.
- **Don't** draw anything the model wrote as markup: the coach only chooses a block type and supplies data.
- **Don't** color data heat (no red-to-green or cobalt ramp) or tell left from right on the muscle map; cobalt outlines are for hover, selection and what the member is pointing the coach at only.
