# Patient History & Lifestyle module

Lives inside the **Patient Chart** tab (`PatientChartView` in `frontend/src/modules/patients/patients-list.view.js`), under the **History** item in the chart's left nav (`data-chart-nav="history"`). Clicking it swaps out the normal widget-grid dashboard for a 5-tab panel: **General | Family History | Relatives | Lifestyle | Other**.

This doc exists so a future revision doesn't need to re-derive the architecture from scratch. Read this first, then jump straight to the relevant file.

---

## Where the tab bar itself lives

- **Markup**: `#pdHistoryPanel` inside `PatientChartView()`, `frontend/src/modules/patients/patients-list.view.js`. Contains `#pdHistoryTabs` (the 5 buttons, `data-history-tab="general|family_history|relatives|lifestyle|other"`) and `.pd-history-category` divs (one per tab, toggled via `.active`).
- **Tab switching + panel show/hide**: `setupChartNav()` and `setupHistoryTabs()` in `frontend/src/modules/patients/patients-list.js`. `resetChartNav()` resets both back to Dashboard/General whenever the chart tab is reopened for a (possibly different) patient.
- **Per-tab init calls**: all five `init*(patient.id)` calls happen unconditionally inside `initPatientChartTab()` in `patients-list.js`, right after `setupChartNav()`/`setupHistoryTabs()`. Each tab fetches its own data independently and renders regardless of which sub-tab is currently visible.

## The shared pattern (read this before touching any tab)

Every tab (except Other, see below) follows the same shape:

1. **Backend module** `backend/app/Modules/Patient<X>/` with `Models/`, `Services/`, `Controllers/`, `routes.php`. Table has an audit-column pattern (`created_at/by`, `updated_at/by`), FK to `patients(id)`.
2. **Full-replace-on-save**: the Service's `save()` wraps a `DELETE FROM ... WHERE patient_id = :id` + re-`INSERT` in a transaction. There is no per-row PUT/DELETE endpoint — the whole set for that patient is replaced every time the form is submitted. This matches these being small, closed-set forms (fixed checklists), not open-ended lists.
3. **Backend validates against a fixed key whitelist** (`RISK_FACTOR_KEYS`, `EXAM_KEYS`, `RELATION_KEYS`, `CONDITION_KEYS`, `ITEM_KEYS` — one PHP const array per Service). Anything sent with an unrecognized key is silently dropped, never stored.
4. **Ownership check**: every controller has a private `ownsPatient($user, $patientId)` — admins/receptionists can touch any active patient, doctors only their own assigned patients. Copy-pasted verbatim from `PatientAllergyController` (the original pattern in this codebase).
5. **Frontend module** `frontend/src/modules/patients/patient-<x>.js` + `.service.js`. Exports `init<X>(patientId)`, called once from `initPatientChartTab()`.
6. **View/Edit toggle**: each tab has a `#pd<X>View` (read-only summary) and `#pd<X>Edit` (a `<form>`) that swap `display: none`/`block`. An "Edit" button switches to the form; "Cancel" discards; the form's `submit` handler saves and switches back to View.
7. **Loading state**: `init<X>()` shows a spinner (`.pd-loading-inline` + `.pd-loading-spinner`, defined once in `patients-list.view.js`) and **disables the Edit button** while the initial `fetch` is in flight, before rendering anything else. This isn't cosmetic — see "Gotchas" below for why the naive version was a real bug.
8. **Empty-state text**: `.pd-chart-nav-empty` (italic gray), reused from the sidebar nav's own empty state.

**Exception — Other tab**: it's a single flat record per patient (2 name/value pairs + one text block), not a checklist, so `PatientOtherHistoryService::save()` does upsert (update-if-exists else insert) instead of delete-all-insert-many.

## Per-tab reference

### General — Risk Factors + Exams/Tests
- Backend: `backend/app/Modules/PatientGeneralHistory/` — tables `patient_risk_factors`, `patient_exams`. Routes: `GET`/`PUT /patient-general-history`.
- Frontend: `patient-general-history.js` / `.service.js`.
- Fixed lists live in `patient-general-history.js`: `RISK_FACTORS` (20 items, 2 have `specify: true` which reveals a text input — `contraceptive_complication`, `other`) and `EXAMS` (15 items, each gets a status: `na`/`normal`/`abnormal` + notes). Exam status defaults to `na`; View mode only shows exams that are non-default or have notes.
- Schema: `backend/database/schema/081_patient_general_history.sql`.

### Family History — Father/Mother/Siblings/Spouse/Offspring
- Backend: `backend/app/Modules/PatientFamilyHistory/` — table `patient_family_history`. Routes: `GET`/`PUT /patient-family-history`.
- Frontend: `patient-family-history.js` / `.service.js`. `RELATIONS` const = 5 fixed relations.
- Each relation has a free-text note **and** a diagnosis code, picked via the shared **code picker** (see below). No separate View/Edit toggle here — the grid is always directly editable (unlike the other tabs), matching how the reference screenshots showed it.
- Schema: `backend/database/schema/082_patient_family_history.sql`.

### Relatives — 9-condition checklist
- Backend: `backend/app/Modules/PatientRelativesHistory/` — table `patient_relatives_history`. Routes: `GET`/`PUT /patient-relatives-history`.
- Frontend: `patient-relatives-history.js` / `.service.js`. `CONDITIONS` const = Cancer, Diabetes, Heart Problems, Epilepsy, Suicide, Tuberculosis, High Blood Pressure, Stroke, Mental Illness — each just a free-text note (no status).
- Layout uses CSS `column-count: 2` (`.pd-rel-grid`) to flow 9 items into two columns automatically, rather than manually splitting the array.
- Schema: `backend/database/schema/083_patient_relatives_history.sql`.

### Lifestyle — the complex one
- Backend: `backend/app/Modules/PatientLifestyle/` — table `patient_lifestyle`. Routes: `GET`/`PUT /patient-lifestyle`.
- Frontend: `patient-lifestyle.js` / `.service.js`. `LIFESTYLE_ITEMS` const = 9 items:
  - 7 items (`tobacco`, `coffee`, `alcohol`, `recreational_drugs`, `counseling`, `exercise_patterns`, `hazardous_activities`) get: notes + Status radios (`current`/`quit`+date-input/`never`/`na`).
  - 2 items (`sleep_patterns`, `seatbelt_use`) get: notes only, no status.
  - `tobacco` additionally gets a status **dropdown** (`TOBACCO_STATUS_OPTIONS`, 9 standard smoking-status values) and a **cigarette pack-years** field. Pack-years is the one field that **always** shows in View mode (defaulting to "0") even when nothing else is recorded — matches the original reference screenshot exactly, don't "fix" this into a normal empty-state.
- Schema: `backend/database/schema/084_patient_lifestyle.sql`.

### Other — 2× Name/Value + Additional History
- Backend: `backend/app/Modules/PatientOtherHistory/` — table `patient_other_history` (**single row per patient**, `UNIQUE(patient_id)`). Routes: `GET`/`PUT /patient-other-history`.
- Frontend: `patient-other-history.js` / `.service.js`. Fields: `name_1`/`value_1`, `name_2`/`value_2`, `additional_history` (textarea). No fixed-key whitelist needed since there's no list.
- Schema: `backend/database/schema/085_patient_other_history.sql`.

## Shared code-picker component

`frontend/src/modules/patients/code-picker.js` — a reusable modal (`#codePickerModalOverlay` in `patients-list.view.js`) that searches the **real Codes module** (the "Codes" admin screen under File Management), not a mock or a separate legacy table. Wired directly to `fetchCodes()` from `frontend/src/modules/codes/codes.service.js` and the 9-value `CODE_TYPES` list from `frontend/src/modules/codes/codes.constants.js` (CPT4, HCPCS, CVX, ICD10, LOINC, PHIN_QUESTIONS, NCI_CONCEPT_ID, CQM_VALUESET, OID_VALUESET).

Usage: `openCodePicker({ defaultType: "ICD10", onSelect: ({code, description}) => {...} })`. Currently only used by Family History's diagnosis-code fields, but it's generic — reuse it for any future "pick a code" field rather than building another picker.

Note: there's an **older, separate** code picker already in this file (`scm*` — "Select Codes Modal", `#selectCodesModalOverlay`) used by allergies/problems/medications/immunizations. It queries three different legacy per-type endpoints (`icd10-diagnoses`, `cvx-codes`, `cqm-valuesets`), not the unified Codes module. Don't confuse the two — `code-picker.js` is the newer one, intentionally built against the real Codes catalog per an explicit ask.

## Gotchas / hard-won lessons

1. **Cache-busting is a whole chain, not one file.** `index.html` → `main.js` (`?v=`) → `router.js` (`?v=`) → `dashboard.js` / `patient-flow.js` (both import `patients-list.view.js` + `patients-list.js`, **independently versioned**) → `patients-list.js` (imports each `patient-*-history.js` module). **Every time you edit a file in this chain, bump that file's own `?v=` wherever it's imported from, all the way up to `index.html`.** Missing a link (this happened twice during development — `main.js`'s import of `router.js`, and `index.html`'s script tag, were both left stale for a while) means the browser can silently keep serving old code even after the source is fixed. If a fix "isn't showing up" and the code looks right, check this chain before anything else.
2. **`renderLoading()` must never touch the container that also holds the Edit button.** The General tab's view has two separate content divs (`#pdGeneralHistoryRiskFactorsView`, `#pdGeneralHistoryExamsView`) that are siblings of the Edit button, so overwriting their `innerHTML` is safe. When Relatives was first built, its loading function targeted the *outer* `#pdRelativesHistoryView` container — which also contained the Edit button — and wiped the button out entirely during every load. Fixed by giving every tab a dedicated inner `#pd<X>HistoryViewContent` div, separate from the button. All 5 tabs now use this shape; keep it that way.
3. **Don't `position: absolute` the Edit button.** The very first version pinned `.pd-gh-edit-btn` to `top: 0; right: 0` inside a `position: relative` wrapper. Fine when content is tall, but when the view is short (e.g. an empty state, one line of text), the container's height is only as tall as that text — the absolutely-positioned button (34px) then overflows past the container's bottom edge. Current fix: the button lives in a normal-flow `.pd-gh-view-header { display: flex; justify-content: flex-end; }` row above the content, so the container always sizes to include it.
4. **`patients-list.view.js` has fully duplicated `<style>` blocks.** `PatientsListView()` and `PatientChartView()` are two separate functions in the same file, each with their own copy-pasted CSS block containing identical selectors (`.pd-chart-nav`, `.pd-widget`, etc.). All the History/Lifestyle CSS only needs to exist in `PatientChartView`'s block. When using the Edit tool to insert CSS near an existing rule, **the rule name alone is not a safe anchor** — it exists twice. Always `grep -c` for the exact string first; if it's not `1`, either add more surrounding context or fall back to a precise line-numbered `sed` insert (verify the target line with `sed -n` immediately before, off-by-one here silently corrupts a rule).
5. **The app's real database is remote, not local XAMPP.** `backend/.env` points `DB_HOST` at a remote MySQL host (Hostinger-style). The local XAMPP MySQL instance is unused by the actual app — don't spend time seeding/checking data there. Schema changes need to be applied directly to the remote DB (`mysql -h<remote-host> ...`) since there's no migration runner in this project; schema files under `backend/database/schema/NNN_*.sql` are numbered but applied manually.
6. **No real login credentials are available in this environment**, and resetting a real user's password to get one is out of bounds (a live shared DB, not a disposable sandbox). The established safe verification pattern for backend logic: write a throwaway PHP script that `require`s `backend/app/Core/Autoload.php` and calls the Service class directly (bypassing HTTP/Session entirely), run it, delete it. For frontend logic that needs a successful API response: mock `window.fetch` for just the endpoint under test inside a `javascript_exec` call, let the real module code run its real path against the mocked response, then restore `window.fetch`.
