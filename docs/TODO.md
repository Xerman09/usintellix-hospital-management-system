# What still needs doing

**17 November 2026.** Everything outstanding across the patient portal work, pulled
together from the per-phase "Still open" sections of `mychart-roadmap.md`, from
`mychart-gap-analysis.md`, and from things found while building M18.

Ordered by what is actually blocking, not by size. Most of the top of this list is not
code — it is a decision, a signature, or a build quota.

Two companion documents, and what each is for:

- **`mychart-roadmap.md`** — what was built, phase by phase, and why each decision was
  made the way it was. Read it before changing any of it.
- **`mychart-gap-analysis.md`** — what Epic MyChart does that this system does not,
  checked against the routing table rather than against the roadmap.

---

## 0. Blocking everything

### No patient can use any of M0–M18 today

Eighteen phases have shipped and there is no way for a real patient to reach any of it:

- the Android build is blocked on the **Expo build quota, which resets 1 December 2026**;
- and there is no patient web portal — `frontend/src/modules/` is entirely staff screens,
  and the only patient-facing HTML in the tree is `share.html`, which is M8's link for an
  outside doctor.

**The web portal is the unblock, and it is smaller than it sounds.** `build-web.js` and
`dev-server.js` already produce a working React Native Web bundle of the entire app —
verified running on `localhost:7001` on 17 November, booting to the sign-in screen and
round-tripping to the PHP backend across origins. What is missing is a deployed origin,
browser session handling in place of `expo-secure-store`, and a login page that is not the
app's own.

---

## 1. Waiting on a person, not on code

These are finished features that stay switched off, or shipped wording nobody qualified
has read. No amount of code closes any of them.

| # | What | Who | Consequence until then |
| --- | --- | --- | --- |
| 1.1 | The six red-flag screening questions, four complaint questionnaires, and four reasons with their "not for this" text | A clinician | `portal_allow_evisits` stays **0**. M15a is built and unreachable. |
| 1.2 | The four patient-facing package labels, and whether publishing both standard and discounted prices is intended | A billing lead | M16 shows figures nobody has approved |
| 1.3 | 45 seeded diagnosis guides, 4 follow-up questionnaires, M14's item wording and intervals | A clinician | Patient-facing clinical wording, unreviewed |
| 1.4 | The PHQ-9 severity label — see below | A clinician | A reassuring label beside a serious answer |
| 1.5 | The six M19 section headings, blurbs and empty-list wording (seed 088) | A clinician | Patient-facing clinical wording written by a developer. Editable from the desk screen without a deployment. |

### 1.4 in full, because it is the one that matters

A patient who answers *"more than half the days"* to thoughts of being better off dead,
with everything else low, scores **4 of 27** and is stored with
`severity = 'No depressive disorder'`.

The escalation is correct and visible: the alert is raised on item 9 regardless of the
total, the row sorts to the top of the desk queue, it carries a "Care team alerted" pill,
and the reader says when the team was alerted. **The severity *text* beside it is what
reads as reassurance.** The label is a faithful reading of the PHQ-9 total, so changing it
is a clinical decision rather than a code one. Flagged, deliberately not reworded.

---

## 2. Sitting on one machine

### 2.1 ~~The dispensing work is uncommitted~~ — done, 17 November

Committed as `1b66ba1` after review: the pharmacy audit trail (nine actions into
`hipaa_audit_logs`) and `prescription_dispenses.created_via`, which records whether a
dispensing came from the tablet or the desktop. Schema 332 had already been applied on
29 October and the code had already produced rows, so this closed a gap between the
repository and the running system rather than changing behaviour.

The code was not written in this session; the commit message says so. Its other half,
`pharmacy_tablet_app`, was already committed and pushed — the repository had been holding
one side of a pair.

### 2.2 The portal cron is live and will send real email

`USIntellix portal notify` runs every five minutes (registered 16 November, verified
firing on its own schedule). **24 of the 35 active patients have an email address on
file.** Nothing is due yet — the only future appointments are in July and November 2027,
far outside the 24-hour reminder window — so nothing has been sent. The first time
something does come due, it goes to real people. Worth checking the mail settings before
that rather than after.

It also runs only while the registering user is logged on. Changing that needs a stored
password or a `SYSTEM` registration; neither was done.

---

## 3. Known defects

### 3.1 M8's access log is incomplete — a shipped feature that is quietly wrong

The 70 `/mychart/*` endpoints go through `PortalGuard`, which writes `portal_audit_logs`.
An older patient surface does not: **messaging, recalls, reminders, the CCD health
summary, medications, ledger, documents, prescriptions and appointment booking**, reached
through role lists or `AuthMiddleware` alone.

Those scope correctly — `HealthRecordController` and `PatientMedicationController` branch
on `role === 'patient'` and call `resolveEffectivePatient($user)`, ignoring any
`patient_id` in the request; writes go through `ownsPatient()`. **There is no cross-patient
read.** What is missing is the capability gate and the audit row, so a patient reading
their own health summary leaves no trace in the log the portal presents as *"who has seen
my record"*.

Fix: bring those routes behind `PortalGuard`. Contained work, and it makes the access log
honest.

### 3.2 The staff uploader serves PHI by URL

`backend/public/uploads/patient_documents` is served straight off the filesystem to anyone
with the path. The `.htaccess` guard added for M11's own storage directory does nothing on
nginx, or with `AllowOverride off`.

### 3.3 SMS queues against a sender that does not exist

`PortalNotificationService::SENDABLE` is `['email']`, but `appointment_reminder` defaults
SMS **on**, so rows accumulate with `status = 'queued'` forever. Connecting a sender later
would deliver the backlog as though it were current. M18's two notification types
deliberately default SMS off for this reason.

### 3.4 The seed directory mixes reference data with demo data

Only the first kind is safe to re-run, and they are interleaved:

- **`049_seed_department_org_mapping.sql`** sets `head_of_department_id` by hard-coded
  department id (`WHERE id = 4` → head 101, and seven more) with no `IS NULL` guard. Those
  ids only line up on the live database; on one built from seeds alone, Internal Medicine
  is id 2 rather than 3, so the heads land on the wrong departments. Re-running it on a
  live deployment also overwrites whatever heads an admin set.
- **`057_seed_patient_identity_verification.sql`** unconditionally overwrites identity
  verification on patients 2, 3 and 4 with sample passport and licence numbers. It is
  labelled "sample" and those happen to be test accounts, but it writes to real patient
  columns by id.

Worth a pass of its own asking, file by file, which is reference data and which is demo
data.

---

## 4. Deployment

### 4.1 Schema and seeds have only reached one database

Schemas **333–342** and seeds **066–086** are applied only to the database named in
`backend/.env`. `AutoMigrator` applies schema on connection; **seeds are not auto-run by
anything.**

These seeds are **not optional** — each grants a `role_permissions` row, and
`RoleAccess::hasPermission()` treats a missing row as *not granted*, so the feature is
denied with no error anywhere:

> **068** · **071** · **075** · **077** · **081** · **083** · **085**

### 4.2 The portal cron must exist on every deployment

Without `backend/cron/portal_notify.php` scheduled, Fast Pass offers never go out and
never expire, and no portal notification is ever delivered. **The symptom is silence, not
an error.** Check it before switching the portal on anywhere.

---

## 5. Feature work, in the order worth taking it

1. **The patient web portal** — see §0.
2. ~~Surface the CCD summary~~ — **done as M19 on 17 November.** It was not the
   presentation job it looked like: those lists were already on screen, drawn straight
   from `/health-summary`, which returns rows marked `Refuted` and `Entered in Error`.
   Patients were being shown items a clinician had ruled out, and an empty allergy list
   rendered as a green tick reading "No known allergies on record (NKDA)". Both fixed,
   plus operations and implants, a correction path, and the six lists moved behind
   `PortalGuard`. **Still needs clinical sign-off on the seeded section wording before it
   is switched on anywhere real** — see §1.
3. **Bring the rest of the older surface behind `PortalGuard`** — closes §3.1. M19 did
   this for the six clinical lists; messaging, recalls, reminders, the ledger, documents,
   prescriptions and booking are still outside it.
4. **Patient rights with a staff module and no patient path**: record amendments
   (`Amendments`), records requests (`DrsRequests`), accounting of disclosures
   (`Disclosures`), medical certificates (`PatientLetters`).
5. **FHIR / US Core / SMART-on-FHIR.** No API exists. The Cures Act information-blocking
   rules require a patient to be able to connect a third-party app of their choosing.
   Largest compliance exposure on this list.
6. **Push notifications**, then SMS once there is a sender.
7. **M11's picker and M17b's health-store bridge** — one Expo rebuild after 1 December, so
   the APK size is checked once.
8. **M15b, video visits.** Still blocked on four decisions: provider, dropped calls,
   billing, bandwidth.
9. **M16 itemised estimates** — `source_type = 'itemised'` has schema support and no desk
   form; and three packages' itemisation does not add up, PKG-MAT-002 worst of all
   (48,000 price, zero line items).

---

## 6. Smaller, recorded so they are not rediscovered

- **Nobody has watched Fast Pass run against real cancellations.** The board counts how
  many freed slots were filled; that number is the only honest verdict on the feature and
  it has no values in it yet.
- **Fast Pass matches on provider and time only.** It does not check the two appointments
  are the same kind of visit, because `visit_category_id` is nullable and mostly null here,
  so a check on it would reject nearly everything.
- **No clinician-initiated e-visit.** A clinician cannot start one to follow something up.
- **Nothing rate-limits e-visits across time.** One open at a time is enforced; four a day
  for a month is not.
- **Nothing reconciles a device reading against a clinical one.** If a patient's monitor
  and the clinic's cuff disagree, both sit in the record and a human decides. Probably
  correct, but nobody has written it down as a decision.
- **No Apple Health export path**, for the same file-upload reason as M17b.
- **The APK self-update loop** stays broken until a 1.0.1 build exists.
