# My Chart: phases

Where the patient portal stands, and the phases left to reach parity with the parts of
Epic MyChart that matter for this hospital.

The numbering continues the `Phase M<n>` labels already in the code. Sizes are relative,
not estimates in days: **S** is a route plus a screen over tables that already exist,
**M** is new tables and a staff-side screen as well, **L** needs a decision or a vendor
before any code is written.

---

## Shipped (M0–M18)

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
| **M16** | What planned care costs — priced packages, and written estimates that hold | `PortalCostEstimateService`, schema 339 |
| **M15a** | Ask a doctor in writing — e-visits, screened for red flags, answered into a real encounter (ships OFF) | `PortalEvisitService`, schema 340 |
| **M17a** | Readings from a health app or device, deduplicated, without paging anybody about history | `PortalReadingImportService`, schema 341 |
| **M18** | Fast Pass — a freed slot offered to somebody who already holds a later appointment | `PortalFastPassService`, schema 342 |

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
Pass). It needed a waitlist table and a notification path, so it became its own phase —
**M18, now done.** M10's cut-off deliberately does not apply there; see that section for
why reusing it would have gutted the feature.

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

## M15a — Asynchronous e-visits — **DONE** (15 November 2026, switched OFF)

A patient picks what is wrong, answers a structured questionnaire, and a clinician reads
it and replies in writing. The reply creates a real encounter. No video.

Schema 340 (`portal_evisits`, `portal_evisit_messages`, `portal_evisit_reasons`, plus
`'evisit'` added to `portal_questionnaires.use_context`), seeds 079–082,
`PortalEvisitService`, fifteen endpoints, the Online Visits queue, and the mobile
"Ask a Doctor" panel. 177 tests.

**It ships switched off.** `portal_allow_evisits` defaults to 0 — the only My Chart
feature that does. Everything else shows a patient their own data; this one puts clinical
triage in front of them, and the questionnaires below need a clinician's signature before
anybody can reach them. Granting the capability (seed 081) does not make it live.

### Why this and not video

M15 as planned is video visits, blocked on decisions nobody has made: which provider,
what happens on a dropped call, how it is billed, what bandwidth patients have. The
plan's own third bullet said to consider the asynchronous e-visit first because it reuses
M13, needs no video stack, and covers much of the demand. That is what this is.

Nothing here gets in the way of video later: a video visit is an appointment of a new
visit type and M10's reschedule and cancel apply to it unchanged.

### The one property that matters

The dangerous failure is not a missed diagnosis. It is a patient typing "crushing chest
pain" into a form, reading *"thank you, a doctor will reply"*, and waiting at home.

So every e-visit questionnaire opens with the same six screening questions — cardiac
chest pain, respiratory failure, stroke, uncontrolled bleeding, altered consciousness,
suicidal ideation — each carrying a `red_flag` object naming the answers that trip it and
the sentence the patient is shown. A tripped flag **refuses the submission** before
anything exists that a clinician could pick up:

- status is `refused` and the row is in no queue;
- `due_by` is NULL, so it can never later read as overdue;
- the patient's own list does not show it and they cannot open it;
- it does not count against their open-visit limit;
- the refusal screen takes over the whole sheet, offers no "try again", and says in
  plain words: go now, **do not wait for a reply**, nobody is reading this, and no online
  visit has been opened for you.

Sixteen assertions cover that refusal, including that the wording never promises contact.

**The refusal is still recorded**, because a patient who was turned away and then did not
go to hospital is exactly the case somebody needs to find afterwards. An alert goes to the
care team saying the e-visit was refused, is in no queue, and that the patient was *not*
told anyone would contact them. The alert is a record and a chance, never a promise.

Screening is server-side and the device is never told what trips a flag — a test asserts
the form payload contains no `red_flag` or `because` key, because a client that knew the
triggers could be made to route around them. Comparison is case- and
whitespace-insensitive for the same reason, and `choice` answers must be one of the
offered options, so a crafted request cannot answer a screening question with a value
that matches no trigger.

The safety questions are also asked on their own first step in the app, so somebody who
has to be turned away is turned away before typing out a history nobody will read.

### The clinical record goes through the normal encounter path

The plan is explicit that a parallel telehealth record would be a second source of truth.
So `reply()` calls `EncounterService::store()` and keeps the encounter id on the e-visit.
The note, any orders and any billing hang off a normal encounter, found by the normal
screens, under a visit category of its own: **"e-Visit (online, no examination)"** — named
that way so anybody reading the chart later understands why there are no observations.

If that category is missing the reply is **refused** rather than filed under something
else. An encounter in the wrong category is worse than one not yet written, because nobody
will know to look for it.

### Two bugs the tests caught

- **Replying to a follow-up created a second encounter.** `COALESCE(encounter_id, …)`
  kept the first id on the e-visit, so the new one was left orphaned in the patient
  record, attached to nothing. Now one encounter per e-visit; a follow-up reply reuses it.
- **`date_of_service` came from PHP's clock** while every other column used MySQL's
  `NOW()`. The two were seven hours apart here, so the encounter was stamped well away
  from the reply that created it. Both now use the database clock, and a test asserts the
  drift is under two minutes.

### Other decisions

- **No prescribing.** There is deliberately no `prescribed` outcome, and the patient is
  told not to stop or change a medicine while waiting. A prescription from a questionnaire
  with no examination is a clinical governance decision, not a schema one.
- **No triage.** The queue is ordered by how long somebody has waited against the
  hospital's own promise (`portal_evisit_reply_hours`, 24) and by nothing else. Sorting by
  a computed severity would be code deciding who is sickest from a questionnaire.
- **Overdue is said out loud.** A patient past the promise is told it has waited longer
  than aimed for and to call the clinic — not shown a reassurance that has stopped being
  true. The queue counts and flags them too.
- **One open visit at a time** (`portal_evisit_max_open`, 1). A patient with four open
  consultations about four problems is a patient who should be seen.
- **One follow-up, inside a window** (`portal_evisit_followup_days`, 7). It re-enters the
  queue with a fresh deadline, because a follow-up nobody is measured against waits for
  ever. `answered_at` stays on the first reply, so the window cannot be extended by
  replying again.
- **Claiming is advisory, not a lock.** The update only succeeds when nobody holds it, but
  nothing stops a second clinician replying. A hard lock on clinical work goes wrong the
  first time somebody goes home with a case claimed.
- **A reason cannot be published without screening.** `saveReason()` refuses to set
  `is_patient_visible` when the questionnaire behind it has no red-flag questions. That is
  the one way this design fails quietly, so it is enforced rather than documented.
- **The notification carries no clinical content at all** — not the reply, not the
  complaint, not the outcome. An e-visit about a water infection says something about the
  patient, and a notification is read by whoever picks the phone up. There is deliberately
  no notification for a refused e-visit: following "go to hospital now" with an email
  would imply there is something to come back and read.
- **M5 and M13 are untouched.** The new `use_context` value works because M13 added
  explicit filters to both the e-check-in resolution and the follow-up catalogue; tests
  assert both still see exactly 5 and 4 questionnaires.

### Still open

- **NEEDS CLINICAL SIGN-OFF before `portal_allow_evisits` is switched on.** Specifically:
  the six red-flag questions and their wording; the four complaint questionnaires; and the
  four accepted reasons with their "not for this" text. This is not a formality — the
  red-flag list is the whole safety case.
- **Video is still unbuilt**, and still needs the four decisions above before it should
  be. If the e-visit covers enough of the demand, that is worth knowing before committing
  to a video provider.
- **No clinician-initiated e-visit.** A clinician cannot start one to follow something up;
  M13's questionnaires cover part of that need.
- **Nothing rate-limits a patient across time.** One open visit at a time is enforced, but
  somebody could raise one a day indefinitely. Worth watching once it is live rather than
  guessing a limit now.

---

## M15b — Video visits — still to do

**Size: L. Still blocked on decisions, not on code.**

M15a (above) shipped the asynchronous half. What is left is video, and it is left because
the same four questions are still unanswered: which video provider, what happens on a
dropped call, how the consultation is billed, and what bandwidth patients actually have.

- A video visit is an appointment of a new visit type, so M10's reschedule and cancel
  apply to it unchanged. Nothing in M15a gets in the way.
- The clinical note, orders and billing must go through the normal encounter path, the
  way M15a's replies already do. A parallel telehealth record would be a second source of
  truth.
- Worth asking before committing to a provider: how much of the demand M15a actually
  absorbs. If written replies cover most of it, the video decision gets easier and
  cheaper.

---

## M16 — Cost estimates — **DONE** (15 November 2026)

A patient can browse the hospital's priced packages, ask the billing desk what
something will cost, and read the written estimate they are issued. The desk answers
from a queue, and every figure is copied onto the estimate at the moment it is issued.

Schema 339 (`portal_cost_estimates`, `portal_cost_estimate_lines`,
`portal_estimate_requests`, `portal_package_visibility`), seeds 076–078,
`PortalCostEstimateService`, twelve endpoints, the Cost Estimates desk screen, and the
mobile Costs panel. 131 tests.

### The plan asked for a tariff version. There isn't one.

"Must read as an estimate and record the tariff version it was produced from" — there is
no tariff version in this database to record. In `billing_tariff_master`,
`effective_start_date` and `effective_end_date` are NULL on all 17 rows and every row
shares one `updated_at`. `billing_tariff_counters` sounds like it versions tariffs and
does not: it is the document numbering table (`ATTENDANCE_LOG`, `BIOMED_CAL`,
`CSSD_BATCH`…).

So an estimate **snapshots** instead. Prices, currency, inclusions prose and a SHA-256
fingerprint of the source rows are copied onto the estimate row and its lines. That
gives what a version number would have been used for:

- re-reading an estimate shows what the patient was told, not today's price list;
- `isStale()` compares a fresh fingerprint against the stored one, so the desk can see
  that a package has been repriced since an estimate went out.

Asserted directly, because the phase rests on it: repricing the package leaves the
patient's figure and lines unchanged, and flips the estimate to stale.

The currency is snapshotted for the same reason, and the service formats money from the
snapshot rather than from `business_settings`. An estimate issued in one currency must
not silently re-read as another.

### The package itemisation does not add up, and is not shown when it doesn't

Of the four packages on file, exactly one reconciles:

| Package | Items total | Standard | Discounted | Verdict |
| --- | --- | --- | --- | --- |
| PKG-MAT-001 | 24,500 | 28,000 | **24,500** | reconciles against the discounted price |
| PKG-SUR-001 | 50,350 | 65,000 | 58,000 | short by 7,650 |
| PKG-EXC-001 | 9,950 | 12,500 | 9,999 | short by 49 |
| PKG-MAT-002 | **no items at all** | 48,000 | 42,000 | nothing to show |

A breakdown that does not sum to the total above it is worse than no breakdown: it
invites the patient to ask why the hospital's own list disagrees with the hospital's own
price, and there is no good answer. So `reconcile()` decides before anything is copied,
trying both candidate line totals (`covered_amount`, and `quantity × unit_price`) against
the price basis being quoted, and matching to the cent. **Nothing is scaled, apportioned
or rounded into place** — a breakdown that had to be massaged to fit is not a breakdown,
and a test asserts that the 100-short fixture still fails.

Where it does not reconcile the patient sees the bundle price and the written inclusions
and exclusions, which are sound on all four packages and are the genuinely useful part.

**The diagnostic is for the desk only.** The stored note says "the itemised list comes to
17900.00 against a discounted price of 18000.00, a difference of 100.00". That is written
for somebody who can fix the data; handing it to a patient would tell them the hospital
cannot add up, in raw unformatted figures. The patient is told the package is priced as
one bundle. Three tests pin that split, including one asserting no raw figure leaks.

### `billing_package_items.item_code` looks like a tariff code and is not one

`tariff_id` is NULL on all 14 package item rows, and the codes collide with real tariff
codes while naming something else entirely:

```
package 1   TAR-CNS-001   "Attending Obstetrician Delivery Care"    9,000
tariff      TAR-CNS-001   "General Physician / OPD Consultation"      500
```

Joining those would show a patient the wrong service at the wrong price. Nothing in this
phase joins package items to the tariff master, and the lines table keeps its own
snapshotted label and price so it never needs to.

### Other decisions worth keeping

- **Both prices are published, labelled.** Every package carries a standard and a
  discounted price differing by thousands, and which applies is a billing decision. The
  catalogue shows both; `price_basis` is recorded on the estimate; the issue form shows
  the arithmetic for each basis so the choice is made with it visible.
- **Surcharges are not applied.** Tariff rows carry emergency (20–35%), night (15–25%)
  and holiday (20–50%) percentages. Planned care is priced at the standard rate and the
  patient is told in words that out-of-hours care costs more — the usual reason a bill
  exceeds an estimate.
- **Tax is honoured, not assumed.** Every tariff and package row currently has
  `taxability_flag = 0`, so tax is 0.00 today; `business_settings` carries a 12% VAT rate
  that would apply if that changed.
- **Nothing is inferred about insurance.** The estimate records whether cover is on file
  at the moment of issue and says the full price is what is quoted, because whether an
  insurer pays is the insurer's decision. Both branches are tested, including that an
  estimate issued before a card was added does not start claiming cover afterwards.
- **An estimate expires.** `portal_estimate_valid_days` (30) sets the window, computed on
  read so nothing needs a nightly job. An expired estimate is still shown, marked, because
  a patient should be able to see what they were quoted and that it has lapsed.
- **A withdrawn estimate is kept.** A patient may have planned around a figure, and "we
  told you 58,000 on the 4th and withdrew it on the 9th" has to be answerable.
- **Declining needs a reason.** "We cannot price this until your surgeon decides" is a
  real answer and the patient needs to know that is what happened.
- **Estimate numbers are the portal's own** (`EST-2026-0001`), not borrowed from
  `billing_tariff_counters` — quietly taking a `counter_type` from the hospital's document
  numbering would put portal rows in a sequence the billing office believes it owns.
- **The notification carries no figure.** A money amount in an email or SMS is read by
  whoever picks up the phone, and an estimate for a caesarean says something about the
  patient before they chose to share it. The message says the estimate is ready; the
  number lives behind the login.

### Still open

- **NEEDS SIGN-OFF from a billing lead** on the four patient-facing package labels and
  blurbs in seed 076, and in particular on whether publishing both the standard and the
  discounted price is intended.
- **The itemisation of three packages should be corrected** so a patient can see a
  breakdown. The desk screen prints the arithmetic for exactly this purpose. PKG-MAT-002
  having a 48,000 price and no line items at all is the most worth fixing.
- **Itemised estimates are not built yet.** `source_type` allows `itemised` and the schema
  supports lines with no package, but there is no desk form for composing one from tariff
  rows — so anything without a package gets a declined request rather than a figure. That
  is the obvious next increment and it needs the tariff surcharge rules thought through,
  since a one-off estimate is where "is this elective or emergency?" actually bites.

---

## M17a — Importing readings from a device — **DONE** (16 November 2026)

Track My Health (M7) was manual entry only, and typing a blood pressure every day does
not last. This is the server side of importing: a batch endpoint with deduplication,
per-reading plausibility checks, provenance a clinician can read, and a rule about when
an imported reading may page somebody.

Schema 341 (`portal_reading_imports`, plus `source_app`, `device_name`, `external_id`,
`dedupe_hash` and `import_id` on `patient_self_readings`), seeds 083–084,
`PortalReadingImportService`, seven endpoints, the Imported Readings desk screen with a
paste-in form, and provenance on the patient's own log. 114 tests.

### What is and is not here

M17 as planned needs native modules on both platforms (Apple HealthKit, Google Fit) to
read the phone's health store. Those cannot be compiled until the Expo build quota
resets, which also still blocks M11's picker. **That is M17b and remains outstanding.**

What is here is the contract that bridge will call — `POST /mychart/readings/import` —
which is the hard part and is fully testable without it. The same service backs a staff
screen that takes pasted readings, so a clinic can load a patient's figures today rather
than after the quota resets.

`source` already existed on `patient_self_readings` as `enum('patient','device')` from
M7, which answers a clinician's first question: did a human type this, or did a machine
produce it. It did not answer the second — *which* machine — so `source_app` and
`device_name` were added, and M7's own reader now carries both through to the patient's
log and the clinician's chart panel.

### An import must not page anybody about history

This is the whole reason import does not simply loop over
`PortalSelfReadingService::record()`.

`record()` raises one urgent care-team alert per out-of-band reading, with no
deduplication. That is correct for somebody typing in a reading they just took. Applied
to a phone handing over three months of blood pressure it would have raised **dozens of
urgent alerts about readings from six weeks ago** and buried the one that mattered.

So:

- every out-of-band reading is still flagged, so nothing is hidden from the chart;
- only readings taken within `portal_import_alert_hours` (24) can raise an alert at all;
- and those produce **one** alert for the whole batch, naming the most recent.

Verified directly: eleven out-of-band historical readings raise **zero** alerts; one
recent reading raises exactly one; a mixed batch of eight raises exactly one. The alert
body says so out loud —

> 4 further readings in this import were outside the band but older than 24 hours. They
> are flagged on the chart and deliberately did not raise an alert — importing history
> must not page anybody about it.

— because a clinician who sees a flagged run and only one alert should know that was a
decision rather than a fault. The import row keeps `flagged_count` and `alertable_count`
separately so the desk screen can show the difference, and setting the window to 0 is
allowed and means "never alert on device data", which is a defensible choice for a
hospital to make.

A bug caught here: the alert originally stamped only the reading it was *named* after,
leaving the other recent out-of-band readings looking as though nobody had been told
about them. It now stamps every reading the alert covers, scoped by the window.

### A re-sync is the normal case, not an error

A health app asked for "everything since January" hands over the same samples every
time. Two keys guard against doubling the chart:

- **`external_id`** — the app's own identifier, which HealthKit and Google Fit both
  provide and which survives the patient editing a note;
- **`dedupe_hash`** — a content hash of measure, minute and values, for sources with no
  identifier. Minute precision rather than second, because a watch re-reporting one
  sample with a different sub-minute stamp would otherwise land twice.

Both are unique per patient and **only ever set on imported rows**, so a patient
recording something by hand is never blocked by them — asserted explicitly, because the
unique indexes would otherwise have quietly broken M7's own entry path.

A duplicate is reported as skipped, not as a failure, and "0 readings saved, 11 already
in your record" is replaced by *"Nothing new — we already had all 11 of these."*

### Time, which is where M15a was bitten

PHP and MySQL are not in the same timezone on every deployment — they are **seven hours
apart on this machine**, which is what stamped an M15a encounter well away from the reply
that created it. M7 compares readings against the database's `NOW()` throughout, so:

- a timestamp carrying an explicit zone (`...Z`, `...+08:00`) names an absolute moment and
  is re-expressed on the database's wall clock, with the offset **measured** rather than
  assumed;
- a naive timestamp (`2026-11-14 08:30`) is taken at face value, because it came from a
  clinic pasting its own figures and shifting it would move every reading by hours.

Tested both ways, including that two spellings of the same moment land identically.

### Other decisions

- **One bad sample must not lose the batch.** Each reading is accepted, skipped as a
  duplicate, or refused with a reason, and the reasons come back line by line. A refused
  reading never reaches the chart — an impossible value stored and then flagged would put
  a fault on the patient's record.
- **The bounds are M7's own `KINDS` bounds**, not a second set that could drift.
- **The paste format is simple and documented**, not an Apple Health export reader. That
  export is hundreds of megabytes of XML and needs a file upload this project cannot do
  yet. A nurse pasting a column of figures a patient read off their monitor is the
  workflow that works today.
- **Parsing never silently drops a line.** A header is only recognised as the *first*
  line with no digits; the first version treated any digit-free line as a header, which
  swallowed a malformed line mid-paste with nothing said about it.
- **The notification is in-app only, not email**, and carries counts rather than values —
  a blood sugar in an email says something about the patient to whoever picks the phone
  up. It is sent only when a staff member loaded the readings; a patient whose own phone
  synced does not need telling they synced, and a daily sync would mean a daily message.

### Still open

- **M17b: the native bridge.** Blocked on the Expo build quota alongside M11's picker.
  When it lands it needs no server change — it posts to the endpoint this phase defines.
- **No file upload path**, for the same reason, so an Apple Health export cannot be
  loaded wholesale.
- **Nothing reconciles a device reading against a clinical one.** If a patient's monitor
  and the clinic's cuff disagree, both sit in the record and a human decides. That is
  probably correct, but it is a decision nobody has written down.

---

## M17b — The native health-store bridge — still to do

**Size: M, and blocked rather than hard.**

M17a shipped the server contract, the dedupe, the alerting rule and a staff paste-in
path. What is left is the phone reading its own health store and posting to
`/mychart/readings/import`, which needs native modules (Apple HealthKit, Google Fit /
Health Connect) that cannot be compiled until the Expo build quota resets -- the same
blocker as M11's picker.

- No server change is needed. The endpoint, the dedupe keys and the alerting rule are
  done and tested; the bridge is a client of them.
- Worth doing in the same rebuild as M11's picker, since both are native additions and
  the APK size should be checked once rather than twice.
- A file-upload path would also unlock loading an Apple Health export wholesale, which
  the paste format deliberately does not attempt.

---

## M18 — Fast Pass — **DONE** (16 November 2026)

M10 made cancelling possible and left the hole in the day to the desk. This fills it:
when a slot comes free it is offered to patients who already hold a later appointment
with the same doctor and have asked to come in sooner, and accepting **moves** the
appointment they already have.

Schema 342 (`portal_fastpass_waitlist`, `portal_fastpass_slots`, `portal_fastpass_offers`,
six settings), seeds 085–086, `PortalFastPassService`, eleven endpoints, the Fast Pass
desk screen with its own queue view, and a "Come in Sooner" screen in the app. 255 tests.

### Moving an appointment, not giving one

This is deliberately not a general waitlist, and that single decision removes most of the
ways the feature could go wrong:

- **the number of appointments never changes**, so nobody ends up with two;
- **no clinical decision is made by this code** — a clinician already agreed who needed
  to be seen, by whom, for how long, when the appointment was booked;
- **accepting is a reschedule**, so it goes through `AppointmentService::update()` and
  gets the same double-booking, roster, capacity and operating-hours checks the desk
  gets, and keeps the same provider (M10's rule: changing doctor is a new booking
  decision, not a reschedule);
- and **a patient who ignores every offer keeps the appointment they had.** The worst
  outcome of the whole feature is that nothing happens.

Nothing offers a slot to somebody with no appointment yet. That needs a clinician to
decide who is waiting for what, and it is a different phase if ever.

### M10's cut-off is the wrong rule here

`portal_appointment_cutoff_hours` (24) stops a patient moving their own appointment at
short notice, which protects the desk from churn it cannot absorb. Applying it to a Fast
Pass offer would have made the feature nearly useless, because **short notice is exactly
when cancellations happen** — a slot freed tomorrow morning is the one worth offering.

The difference is who is asking. A reschedule is the patient changing their mind; a Fast
Pass offer is the hospital asking the patient to come in sooner, about a gap the hospital
would rather not have. So `portal_fastpass_min_lead_hours` (4) takes its place: a slot
closer than that is never offered, because nobody can rearrange a morning in an hour and
offering it only produces a message the patient cannot act on.

A second guard follows from it: an offer's deadline is `min(now + offer_hours,
slot − min_lead)`, so an offer always expires while the slot is still real. If that leaves
under half an hour, nothing is offered at all — an eight-minute window burns the slot's
round for nothing, and the board says it expired unoffered rather than pretending somebody
was asked.

### First come first served, in small rounds

Two obvious designs, both worse:

- **One at a time, cascading.** Kindest, and the slot sits unoffered while an expiry ticks
  down. Four-hour window, five people: a slot freed Monday is still being offered
  Wednesday, by which time it has passed its own lead time and helped nobody.
- **Everyone at once.** Fastest, and tells everybody but one person "sorry, taken". Do
  that a few times and people stop opening the notification, which is the one thing this
  feature cannot survive.

So offers go to `portal_fastpass_offer_batch` (3) patients at a time, in the order they
joined, all with the same deadline. First to accept wins; the rest of that round are
marked `missed` and told another patient took it. A round that passes with nobody
accepting goes to the next three.

The queue order is `joined_at` and nothing else — no scoring, no clinical weighting.
Anything cleverer is a rationing decision, and a rationing decision made in a service
class is one nobody signed off.

### One offer can win, and the slot row decides it

Two patients tapping Accept at the same instant is the one race that matters. It is
settled by a conditional `UPDATE portal_fastpass_slots SET status='taken' … WHERE id=?
AND status='offered'`. Exactly one statement can affect that row; only the winner then
attempts the move.

And if the move fails behind a successful claim — the desk filled the slot by hand a
moment earlier, the roster changed — **the claim is released**, because a slot held by a
move that did not happen is worse than a slot nobody was offered. The suite forces this
rather than hoping about it: an offer is put back to `open` behind an already-claimed slot
and the second accept has to lose cleanly, and a slot is booked by hand between the offer
and the accept so the release path runs.

Availability is re-checked twice — at offer time and again inside the claim — through
`findAvailableSlots()`, which is the same answer the desk's booking screen gets. If it
cannot be determined, the slot is not offered: a wrong "yes" double-books a clinic, a
wrong "no" costs one empty chair.

### A chain, deliberately

Accepting publishes the slot the patient just vacated. That one is a *better* gap than
the one just filled — it is further out, so there is more notice — and it is how one
cancellation can move two people forward.

### Declines and silence are not the same thing

`declines` and `expiries` are counted separately and treated differently:

- an explicit decline is a patient saying "not that one". Three of them
  (`portal_fastpass_max_declines`) and the entry goes dormant, because asking a fourth
  time is pestering. The wording says offers are paused and invites them back;
- **an expiry counts against nothing.** It may only mean they were asleep. It is recorded
  so the desk can see an entry that never answers, and that is all it does;
- a `missed` offer (somebody else accepted) counts against nothing either, and neither
  does a `void` one (the patient left the list, or the appointment changed underneath the
  offer). Four outcomes, four different meanings, because collapsing them would punish
  people for other patients' timing.

Rejoining after dormancy resets `declines` — the patient has just asked again, which is a
clearer signal than three stale refusals. `offers_sent` and `expiries` are kept, because
they are the desk's history and nobody is penalised by them.

### What the patient is and is not shown

- **The live offer renders first, above everything**, with the deadline as a date and time
  and the minutes left. It is the only thing in My Chart with a deadline on it, and a
  patient who has to scroll to find it may miss it.
- **A near miss is not an error.** "Somebody took it" is the expected outcome for everybody
  but one person in each round, so it gets a calm blue card in the same register as a
  success, not a red one.
- **No queue position.** The desk sees it; the patient does not. It moves for reasons that
  have nothing to do with them — somebody ahead leaves, or is offered a slot this patient
  could not have taken anyway — and a number that goes backwards with no explanation is
  worse than no number.
- **The offer never says why the slot came free.** "Someone cancelled" is another patient's
  business, and in a small clinic with one specialist it is identifying.
- The tile says "Come in Sooner" and "if something comes free". Most people on this list
  will never be offered a slot, and a tile that implied otherwise would be the first
  disappointment.

### Notifications

Two types, and they link to different tabs on purpose. `fastpass_offer` links to Fast
Pass, where it can be answered — sending somebody to their appointment list with a
four-hour deadline running would tell them to act and then put them on the wrong screen.
`fastpass_moved` links to the appointment list, because by then the appointment is the
thing they want to look at.

Email is **on**, unlike most portal notifications: an in-app-only message is fine for "your
readings were added", and a four-hour offer found on Thursday is an offer nobody could
take.

SMS is **off**, even though SMS is the right channel for this, because
`PortalNotificationService::SENDABLE` contains `email` only. An SMS row queues and is never
drained — a dormant row for a reminder, a trap for a time-limited offer: the day somebody
wires up a sender, the backlog would deliver a pile of offers for slots that passed months
ago, each reading as though it were live. Two lines to turn on once there is a sender, and
not before. (`appointment_reminder` already defaults SMS on and has the same latent
backlog. Not this phase's to change, but worth knowing before a sender is connected.)

### Where slots come from

Published the moment a patient cancels or moves away from a slot through M10, because the
delay is the whole problem — a slot freed at nine and found at midnight has usually lost
its value. The sweep is the safety net, not the main path: it finds cancellations made at
the desk, bounded to the last week so a first run on an existing database does not publish
a year of dead slots. The staff appointment routes are outside My Chart and are
deliberately untouched by this phase.

Both hooks into M10 swallow their own errors. A cancel that has already succeeded must not
be reported as a failure because Fast Pass could not write a row, and the sweep would have
found it anyway.

### The sweep

`sweep()` is one idempotent pass: settle offers past their deadline, void offers whose
appointment is no longer movable, close slots that have come too close, find the desk's
cancellations, then offer — in that order, so the cancellations found in step four go out
in the same pass. It returns its counts, and the desk screen says them in full rather than
"done", because every one of those numbers is something a patient was or was not told.

Nothing schedules it yet. It is a method and an endpoint; whatever runs the existing portal
cron should call it, and until something does, there is a button. Tested as repeatable: a
second sweep over an unchanged database expires nothing and writes no rows.

### One clock

PHP and MySQL are seven hours apart on this machine. Every datetime compared or stored here
derives from the database's `NOW()`, read once per request and passed down as `$now`; no
path calls PHP's `date()` for a stored or compared value. M15a shipped a bug for exactly
this reason, and the suite asserts that `joined_at` lands on the database's clock rather
than PHP's.

### Two things the tests needed

A **second fixture patient** (`ZZTEST-0002`), built on demand rather than by `world()`, so
suites written before M18 see the database they saw before. Fast Pass cannot be tested with
one patient: who is offered first, what the rest of a round are told, and that one patient's
answer cannot touch another's appointment all need two people.

`test_portal_writes`'s "the fixture patient exists and is the only one" became "every
patient in this database is a fixture patient" — the real guarantee, and one that survives a
second fixture.

### Still open

- **Nothing schedules the sweep.** Offers expire when it is next called rather than on the
  minute. The endpoint is there; the cron entry is not.
- **A slot is matched on provider and time only.** It does not check that the freed
  appointment and the waiting one are the same kind of visit, because `visit_category_id` is
  nullable and mostly null in this database, so a check on it would reject nearly
  everything. The practical guard is the shared provider and the clinic grid's fixed slot
  length.
- **SMS**, as above, once there is a sender.
- **Nobody has watched this run against real cancellations.** The numbers that decide
  whether it earns its place — how many freed slots get filled, how many offers go
  unanswered, whether the four-hour window is right — exist on the board and have no values
  in them yet.

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

**~~M10~~ → ~~M11~~ → ~~M12~~ → ~~M13~~ → ~~M14~~ → ~~M9.5~~ → ~~M16~~ → ~~M15a~~ → ~~M17a~~ → ~~M18~~ → (M11 app + M17b, one rebuild) → M15b**

M9.5 and M16 are done. What remains of M9.5 is the clinician sign-off on seeded wording,
which no amount of code will settle; what remains of M16 is a billing sign-off on the
package labels and a correction to three packages whose itemisation does not add up.
M15a answered that question by being built: the asynchronous e-visit is done and waiting
on a clinician to sign off its red-flag screening. M17a did the same for device readings --
the server contract, the dedupe and the alerting rule are done, and the native bridge is a
client of them.

M18 is done, and it was the last phase that was only work. **Everything still outstanding
is blocked on something that is not code:** the Expo build quota, a vendor decision, or a
clinician's or biller's signature. The two native pieces (M11's picker and M17b's
health-store bridge) should go in one rebuild once the quota resets, so the APK size is
checked once. M15b (video) stays last: not because it matters
least -- it is still the biggest gap against modern MyChart -- but because it is the only
phase whose blocker is a decision rather than work, and because how much demand M15a
absorbs is worth knowing before choosing a provider. M11 unlocks M12 and the medical
certificate work. M15 sits late despite being the most valuable, because starting it
before the decisions are made means building the wrong thing; if an asynchronous e-visit
is acceptable, bring that part forward to sit beside M13.

M18 was said here to only make sense once M10 had been live long enough to produce
cancellations. That turned out to be the wrong way round: the mechanism is what makes a
cancellation worth anything, and waiting for a pile of unused cancellations first would
only have wasted them. What is still true is that **nobody has watched it run against real
ones** — the board counts how many freed slots were filled, and that number is the only
honest verdict on the feature.
