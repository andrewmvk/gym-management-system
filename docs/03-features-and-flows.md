# Core Features & User Flows

See [02-requirements.md](./02-requirements.md) for the requirement IDs referenced below.

## 1. Member: Registration at the Gym

Accepting a person as a member is not the system's job. It happens at the physical gym, off-system: a staff member asks the person about their workout restrictions, looks at any medical certificate they bring, and decides in person (FR-57). Only then is the person sent to the registration page. The staff check leaves no record in the system.

```
1. At the gym, the person tells a staff member their workout restrictions and
   shows a medical certificate if they have one. Staff decide in person. If
   the person is accepted, they are sent to the registration page (/signup)
   on a gym device. Nothing in the system records this step.
2. Details: name, phone, e-mail, birthdate and an optional gender. The e-mail
   is checked (nothing is stored): an already registered e-mail is refused.
3. Consent: the explicit LGPD biometric consent (FR-46).
4. Photo: a reference photo via webcam. Details, consent and photo stay in
   the browser; the person can go back to any earlier step and change them.
5. Password: the person chooses a password (minimum 8 characters) and
   submits. This is the one write of the whole registration: the backend
   records the consent, computes the face embedding from the photo and
   stores it (the raw photo is kept server-side only for audit/recompute and
   is never distributed further), hashes the password and creates the
   account. A photo with no face or several faces rolls everything back and
   sends the person to retake it. Nothing exists for a person who leaves
   before this point.
6. The account exists at once: it is added to the member policy group
   (FR-42/44/47) with an active (mock) membership, and an authenticated
   session begins.
7. System sends an e-mail with a link to the login page.
```

Notes:
- The restriction that registration happens only at the gym is enforced only on paper. The page is meant to be reachable only from the gym's own devices or network, but the project does not enforce it: there is no intranet, IP allowlist or staff-issued token, and that is explicitly out of scope.
- No login and no account exist before the final submission: there is nothing to authenticate against until step 5 completes.
- A registered e-mail is refused. There is no "rejected" or "pending" state for a person any more, so nothing blocks an e-mail permanently.
- The e-mail links to the login page, not to the onboarding form. After login the member is redirected to onboarding (flow 2), which is required.

## 2. Member: Onboarding and Health Profile (post-authentication)

```
1. Member logs in, from the link in the registration e-mail or directly.
   If they have not completed onboarding they are redirected to the in-app
   onboarding page from every member page, so a lost or spam-filtered
   e-mail is never a dead end. A member who has completed onboarding goes to
   Now (flow 10).
2. Member submits, all required before the app can be used:
   - Physical information: height in cm and weight in kg (both required).
   - Goals/pretensions.
   - Medications (if there are none, the member says so: "none" is valid).
   - Physical conditions/limitations, and any other free-form notes.
   - Medical exams: structured entries, each with a name, an optional date
     and a findings summary typed by the member, plus an optional attached
     file (JPEG, PNG or PDF). With no exams, the member says so: "none" is
     valid.
3. Onboarding data is saved to the member's profile.
4. AI generates the member's first training plan from this data.
5. Plan is published immediately (visible to member right away).
6. Plan appears in the trainer's shared review queue for asynchronous oversight.
```

The AI module carries text only. For that reason the AI reads the findings the member typed for each exam; an attached file is optional supporting material kept with the entry and is never read by the AI. The same typed-findings rule applies to every other part of the profile.

Onboarding is not a one-time gate - members can add or revise this information later, by form or via the AI chat (flow 4), and each addition can trigger plan regeneration. A member who has already submitted opens the update form prefilled with their current profile, and the newest submission is the current truth for the AI. Auto-regeneration after an update never overwrites a plan that has ticked exercises or a trainer edit: it skips it, and the member can rebuild from the plan page (flow 4).

### Health profile page (FR-58)

```
1. The member's Health profile page shows two things side by side:
   - The current profile: the latest onboarding submission, with an action
     to update it.
   - "What your coach remembers": every fact stored in the member's history
     (injuries, medication changes, skipped exercises, life events, muscle
     focus changes), grouped by type, each with its date and the member's
     own words.
2. The member can mark a fact "No longer true". It moves to a "No longer
   true" list, struck through, and the AI stops using it on every future
   plan and chat turn. "Applies again" brings it back.
3. Nothing is deleted: a resolved fact stays in the history and stays
   visible to staff, muted.
```

## 3. Member: Facial Recognition Check-in (kiosk panel)

```
1. Member approaches the gym panel (kiosk web app) and looks at the camera.
2. The kiosk holds only precomputed face embeddings for all registered
   members, fetched from a dedicated, kiosk-authenticated backend
   endpoint - it never receives raw reference photos.
3. Panel captures a photo, computes its embedding client-side, and searches
   for the closest match:
   a. Best match above the similarity threshold and clearly separated from
      the second-best → accepted.
   b. No candidate clears the threshold, or the top two are too close to
      call → rejected; member is asked to retry. After 3 misses in a row
      the panel stops asking and says "Please see the front desk".
4. On an accepted match the backend first checks the membership:
   a. Membership inactive → refused. No turnstile call is made and no
      check-in is recorded. The kiosk says "Membership inactive. Please see
      the front desk." (FR-33, FR-40).
   b. Otherwise the backend attempts to call the external turnstile REST API
      (using Admin-configured method, URL, headers and optional body).
   c. The check-in (member, timestamp, turnstile_status: success|failed)
      is recorded regardless of whether that call succeeded.
   d. If the call failed/timed out, the kiosk shows "Please wait. A staff
      member will open the door for you.", with a small instruction for
      staff beneath it - the visit still counts.
5. On no match: access denied, member can retry or seek staff help.
```

Notes:
- The kiosk never shows a member's name or any other identity. It is the least trusted, public-facing client, so every result is anonymous.
- Each state has its own look: "Access not available" (solid red) is a settled decision about access, "Membership inactive" has its own status, and "Check-in unavailable" (dashed) means the request itself failed and nothing was recorded. The 3-miss "Please see the front desk" is a dashed state too, since it is a run of misses and not a determination about the person.
- No developer text (file paths, key names) is shown on the panel in production.

## 4. Member: Daily Plan, History, and AI Chat

```
0. Member logs in and lands on the Now screen (flow 10); the full plan, its
   muscle map and its history live on the plan page below.
1. Member opens the plan page, sees today's plan (exercises from the curated library:
   sets/reps/equipment) and can mark exercises as completed. An exercise
   only shows as currently performable if it needs no equipment or at
   least one of its linked equipment items is available.
   Beside the plan sits a muscle map (FR-50): a front and back body where
   each muscle is shaded by its weighted sets in today's plan, plus a
   ranked list of the same muscles. Selecting a muscle (on the body or in
   the list) shows the exercises that train it, as primary or supporting,
   and dims the other exercises in the plan.
   If the plan holds an exercise that cannot be done because its equipment
   is out of service, the plan is a must-review plan (flow 11): a notice
   names those exercises and the equipment, and offers "rebuild without
   them", which asks for confirmation first.
   Any trainer notes on the plan are shown with it (see below).
2. The plan page's "Other days" tab lets the member browse plan history by
   date and see upcoming plans: the days from today onwards that already hold
   a plan appear as date chips with their exercise count. Each day shows its
   own muscle map and the same drilldown, read-only (ticks included).
3. Member opens the AI chat (a dialog; no persistent visible thread) and can:
   - Report they skipped/modified an exercise on a given day.
   - Report a physical state change (injury, soreness, medication change).
   - Report a life event affecting training (e.g. "I played soccer yesterday").
   - Ask the AI to adapt today's or a future day's plan.
   - Ask the AI how their plan compares to what other members are doing
     today (AI can pull aggregate info from other members' published plans).
4. Every message is parsed by the AI to extract structured facts, which are
   saved permanently to the member's history - this is what the AI reads
   back on every future plan generation/chat turn, not the raw chat log.
   After each reply the chat shows which facts it just remembered, with a
   link to the Health profile page (flow 2) where the member can see and
   correct them.
5. A plan is never silently overwritten. When regenerating or adjusting a
   plan would replace something worth keeping, the member is first asked to
   confirm, and the reason is named:
   - A trainer edited the plan ("A trainer already adjusted this plan" -
     confirming replaces their edits).
   - The member already ticked off exercises ("You've already started this
     plan" - confirming keeps the ticks on exercises that stay in the plan).
   If both apply, the trainer edit is named first. A plan with neither is
   rebuilt straight away.
6. A chat adjustment for today or a later day passes the member's own
   instruction into the regeneration, so the AI follows what was asked
   (unless it conflicts with safety, injuries or medication).
7. If the adjusted plan is published, it surfaces in the trainer review
   queue like any other plan.
8. A retroactive correction to a past day directly overwrites that day's
   historical record - this is intentional; metrics (flow 5) reflect the
   corrected version, not the original.
9. If the AI is unavailable when a plan or a chat reply is needed, the
   member sees "AI is temporarily unavailable" and nothing is saved: an AI
   failure never produces a plan. The deterministic placeholder plan exists
   only in the mock/demo mode, never as a fallback for a failed live AI.
```

What the AI balances when it builds or rebuilds a plan (FR-15): the member's goals, physical information, physical conditions, medications, exams, the accumulated facts that still apply, the muscle focus, the last 14 days of plans with what was done and when the member checked in, the latest trainer notes and edits, and the demand other members' plans for that date already place on each piece of equipment (counted in plans) and on each muscle. Broad goals are spread across different equipment and overloaded equipment is avoided, but safety, injuries, medications, exams and muscle focus always win over that spreading.

Trainer notes (FR-19): each note and each edit a trainer leaves is its own entry (author, time, text). The member whose plan it is reads them in full, oldest first, on the plan and on Now; an edit is flagged "Edited the plan". The plan badge reads "Edited by a trainer", or "Trainer note" for a note without an edit.

### Setting muscle focus and rebuilding (FR-51)

```
1. On today's plan, the member selects a muscle (body or list). Its panel
   shows five slanted segments centered on "normal", from much less to
   much more.
2. Choosing a level saves it at once for that muscle. Choosing normal
   removes it. Each change is also written to the member's profile
   history as a muscle focus event; setting the level a muscle already has
   writes nothing.
3. The saved focus is part of the context the AI reads on every plan
   generation and chat turn. It steers the balance of future plans, but
   injuries, conditions, medications and safety always win over it.
4. Nothing about today's plan changes yet. The member can choose "Rebuild
   today with my focus", which asks for confirmation first when a trainer
   edited the plan or the member already ticked exercises (the warnings of
   flow 4, step 5): trainer edits are replaced, and ticks are kept on the
   exercises that stay.
```

## 5. Member: Metrics

```
1. Member opens their metrics view and picks a date range, either a
   preset (today, last 7 days, this month, this year, ...) or a custom
   first and last day.
2. System computes, for that range, (from check-ins + plan/exercise history, not stored
   redundantly): training frequency, total days trained, exercise
   breakdown, training volume, progress toward stated goals, and a muscle
   heat map of the completed exercises (weighted sets per muscle). Each
   figure is labelled with exactly what it counts (for example "Reps
   completed" and "Plan completed"), with a "?" tooltip.
```

## 6. Personal Trainer: Review Queue

```
1. Trainer logs in (via a seeded demo account - see flow 7), lands on the
   Overview (flow 12) and opens the shared queue of all members'
   plans (no 1:1 assignment - any trainer can act on any plan). Must-review
   plans (flow 11) carry a "Must review" badge, can be filtered, and are
   sorted first. The other filters are AI (plans no trainer touched) and
   Trainer (plans a trainer edited or left a note on); a row shows
   "Trainer edited" for an edit and "Trainer note" for a note without an
   edit. A "When" filter limits the dates: "Today and later" (the default),
   "Past" or "All dates"; the Trainer tab opens on all dates, because the
   plans a trainer touched are often in the past.
2. Trainer opens a member's plan. The page shows:
   - A "What the AI knew" card (FR-60): the member's name and age, their
     latest onboarding (physical information, goals, medications,
     conditions, exams), and the remembered facts that still apply, with
     injuries and medication changes first, the member's own words and the
     dates, so the trainer can judge the plan's safety against the same
     inputs the AI had.
   - The exercises, each marked "Done" when the member did it.
   - A muscle balance preview (FR-54): by default it follows the exercises
     as they are edited, before saving; it can be switched to the member's
     completed work in the 14 days before the plan. The member's muscle
     focus is outlined on the body, and a line names focused muscles the
     plan does not train. The preview only shows facts: whether the plan
     lacks something useful for the member is the trainer's own judgement.
   - If the plan is a must-review plan, a banner at the top names the
     exercises that cannot be done and the equipment that is down.
   - Previous and Next buttons that walk the queue in the same order and
     with the same filters the trainer came from.
3. The trainer has one note field and two actions:
   - "Save changes" publishes the edits (exercises, sets/reps/load, with a
     searchable add-exercise picker) and attaches the note to the edit,
     marking the plan as trainer-edited. It is enabled only when the plan
     actually changed.
   - "Add note only" records the note as its own entry in that plan's
     review history and leaves the exercises as they are.
   Multiple trainers can each leave their own notes; none overwrite
   another's.
4. Edits are saved and immediately visible to the member, together with the
   note: the member reads trainer notes in full (flow 4). This never blocks
   the AI from having already published a plan. If the AI later wants to
   regenerate this plan, the member is warned first (flow 4) before any
   trainer edit is overwritten. The AI also reads the trainer's notes as
   guidance when it builds that member's later plans.
5. Write controls follow the abilities. An admin only reads: the page says
   "You can read this plan. Trainers edit it and leave notes." A plan dated
   before today is history: its exercises cannot be edited ("Past plans
   cannot be edited"), but a note can still be added.
```

## 7. Gym Admin: System Configuration & Oversight

```
1. Admin logs in (via a seeded demo account with known credentials created
   at first boot - there is no staff self-signup anywhere), can:
   - Configure the external turnstile REST API integration (method, URL,
     headers/credentials, optional body) used by the check-in flow, and
     test the saved request from the settings page.
   - Manage the exercise/equipment catalog: add new exercises (tagging
     their primary and supporting muscles by tapping a body, or choosing
     from the list of muscle names; never by typing a name), add new
     gym equipment, and set whether a piece of equipment is currently
     available. Existing exercises can never be deleted - only added -
     so historical plans always resolve against a valid exercise.
     - Switching a piece OFF first shows its impact in a confirmation: how
       many plans dated today or later would become must-review plans
       (flow 11) and how many members they belong to. The change is applied
       only after the admin confirms.
     - A piece's linked exercises can be edited. Removing an exercise's last
       link makes it count as needing no equipment, so the editor warns
       first.
     - "Out of service" is the one phrase used for unavailable equipment.
   - Read the catalog's Coverage tab (FR-52): a front and back heat map of
     how many exercises train each muscle, in three views (whole catalog,
     available now, lost to out-of-service equipment). A muscle no
     exercise trains is marked as a gap. Selecting a muscle lists its
     exercises and equipment. Selecting an out-of-service piece of
     equipment redraws the map with only the muscles it hurts and lists
     the exercises it removes. The Equipment tab also says what each
     out-of-service piece takes out.
   - Watch the gym's demand on the Overview (flow 12) and the Gym info page
     (flow 8).
   - Open the Members table and each member's page, and switch a member's
     membership between active and inactive (flow 13).
   - Read the check-in log and edit the opening hours (flow 14).
   - Manage access policies (flow 9).
```

## 8. Public/Logged-in: Gym Info Page

```
1. Shows whether the gym is currently open (server's local timezone
   against configured hours), with today's hours and when it next
   closes or opens.
2. Shows an estimated current occupancy: the count of distinct members who
   checked in within a trailing rolling window (e.g. the last 90 minutes).
   There is no checkout event, so this is explicitly an estimate, not an
   exact live headcount.
3. Anyone with the check-in read permission also sees today's check-ins
   per hour, counting distinct members per hour (a second scan in the same
   hour is not a second visitor).
```

The page is public (no sign-in needed) and is linked from the public header, the landing page, and the member and staff areas. Staff also get links to the Overview and, for an admin, to the check-in log. It shows no muscle or equipment demand: that lives on the staff Overview (flow 12).

## 9. Admin: Access Policy Management

```
1. Admin (holding the policy-management permission) opens the policy
   screen, sees:
   - Every defined policy (d_user_policy): its operation, resource, and
     scope, and every policy group (d_user_policy_group) with the
     policies it contains (read-only, FR-47).
   - Every user with the groups they belong to (non-expired
     f_user_policy_group_on_user rows) shown at a glance, and the
     policies they hold directly (f_user_policy_on_user rows not yet
     expired). Each effective policy says where it comes from: "via
     <group>" or "direct" (FR-48).
   - A filter by group and by policy, so the Admin can list only the
     users who belong to a group or hold a policy.
2. Admin assigns a group to any existing user - including the trainer or
   admin group - which writes/updates an f_user_policy_group_on_user row,
   or grants an individual policy, which writes/updates an
   f_user_policy_on_user row. Neither creates a new account (FR-41 still
   holds); they only change what an existing account can do
   (FR-42/FR-43).
3. Admin revokes a group or a policy by setting its expires_on to now, or
   extends it by moving expires_on forward (or clearing it for an
   indefinite one). A policy a user receives through a group cannot be
   revoked on its own: the Admin either removes the group or adds a
   direct "denied" grant for that policy, which overrides the group
   (RN-10).
4. The Admin is never allowed to remove their own access to the staff
   area or to policy management, directly or by leaving the group that
   supplies it (RN-13).
```

## 10. Member: Now (home)

```
1. After login (and from the brand mark), the member lands on Now, a
   screen built for the moment at the gym, not a second copy of the plan
   page. It shows, from top to bottom:
   - A header strip with the date, the day's tally of exercises done, the
     check-in state (the latest check-in today, or "not checked in yet")
     and the gym status (open or closed, and the occupancy estimate of
     FR-37).
   - The must-review notice, when it applies (flow 11).
   Below that, in two columns (stacked on a phone):
   - Left: the next exercise in large numerals with one Done action;
     marking it done moves on to the next, and when all are done it says
     so; then the day's list, names only, done ones struck through.
   - Right: a Monday to Sunday week strip, each day filled when the member
     has a check-in that day (the same rule as days trained, FR-36), and,
     only when a trainer wrote a note or changed today's plan, the trainer
     notice: "Your trainer changed this plan" (the list already includes the
     change) when the plan was edited, or "A note from your trainer" for a
     note without an edit, with the notes in full (FR-55).
2. There is no muscle map on Now. The map, the focus controls and the
   plan history are on the plan page (flow 4).
3. With no plan yet, Now offers the same single action as the plan page:
   build my plan.
```

## 11. Must-review plans (FR-53)

```
1. A plan dated today or later that holds an exercise whose linked
   equipment is all out of service is a must-review plan. Nothing is
   stored: the rule is evaluated on every read, so the flag appears when an
   admin switches a piece of equipment off, and disappears by itself when
   the plan is edited or rebuilt without that exercise or the equipment is
   switched back on. Past plans are never flagged, and are not re-filtered
   by equipment that went down after their date.
2. Member: a notice on the plan page and on Now lists the exercises that
   cannot be done and the equipment that is out of service, with "rebuild
   without them" behind a confirmation (the warnings of flow 4 apply).
3. Staff: the plan gets a "Must review" badge in the queue (filterable,
   sorted first), a banner on its review page, and a place at the top of
   the Overview (flow 12).
4. The flag never blocks anything: the plan stays published and the member
   can still do every other exercise. The system never marks a plan as
   good or bad; what the trainer does about it, if anything, is theirs to
   judge.
```

## 12. Staff: Overview

```
1. Trainers and admins land on the Overview, an exceptions-first page. It
   answers one question: is anything wrong or worth a look right now?
2. It shows, in this order, equal summary lines (a number, a title, one
   sentence, a link) and never a full list:
   - Must review (flow 11): the number of plans, and a sentence naming the
     next one with its member, plan date and the exercises that cannot be
     done with the equipment that is down. It opens the reviews queue
     filtered to must-review plans.
   - Trainer edits and notes: the number of plans a trainer edited or left
     a note on in the last 7 days (the window is stated on screen), and a
     sentence naming the latest author, member, plan date and time, so a
     trainer can see whether a colleague already looked at a plan in a
     shared pool with no assignment. It opens the queue's Trainer tab.
   - For an admin, Turnstile: the number of failed check-ins today and the
     sentence "n of m check-ins today did not open the turnstile", or "Not
     configured" when no turnstile is set up. It opens the check-in log
     filtered to the ones that did not open, or the turnstile settings when
     it is not configured. It refreshes every 60 seconds.
3. Below the lines, one full-width "Today's demand" card (FR-29), so
   trainers are not surprised by missing or over-demanded equipment.
   Everything is counted in plans (distinct plans), never in exercise rows
   or sets, and each count says what it counts. The card has two halves:
   - Muscles: a body map and a ranked list with numbers: how many of
     today's plans train each muscle through an exercise that can be done
     now, with the heat scaled to the busiest muscle. A filter switches
     between "All plans today" and "Already checked in" (plans of members
     who have checked in today). It states facts only.
   - Equipment: a table with out-of-service pieces first, then the busiest
     first. "Plans" is how many of today's plans need the piece (with a quiet
     bar scaled to the busiest piece); "In the gym" is how many of those
     plans belong to members who have already checked in today. A piece that
     is down carries an "Out of service" badge and links to the catalog
     Equipment tab. A plan counts toward a down piece only through an
     exercise that has no working alternative.
   The card refreshes every 60 seconds.
4. When nothing needs attention, the lines say so in one calm sentence.
```

## 13. Staff: Member Page and Membership

```
1. Staff open the Members table (anyone holding the member-read permission:
   trainers and admins). It lists each member with their plan and their
   membership status, and each row links to the member's own page.
2. The Member page (FR-60) shows, for one member:
   - Their profile and membership.
   - The current health profile: the latest onboarding submission.
   - What the coach remembers: every remembered fact, grouped as the
     member sees it, with resolved facts muted and struck through.
   - Their plans: date, status, how many exercises were done of how many,
     how many notes, and a link to that plan's review. It covers the last
     60 days and any plan dated later.
   - The last 30 days of check-ins, one mark per day.
3. An admin can switch the membership between active and inactive, with a
   control on each Members row and on the Member page. Deactivating asks for
   confirmation first. Trainers see the status read-only.
4. An inactive member cannot log in (login fails with "Your membership is
   inactive. Ask the front desk to reactivate it.", shown only after a
   correct password) and cannot check in at the kiosk (flow 3). An existing
   session stops working at once. Nothing else about the member is changed,
   so reactivating restores everything (FR-40).
5. The scenario this serves: a member stops paying, comes back months
   later, pays at the desk, and a staff member reactivates them. Payment
   itself is out of scope.
```

## 14. Admin: Check-in Log and Opening Hours

```
1. The check-in log (FR-61) lists recent check-ins: the member, the time and
   the turnstile result, "Opened" or "Did not open". A "Did not open" result
   is a technical failure of the door, drawn dashed, and the visit still
   counts. A reason is shown beside it: not configured, timed out, the
   turnstile answered with an error, could not be reached, or unknown. A
   filter switches between All and Did not open. The Overview's Turnstile
   line (flow 12) summarizes today's failures and links here.
2. The opening hours editor (FR-62) shows one row per weekday. The admin sets
   an open and a close time or marks the day closed, and the close time must
   be after the open time. Saving updates what the public Gym info page
   (flow 8), the open/closed state and the Now header show.
```
