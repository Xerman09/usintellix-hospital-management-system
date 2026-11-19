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

### 3.3 `must_change_password` is honoured by the web UI only

`frontend/src/modules/auth/auth.js:545` acts on the flag. `AuthService` authenticates and
returns a session regardless, and nothing in `backend/app/Core/` or the middleware checks
it. So the mobile app, a direct API call, or any client that ignores the flag gets a fully
working session and is never asked to change anything.

The same hole sits under breach detection: when `AuthService` matches a password against
the HIBP list it sets `must_change_password = 1` and logs `PASSWORD_BREACH_DETECTED` with
"immediate credential change required (§ 164.308)" — then lets the login through. A
known-compromised password keeps working, and the audit trail records that a change was
required while nothing required it.

Found while resetting the admin password on 17 November: it is why that reset was not
issued as a temporary credential forced to change at first login, which would have been a
safeguard that does not exist.

### 3.4 Test suites write to the LIVE database — partly fixed, 18 November

**Correction, 19 November.** The entry below was wrong about the scope, and the error was
mine. Four suites were fixed because four suites had left rows matching the username
patterns I searched for. That is not the same question as "which suites connect to the
live database", and nobody asked the second one until a mail problem sent me back through
`tests/`.

The honest count: of 31 suites in `tests/`, **12 call `TestDatabase::use()` and 18 do
not**. The 18 run against whatever `backend/.env` points at, which is the live database:

    test_accounting_of_disclosures      test_npp_consent
    test_backup_and_disaster_recovery   test_portal_appointments
    test_business_associates            test_portal_health_maintenance
    test_diagnosis_guides               test_portal_insurance
    test_eye_exam                       test_portal_questionnaires
    test_field_encryption               test_portal_uploads
    test_gad7                           test_safe_harbor_deidentification
    test_hipaa_officer_designation      test_security_incidents
    test_hipaa_retention_and_export     test_visit_summary
    test_hitech_restriction             test_workforce_training_and_sanctions

Some of those only read. Several plainly do not. Each one needs the same two lines the
other four got, and each needs running afterwards to see what it was relying on — the four
already fixed each broke in some small way once moved, so expect that again rather than a
clean sweep.

Until that is done, `tests/run_all_hipaa_tests.php` is a script that writes to production.

The rest of this entry, about the rows that were cleared, stands.

It was **six** suites, not the two first reported: `test_confidential_communications`,
`test_drs_right_of_access`, `test_minimum_necessary` and `test_phi_amendments` are the
four still in `tests/`, and two more patterns (`test_pw_user_*`, `test_patient_npp_*`)
come from suites no longer in the tree. All four surviving ones now call
`TestDatabase::use()` before anything connects, and all four still pass — 60, 89, 18 and
90 assertions respectively. Rerunning them creates nothing in the live database, which was
checked rather than assumed.

What was cleared: **42 users, 43 employees, 6 patients and 2 patient_contacts**,
accumulated between 21 September and 08:00 on 18 November. Soft-deleted, not deleted —
every one of those tables carries `deleted_at`, every query filters on it, and a soft
delete is reversible. A JSON backup of every row touched is in
`backend/storage/retired-test-rows-20261118-115348.json` (password hashes stripped).

Two things were deliberately left in place:

- **`hipaa_audit_logs`** — 83 rows naming those users or patients. That table is a
  tamper-evident hash chain; removing rows from the middle breaks verification for
  everything after them, and the point of the chain is that nobody can quietly take
  things out of it.
- **`user_password_history`** — 44 rows, harmless, and needed if the soft delete is ever
  reversed.

`testrecep2`, `testpatient1` and `testdoc1` were **not** touched. They have no timestamp
in the name, they were created in July, and they look like accounts somebody made on
purpose rather than suite artefacts.

Still worth knowing: those fake patients consumed real medical record numbers —
**PAT-000029 through PAT-000065**. Soft-deleting them does not give the numbers back, and
reissuing an MRN would be worse than losing it, so that sequence has a permanent gap.

### 3.5 SMS queues against a sender that does not exist

`PortalNotificationService::SENDABLE` is `['email']`, but `appointment_reminder` defaults
SMS **on**, so rows accumulate with `status = 'queued'` forever. Connecting a sender later
would deliver the backlog as though it were current. M18's two notification types
deliberately default SMS off for this reason.

### 3.6 The seed directory mixes reference data with demo data

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

### 3.7 No email can leave the system — the mail server rejects the credentials

Found 19 November, from "I didn't receive any email about the forgot password".

`MAIL_USERNAME` / `MAIL_PASSWORD` in `backend/.env` are refused by the mail host:

    220 box4244.bluehost.com ESMTP Exim 4.100.1
    250-AUTH PLAIN LOGIN
    AUTH LOGIN  -> 535 Incorrect authentication data
    AUTH PLAIN  -> 535 Incorrect authentication data

The transport is fine — TLS on 465 connects in about 1.5s and the server advertises both
mechanisms. It is the password. The value in `.env` loads cleanly (16 printable
characters, no stray quoting, nothing the env loader mangles), so it is simply not the
mailbox's current password, or `iask@usintellix.com` no longer exists on that host.

Nothing has ever been delivered by this system. Not password reset codes, not the M6
patient notifications (`patient_notifications` has always been empty), not the clinical
instruction emails. Every one of those paths calls the same `Mailer`.

**This is the one blocking item that cannot be fixed from the repository.** Someone with
the hosting account has to either supply the mailbox's current password or reset it in
cPanel, after which it goes in `backend/.env` as `MAIL_PASSWORD` and the SMTP check above
should answer `235`.

Do not test it by repeatedly guessing: that host runs brute-force protection and three
failures were already spent confirming the above.

**Partly worked around, 19 November.** The sign-in page already shows the 2FA code on
screen when mail fails, for staff, and the same now exists for Forgot Password: schema
345, `general_settings.allow_password_reset_dev_code`, default on. It is fenced three
ways — loopback only and no proxy header anywhere on the request, staff accounts only,
and only after a send that actually failed — because unlike the 2FA version there is no
password behind it, so the code on screen *is* the authentication. Every use writes a
`PASSWORD_RESET_CODE_SHOWN_ON_SCREEN` row.

**Set that column to 0 the day this system is served through a reverse proxy**, and do
not rely on the loopback check alone to remember it for you: behind nginx, `REMOTE_ADDR`
is the proxy. The header check is what stands between that and a hole, and a header check
is a weaker thing to depend on than a switch somebody has deliberately turned off.

This is a workaround and not the fix. Mail still does not work, and nothing reaches a
patient — patients are excluded from the fallback by design, so the portal's own reset is
still dead until the mailbox is sorted out.
### 3.8 The live audit chain cannot be verified, and has not been since day one

`AuditLogger::verifyIntegrity()` against the live database:

    {"valid":false,"total_verified":10,"corrupted_id":11}

Rows 1–10 verify. Row **#11** — a `LOGIN_FAILED` for `test_lockout_user`, written
2026-09-21 17:26:45, one second after the `ACCOUNT_LOCKED` row above it — does not match
the hash it should carry, so verification stops there and the remaining 1,822 rows are
never reached. The same check against the disposable test database passes on all 499 rows,
so the algorithm and the genesis salt are right; it is this table.

The likeliest cause is the lockout path writing two rows close enough together that the
second one chained off a hash the first had already superseded, i.e. a concurrency bug in
`AuditLogger::log()` rather than anybody tampering. Two other facts point the same way and
are worth recording: ids run 1 to 1892 but only 1,833 rows remain, so **59 rows have been
removed** from somewhere in the middle at some point, and the chain cannot survive that
either.

What this costs: the nine HIPAA suites that assert chain integrity each report one failure
and have been doing so all along (965 passed, 9 failed on 19 November — all nine are this
same assertion, against live, per 3.4). More to the point, § 164.312(c)(1) is the reason
the chain exists, and right now it cannot be used to show that the log has not been
altered.

Do **not** "fix" it by recomputing the hashes. A chain that is rebuilt whenever it fails
proves nothing, and the rebuild would destroy the only evidence of what actually happened.
The fix is to find why #11 is wrong, write that down, and decide deliberately whether to
re-anchor the chain from a dated, signed starting point.

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

- **Two admin accounts carry an address built from their username.** `employees.email` for
  user #1 was `ermancerujano10@gmail.com@intellix.hospital` — the username with a domain
  stapled on, two @ signs, deliverable nowhere. Corrected 19 November to the real address.
  **Employee #74 (user #252, `admin@usintellix.com`) still has the same shape** and was
  left alone, because `admin@usintellix.com` is a guess at what it should be rather than
  something anybody confirmed. 75 further rows with that domain are soft-deleted test
  leftovers. No code in the tree generates these, so it came from a bootstrap script that
  is no longer here; nothing needs fixing beyond the data.
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
