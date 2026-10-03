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
- Locker Ink panels for kit moments: the header, today's plan header, the auth card top, the kiosk.
- Status is carried by form as well as hue: solid, dashed, struck.
- Tight, confident corners (4 to 8px), flat surfaces, shadows only for things that float.

## Colors

A restrained team palette: one saturated cobalt, one ink, one yellow, on cool neutrals. The frontmatter holds the light-theme values; the dark theme (class `.dark`) redefines each role, listed below.

### Primary
- **Kit Cobalt**: primary buttons, the active tab underline, selected chips and calendar days, checked checkboxes, the completed-exercise fill, progress segments, focus rings. Dark theme lifts it to a lighter cobalt (oklch(0.72 0.15 266)) with ink text on it.
- **Stripe Cobalt**: the cobalt band in the brand mark and in the corner sleeve stripes only. Slightly brighter than Kit Cobalt so it reads on ink.

### Secondary
- **Pace Tape**: attention, never action. "Edited by a trainer", the user's initials disc, the current step in the signup stepper, the active nav underline in the header, the "Join" call to action on the public header, the yellow band in the sleeve stripes.

### Tertiary
- **Cleared Green**: settled positive determinations only (cleared, available).
- **Stop Red**: settled negative determinations and destructive actions (not cleared, reject). As a dashed border it marks technical failure (see the Form-Not-Hue Rule).

### Neutral
- **Locker Ink**: body text in light theme; the header and every kit panel in both themes (dark theme uses a deeper oklch(0.12 0.01 265) so panels stay darker than the page).
- **Chalk**: the page ground in light theme. Dark theme ground is oklch(0.16 0.012 265).
- **Card White**: cards, inputs, popovers. Dark theme: oklch(0.2 0.014 265).
- **Bench Gray** / **Bench Gray Text**: muted fills (hover rows, chips, segmented filter track) and secondary text.
- **Cobalt Wash** / **Cobalt Wash Text**: tinted info surfaces (notes, "remembered from chat", icon tiles, checked option cards).
- **Hairline** / **Field Stroke**: dividers and card borders / input outlines.
- **Locker Ink Muted**: secondary text on ink panels.

### Named Rules
**The Team Color Rule.** Kit Cobalt marks what you can do or what is live. If an element is neither an action nor live state, it doesn't get cobalt.

**The Tape Means Look Rule.** Pace Tape is reserved for "notice this": edits by someone else, where you are in a sequence, who you are. Never use it for a primary action inside the app.

**The Achromatic Reading Field Rule.** Paragraphs, tables and forms sit on Chalk or Card White with ink and gray text. Color lives at the edges: badges, buttons, kit panels.

## Typography

**Display Font:** Barlow Condensed (with sans-serif)
**Body Font:** Barlow (with sans-serif)

**Character:** Barlow Condensed is the jersey: tall, tight, uppercase, built for numbers. Barlow is its plain-spoken teammate, a DIN-flavored workhorse with stylistic set 01 on for the body.

### Hierarchy
- **Display** (800, 3.75rem up to 6rem on wide screens, line-height 1, uppercase): landing headline only.
- **Headline** (800, 2.25rem, 3rem from sm, line-height 1, uppercase): one page title per page, plus the auth tagline.
- **Title** (700, 1.25rem, tracking 0.025em, uppercase): card titles, section titles, empty-state titles, dialog titles.
- **Numerals** (700 to 800, 1.875rem in rows, 3rem in panel tallies, tabular lining figures): sets × reps, done counts, staff board counts, calendar days, pagination.
- **Body** (400, 1rem; inputs drop to 0.875rem from md): prose, descriptions, table cells. Keep paragraphs within 65 to 75ch (`max-w-prose`).
- **Label** (600, 0.75rem, tracking 0.1em, uppercase): table headers, muscle-group tags, eyebrow lines inside kit panels, badges.
- **Control** (600, 1rem, tracking 0.05em, uppercase): every button except the `link` variant, tab triggers, segmented filters.

### Named Rules
**The Jersey Number Rule.** Any count, measure or date component the user scans is set as numerals (condensed, tabular). Never set sets/reps/load in the body face.

**The Scale-Only Rule.** Sizes, tracking and leading come from the Tailwind scale (`text-xs`, `tracking-widest`, `leading-none`), never bracket values. One-off sizes are how a system stops looking like one.

## Layout

One frame for every page: the header and page content share the same centered container (max width 72rem, `max-w-6xl`) with a 16px gutter on phones and 24px from sm. Pages stack sections with a 32px gap and leave 96px at the bottom so the floating coach button never covers content.

Two-column pages (member home, catalog, review detail) use a 3-column grid on large screens: the main content spans two columns, the side panel one. Onboarding uses five columns split 2/3. Everything collapses to a single column below lg.

Sign-in and sign-up have no app header: a single centered card (max width 32rem) on the page ground, brand inside the card's ink top, the switch-page link under the card.

The header is 64px tall and sticky. With `scrollbar-gutter: stable`, the root background paints the ink band into the gutter so the header always reads full width.

Tables scroll horizontally inside their card rather than breaking the page; low-priority columns hide below sm or lg.

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

Dashed strokes are semantic, not decorative: they mean pending, empty, or failed-to-load (see the Form-Not-Hue Rule).

## Components

### Buttons
Confident and kit-sharp: uppercase condensed labels, solid fills, no gloss.
- **Shape:** gently squared (6px), 4px on `sm`/`xs`.
- **Sizes:** 40px default, 32px sm, 48px lg (lg uses 1.125rem labels), square icon buttons at 28/32/40/48px.
- **Primary:** Kit Cobalt fill, raised shadow. Hover mixes 12% black into it (12% white in dark).
- **Outline:** Card White with a Field Stroke border; hover darkens the border and fills Bench Gray.
- **Secondary / Ghost:** Bench Gray fill / transparent, both hover to a light tint.
- **Success / Destructive:** solid Cleared Green / Stop Red, used only for the clear and reject decisions on certificates.
- **Tape:** Pace Tape fill with dark text; the public "Join" button and the chat's "Apply to plan" action.
- **Link:** the only lowercase, body-face variant.
- **States:** focus shows a 3px cobalt ring at 45%; pressing nudges down 1px; disabled drops to 45% opacity. A running action disables the button and swaps its label ("Saving...").

### Badges (status)
- **Style:** 24px tall, 4px corners, label typography.
- **Live:** solid Cleared Green ("AI: cleared", "Available").
- **Negative:** solid Stop Red ("AI: not cleared").
- **Pending:** transparent with a dashed ink border.
- **Retry:** transparent with a dashed Stop Red border and red text ("AI: couldn't evaluate"). This is for technical failure, never a real determination.
- **Unavailable:** outlined, gray, struck through.
- **Tape:** solid Pace Tape ("Trainer edited", "Sample plan").

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** Card White (dark: oklch(0.2 0.014 265)).
- **Shadow Strategy:** none; see Elevation.
- **Border:** 1px Hairline.
- **Internal Padding:** 20px on phones, 24px from sm. Footers sit on Bench Gray at 60% with a top border.
- **Titles:** Title typography, uppercase.

### Kit Panel (signature)
The ink header strip on today's plan, the landing sample plan and the auth card top. Locker Ink fill, Locker Ink Muted eyebrow label, a big tabular tally, and the **sleeve stripes**: two bands at 107° (Stripe Cobalt then Pace Tape) in a 6rem-wide strip at the top-right corner. The right side of the panel is padded 80px so content never sits on the stripes.

The stripes are a small detail, not a surface. They belong only on a compact ink strip (a header or card top roughly 8rem tall or less), once per screen, in its top-right corner. They never go on a page or full-screen background, on a tall panel, or behind content. If a surface is big enough that the stripes would dominate it, it gets none: the brand mark carries the kit.

### Kiosk Panel
The wall-mounted check-in screen is the one surface with its own layout, because it is read from a few metres away, not used up close. A full-viewport Locker Ink page with no stripes and no app header: a slim row with the brand mark (and the dev-only simulation control), then two columns from lg (3/5 and 2/5) that stack below it, camera first.
- **Step highlight:** each card has an inset outline (it never moves the content) in three weights, 1px, 2px, 4px, that rises as its own step progresses and is not synced with the other card. The camera stage is 1px until the camera is on or an image is chosen, 2px while it watches, 4px once a face is in. The status panel is 1px until recognition starts, 2px while it runs, 4px once it has an answer. The highlight walks from the camera to the status.
- **Camera stage:** fills the column's full height, mirrored, with an outline that takes the state's color (cobalt while scanning, solid green or tape for a result, dashed for retry and failure). While scanning, a dashed oval shows where to stand.
- **Status panel:** the peak of the screen. An outlined 8px panel holding a 5rem to 6rem icon, a Display-weight uppercase title (up to 6rem), and a 1.5 to 1.875rem sentence. A result fills the whole panel: Cleared Green for access granted, Pace Tape for "open the turnstile manually", a dashed outline on ink for retry, see staff and failures. A slanted bar drains across its bottom edge during the 5 second cooldown.
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

### Navigation
- **Header:** a 64px sticky Locker Ink bar with the brand on the left, then nav links in Control typography at 1rem. Inactive links are Locker Ink Muted; the active one is full white with a 3px Pace Tape underline that grows from the left. Theme menu and user menu sit on the right.
- **Grouped pages:** when an area has more pages than fit one line (staff), related pages sit in a group such as "Gym" or "People", shown as a trigger with a chevron. The group opens on hover (and on click or keyboard) as a Locker Ink panel below the trigger, with a hairline kit border and the popover shadow. Each row is Control typography with a slanted marker on the left: Pace Tape on the current page, a muted marker on the others. The trigger carries the tape underline when any page in the group is current. Links never wrap: a page name stays on one line. A group left with one page by permissions is shown as that page's link.
- **Mobile:** a hamburger opens a left sheet (80% width, max 24rem) in Locker Ink with 2xl uppercase links and a slanted tape marker on the active one. Groups are flattened into the same list under small uppercase group labels.
- **Tabs:** uppercase Control labels on an inset hairline baseline; the active tab gets a 3px Kit Cobalt underline. Horizontal overflow scrolls without a visible scrollbar.
- **Pagination:** "1-10 of 34 plans" in numerals on the left, ghost page buttons on the right, the current page filled cobalt.

### Signup Stepper
"Step 3 of 5 · Photo" in label type, over a row of slanted segments: done segments solid cobalt, the current one Pace Tape, upcoming ones dashed. The point after which answers can't be changed is marked with a lock line above the submit button.

### Exercise Row (signature interaction)
The checkbox, the order number, the name and muscle-group label, and sets × reps (with load under it) as right-aligned numerals. Completing it fills the checkbox cobalt, draws a line through the name from left to right (420ms, expo-out), dims the numerals, and ticks the panel's tally and progress segments. Exercises that can't be done strike their numerals and show an "Equipment unavailable" badge.

### Tooltip
Explains a label without a visible second line. Opens on hover and keyboard focus after 150ms from a small icon-only trigger: a help (`?`) icon, 28px square, muted until hovered, with the same text as its accessible name. The bubble is a Card-colored popover with a Hairline border, the Popover shadow, 6px corners, caption-sized text and a 15rem maximum width. Use `?` to explain what something is; reserve `!` for a warning, which belongs in a badge or message instead. Never put information users need to act on only in a tooltip, because a tap on a phone may not open it.

### Group Matrix (signature table)
The policies-by-groups comparison on the policy screen's second tab: one row per policy, one column per group, a Kit Cobalt tick where the group includes it and a faint dash where it doesn't. Group headers are Title typography with a help tooltip for the description and the group's tally in numerals ("8 of 18") underneath; the first header, "Policy", is the same size and vertically centered with them. Rows holding the same set of groups sit together, widest first, and a 4px Bench Gray rule marks each new cluster, so every group reads as a block of ticks down its column. Each row leads with the policy's description and, under it, its permission in caption type. Each cell has an off-screen label for screen readers. It scrolls horizontally inside its card on a phone.

### Chart
Data is drawn with shadcn's Chart component (`components/ui/chart.tsx`, Recharts underneath), never hand-built bars. The check-ins-per-hour bar chart on the gym page is the pattern: a `ChartContainer` 12rem tall inside a card section, horizontal Hairline grid lines only, no axis lines or tick marks, count labels on the left and hour labels every six hours at the bottom, in the muted gray and numerals. Bars have 2px top corners and are Locker Ink at 60% for past hours; the current hour is Kit Cobalt, because it is live state. The tooltip is the Popover pattern (Card-colored, Hairline border, Popover shadow) and gives "07:00 to 07:59" with the count, on hover, tap and keyboard focus (`accessibilityLayer`). A one-line summary in body type above the chart (peak hour and total) carries the reading for anyone who skips the graphic. Demand lists on the same page stay as simple CSS bars: they rank names, not a time series.

### Certificate Preview
The 7rem square thumbnail of an uploaded certificate in the review queue: a 6px-cornered, hairline-bordered tile that opens the file full size, with an ink veil and an open icon on hover and focus. If the file is missing from storage, the tile becomes a dashed Bench Gray square with a "File not found" label, since a dashed stroke already means failed-to-load. Each row also shows when it was uploaded, in numerals.

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

### Don't:
- **Don't** run stripes or tape across the full width of the header or a panel; the kit appears as the corner sleeve stripes and the brand mark only.
- **Don't** use the sleeve stripes as a background or on a large surface (the kiosk page has none); they are a subtle corner detail of a compact ink strip, once per screen.
- **Don't** use bracket values for size, tracking, leading, radius or borders (`text-[10px]`, `tracking-[0.04em]`); use the Tailwind scale.
- **Don't** show a technical failure (`pending_retry`, a failed turnstile call) with the solid red "not cleared" form.
- **Don't** put a shadow on a card that sits on the page.
- **Don't** use Pace Tape for a primary in-app action, or Kit Cobalt for decoration.
- **Don't** show the app header on sign-in or sign-up, or a theme toggle there; those pages follow the system theme.
- **Don't** use spinners or "Loading..." text for data; use matching skeletons behind the 200ms delay.
- **Don't** leave a broken image icon where an uploaded file is missing; show the dashed "File not found" tile.
