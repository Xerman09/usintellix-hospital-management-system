# My Chart: phases

Where the patient portal stands, and the phases left to reach parity with the parts of
Epic MyChart that matter for this hospital.

The numbering continues the `Phase M<n>` labels already in the code. Sizes are relative,
not estimates in days: **S** is a route plus a screen over tables that already exist,
**M** is new tables and a staff-side screen as well, **L** needs a decision or a vendor
before any code is written.

---

## Shipped (M0–M10)

| Phase | What it gave the patient | Where it lives |
| --- | --- | --- |
| **M0** | Core context and the chart switcher (self + proxy) | `PortalProxyService`, `/proxy-access/*` |
| **M1** | Released lab and imaging results | `PortalResultService`, `/mychart/results` |
| **M2** | Plain-language test explanations and analyte trends | `PortalExplanationService`, schema 303 |
| **M3** | Visits, After-Visit Summaries, discharge summaries | `PortalVisitService`, `/mychart/visits/*` |
| **M4** | Statements, payment, receipts, history | `PortalPaymentService`, schema 304 |
| **M5** | e-Check-In with questionnaires | `PortalCheckinService`, schema 305 |
| **M6** | Notifications and channel preferences | `PortalNotificationService`, schema 306 |
| **M7** | Track My Health — self-readings with goal bands | `PortalSelfReadingService`, schema 307 |
| **M8** | Account, proxy requests, Share-Everywhere links, access log | `PortalShareService`, schema 308 |
| **M9** | Diagnosis guides — what a diagnosis means, do's and don'ts | `PortalDiagnosisGuideService`, schema 333 |
| **M10** | Appointment self-service — move, cancel, confirm | `PortalAppointmentService`, schema 334 |

**M9 is unlabelled in the code.** It was built without a `Phase M9` comment or a capability
flag. Worth labelling so the sequence stays readable.

---

## M9.5 — Housekeeping before the list grows

**Size: S. Partly done.** Not a feature. Inconsistencies that get more expensive with
every phase added on top of them.

1. **Capability flags are applied unevenly.** *Started:* M10 shipped with
   `mychart_appointment_manage`, so new features now arrive gated. **Still to backfill:**
   visits, AVS, notifications and the M9 diagnosis guides call `PortalGuard::enter()` with
   no capability at all, so a hospital cannot switch those four off per deployment. Eight
   capabilities now exist; four features have none.
2. **Pending from M9**: the After-Visit Summary path has never run against real coded
   diagnoses (`encounter_diagnoses` is empty in the dev database), the 45 seeded guides
   have no clinician sign-off, and the guide modal missed the mobile UI redesign so it
   still uses the older card styling while the screens around it moved on.
3. **Pending from M10**: the successful reschedule, cancel and confirm writes are not
   test-covered — only the refusal paths are, because exercising a write would alter real
   appointments. Worth one pass against a disposable database.
4. **Not a portal item but adjacent**: the hosted APK self-update loop is still broken
   until a 1.0.1 build exists (quota resets 1 December), and the dispensing work in the
   HMS working tree is uncommitted, including the untracked migration
   `332_dispensing_client_channel.sql`.

---

## M10 — Appointment self-service — **DONE** (11 November 2026)

Shipped as `d18e55e` (backend) and `b10723f` (app). Five endpoints under
`/mychart/appointments`, deliberately not the staff `PUT`/`DELETE`, which update any
field of any appointment and soft-delete respectively.

What it does: reschedule and cancel the patient's own future appointments inside a
cut-off the hospital sets (`portal_appointment_cutoff_hours`, default 24, with
`portal_allow_self_reschedule` and `portal_allow_self_cancel` as separate switches);
confirm attendance, which stays open inside the cut-off because that is when it is most
useful to the desk; and the patient's actions surface on the appointment row for the
desk rather than only in the audit log.

Three things that needed care, recorded here because they are the kind of thing that
gets re-broken: `buildAppointmentFields()` keeps nothing it is not given, so a reschedule
has to send the whole existing row back; `update()` deliberately does not enforce a
future date, so eligibility checks that itself; and a patient cancel must not use
`remove()`, which soft-deletes and would hide the freed slot from the desk.

**Not included, deliberately:** offering a freed slot to someone waiting (Epic's Fast
Pass). It needs a waitlist table and a notification path, so it is its own phase if
wanted — see M18 below.

## M11 — Patient uploads

**Size: M. Enables M12.**

The app cannot upload anything at all today. In MyChart this carries insurance cards,
IDs, outside lab results and wound photos. `PatientDocuments` already exists staff-side,
so this is an endpoint, a picker and a review queue rather than a new subsystem.

- Camera and file picker in the app; images downscaled on the device.
- Size, type and count limits enforced server-side, never only in the app.
- Everything lands as **unverified** in a queue a staff member accepts or rejects — a
  patient-supplied document must never silently become part of the legal record.
- Audited through `PortalAudit` like every other portal action.

## M12 — Insurance self-service

**Size: M. Needs M11.**

`PatientInsurances` exists staff-side and insurance appears inside e-check-in, but
outside that window a patient cannot see or correct their own coverage. For
PhilHealth and HMO workflows this is a large share of front-desk time.

- View current coverage and its status.
- Submit or replace a card photo (via M11) and request a change to member details.
- A change request is a request, not a write: staff accept it into `patient_insurances`.

## M13 — Questionnaires between visits

**Size: M.**

The questionnaire engine (`portal_questionnaires`, `portal_questionnaire_responses`,
schema 305) only runs inside e-check-in. Epic sends questionnaires out between visits —
PHQ-9 and GAD-7 follow-ups, post-operative checks, symptom diaries. The content already
exists as the `Phq9`, `Gad7`, `ScreeningTools` and `FormDefinitions` modules.

- Assign a questionnaire to a patient with a due date; it appears in the M6 to-do list.
- Patient completes it at home; the score lands in the chart where the clinician
  already reads that instrument.
- A scored instrument crossing a threshold should raise the same alert it would if a
  nurse had keyed it in — reuse the existing alert escalation, do not invent a path.

## M14 — Health maintenance and preventive care

**Size: M.**

`Recalls` and `PatientReminders` exist, so patients get told to come back, but there is
no "what you are due for" panel with due dates — the thing that actually drives
screening compliance.

- Due, overdue and completed, per patient, from the practice rules already seeded.
- Ties to M10 so "due for a Pap smear" ends in a booked appointment rather than a note.

## M15 — Telehealth and video visits

**Size: L. Highest value, latest start.**

Nothing exists anywhere in either codebase. This is the biggest functional gap against
modern MyChart, and for a hospital with a provincial catchment it is plausibly worth
more than several phases already shipped. It is placed here only because it needs
decisions before code: which video provider, what happens on a dropped call, how the
consultation is billed, and what bandwidth patients actually have.

- A video visit is an appointment of a new visit type, so M10's reschedule and cancel
  apply to it unchanged.
- The clinical note, orders and billing must go through the normal encounter path. A
  parallel telehealth record would be a second source of truth.
- Consider an asynchronous e-visit (symptom questionnaire → clinician reply) first: it
  reuses M13, needs no video stack, and covers much of the demand.

## M16 — Cost estimates

**Size: M.**

`TariffMaster`, `BillingManager` and the bundled-package tables exist, so a pre-visit
estimate is feasible. It matters most where patients pay out of pocket.

- An estimate for a planned procedure or admission, with what is and is not included.
- Must read as an estimate and record the tariff version it was produced from.

## M17 — Device and health-app import

**Size: L.**

Track My Health (M7) is manual entry only. Epic leans on Apple Health and Google Fit for
blood-pressure and glucose adherence, because typing readings daily does not last.

- Import into the existing `patient_self_readings`, flagged by source so a clinician can
  tell a device reading from a typed one.
- Needs native modules on both platforms, which is the reason for the L.

---

## M18 — Fast Pass (offer a freed slot)

**Size: M. Optional, and only worth it once M10 has produced cancellations.**

When a patient cancels through M10 the slot simply goes back to the desk. Epic offers it
to patients on a waitlist, first come first served, which is how a cancellation becomes
somebody else's earlier appointment instead of an empty chair.

Needs a waitlist table, a rule for who gets offered what and for how long, and a
notification path (M6 already has the channels). Deliberately left out of M10, which only
had to make cancelling possible — there is no point building the offer mechanism before
there are cancellations to offer.

---

## Deliberately not planned

Worth naming so nobody assumes they were missed: growth charts (pediatric), advance
directive upload, research-study enrolment, organ-donor registration, and Happy
Together-style external record import (though `PatientExternalData` exists if that
changes).

One item is **not** an Epic feature but belongs on this list anyway: **medical
certificate requests**. Patients ask for them constantly here, `PatientLetters` already
exists staff-side, and it would be an S once M11's review-queue pattern is in place.

---

## Suggested order

**~~M10~~ → finish M9.5 → M11 → M12 → M13 → M14 → M16 → M15 → M17 → M18**

M10 is done. What is left of M9.5 is the capability backfill and M9's three loose ends,
all small, and worth clearing before the list grows. M11 unlocks M12 and the medical
certificate work. M15 sits late despite being the most valuable, because starting it
before the decisions are made means building the wrong thing; if an asynchronous e-visit
is acceptable, bring that part forward to sit beside M13. M18 only makes sense after M10
has been live long enough to produce cancellations.
