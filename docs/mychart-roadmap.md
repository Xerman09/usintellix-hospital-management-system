# My Chart: phases

Where the patient portal stands, and the phases left to reach parity with the parts of
Epic MyChart that matter for this hospital.

The numbering continues the `Phase M<n>` labels already in the code. Sizes are relative,
not estimates in days: **S** is a route plus a screen over tables that already exist,
**M** is new tables and a staff-side screen as well, **L** needs a decision or a vendor
before any code is written.

---

## Shipped (M0–M14, plus M9.5)

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
| **M11** | Sending in photos and documents, reviewed before they count | `PortalUploadService`, schema 335 |
| **M12** | Insurance self-service — see cover, ask for it to be corrected | `PortalInsuranceService`, schema 336 |
| **M13** | Questionnaires between visits, PHQ-9 and GAD-7 scored and escalated | `PortalQuestionnaireService`, schema 337 |
| **M14** | What you are due for — screenings and vaccinations, with dates | `PortalHealthMaintenanceService`, schema 338 |
| **M9.5** | Nothing new for the patient — a disposable database, so the write paths are tested | `tests/lib/test_database.php`, `tests/test_portal_writes.php` |

**M9 is labelled as of M9.5.** It was built without a `Phase M9` comment or a capability
flag; both are now in place.

---

## M9.5 — Housekeeping before the list grows — **DONE** (15 November 2026)

Not a feature. The inconsistencies that get more expensive with every phase added on
top of them. Two of the four items turned out to have been quietly closed by later
phases, and the two that were real are now done.

**1. Capability flags — was already done, and this entry was stale.** The backfill
landed with seed 068: `mychart_visits_view`, `mychart_billing_view`,
`mychart_account_view`, `mychart_notifications`, `mychart_diagnosis_guides` and
`mychart_appointments_view`. All fifteen of those endpoints go through
`PortalGuard::enter()` with a capability, and the two that stay deliberately ungated
(revoking someone's proxy access to your own record, and confirming attendance) are
documented as such in `PortalGuard`. Twelve capabilities now exist and every feature
has one.

**2. M9 is labelled.** Schema 333, seed 066, `PortalDiagnosisGuideService`, the routes
block and the desk screen all now carry `Phase M9`, matching how M10–M14 label
themselves, so the sequence reads straight through.

**3. The successful write paths are covered — `tests/test_portal_writes.php`, 98
tests.** This was the real item. M10–M14 shipped with their refusals tested and their
writes not, because the only database available was the live one, and a test that
proved "cancelling works" would have cancelled a real appointment. M14 demonstrated the
cost of that: a failing test wrote a care-gap claim against a real patient with a date
nobody chose, and it had to be found and deleted by hand.

So there is now a disposable database:

- `tests/lib/test_database.php` builds it from the same two directories the real one is
  built from — `backend/database/schema` via `AutoMigrator`, which the app already runs
  on every connection, then every `backend/database/seed/*.sql` in order. No fixture
  dump, because a dump would be a third description of the schema and would rot the
  first time someone added a migration without remembering it existed.
- `tests/lib/test_fixtures.php` builds one synthetic patient, provider, encounter and
  insurer, all prefixed `ZZTEST`/`zz_test`. Nothing is copied from the live database:
  copying rows would put real names and birthdates into a second database with weaker
  handling, and no test needs a real person to prove a cancel writes a cancelled row.
  Reminders come from `PatientReminderService::processForPatient()`, the same path the
  nightly job uses.
- `tests/build_test_database.php` creates it (`--fresh` to rebuild, `--drop` to remove).
  About 50 seconds for a full build.

What that bought, beyond coverage:

- **A patient cancel does not soft-delete.** M10's own comment warns about this and
  nothing enforced it. Now asserted directly: `status = 'cancelled'`,
  `cancelled_by_patient = 1`, `deleted_at` still NULL, so the freed slot stays on the
  desk's day.
- **Confirming works inside the cut-off while cancelling does not** — the deliberate
  asymmetry from M10, now pinned by two assertions that would both have to be changed
  to break it.
- **Accepting an upload copies it into `patient_documents`; accepting an insurance
  request is what puts cover on the record.** Both previously untested, and both are
  the point of the review queue.
- **M9's After-Visit Summary path has finally run against a coded diagnosis.**
  `encounter_diagnoses` is empty in every database this project has, so the guide
  matcher had never met a coded row. The fixture encounter carries E11.9, which
  exercises the 3-character category step (the seeded guide is E11), and an unknown
  code still returns nothing rather than a near-miss.

**4. Still open, and not closable here:**

- **The 45 seeded diagnosis guides, the 4 seeded follow-up questionnaires and M14's
  item wording and intervals have no clinician sign-off.** Unchanged, and not something
  code can settle.
- **The PHQ-9 severity label needs a clinician's eye.** The write tests pinned a case
  worth looking at: a patient who answers "more than half the days" to thoughts of
  being better off dead, with everything else low, scores 4 of 27 and is stored with
  `severity = 'No depressive disorder'`. The escalation is correct and visible — the
  alert is raised on item 9 regardless of the total, the row sorts to the top of the
  desk queue, carries a "Care team alerted" pill, and the reader says when the team was
  alerted. But the severity *text* beside it reads as reassurance. The label is a
  faithful reading of the PHQ-9 total, so changing it is a clinical decision, not a
  code one. Flagged rather than reworded.
- **The APK self-update loop** is still broken until a 1.0.1 build exists (Expo quota
  resets 1 December), which also gates M11's picker and M12's card-photo flow.
- **The dispensing work in the HMS tree is still uncommitted**, including the untracked
  migration `332_dispensing_client_channel.sql`, which exists nowhere but that disk.

### A bug this phase found: `USE` in a seed file

`007_seed_admin.sql` began with `USE usintellix_hospital_management_system;`. Because it
is the lowest-numbered seed, every seed run after it in the same session went to that
hard-coded database — whatever database the caller had actually selected, including the
one named on the `mysql` command line and the one the application's connection is bound
to.

It was found the worst possible way: the first test-database build reported success
against the test database having re-seeded the **live** one. Nothing in the output said
so, because the connection genuinely was pointed at the test database when the run
started. The live database survived because the seeds are idempotent — every count was
verified unchanged afterwards — but one unguarded `UPDATE` in `057_seed_patient_identity_verification.sql`
reset `verified_at` on patient 2 to that day's timestamp.

Fixed: the `USE` is gone, replaced by a comment saying why it must not come back.
`applySeeds()` now refuses any seed containing a `USE` statement and re-reads
`SELECT DATABASE()` after every file, so a silent switch stops the run instead of
redirecting it.

Two related things found while confirming the damage, both left alone deliberately
because fixing them means changing configured data:

- **`049_seed_department_org_mapping.sql` sets `head_of_department_id` by hard-coded
  department id** (`WHERE id = 4` → head 101, and seven more), with no `IS NULL` guard.
  Those ids only line up on the live database, whose numbering comes from hand-created
  rows; on a database built from the seeds alone, Internal Medicine is id 2 rather than
  3, so the heads land on the wrong departments. Re-running that seed on a live
  deployment would also overwrite whatever heads an admin had set.
- **`057_seed_patient_identity_verification.sql` overwrites identity verification on
  patients 2, 3 and 4 unconditionally**, with sample passport and licence numbers. It is
  labelled "sample" and those happen to be test accounts, but it writes to real patient
  columns by id.

Neither belongs in a test-infrastructure change. Worth a pass of its own over the seed
directory asking which files are reference data and which are demo data — they are
mixed together now, and only the first kind is safe to re-run.

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

## M11 — Patient uploads — **backend and desk DONE, app side blocked**

Shipped: schema 335, seed 069, `PortalUploadService`, seven endpoints, and the
"Patient Uploads" review queue. 38 tests.

Everything a patient sends lands `pending`; accepting copies it into
`patient_documents`, rejecting requires a reason the patient reads. Images and PDF
only — no Office formats, and the type is read from the file's own bytes, never the
name or the client-supplied type. Policy is `portal_allow_uploads`,
`portal_upload_max_mb` (8) and `portal_upload_max_per_day` (10) in `general_settings`.

**A security finding worth keeping:** the plan said to store these outside the web
root. There is no outside — the deployed tree sits under the Apache DocumentRoot
(`C:/xampp/htdocs`), and `backend/storage/patient-uploads` answered a plain `GET`
with **HTTP 200** before `.htaccess` was added to deny it (403 after, both verified).
The staff uploader writes to `public/uploads/patient_documents`, which is still
served straight off the filesystem to anyone with the path — fine for a lab report,
wrong for an identification card, and worth revisiting separately. On nginx, or with
`AllowOverride off`, the `.htaccess` does nothing and the location must be denied in
server config.

**Blocked: the app cannot send files yet.** The project has no picker dependency at
all (`expo-image-picker` / `expo-document-picker` are absent, and the only expo
packages are asset, constants, local-authentication and secure-store). Those are
native modules, so they take effect only in a rebuild — and rebuilds are blocked on
the Expo free-plan quota until 1 December. Deliberately not installed: adding a
native dependency that cannot be compiled would leave the tree in a state nobody can
build. When the quota resets: add the picker, add the upload call against
`POST /mychart/uploads` (multipart, field `file`, with `kind` and `caption`), and
check the APK size, since a picker is the first real native addition since the
~16 MB packaging rules in `GEMINI.md` were written.

Until then the endpoints and the desk queue are live and usable — staff can review
anything that arrives, and M12 and the medical certificate work can build on this.

---

## M11 (original plan) — Patient uploads

**Size: M. Enables M12.**

The app cannot upload anything at all today. In MyChart this carries insurance cards,
IDs, outside lab results and wound photos. `PatientDocuments` already exists staff-side,
so this is an endpoint, a picker and a review queue rather than a new subsystem.

- Camera and file picker in the app; images downscaled on the device.
- Size, type and count limits enforced server-side, never only in the app.
- Everything lands as **unverified** in a queue a staff member accepts or rejects — a
  patient-supplied document must never silently become part of the legal record.
- Audited through `PortalAudit` like every other portal action.

## M12 — Insurance self-service — **DONE**

Shipped: schema 336, seed 070, `PortalInsuranceService`, five endpoints, the
"Insurance Requests" desk queue, and `MyChartInsuranceModal` with a dashboard tile.
51 tests.

The principle comes from e-check-in, which already said it: a patient never edits
the insurance record — the desk does that with the card in hand. e-Check-in could
only capture "something changed" as one sentence on one appointment inside the 48
hours before it. This gives the same idea standing at any time: a request carrying
the proposed values, which the desk applies or declines. Nothing writes
`patient_insurances` except an apply, inside a transaction.

Worth keeping in mind:

- **Reading cover is separate from requesting changes.** `portal_allow_insurance_requests`
  switches the requests off while a patient can still see what will be billed; the
  capability `mychart_insurance` gates the whole area.
- **An apply needs a real payer.** A request naming an insurer only in free text
  (`insurer_name_text`, for the HMO that is not in the list) is refused at apply
  time with an explanation, rather than guessed at. The desk adds the insurer
  first, or enters the cover by hand and declines with a note.
- **The desk sees current beside proposed**, field by field, because a changed
  digit in a policy number is invisible otherwise.
- **`portal_insurance_max_pending`** (3) stops a patient stacking requests while
  the first is still waiting.
- The card photograph rides on M11 (`upload_id`, validated as that patient's own
  `insurance_card`), so that part of the flow waits on M11's picker and the
  1 December rebuild. Everything else works without it.

---

## M12 (original plan) — Insurance self-service

**Size: M. Needs M11.**

`PatientInsurances` exists staff-side and insurance appears inside e-check-in, but
outside that window a patient cannot see or correct their own coverage. For
PhilHealth and HMO workflows this is a large share of front-desk time.

- View current coverage and its status.
- Submit or replace a card photo (via M11) and request a change to member details.
- A change request is a request, not a write: staff accept it into `patient_insurances`.

## M13 — Questionnaires between visits — **DONE**

Shipped: schema 337, seeds 071–073, `PortalQuestionnaireService`, ten endpoints, the
"Questionnaires" desk screen, `MyChartQuestionnairesModal` with a dashboard tile, and
a new To-Do item kind. 139 tests.

A clinician picks a questionnaire, a patient and a due date; it lands in the patient's
To-Do list and they are notified; they answer it at home; the answers come back to the
people looking after them. Two kinds go out, and the difference is the whole design:

- **Unscored** — the four follow-up questionnaires seeded by 072 (after an operation,
  after going home from a ward, a new medicine, how this week has been). Read as words.
- **Scored** — PHQ-9 and GAD-7. Their questions and their bands come from `Phq9Service`
  and `Gad7Service`, the same code the clinical screens use, so a home score and an
  in-visit score can never be computed two different ways. Nothing is duplicated as JSON.

Worth keeping in mind:

- **PHQ-9 item 9 escalates on its own.** A patient can answer "nearly every day" to
  thoughts of being better off dead and still total under 15. A threshold on the total
  would swallow exactly that case, so item 9 positive is `critical` whatever the total;
  a total of 15 or more is `urgent`. Both go out through `AlertService::raise()` to the
  care team resolved by `PortalSelfReadingService::careTeamTargets()` — the same path a
  nurse keying the score in would take, not a new one.
- **The patient is never shown a score.** `mine()` returns no `total_score` and no
  `severity`, and a test asserts it. After submitting they are told their team can see
  it, and — when it crossed — that the team was told today. A number somebody cannot
  interpret, with nobody there to interpret it, at the moment they are least able to,
  is worse than no number.
- **The home score does not go into `encounter_phq9`.** That table is `encounter_id NOT
  NULL`, foreign-keyed to `encounters`, one row per encounter. Attaching a home answer
  to the encounter it followed from would overwrite what the clinician keyed in at that
  visit; inventing an encounter would put a visit in the record that never happened. So
  the score is authoritative on the assignment row, and `scoreHistory()` merges in-visit
  and at-home scores into one timeline, each row labelled with where it came from. The
  schema 337 header states this at length because it is the one thing a later reader
  will assume was an oversight.
- **`portal_questionnaires.use_context`** keeps the two catalogues apart. It defaults to
  `checkin`, so every questionnaire that existed before this change stays an e-check-in
  questionnaire, and `PortalCheckinService::questionnaireFor()` now filters on it —
  three of the four follow-up questionnaires also have `specialty` NULL, so without the
  filter the general fallback could have handed a patient "After your operation" at
  check-in.
- **`portal_questionnaire_grace_days`** (14) keeps a questionnaire answerable after its
  due date. A patient who answers two days late should still be heard; the alternative
  is a dead link and a phone call. Whether an answer can still be sent is decided
  server-side and comes down as `can_answer` plus a `status_text`, so the app never
  offers a button the server would refuse.
- **A second send of the same questionnaire while the first is unanswered is refused**
  as a duplicate rather than written. Two identical rows in a To-Do list read as a
  mistake the patient has to resolve.
- **`GET /portal-questionnaires/patients`** exists because `GET /patients` answers
  admin, receptionist and doctor only, while a nurse and a clinician may send a
  questionnaire. It returns at most twenty rows and only after two characters, rather
  than widening that route and handing the whole patient list to roles with no other
  reason to hold it.

Not done, and deliberately: **no recurrence**. A symptom diary every week means a
scheduler, and there is no cron runner in this project — a clinician sends the next one.
Worth revisiting if the four seeded questionnaires get used.

The 45 diagnosis guides already wanted a clinician's read; these four questionnaires
want the same before they go out to real patients.

---

## M13 (original plan) — Questionnaires between visits

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

## M14 — Health maintenance and preventive care — **DONE**

Shipped: schema 338, seeds 074–075, `PortalHealthMaintenanceService`, seven endpoints, the
"Health Maintenance" desk screen with its items tab, `MyChartHealthMaintenanceModal` with a
dashboard tile, and the To-Do list rewired through the same service. 137 tests.

The engine was already there — `practice_rules` decides who should be reminded,
`patient_reminders` records that someone is due, `patient_reminder_actions` records staff
having dealt with it. None of it could be shown to a patient, for three reasons that took
longer to find than the feature took to build:

1. **There was no recurrence interval anywhere.** `practice_rules.reminder_intervals`
   holds only warning and past-due *offsets*, and every seeded rule carries the same
   "2 Week / 1 Month" placeholder. Nothing said a Pap smear is due every three years, so
   there was no next-due date to show. `portal_health_maintenance_items.recurrence_val`
   is that number.
2. **`item_label` is clinical text.** It comes from `actions_list[0].category_title`, so
   the To-Do list was literally saying "Assessment - Pap Smear is due". Same lesson as the
   M9 diagnosis guides.
3. **Seven of the thirteen seeded rules have no demographic criteria at all**, and
   `matchesDemographics([])` returns true for everybody. So every patient in this database
   already carries reminders for four diabetes items, Coumadin INR monitoring, a penicillin
   allergy assessment and a social security number. "Show patients their reminders" would
   have told a healthy twenty-year-old to book a diabetic eye exam.

Worth keeping in mind:

- **Three switches, all required.** An item reaches a patient only when the rule's own
  `is_patient_reminder` is on (the hospital's existing master switch), the item's
  `is_patient_visible` is on (the patient wording has been written), and `needs_condition`
  is off. They are in one WHERE clause, so there is no code path that returns an
  unapproved item. The desk screen shows all three side by side and states plainly whether
  an item reaches patients, because three switches are easy to get wrong one at a time.
  `saveItem()` refuses to switch on anything still marked `needs_condition`.
- **Seed 074 records a decision for every rule, including the ones left off**, with the
  reason in `condition_note`. Five are shown: mammogram, cervical screening, prostate
  check, blood pressure, flu vaccine — the ones where age and sex genuinely do decide.
  Bowel screening is seeded ready but its rule is typed `Passive Alert`, so the engine
  creates no reminders for it; changing the type is all that is needed.
- **Nothing is inferred from lab or imaging orders.** Matching "Cancer Screening: Pap
  Smear" to an order name is a guess, and a guess in the direction of "you are up to date"
  is the dangerous direction. Evidence is a completed `patient_reminder_actions` row. Where
  there is none, the panel says "we have no record of you having this" rather than showing
  nothing, because a quiet panel reads as reassurance.
- **The next-due date is computed on read, never stored.** `patient_reminders.due_status`
  already demonstrates what a stored derived value does between runs.
- **"I had this done elsewhere" is a claim, not a fact.** It stays showing as due until the
  desk accepts it, and the app says so. Accepting writes through
  `PatientReminderService::addAction()` — the module's own way of closing a reminder — so
  there stays one path by which an item is satisfied, whether a nurse logged it or a
  patient reported it.
- **"Please arrange this" is a request, not a booking.** M10 deliberately gave patients
  reschedule, cancel and confirm but not the power to create an appointment, and M14 does
  not quietly add it. Accepting records that the desk took it on; the booking happens on
  the appointments screen. This is the one place M14 falls short of the original plan's
  "ends in a booked appointment rather than a note" — patient-facing booking is its own
  phase, and worth naming as one.
- **A bug this turn's tests found in M13 as well.** `strtotime('2027-02-30')` does not
  fail — it rolls forward to 2 March. Both services now require a plain `Y-m-d` to be a
  day that exists. The M13 test that supposedly covered this had been passing for the
  wrong reason: its impossible date rolled into the past and tripped the past-date check
  instead, so the calendar was never consulted.
- **Everything reads as overdue in this database**, because no completion has ever been
  recorded against any reminder and the engine's own `due_status` flips to `past_due` once
  a row is older than its placeholder month. That is accurate rather than alarming — but
  it means the panel will look bleak until real completions exist, and the first thing a
  clinic should do is log what it has already done.

Still wanted, and now cheap: a real condition check (`patient_medical_problems`, coded
diagnoses) would let the five `needs_condition` items come on, and those rows already carry
their wording.

---

## M14 (original plan) — Health maintenance and preventive care

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

**~~M10~~ → ~~M11~~ → ~~M12~~ → ~~M13~~ → ~~M14~~ → ~~M9.5~~ → M16 → M15 → M17 → M18**

M9.5 is done: the capability backfill turned out to have landed already, M9 is
labelled, and the write paths have a disposable database to run against. What remains of
it is the clinician sign-off on seeded wording, which no amount of code will settle. M11 unlocks M12 and the medical
certificate work. M15 sits late despite being the most valuable, because starting it
before the decisions are made means building the wrong thing; if an asynchronous e-visit
is acceptable, bring that part forward to sit beside M13. M18 only makes sense after M10
has been live long enough to produce cancellations.
