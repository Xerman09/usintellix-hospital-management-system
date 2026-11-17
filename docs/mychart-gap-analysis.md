# My Chart: what is still missing against Epic

**17 November 2026.** A fresh gap list, built by reading the routing table, the module
tree and the app's own screens rather than by re-reading `mychart-roadmap.md`. Where the
two disagree, this document is the one that was checked against the code.

The roadmap tracks phases that were planned. This tracks **everything Epic MyChart does
that this system does not**, including things no phase ever proposed.

---

## What is actually reachable by a patient today

Worth stating first, because the gap list below is meaningless without it.

**70 endpoints under `/mychart/*`**, all behind `PortalGuard` (patient resolved from the
session, capability checked, access logged). These cover: results with explanations and
trends, visits and After-Visit Summaries, billing and payment, e-Check-In, notifications
and preferences, self-readings and device imports, account and proxy and Share Everywhere,
diagnosis guides, appointment self-service and Fast Pass, uploads, insurance,
questionnaires, health maintenance, e-visits, and cost estimates.

**And a second, older surface outside `PortalGuard`** — reached by the app and working:
secure two-way messaging, recalls, reminders, prescription list and refill requests, the
CCD health summary, medications, ledger, documents, and appointment booking.

**Eleven tiles** in the app: Appointments, Prescriptions, Health Records, My Conditions,
My Insurance, Questionnaires, Staying Well, Costs, Ask a Doctor, Come in Sooner, Messages.

---

## 1. The biggest gap is not a feature. There is no patient web portal.

Epic MyChart is a **browser portal first** — `mychart.<hospital>.org` — with a companion
app. Here it is the other way round, and the browser half does not exist:
`frontend/src/modules/` is 250-odd directories of **staff** screens, and the only
patient-facing HTML in the tree is `share.html`, which is M8's link for an outside doctor.

This matters more than any single feature below:

- a patient on a desktop at work cannot reach their chart at all;
- every feature shipped in M0–M18 is only usable by someone who has installed an app;
- and the app cannot be installed, because the Expo build quota blocks it — so **today
  there is no way for a real patient to use any of this.**

The effort is smaller than the impact suggests. `build-web.js` and `dev-server.js` already
produce a working React Native Web bundle of the whole app (verified running on
`localhost:7001`). What is missing is a deployed origin, session handling for a browser
rather than `expo-secure-store`, and a login page that is not the app's.

**This should probably be the next phase, ahead of everything else on this list.**

---

## 2. ~~The chart the backend already assembles, that the patient cannot see~~

**CORRECTED 17 November, and then built as M19.** This section was wrong in two ways when
it was written on the 17th, both because it was checked by grepping rather than by reading.
Left in place with the corrections beside it, because a gap list that quietly rewrites its
own mistakes is not worth trusting.

**What it said:** that `GET /health-summary` "already returns" twenty-odd sections
including procedures, vital signs, advance directives, goals, social history and care
team — and that "the app renders almost none of it".

**What is true:**

1. **Fourteen of those keys are hard-coded empty arrays** in
   `HealthRecordSummaryService::buildSummary()`. Only `allergies`, `problems`,
   `medications`, `prescriptions`, `results`, `immunizations` and `encounters` are
   populated, plus demographics and the care provider. `procedures`, `vital_signs`,
   `advance_directives`, `goals`, `health_concerns`, `treatment_plan`, `social_history`,
   `functional_status`, `mental_status`, `medical_equipment`, `payers`, `assessments`,
   `clinical_reminders` and `reasons_for_referral` return `[]` to everybody. The data for
   several of them does exist in its own tables — it was never wired into that summary.

2. **The app was already rendering them.** `HealthRecordsModal` has had tabs for
   Allergies, Conditions, Medications, Vaccines, Lab Results, Visits and Demographics
   throughout. The original grep looked for `data.x` and the component uses `data?.x`, so
   it found one match and the conclusion was drawn from that. Reading the file would have
   taken a minute.

**Which makes the real gap a different and more serious one.** Those lists were being
rendered *ungated*: `/health-summary` returns rows whose `verification_status` is `Refuted`
(a clinician decided the patient does NOT have this) or `Entered in Error`, and the screen
drew them as facts. In the live database that was two rows on a patient with a working
portal login. The same screen rendered an empty allergy list as a green tick reading
**"✓ No known allergies on record (NKDA)"** — a clinical assertion invented from an empty
table, which a patient could repeat to the next clinician who asked.

Both are fixed in **M19**, which also adds operations and implants (genuinely absent, since
`procedures` was one of the empty keys), a correction path, and moves these six lists behind
`PortalGuard` so they are capability-gated and appear in the patient's own access log.

Still missing after M19, and still worth having: **clinic-measured vitals**
(`EncounterVitals` exists, the CCD key is empty), **care plan and goals**
(`EncounterCarePlanItems`), **my care team** (`CareTeams`, currently an empty table),
**advance directives** (`PatientCarePreferences`, empty), and **family and social history**
(`PatientFamilyHistory`, empty). The last three have no data in them yet, so they are a
staff-workflow question before they are a portal one.

---

## 3. Patient rights that have a staff module and no patient path

These are not conveniences. Three of them are things a patient is legally entitled to ask
for, and the modules exist already.

- **Record amendment requests.** `Amendments` exists staff-side. A patient's right to ask
  for a correction is 45 CFR 164.526. Today they must telephone.
- **Records requests / designated record set.** `DrsRequests` exists. M8's record pack is
  a download of what the portal holds, not a formal request with a response clock.
- **Accounting of disclosures.** `Disclosures` exists. M8's access log covers *portal*
  views only — it does not show disclosures made outside the portal, which is what the
  right actually covers.
- **Medical certificates and work notes.** `PatientLetters` exists. The roadmap has been
  flagging this since M11; patients here ask for them constantly.
- **Notice of Privacy Practices acknowledgement.** `NppConsent` exists; nothing presents
  it in the portal.

---

## 4. Epic features with no counterpart here at all

**Scheduling**
- **Open / direct scheduling** — booking exists (`POST /appointments` admits patients) but
  there is no "find any provider with an opening" flow; M10's slot search is tied to an
  appointment the patient already holds.
- **Ticket scheduling** — a provider issues a ticket, the patient picks the slot.
- **A waitlist for people with no appointment.** Fast Pass deliberately only *moves* an
  appointment somebody already holds. Somebody who wants to be seen and has nothing booked
  has no path.

**Money**
- **Payment plans** and **financial assistance applications**. M4 takes a payment; it
  cannot arrange one.
- **Price transparency beyond packages.** M16 quotes packaged procedures only.

**Interoperability** — the one with a legal deadline attached
- **No FHIR API, no US Core, no SMART-on-FHIR app authorisation.** Under the 21st Century
  Cures Act information-blocking rules a patient must be able to connect a third-party app
  of their choosing to their record. `PatientExternalData` exists as a table and there is
  no API. This is the largest *compliance* gap on the list, and nothing in M0–M18 touches
  it.
- **Happy Together** — showing records from other organisations. Marked "not planned" in
  the roadmap; worth revisiting only after FHIR exists, since it is the same plumbing.

**The inpatient experience (MyChart Bedside)** — an admitted patient gets nothing
- meal ordering (`Dietary` exists), today's schedule, who is on my care team right now
  (`NursingStaff`, `CareTeams`), visitor management (`VisitorManagement`), education
  pushed to the bedside (`patient-education`). Every one of these modules exists for
  staff. For a patient in a bed, the app shows the same thing it shows at home.

**Clinical content**
- **Radiology images.** `Radiology` and a DICOM viewer exist staff-side; patients get
  reports at best.
- **Patient education.** `patient-education` exists; nothing pushes it to a patient after
  a visit — M9's diagnosis guides are the closest thing and are not linked to it.
- **Growth charts** (paediatric) — marked not planned; worth reconsidering if this
  hospital sees children, because parents expect it.
- **Symptom checker / triage** — Epic has one; M15a's red-flag screening is a narrower
  thing bolted to e-visits.

**Find care**
- **Provider directory** for patients (`Providers` is staff-only), **ER wait times**
  (`Er` and the `er_wait.php` cron compute them already), clinic hours and locations.

---

## 5. Account, delivery and access

- **No push notifications.** `PortalNotificationService::SENDABLE` is `['email']`. In-app
  rows are read when the patient opens the app; email is the only thing that reaches out.
  For a four-hour Fast Pass offer that is thin, and push is the channel Epic relies on.
- **SMS is queued and never drained.** `appointment_reminder` defaults SMS on, so rows are
  accumulating against a sender that does not exist. Connecting one later would deliver a
  backlog of dead messages.
- **No two-factor authentication** on the patient account. Biometric unlock exists on the
  device; that is not the same thing.
- **No self-registration or activation codes.** `PatientPortalAccess` exists staff-side,
  but how a real patient obtains a login is undefined.
- **English only.** No i18n anywhere in the app.
- **No accessibility work.** No screen-reader labels, no dynamic type, no contrast audit.
  Epic ships this because it is procured against.

---

## 6. Structural: there are two patient surfaces and only one of them is governed

M0–M18 established a rule and held to it: every `/mychart/*` endpoint goes through
`PortalGuard`, which resolves the patient from the session, checks a capability, and writes
`portal_audit_logs`. No endpoint takes a `patient_id` from the request.

The older surface does **not** go through it. Messaging, recalls, reminders, the health
summary, medications, ledger, documents, prescriptions and appointment booking are reached
by patients either through a role list or through `AuthMiddleware` alone.

To be clear about what was checked: **these scope correctly.** `HealthRecordController`
and `PatientMedicationController` both branch on `role === 'patient'` and call
`resolveEffectivePatient($user)`, ignoring any `patient_id` in the request; writes are
guarded by `ownsPatient()`. There is no cross-patient read here.

What is missing is everything else `PortalGuard` provides:

- **no capability gate** — a hospital cannot switch messaging or the health summary off per
  deployment the way it can switch off every M0–M18 feature;
- **no `portal_audit_logs` row** — so **M8's "who has seen my record" is incomplete.** A
  patient reading their own health summary, or a conversation, leaves no trace in the log
  the portal presents as the record of access. That is a correctness problem with a feature
  that has already shipped, not a future gap;
- **no consistent refusal wording**, so these screens fail differently from the rest.

Bringing them behind `PortalGuard` is a contained piece of work and would make the access
log honest.

---

## Suggested order

1. **The web portal.** Without it there is no way to use any of this today.
2. ~~Surface the CCD summary~~ — **done as M19**, and it turned out to be a safety fix
   rather than a presentation one. See §2.
3. **Bring the older surface behind `PortalGuard`**, so the access log stops lying.
4. **Patient rights**: amendments, records requests, disclosures, certificates.
5. **FHIR / SMART-on-FHIR.** Largest compliance exposure; large piece of work.
6. **Push notifications**, then SMS once there is a sender.
7. Everything else as the hospital asks for it.

M15b (video) and M17b (the native health-store bridge) stay where the roadmap has them —
both blocked on something that is not code.
