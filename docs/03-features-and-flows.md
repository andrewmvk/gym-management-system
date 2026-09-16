# Core Features & User Flows

See [02-requirements.md](./02-requirements.md) for the requirement IDs referenced below.

## 1. Member: Signup → Aptitude → Account Creation

```
1. Member fills basic signup form: name, phone, email, birthdate.
2. Member captures a reference photo via webcam. The backend computes a
   face embedding from it and stores that embedding; the raw photo is kept
   server-side only (audit/recompute) and is never distributed further.
3. Member fills the digital aptitude/health questionnaire.
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
7. Member sets a password → account created, granted the member-designated
   access policies (FR-42/44), authenticated session begins.
8. System sends an email with a link to the onboarding form.
```

Notes:
- No login is possible before step 7 - there's nothing to authenticate against yet.
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
      Admin-configured base URL/credentials/field mapping).
   b. The check-in (member, timestamp, turnstile_status: success|failed)
      is recorded regardless of whether that call succeeded.
   c. If the call failed/timed out, the kiosk shows a failure notice so
      gym staff can open the turnstile manually - the visit still counts.
5. On no match: access denied, member can retry or seek staff help.
```

## 4. Member: Daily Plan, History, and AI Chat

```
1. Member logs in, sees today's plan (exercises from the curated library:
   sets/reps/equipment) and can mark exercises as completed. An exercise
   only shows as currently performable if it needs no equipment or at
   least one of its linked equipment items is available.
2. Member can browse plan history by date.
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

## 5. Member: Metrics

```
1. Member opens their metrics view.
2. System computes (from check-ins + plan/exercise history, not stored
   redundantly): training frequency, total days trained, exercise
   breakdown, training volume, progress toward stated goals.
```

## 6. Personal Trainer: Review Queue

```
1. Trainer logs in (via a seeded demo account - see flow 7), sees a shared
   queue of all members' current/recent AI-generated plans (no 1:1
   assignment - any trainer can act on any plan).
2. Trainer opens a member's plan, can:
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
   - Configure the external turnstile REST API integration (base URL,
     API key/credentials, field mapping) used by the check-in flow.
   - Manage the exercise/equipment catalog: add new exercises, add new
     gym equipment, and toggle whether a piece of equipment is currently
     available. Existing exercises can never be deleted - only added -
     so historical plans always resolve against a valid exercise.
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
   against configured hours).
2. Shows an estimated current occupancy: the count of check-ins within a
   trailing rolling window (e.g. the last 90 minutes). There is no
   checkout event, so this is explicitly an estimate, not an exact
   live headcount.
3. Shows which muscle groups/equipment are in demand today - computed
   from seeded check-in and plan data, not truly live multi-user traffic,
   and only counting exercises whose equipment is currently available.
```

## 9. Admin: Access Policy Management

```
1. Admin (holding the policy-management permission) opens the policy
   screen, sees:
   - Every defined policy (d_user_policy): its operation, resource, and
     scope.
   - Every user and which policies are currently active on their account
     (f_user_policy_on_user rows not yet expired).
2. Admin grants a policy to any existing user - including the trainer or
   admin policy set - which writes/updates an f_user_policy_on_user row.
   This never creates a new account (FR-41 still holds); it only changes
   what an existing account can do (FR-42/FR-43).
3. Admin revokes a policy by setting its expires_on to now, or extends a
   grant by moving expires_on forward (or clearing it for an indefinite
   grant).
```
