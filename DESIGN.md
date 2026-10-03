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
- **Heat 0 to Heat 5**: the muscle map ramp (`--heat-0` to `--heat-5`), six achromatic steps from "no work" up to the busiest muscle. Light theme runs from a pale gray to near Locker Ink (above); dark theme reverses direction so more work is lighter: oklch(0.29 0.013 265), oklch(0.4 0.014 265), oklch(0.52 0.014 265), oklch(0.67 0.012 265), oklch(0.82 0.01 265), oklch(0.96 0.006 265).

### Named Rules
**The Team Color Rule.** Kit Cobalt marks what you can do or what is live. If an element is neither an action nor live state, it doesn't get cobalt.

**The Tape Means Look Rule.** Pace Tape is reserved for "notice this": edits by someone else, where you are in a sequence, who you are, and a plan that must be reviewed because an exercise in it cannot be done (the Must Review badge, the plan notice and the review banner). Never use it for a primary action inside the app.

**The Achromatic Reading Field Rule.** Paragraphs, tables and forms sit on Chalk or Card White with ink and gray text. Color lives at the edges: badges, buttons, kit panels.

**The Quiet Heat Rule.** Data heat is never colored. The muscle map ramp is ink on gray in both themes, so Kit Cobalt stays reserved for what you can do (hover, select, set a focus) and a heat step is never mistaken for an action.

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

Two-column pages (the member plan page, catalog, review detail) use a 3-column grid on large screens: the main content spans two columns, the side panel one. A side panel never sits inside a column that is already a third of the page, so a map is never squeezed. The member home (the Now screen) and the staff Overview are single-column pages: the Now screen is one stack read from top to bottom with the next exercise as its focus, and the Overview puts three equal summary lines first (each a number, a title and one sentence, opening the page that owns the detail) and one full-width pool card below them. Onboarding uses five columns split 2/3. Everything collapses to a single column below lg.

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

Dashed strokes are semantic, not decorative: they mean pending, empty, or failed-to-load (see the Form-Not-Hue Rule). On the muscle map a dashed outline means no exercise trains that muscle, and a dashed cobalt outline means the member asked for less of it; a diagonal hatch means lost to unavailable equipment, the same grammar as struck.

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
- **Tape:** solid Pace Tape ("Trainer edited", "Sample plan"). A plan with a trainer's note but no edit uses the quieter Secondary badge ("Trainer note"), because a note changes nothing in the plan.

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
The checkbox, the order number, the name and its muscles (the primary muscles in the label type, the supporting ones after a plus in the body face), and sets × reps (with load under it) as right-aligned numerals. Completing it fills the checkbox cobalt, draws a line through the name from left to right (420ms, expo-out), dims the numerals, and ticks the panel's tally and progress segments. Exercises that can't be done strike their numerals and show an "Equipment unavailable" badge. While a muscle is selected on the muscle map, the rows that do not train it dim to 45%.

### Tooltip
Explains a label without a visible second line. Opens on hover and keyboard focus after 150ms from a small icon-only trigger: a help (`?`) icon, 28px square, muted until hovered, with the same text as its accessible name. The bubble is a Card-colored popover with a Hairline border, the Popover shadow, 6px corners, caption-sized text and a 15rem maximum width. Use `?` to explain what something is; reserve `!` for a warning, which belongs in a badge or message instead. Never put information users need to act on only in a tooltip, because a tap on a phone may not open it.

### Group Matrix (signature table)
The policies-by-groups comparison on the policy screen's second tab: one row per policy, one column per group, a Kit Cobalt tick where the group includes it and a faint dash where it doesn't. Group headers are Title typography with a help tooltip for the description and the group's tally in numerals ("8 of 18") underneath; the first header, "Policy", is the same size and vertically centered with them. Rows holding the same set of groups sit together, widest first, and a 4px Bench Gray rule marks each new cluster, so every group reads as a block of ticks down its column. Each row leads with the policy's description and, under it, its permission in caption type. Each cell has an off-screen label for screen readers. It scrolls horizontally inside its card on a phone.

### Chart
Data is drawn with shadcn's Chart component (`components/ui/chart.tsx`, Recharts underneath), never hand-built bars. The check-ins-per-hour bar chart on the gym page is the pattern: a `ChartContainer` 12rem tall inside a card section, horizontal Hairline grid lines only, no axis lines or tick marks, count labels on the left and hour labels every six hours at the bottom, in the muted gray and numerals. Bars have 2px top corners and are Locker Ink at 60% for past hours; the current hour is Kit Cobalt, because it is live state. The tooltip is the Popover pattern (Card-colored, Hairline border, Popover shadow) and gives "07:00 to 07:59" with the count, on hover, tap and keyboard focus (`accessibilityLayer`). A one-line summary in body type above the chart (peak hour and total) carries the reading for anyone who skips the graphic. Equipment demand lists on the same page stay as simple CSS bars: they rank names, not a time series. A heat map of muscles is not a chart: it is the Muscle Map below.

### Muscle Map (signature visualization)
A front and a back body drawn from inline SVG, one shape group per muscle (22 muscles; left and right are never told apart, so both sides are painted, hovered and selected as one, and a muscle seen from both sides looks the same on both). Each muscle is filled with one of six achromatic steps, `--heat-0` for no work up to `--heat-5` for the busiest muscle in that view, with a 1.5px Card-colored stroke so neighbors separate. The fill eases for 300ms (expo-out) when the data changes, the one authored motion. The ramp is Locker Ink on gray, never colored (The Quiet Heat Rule).
- **Cobalt is interaction only:** hovering a muscle, on the body or in the list, draws a 2px Kit Cobalt outline, the selected muscle a 3px one, and a muscle the member has a focus for keeps a 2px solid cobalt outline, dashed when the focus is less. The outlined muscle is drawn last so no neighbor covers it.
- **Form carries status:** a diagonal hatch over the fill means lost to unavailable equipment, and a dashed Locker Ink outline means no exercise trains that muscle. The legend explains the ramp and shows the hatch and the dashed swatch only when the view uses them.
- **Layout:** the two bodies sit side by side from `sm` inside their card; on a phone one body shows behind a Front/Back segmented control. A narrow form column asks for the single view at every size. The map sits next to a ranked list of the same muscles (a swatch, the name, the value in numerals): the list is the text summary, the keyboard and screen-reader path (every muscle is a button), and where a selected muscle's detail opens, a hairline-bordered block with its exercises, never a nested card. The shapes themselves are hidden from assistive technology and carry a hover title.
- **Loading:** a skeleton is the real silhouette in 7% ink, pulsing, behind the usual 200ms delay.
- **Variants:** the plan page (heat is weighted sets of the plan, plus the focus control), plan history and metrics (read-only), gym demand, the catalog Coverage tab (catalog, available now, lost; selecting out-of-service equipment redraws only the muscles it hurts, hatched), and the add-exercise body selector (a tap steps a muscle through primary at the top step, supporting at a lower one, and off).

### Must-Review Notice
A plan that holds an exercise that cannot be done (equipment out of service) says so with Pace Tape, because it means "look at this". On the member's plan page and Now screen it is a tape-tinted strip that names the exercises and the equipment that is down and offers "Rebuild without them" (a confirmation first). For staff it is the same tape badge, "Must review", in the queue (filterable, flagged plans first), a banner on the plan review page, and the first summary line of the Overview, a count with one sentence naming the next plan and linking to the queue filtered to must-review plans. It is a notice, never a block: it uses no red and no strikethrough (those mean a settled negative or an unavailable exercise), and it disappears when the plan no longer needs it. When nothing needs review the Overview line says so in one calm sentence.

### Week Strip
Seven slanted segments, Monday to Sunday, in the stepper's lean (`-skew-x-12`, 2px corners): a day with a check-in is solid Kit Cobalt, a day without one is Bench Gray, and a day yet to come is dashed. The weekday initial sits under each segment in label type and today's segment keeps a 2px ink outline. It is a row of facts about the member's own visits, so each segment has the date and "checked in" or "no check-in" as its accessible name.

### Pool Map
The Overview's card, in two columns from md. On the left, the Muscle Map with its value being how many of today's plans train each muscle (not weighted sets), counting only exercises that can be done now, with its legend and a one-line text summary. It states facts only: no judgement is drawn on it, and a muscle no plan trains gets the dashed outline ("No plan trains it"). It has no ranked list and is not interactive. On the right, a scrollable list of every piece of equipment: pieces out of service come first, struck through with an "Out of service" badge, each row ending in the count of today's plans that use it as X/N in numerals, and a link to the catalog Coverage tab. The list is positioned to fill the height of the map column, so a long list scrolls inside the card and never makes it taller than the body and legend; below md it stacks under the map with a capped height.

### Focus Stepper
How much of a muscle the member wants: five slanted segments (`-skew-x-12`, 2px corners, the stepper's lean) centered on "Normal", labeled Much less, Normal and Much more in label type. The segments between Normal and the chosen level fill Kit Cobalt; at Normal only the center segment shows, in ink at 60%. Each segment is a toggle button with its level as its accessible name, and focus shows the usual 3px cobalt ring.

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
- **Do** draw any muscle visual with the shared Muscle Map and the `--heat-*` tokens, and pair it with the ranked list so it works without pointing at a shape.

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
- **Don't** color data heat (no red-to-green or cobalt ramp) or tell left from right on the muscle map; cobalt outlines are for hover, selection and the member's own focus only.
