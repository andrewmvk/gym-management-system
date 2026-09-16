# Product Overview - AI Gym Management System

## 1. Context

Academic project modernizing a physical gym's access-control and training workflow. **The system will not be deployed to real users.** All member data, biometric data (face embeddings/photos), and the turnstile REST API are mocked or seeded for evaluation purposes. No real payments are processed and no real biometric data is collected from real people.

## 2. Problem Statement

The gym currently runs on two disconnected, manual processes:

1. **Access control**: a fingerprint scanner unlocks the turnstile. It has no identity intelligence - it doesn't know who the person is beyond a fingerprint match, and doesn't connect to any other system.
2. **Training**: a human personal trainer verbally interviews the member on the spot, decides a plan for the day, and manually records it. This doesn't scale, isn't personalized beyond that single conversation, isn't available 24/7, and loses historical nuance (injuries, medication, life events) between sessions.

The client wants to replace both with a unified, AI-driven system: face recognition for access, and a continuously-learning AI that builds a training plan from a rich onboarding profile and ongoing conversation, refining it over time.

## 3. Vision / Value Proposition

- **24/7 personalization**: a member can get plan feedback and adjustments any time, not just during a trainer's shift.
- **Cautious, data-informed plans**: the AI reasons from accumulated health/state data (medication, injuries, exams, self-reported physical state) rather than a single verbal check-in.
- **Frictionless access**: face recognition at the door replaces fingerprint hardware, integrating with the gym's existing turnstile REST API.
- **Human oversight preserved**: personal trainers remain in the loop, reviewing and able to override any AI-generated plan.
- **Community awareness**: members and the gym can see aggregate, real-time-style info (occupancy, popular exercises/equipment) derived from other members' plans.

## 4. Target Audience / User Roles

Single gym location. Three user roles:

| Role | Who | Core need |
|---|---|---|
| **Member** | Gym member with an active membership | Sign up, get cleared to train, get a personalized daily plan, check in via face recognition, talk to an AI about their training/state, see their history and metrics |
| **Personal Trainer** | Gym staff | Oversee AI-generated plans across all members (shared pool, not 1:1 assigned), comment on / override any plan |
| **Gym Admin** | Gym staff/management | Configure the turnstile REST API integration, manage the exercise library, monitor gym occupancy, act as backstop reviewer for medical certificates/aptitude edge cases, view mocked membership status |

Trainers and Admins are both "staff" but have distinct dashboards/permissions - see [03-features-and-flows.md](./03-features-and-flows.md).

## 5. Key Constraints Driving Design

- **Single gym, single location** - no multi-tenancy needed in the data model or auth model.
- **Mocked biometrics, real recognition logic**: facial recognition itself is implemented with a real in-browser face-detection/matching library; only the member database and the turnstile API responses are mocked/seeded (the turnstile API is treated as an existing external system the app integrates with, not one we build).
- **Trainers never block the AI**: plans are generated and published immediately; trainer review is asynchronous and non-blocking, preserving the 24/7 value proposition.
- **No visible persistent chat log**: the AI chat is stateless in the UI, but every message is mined for structured facts that are saved permanently to the member's profile/history - this is what makes future plans "remember" the member.
- **Only face embeddings ever reach the kiosk** - never raw reference photos - to limit how much of the biometric dataset is exposed to the check-in panel.
- **No staff self-signup**: trainer and admin accounts are fixed demo accounts created by a seed script at first boot, not created through the app.
- **Academic scope**: non-functional requirements are kept minimal (responsive UI, reasonable performance, basic security hygiene) - see [02-requirements.md](./02-requirements.md) for the full in/out-of-scope list.
