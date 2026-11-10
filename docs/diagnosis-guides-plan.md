# Diagnosis Guides ("Know your diagnosis") for My Chart

> **Status: built, 2026-10-30.** Everything below is implemented except the two items
> listed here. `tests/test_diagnosis_guides.php` covers the matcher, the payload shape,
> the privacy filter and save validation — 41 assertions, all passing against the live
> database.
>
> | Step | State |
> | --- | --- |
> | Schema `333_portal_diagnosis_guides.sql` | applied to the live DB |
> | `PortalDiagnosisGuideService` | done, matcher proven against real text formats |
> | Controller methods + 3 routes | done |
> | Seed `066_seed_diagnosis_guides.sql`, 45 guides | applied, idempotency re-verified |
> | Staff editor tab `portal_diagnosis_guides` | done, with the gap list |
> | Guides attached to AVS / discharge / visits | done, verified on real admissions |
> | `DiagnosisGuideModal` + 3 call sites | done |
> | "My Conditions" dashboard tile + offline fallback | done |
> | **APK rebuild** | **not done** — long gradle build, left for you to trigger |
> | **AVS path against real coded diagnoses** | **not exercised** — `encounter_diagnoses` is empty in this DB, and writing test rows to the shared database was declined. The glue was verified read-only and the matcher is covered by tests. |
>
> Two decisions were changed while building, both because real data contradicted the
> plan; the reasons are recorded at the relevant sections below:
> 1. **Match order is exact code → keyword → category**, not code → category → keyword.
> 2. **All codes are read from a field, not just the first** — `patient_medical_problems.coding`
>    holds several per row.

**Goal.** When a doctor records a diagnosis, the patient app shows, next to that
diagnosis, plain-language knowledge about it: what the condition is, why it happens,
what to watch for, **Do's**, **Don'ts**, and when to come back urgently.

This mirrors a feature the codebase already has and proves: `portal_test_explanations`
(schema 303, `PortalExplanationService`, staff tab `portal_explanations`, rendered in
`MyChartResultsModal`). The same shape is reused here so nothing new has to be invented
for authoring, auditing, or the staff screen.

---

## 1. Where diagnoses already live

Four places a patient can meet a diagnosis today, and all four should get the guide:

| Source | Table / column | Coded? |
| --- | --- | --- |
| After-Visit Summary, "Diagnoses Addressed" | `encounter_diagnoses` (`code`, `description`, `sequence`) | ICD-10, always |
| Health Records → Conditions | `patient_medical_problems` (`title`, `coding`) | free text, `coding` sometimes |
| Discharge Summary | `inpatient_discharge_summaries.admitting_diagnosis` / `.discharge_diagnosis` | free text |
| ER visit row | `er_visits.er_diagnosis` | free text |

Serving code: `PortalVisitService::avs()` (diagnoses query at ~line 303),
`PortalVisitService::dischargeSummary()` (~line 486), and `/health-summary`
(`HealthRecordsService`, `'problems' => ...`).

Mobile rendering: `MyChartVisitsModal.js:199` ("Diagnoses Addressed"),
`MyChartVisitsModal.js:358` (discharge diagnosis), `HealthRecordsModal.js:232`
(Conditions tab).

**Consequence for matching:** the code is present only for encounter diagnoses, and even
then it is granular (`E11.9`, `E11.21`, `E11.65` are all type 2 diabetes). So matching
must be: exact code → code category prefix → keyword on the text. Same reasoning as
schema 303's note about `name` being the key and `code` the optional second way in.

---

## 2. Database

### 2.1 Schema `333_portal_diagnosis_guides.sql`

```sql
CREATE TABLE IF NOT EXISTS `portal_diagnosis_guides` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(150) NOT NULL,          -- "Type 2 diabetes", patient-facing name
    `code` VARCHAR(20) NULL,                -- ICD-10, exact ('E11.9') or category ('E11')
    `keywords` VARCHAR(500) NULL,           -- comma-separated, for free-text diagnoses
    `about` TEXT NULL,                      -- what the condition is
    `why_it_happens` TEXT NULL,             -- causes / how it develops
    `common_symptoms` TEXT NULL,
    `dos` TEXT NULL,                        -- one item per line
    `donts` TEXT NULL,                      -- one item per line
    `when_to_seek_help` TEXT NULL,          -- red flags, one per line
    `source` VARCHAR(150) NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` INT NULL,
    `updated_by` INT NULL,
    UNIQUE KEY `uq_portal_diagnosis_guide` (`title`),
    INDEX `idx_pdg_code` (`code`),
    INDEX `idx_pdg_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Notes on the choices:

- **`title` is the unique key**, not `code` — a nullable `code` would not constrain
  anything in MySQL/MariaDB (the exact point schema 303's header makes), and one guide
  legitimately covers many codes.
- **`dos` / `donts` / `when_to_seek_help` are TEXT, one item per line**, not JSON. The
  admin types into a textarea; the app splits on newline and renders bullets. Matches how
  `encounter_clinical_instruction_items.instructions` is already handled.
- **No FK to `icd10_diagnoses`.** `encounter_diagnoses` deliberately snapshots
  (`code`, `description`) rather than pointing at the catalog; a guide keyed on a code
  string stays consistent with that and survives codes that aren't in the catalog.
- `medical_problems.description` (schema 026) is a one-line staff label, not patient
  prose — it is not a substitute for this table.

### 2.2 Seed `066_seed_diagnosis_guides.sql`

Next seed number is **066** (current max in `backend/database/seed/` is 065).

- `INSERT IGNORE` against `uq_portal_diagnosis_guide (title)` — idempotent, and leaves
  wording the hospital has since edited alone. Same pattern as seed 060.
- Pick the starting set from what patients actually get diagnosed with here, not a
  textbook list:

  ```sql
  SELECT code, description, COUNT(*) c FROM encounter_diagnoses
  WHERE deleted_at IS NULL GROUP BY code, description ORDER BY c DESC LIMIT 60;
  ```

  plus the same over `patient_medical_problems.title`. Seed ~40 guides covering the top
  of both lists. Expect hypertension, type 2 diabetes, UTI, pneumonia, acute
  gastroenteritis, dengue, asthma, COPD, PTB, anemia, dyslipidemia, CKD,
  hypothyroidism, GERD/gastritis, migraine, URTI, animal bite, typhoid, leptospirosis.
- Per CLAUDE.md: apply the seed to the live remote DB from `backend/.env` and
  `SELECT` the rows back. A written-but-unapplied seed is not finished work.

**Wording rules for the seed (and for the admin screen's help text):** second person,
no jargon, never contradicts the doctor, never names a drug or a dose, never says "you
have" or implies a prognosis. Every guide ends up under the standing line *"This is
general information about the condition. Your own treatment is what your doctor told
you — follow that first."*

---

## 3. Backend

### 3.1 `backend/app/Modules/MyChart/Services/PortalDiagnosisGuideService.php`

Modelled directly on `PortalExplanationService`.

```php
public const VIEW_ROLES = ['admin', 'doctor', 'clinician', 'nurse'];
public const EDIT_ROLES = ['admin', 'doctor'];

/** @param array $rows each with 'code' and/or 'description'/'title' */
public static function forDiagnoses(array $rows): array   // keyed by the row's label
public static function listAll(string $q = ''): array     // staff screen + gap list
public static function save(array $data, int $actorId): array
```

`forDiagnoses()` — one query whatever the number of rows, then resolve in PHP in this
order per row:

1. **Exact code** match (normalise: uppercase, trim, keep the dot).
2. **Keyword** — longest `keywords` entry contained in the diagnosis text.
   This is what carries the free-text sources (problem list, discharge, ER).
3. **Category prefix** — the code's first 3 characters (`E11.9` → `E11`) against a guide
   whose `code` is that category.

**Changed from the original plan:** keyword now comes *before* category. Writing the
tests showed why — with category second, `E11.10 "Type 2 diabetes with ketoacidosis"`
resolved through the broad `E11` catch-all before the specific word "ketoacidosis" was
ever considered. The words a clinician wrote are more specific evidence than the ICD
chapter the code falls in, and a category is a catch-all by construction. Two further
notes that the tests pinned down:

- Where a diagnosis names two conditions (`Resolved Acute Bronchitis, Secondary Mild
  Dehydration`) the longest keyword decides. That is a tie-break, **not** clinical
  reasoning. The way to make a specific diagnosis read a specific guide is to author
  that guide against the exact code, which step 1 settles before any guessing.
- Keyword matching normalises punctuation to spaces. Padding keywords with spaces
  alone (to match whole words) failed on `bronchitis,` — the comma meant the word was
  never found.

Rows with no hit are simply absent from the map; the UI then shows no button. Never
guess: a wrong guide on a diagnosis is worse than none.

### 3.2 Attaching to existing payloads

- `PortalVisitService::avs()` — add
  `$out['diagnosis_guides'] = PortalDiagnosisGuideService::forDiagnoses($diagnoses)`,
  exactly as `PortalResultService` adds `explanations` (line ~395).
- `PortalVisitService::dischargeSummary()` — same, over `admitting_diagnosis` and
  `discharge_diagnosis` as free text.
- `PortalVisitService::visits()` — add guides for `er_diagnosis` on ER rows.
- `/health-summary` is a **shared** CCD endpoint (staff read it too) — leave it alone.
  The Conditions tab instead calls the lookup endpoint below with the titles it has.

### 3.3 Routes (`backend/app/Modules/MyChart/routes.php`)

```php
// Patient: the guide for a diagnosis the patient has been given.
$router->post('/mychart/diagnosis-guides', [MyChartController::class, 'diagnosisGuides'], [
    AuthMiddleware::class, [RoleMiddleware::class, ['patient']]
]);

// Staff: the authored guides, under Laboratory/Clinical settings.
$router->get('/portal-diagnosis-guides', [MyChartController::class, 'portalDiagnosisGuides'], [
    AuthMiddleware::class, [RoleMiddleware::class, PortalDiagnosisGuideService::VIEW_ROLES]
]);
$router->post('/portal-diagnosis-guides', [MyChartController::class, 'savePortalDiagnosisGuide'], [
    AuthMiddleware::class, [RoleMiddleware::class, PortalDiagnosisGuideService::EDIT_ROLES]
]);
```

`POST` for the patient lookup because it takes a list of `{code, text}` pairs. It resolves
the patient through `PortalGuard::enter($user, 'Diagnosis Guide Viewed')` like every other
My Chart action, so it takes no `patient_id` — and the view is audited.

**Privacy point worth stating:** the patient endpoint must only return guides for
diagnoses that patient actually has. Otherwise it becomes an open medical dictionary
keyed by ICD-10, which is harmless in content but makes the audit log meaningless. So
`diagnosisGuides()` intersects the requested codes/titles against that patient's own
`encounter_diagnoses` + `patient_medical_problems` + discharge/ER diagnoses before
looking anything up.

### 3.4 Controller (`MyChartController.php`)

Three thin methods next to `explanations()` / `saveExplanation()` (~line 890), using the
existing `$this->success()` / `$this->respond()` helpers and `RoleAccess::inList()` for
the `can_edit` flag.

---

## 4. Patient mobile app

### 4.1 New component `src/components/DiagnosisGuideModal.js`

A bottom-sheet opened from any diagnosis row. Sections, in this order:

1. The diagnosis as the doctor wrote it, with the ICD code small underneath.
2. **Your doctor's instructions for this visit** — only when the encounter has
   `instructions` (already in the AVS payload). The doctor's own words come before any
   general text; the general guide must never look like the authority.
3. **What it is** (`about`), **Why it happens** (`why_it_happens`), **Common signs**.
4. **Do's** — green card, check bullets, from `dos` split on newline.
5. **Don'ts** — amber/red card, cross bullets, from `donts`.
6. **Get help right away if…** — red card, from `when_to_seek_help`.
7. Footer: the standing disclaimer + `source`.
8. "Ask my doctor about this" — reuses the existing `MyChartService.askAboutResult`
   message path pattern (new message type, or the same free-text question endpoint).

Styling follows the existing modals: `StatusBar.currentHeight` top inset (per
`GEMINI.md`), `react-native-svg` icons via `Icons.js`, no new dependency — the APK must
stay ~16 MB and the arch list unchanged.

### 4.2 API client `src/api/mychart.js`

```js
async getDiagnosisGuides(items) {   // [{ code, text }]
  return apiRequest('/mychart/diagnosis-guides', {
    method: 'POST', body: JSON.stringify({ items })
  });
}
```

### 4.3 Wiring

- `MyChartVisitsModal.js:199` — each diagnosis row becomes tappable when
  `avsDetail.diagnosis_guides[d.description]` exists, with a "Learn about this" chip.
- `MyChartVisitsModal.js:358` — same chip on the discharge diagnosis.
- `HealthRecordsModal.js:232` — Conditions tab fetches guides for its titles on tab open
  (one call), then shows the chip per condition.
- Optional, cheap, and the thing patients will actually find: a **"My conditions"** tile
  on `PatientDashboardScreen` that opens the guide list for the patient's active problem
  list directly.

### 4.4 Offline fallback

`src/utils/analyteDictionary.js` already carries `FALLBACK_EXPLANATIONS` for results.
`src/utils/diagnosisDictionary.js` does the same for 8 of the commonest conditions.

**Narrower than the plan first said, deliberately.** The rule is: the fallback is used
only when the *request failed* (no network, server unreachable). It must never be used
when the server answered and simply had no guide, because that answer is a decision —
an admin may have switched a guide off or reworded it, and substituting hard-coded text
would quietly contradict an edit made in the Diagnosis Guides screen and show a patient
something the hospital chose not to show them. In practice that means the fallback only
fires in the Conditions tab, where the problem list can load while the guides call
fails; the AVS and discharge guides travel inside payloads that need the network anyway.

---

## 5. Staff / admin screen

`frontend/src/modules/mychart/portal-diagnosis-guides.js`, copied in structure from
`portal-explanations.js` (195 lines — the whole screen is one file):

- Table of authored guides: title, code/category, keywords, do/don't counts, updated.
- **Gap list** — the diagnoses patients have actually received that no guide matches,
  from `encounter_diagnoses` and `patient_medical_problems`, so the holes are visible.
  This is the equivalent of `listAll()`'s `missing` query in `PortalExplanationService`.
- Edit form: textareas for each section, with the newline-per-item hint on do's/don'ts.
- Registration: a tab branch in `frontend/src/modules/dashboard/dashboard.js` beside
  `portal_explanations` (line 1714), and a sidebar link in
  `frontend/src/modules/dashboard/dashboard.view.js:171`. Visible to doctors read-only,
  editable by admin and doctor.

---

## 6. Order of work

1. Schema 333 + apply to the live DB.
2. `PortalDiagnosisGuideService` (`forDiagnoses` + `listAll` + `save`).
3. Controller methods + routes.
4. Seed 066 from the real top-diagnosis query, applied and verified.
5. Staff screen + tab/sidebar registration — so the wording is editable before patients
   see it.
6. Attach `diagnosis_guides` to AVS, discharge summary, visits.
7. Mobile: API method, `DiagnosisGuideModal`, wire the three call sites.
8. Dashboard "My conditions" tile + offline dictionary.
9. Rebuild the APK with the arch/packaging settings from `GEMINI.md` unchanged; check the
   size is still ~16 MB.

## 7. Things to decide before step 2

- **Who authors the content.** Seeded wording is a starting point only; someone clinical
  has to own it. The table carries `created_by`/`updated_by` and the screen shows
  `source`, which is enough to answer "who wrote this" during a review.
- **Tagalog / second language.** Not in this plan. If it is wanted, it is an extra
  `language` column and a widening of the unique key to `(title, language)` — cheaper to
  decide now than to retrofit.
- **Whether a doctor can attach a guide per patient.** Not needed: per-patient
  instructions already exist as `encounter_clinical_instruction_items` and are shown
  above the general guide. Keep the general/specific split.
