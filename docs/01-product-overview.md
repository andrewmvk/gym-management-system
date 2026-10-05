# Product Overview - AI Gym Management System

## 1. Context

Academic project modernizing a physical gym's access-control and training workflow. **The system will not be deployed to real users.** All member data, biometric data (face embeddings/photos), and the turnstile REST API are mocked or seeded for evaluation purposes. No real payments are processed and no real biometric data is collected from real people.

## 2. Problem Statement

The gym currently runs on two disconnected, manual processes:

1. **Access control**: a fingerprint scanner unlocks the turnstile. It has no identity intelligence - it doesn't know who the person is beyond a fingerprint match, and doesn't connect to any other system.
2. **Training**: a human personal trainer verbally interviews the member on the spot, decides a plan for the day, and manually records it. This doesn't scale, isn't personalized beyond that single conversation, isn't available 24/7, and loses historical nuance (injuries, medication, life events) between sessions.

The client wants to replace both with a unified, AI-driven system: face recognition for access, and a continuously-learning AI that builds a training plan from a rich onboarding profile and ongoing conversation, refining it over time.

## 3. Vision / Value Proposition

- **24/7 personalization**: a member can get plan feedback and adjustments any time, not just during a trainer's shift. The AI coach works as a custom trainer: the member asks, points at an exercise or muscle, reads a proposed change as a diff, edits it and applies it, and the AI never writes on its own.
- **Cautious, data-informed plans**: the AI reasons from accumulated health/state data (physical information, medication, injuries, exams, self-reported physical state) rather than a single verbal check-in, and the member can see and correct every fact it remembers.
- **Frictionless access**: face recognition at the door replaces fingerprint hardware, integrating with the gym's existing turnstile REST API.
- **Human oversight preserved**: personal trainers remain in the loop, reviewing and able to override any AI-generated plan.
- **Demand-aware planning**: the AI and the trainers see how other members' plans load the equipment and muscles of the day (demand is not shown to the public), so plans spread across the gym and trainers are not surprised by missing or over-demanded equipment. Members and the public see only whether the gym is open and an occupancy estimate.

## 4. Target Audience / User Roles

Single gym location. Three user roles:

| Role | Who | Core need |
|---|---|---|
| **Member** | Gym member with an active membership | Register at the gym once staff have accepted them, complete the required onboarding, get a personalized daily plan, check in via face recognition, work with the AI coach on their training (ask, point at things, review and apply proposed changes, understand exercises), edit their own sets, reps and weight, confirm and correct what the coach remembers, read their trainers' notes, see their history and metrics |
| **Personal Trainer** | Gym staff | Oversee AI-generated plans across all members (shared pool, not 1:1 assigned), see what the AI knew about the member (health profile, remembered facts, exams) to judge safety, comment on / override any plan, leave notes the member can read |
| **Gym Admin** | Gym staff/management | Configure the turnstile REST API integration and watch its health through the check-in log, manage the exercise library and equipment availability, edit the opening hours, monitor gym occupancy and demand, manage each member's mocked membership status (active or inactive) |

Accepting a person as a member is not a system function. It happens at the physical gym, off-system: a staff member asks about the person's workout restrictions, looks at any medical certificate in person and decides; only then is the person sent to the registration page. That check leaves no record in the system.

Trainers and Admins are both "staff" but have distinct dashboards/permissions - see [03-features-and-flows.md](./03-features-and-flows.md).

### Member journey

1. **Accepted at the gym**: staff check restrictions and any certificate in person, off-system.
2. **Register**: at the gym, the person completes Details, Consent, Photo and Password; the account is created at once, with an active mocked membership.
3. **Email**: the member receives an email with a link to the login page.
4. **Log in and onboard**: after login the member is redirected to the required onboarding (physical information, goals, medications, conditions, exams, other notes) and cannot use the app before completing it; a member with a completed onboarding lands on Now.
5. **Train**: the AI publishes a plan at once, the member checks in at the kiosk, chats with the coach and follows the plan, while trainers oversee asynchronously.

## 5. Key Constraints Driving Design

- **Single gym, single location** - no multi-tenancy needed in the data model or auth model.
- **Mocked biometrics, real recognition logic**: facial recognition itself is implemented with a real face-detection/embedding library (computed on the backend for the signup photo and in the browser at the kiosk); only the member database and the turnstile API responses are mocked/seeded (the turnstile API is treated as an existing external system the app integrates with, not one we build).
- **Trainers never block the AI**: plans are generated and published immediately; trainer review is asynchronous and non-blocking, preserving the 24/7 value proposition.
- **No visible persistent chat log**: the AI chat is stateless in the UI, but every message is mined for structured facts that, once the member confirms them, are saved permanently to the member's profile/history - this is what makes future plans "remember" the member.
- **The coach proposes, the member applies**: the AI has read-only lookups and no write path; a plan change it suggests is a draft the member reads, edits and applies, and a fact it extracts waits for the member's confirmation.
- **Only face embeddings ever reach the kiosk** - never raw reference photos - to limit how much of the biometric dataset is exposed to the check-in panel. The kiosk is the least trusted client: it never shows another person's name.
- **Registration is restricted to the gym on paper only**: the registration page is meant to be reachable only from the gym's own devices or network, but this is not enforced (no intranet, IP allowlist or staff-issued token); the in-person acceptance and any certificate check are off-system and leave no record.
- **Membership lockout**: an inactive (mocked) membership blocks both login and kiosk check-in until an admin reactivates it; no payment is processed.
- **No staff self-signup**: trainer and admin accounts are fixed demo accounts created by a seed script at first boot, not created through the app.
- **Academic scope**: non-functional requirements are kept minimal (responsive UI, reasonable performance, basic security hygiene) - see [02-requirements.md](./02-requirements.md) for the full in/out-of-scope list.
