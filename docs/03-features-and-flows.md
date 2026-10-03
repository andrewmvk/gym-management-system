# Core Features & User Flows

See [02-requirements.md](./02-requirements.md) for the requirement IDs referenced below.

## 1. Member: Signup → Aptitude → Account Creation

```
1. Member fills basic signup form: name, phone, email, birthdate. The
   e-mail is checked (nothing is stored): a rejected or registered e-mail is
   refused, and one whose questionnaire was already submitted resumes at
   its verdict.
2. Member gives the biometric consent (FR-46), then captures a reference
   photo via webcam. Both stay in the browser; the member can go back to any
   earlier step and change them.
3. Member fills the digital aptitude/health questionnaire and submits it.
   This is the one write of the whole signup: the backend records the
   consent, computes the face embedding from the photo and stores it (the
   raw photo is kept server-side only for audit/recompute and is never
   distributed further), and stores the answers. A photo with no face or
   several faces rolls everything back and sends the member to retake it.
   Nothing exists for a member who leaves before this point.
4. AI evaluates the questionnaire, returning cleared / not_cleared / pending_retry:
   a. cleared       → go to step 7.
   b. pending_retry  → member sees "still processing, check back shortly";
                        system retries automatically.
   c. not_cleared    → member must upload a medical certificate.
5. Member uploads a medical certificate. AI reviews it, returning
   cleared / not_cleared / pending_retry.
6. Every certificate result - regardless of which of the three - is routed
   to the Admin backstop queue:
   a. Admin confirms/overrides to cleared  → go to step 7.
   b. Admin confirms not_cleared           → signup cannot be completed,
                                               no account is created.
   c. pending_retry stays queued until the AI resolves it or Admin
      manually decides.
7. Member sets a password → account created, added to the member policy
   group (FR-42/44/47), authenticated session begins.
8. System sends an email with a link to the onboarding form.
```

Notes:
- No login is possible before step 7 - there's nothing to authenticate against yet.
- Once step 3 is submitted its answers are final: later steps have no way back to them.
- The Admin override in step 6a is the *only* recovery path for a member the AI has wrongly rejected, since they have no account to log in and contest it themselves.

## 2. Member: Detailed Onboarding (post-authentication)

```
1. Member opens the onboarding link from their email - or, if they never
   completed onboarding, they're redirected to the same in-app onboarding
   page automatically on login. Either path works; a lost/spam-filtered
   email is never a dead end.
2. Member submits: exam attachments, medications, physical
   conditions/limitations, goals/pretensions, and any other free-form info.
3. Onboarding data is saved to the member's profile.
4. AI generates the member's first training plan from this data.
5. Plan is published immediately (visible to member right away).
6. Plan appears in the trainer's shared review queue for asynchronous oversight.
```

Onboarding is not a one-time gate - members can add or revise this information later via the AI chat (flow 4), and each addition can trigger plan regeneration.

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
      call → rejected; member is asked to retry.
4. On an accepted match:
   a. Backend attempts to call the external turnstile REST API (using
      Admin-configured method, URL, headers and optional body).
   b. The check-in (member, timestamp, turnstile_status: success|failed)
      is recorded regardless of whether that call succeeded.
   c. If the call failed/timed out, the kiosk shows a failure notice so
      gym staff can open the turnstile manually - the visit still counts.
5. On no match: access denied, member can retry or seek staff help.
```

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
2. Member can browse plan history by date; each day shows its own muscle
   map and the same drilldown, read-only.
3. Member opens the AI chat (no persistent visible thread) and can:
   - Report they skipped/modified an exercise on a given day.
   - Report a physical state change (injury, soreness, medication change).
   - Report a life event affecting training (e.g. "I played soccer yesterday").
   - Ask the AI to adapt today's or a future day's plan.
   - Ask the AI how their plan compares to what other members are doing
     today (AI can pull aggregate info from other members' published plans).
4. Every message is parsed by the AI to extract structured facts, which are
   saved permanently to the member's history - this is what the AI reads
   back on every future plan generation/chat turn, not the raw chat log.
5. If the requested adjustment targets a plan a trainer has already edited,
   the member is first shown a warning ("A trainer already adjusted this
   plan - regenerating will replace their edits") and must confirm before
   the AI overwrites it.
6. If the adjusted plan is published, it surfaces in the trainer review
   queue like any other plan.
7. A retroactive correction to a past day directly overwrites that day's
   historical record - this is intentional; metrics (flow 5) reflect the
   corrected version, not the original.
```

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
   today with my focus", which asks for confirmation first: ticked-off
   exercises are cleared, and a trainer's edits to the plan are replaced
   (the warning of flow 4, step 5).
```

## 5. Member: Metrics

```
1. Member opens their metrics view and picks a date range, either a
   preset (today, last 7 days, this month, this year, ...) or a custom
   first and last day.
2. System computes, for that range, (from check-ins + plan/exercise history, not stored
   redundantly): training frequency, total days trained, exercise
   breakdown, training volume, progress toward stated goals, and a muscle
   heat map of the completed exercises (weighted sets per muscle).
```

## 6. Personal Trainer: Review Queue

```
1. Trainer logs in (via a seeded demo account - see flow 7), lands on the
   Overview (flow 12) and opens the shared queue of all members'
   current/recent AI-generated plans (no 1:1 assignment - any trainer can
   act on any plan). Must-review plans (flow 11) carry a "Must review"
   badge, can be filtered, and are sorted first. The other filters are AI
   (plans no trainer touched) and Trainer (plans a trainer edited or left
   a note on); a row shows "Trainer edited" for an edit and "Trainer
   note" for a note without an edit.
2. Trainer opens a member's plan. Beside the exercises sits a muscle
   balance preview (FR-54): by default it follows the exercises as they
   are edited, before saving; it can be switched to the member's completed
   work in the 14 days before the plan. The member's muscle focus is
   outlined on the body, and a line names focused muscles the plan does
   not train. The preview only shows facts: whether the plan lacks
   something useful for the member is the trainer's own judgement.
   If the plan is a must-review plan, a banner at the top names the
   exercises that cannot be done and the equipment that is down.
   The trainer can:
   - Leave a comment/note - recorded as its own entry in that plan's
     review history. Multiple trainers can each leave their own notes;
     none overwrite another's.
   - Edit the plan directly (exercises, sets/reps) - this marks the plan
     as trainer-edited.
3. Edits are saved and immediately visible to the member; this never
   blocks the AI from having already published a plan. If the AI later
   wants to regenerate this plan, the member is warned first (flow 4)
   before any trainer edit is overwritten.
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
     gym equipment, and toggle whether a piece of equipment is currently
     available. Existing exercises can never be deleted - only added -
     so historical plans always resolve against a valid exercise.
   - Read the catalog's Coverage tab (FR-52): a front and back heat map of
     how many exercises train each muscle, in three views (whole catalog,
     available now, lost to out-of-service equipment). A muscle no
     exercise trains is marked as a gap. Selecting a muscle lists its
     exercises and equipment. Selecting an out-of-service piece of
     equipment redraws the map with only the muscles it hurts and lists
     the exercises it removes. The Equipment tab also says what each
     out-of-service piece takes out.
   - View gym-wide occupancy/equipment-demand dashboard (same aggregate
     data members see, plus any admin-only detail).
   - Review every medical certificate result - cleared, not_cleared, and
     pending_retry alike - in the backstop queue, and override an AI
     not_cleared result when warranted (the only recovery path for a
     wrongly-rejected member).
   - View each member's mocked membership status.
```

## 8. Public/Logged-in: Gym Info Page

```
1. Shows whether the gym is currently open (server's local timezone
   against configured hours), with today's hours and when it next
   closes or opens.
2. Shows an estimated current occupancy: the count of check-ins within a
   trailing rolling window (e.g. the last 90 minutes). There is no
   checkout event, so this is explicitly an estimate, not an exact
   live headcount.
3. Shows which muscles and equipment are in demand today - computed
   from seeded check-in and plan data, not truly live multi-user traffic,
   and only counting exercises whose equipment is currently available.
   Muscle demand is a heat map of the weighted sets planned by members
   who checked in today; equipment demand is a ranked list.
4. Anyone with the check-in read permission also sees today's check-ins
   per hour.
```

The page is public (no sign-in needed) and is linked from the member and staff areas.

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
   single column built for the moment at the gym, not a second copy of the
   plan page. It shows, from top to bottom:
   - The date and the day's tally of exercises done.
   - The check-in state (the latest check-in today, or "not checked in
     yet") and the gym status (open or closed, and the occupancy estimate
     of FR-37).
   - The must-review notice, when it applies (flow 11).
   - The next exercise in large numerals with one Done action; marking it
     done moves on to the next. When all are done it says so.
   - The remaining exercises, names only, done ones struck through.
   - A since-last-visit line when a trainer edited the plan: who and when.
   - A Monday to Sunday week strip: each day filled when the member has a
     check-in that day (the same rule as days trained, FR-36).
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
   switched back on. Past plans are never flagged.
2. Member: a notice on the plan page and on Now lists the exercises that
   cannot be done and the equipment that is down, with "rebuild without
   them" behind a confirmation (the warnings of flow 4 apply).
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
2. It shows, in this order, three equal summary lines (a number, a title,
   one sentence, a link) and never a full list:
   - Must review (flow 11): the number of plans, and a sentence naming the
     next one with its member, plan date and the exercises that cannot be
     done with the equipment that is down. It opens the reviews queue
     filtered to must-review plans.
   - Trainer edits and notes: the number of plans a trainer edited or left
     a note on, and a sentence naming the latest author, member, plan date
     and time, so a trainer can see whether a colleague already looked at a
     plan in a shared pool with no assignment. It opens the queue's Trainer
     tab.
   - For an admin, certificates waiting: the open count and the oldest
     wait. It opens the certificate queue.
3. Below the lines, one full-width "Today's pool" card in two columns. On
   the left, the muscle map of how many of today's plans train each muscle,
   counting only exercises that can be done now, with its legend and a text
   summary; it states facts only. On the right, a scrollable list of every
   piece of equipment, out-of-service pieces first and struck through, each
   with the number of today's plans that use it (for example 3/25) and a
   link to the catalog coverage tab. The list takes the height of the map
   column, so a long list scrolls instead of growing the card.
4. When nothing needs attention, the lines say so in one calm sentence.
```

