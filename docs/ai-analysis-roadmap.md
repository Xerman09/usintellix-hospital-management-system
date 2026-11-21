# AI analytics — the phases

How to build what `docs/ai-analysis-build-list.md` lists. Same shape as
`docs/mychart-roadmap.md`: one phase at a time, each shipping something usable, each
phase's decisions argued where they are not obvious.

Nine phases. The first four need nothing from anybody but an API key. The last three
cannot start until counsel answers.

**Numbering:** AI-1 … AI-9. (`§A0` in `docs/ai-analysis-plan.md` is the provider
decision, not a phase.)

---

## The rule the whole thing rests on

**The server assembles what is sent. The client names a report; it never supplies the
data.**

This is a correction, not a preference. The mock works the other way round today:

```js
// frontend/src/modules/patients/patients.service.js
export async function fetchAiHealthAssessment(patientId, summaryData)
{
    return await api("/ai/health-assessment", {
        method: "POST",
        body: JSON.stringify({ patient_id: patientId, data: summaryData })
    });
}
```

The browser sends the data to be analysed, and `AiAnalysisController` reads it straight
back out of the request body. With a mock that is merely odd. With a real model behind it
the browser would decide what leaves the hospital — and a field allowlist on the server
would be decorative, because the server would be allowlisting data the client chose.

So every endpoint in these phases takes **a report identifier and the report's own
filters**, runs the report's existing service method server-side, projects it through the
allowlist, and sends that. Nothing else is accepted. A request carrying a `data` payload
is rejected, not merged.

---

## AI-1a — The guard rail — **DONE** (21 November 2026)

Built before the thing it guards, at the hospital's request and for the right reason:
every other feature here costs the same whether it runs once or ten thousand times, and
this one bills a third party per call.

Schema 346 (`ai_analysis_runs`, `ai_analysis_cache`, `ai_model_rates`, nine settings),
seeds 090–091, `AiGuardService`, `AiPayload`, 78 tests. No provider is called by any of
it, and the suite costs nothing to run.

**Three controls, because none of them works alone.** A spend cap stops the month but not
a fast loop, since spend is measured after the fact. Rate limits stop the loop but not
thirty days of steady legitimate use. The response cache removes the commonest cause of
both — the expensive pattern in a reporting tool is not abuse, it is somebody opening the
same unchanged report four times in a morning.

**A cache hit is offered before every limit that exists to control cost.** It is free, so
being told to wait for it would be nonsense, and this is the check most likely to be
broken by a well-meaning reordering — hence the test that says so in capitals.

**The caps are honestly approximate.** Output length is not known before the call, so
spend is checked against what has already been spent and one call can cross a cap rather
than stop exactly at it. `ai_max_output_tokens` bounds that overshoot to the cost of a
single response: cents.

**Refusals are in the ledger too.** A table of only successful calls answers "what did we
spend" and cannot answer "who keeps hitting the cap", "is the cache working" or "when did
this start failing" — which are the questions actually asked when a bill looks wrong.

**An unpriced model is charged at the dearest rate on file**, not at zero, so a model
missing from `ai_model_rates` is caught by a cap rather than slipping under all of them.

**`allow_ai_analysis` defaults to 0.** Unlike almost every switch in this system: the rest
cost nothing when unused. A hospital that upgrades and finds a billing relationship
switched on by a migration has been done a disservice.

**The capability is seeded for `admin` only** — every grant is a standing authority to
spend money, so the seed ships the row to copy rather than the grants to inherit.

### Still open

- Nothing calls the guard yet. AI-1 is what calls it.
- `AiPayload::ALLOWLIST` covers three reports. Each further report adds its own entry,
  which is the deliberate moment somebody looks at the columns.
- Cache purging is a method, not a schedule. It wants a line in `portal_notify.php` or a
  cron of its own once there is traffic to purge.

---
## AI-1 — The spine, and one report through it — **DONE** (21 November 2026)

Shipped with claim-denial-pareto as the single consumer, as planned.
`AiProvider` (the seam), `AnthropicProvider` (the transport), `AiReports` (which reports
exist, how the server builds each, and the system prompt), `AiAnalysisService` (the
seven-step path), three endpoints, a panel on the pareto screen, 77 tests. No provider is
called by the suite, so it costs nothing to run.

### Two deviations from what this section originally said

**It is not built on the official PHP SDK.** That needs Composer, and this project has no
`composer.json`, no `vendor/`, and no composer binary on the machine. Installing it is a
change to how the system is deployed and not a decision to take quietly inside a feature.
So the transport is hand-written behind `AiProvider`, and swapping it for an SDK-backed
class is one file and a line of config. The debt is real and is recorded here rather than
in a commit message: the Mailer is what hand-maintaining a protocol looks like after two
years.

**No structured outputs.** The response shape is asked for in the system prompt and parsed
defensively instead. A first build that cannot be tested against the real API should not
carry a parameter whose exact wire shape is unverified — being wrong there means the first
real call fails on a parameter rather than on something that teaches us anything. Worth
adding the day there is a key to test with.

### A bug the tests caught, worth knowing about

The cache was keyed on the model the response came back carrying, while the lookup used
the model from config. Those are the same string until a server-side fallback answers, or
a platform returns a versioned id — and then the cache writes to one key, reads from
another, and never hits again, with no symptom except a bill that does not fall. Both ends
now use the model that was **requested**; the ledger separately records the one that
actually ran, because that is what the cost must be computed from.

### Also decided here

**`immediate_correction` and `recommended_strategy` are not sent.** Both are static advice
the hospital wrote into `$categoryMeta` and the CARC dictionary. Feeding them to the model
would get them back as findings — an answer that looks like analysis and is a quotation.
If that advice is worth showing, show it as the hospital's, beside the summary.

**The panel never runs on load**, or on a filter change. Only on a click. A report panel
that fills itself whenever somebody opens the screen is the most expensive habit this
feature could acquire.

**A refusal answers 200**, not 4xx. Switched off, over the cap, too soon, provider down —
all ordinary operational answers that belong in front of a person, not in the browser
console.

### Still open

- **Nobody has judged the output.** The ten-saved-outputs step below has not happened,
  because there is no API key yet. Until it does, this is a working pipeline and an
  unproven feature.
- Structured outputs, and the SDK, as above.
- `AiPayload::ALLOWLIST` covers three reports; `AiReports::REPORTS` covers one. AI-3 adds
  the rest.

---

## AI-1 — as originally planned

**Size: M, reduced by AI-1a.** Needs an API key — *not* the HIPAA-ready organisation,
because nothing in this phase sends personal data. The guard rail, the ledger, the field
allowlist and the capability already exist; what is left is the provider client, the
per-report prompt and the panel.

### Getting the key, since this is the only thing AI-1 waits on

1. Sign in at **platform.claude.com** and create an organisation for the hospital — not a
   personal account, because the key, the billing and later the BAA all attach to the
   organisation.
2. Add billing. The API is **prepaid**: you buy credits up front rather than receiving an
   invoice. Set a spend cap while the figures are still guesses.
3. **Settings → API keys → Create key.** It begins `sk-ant-` and is shown **once** — copy
   it then or create another.
4. Put it in `backend/.env` as `ANTHROPIC_API_KEY`, alongside the `MAIL_*` entries. That
   file is gitignored and untracked, which was checked. Add the key *names* with empty
   values to `backend/.env.example` so a fresh deployment knows what it needs.
5. `backend/config/ai.php` reads them through `Env::get()`, exactly as
   `backend/config/mail.php` does. The key is never read anywhere else.

Do **not** use a personal Pro or Max subscription's credits for this. The hospital's
traffic belongs to the hospital's organisation — that is what the BAA will later be
signed against, and mixing them makes that impossible to unpick.

### What it costs to run

Measured rather than guessed, on the real `billing_claim_denials` table: the grouped
payload that would be sent for claim-denial-pareto is **1,615 characters, about 460
tokens**. With a system prompt and per-report instructions, call it 1,700 tokens in and
600 out.

At Claude Opus 5.5 rates ($4 per million input, $20 per million output) that is **about
two US cents per generation**, and less once prompt caching is reading the stable part of
the prompt at the cache rate.

The useful property is that **an aggregate does not grow with patient volume.** Six
denial categories today; a hospital ten times the size still has a dozen or so. Cost per
report stays roughly flat as the hospital grows, which is not true of anything that sends
rows.

Cheaper models exist in the same API and under the same BAA — Claude Sonnet 5.5 at $2/$10,
Claude Haiku 5.5 at $0.10/$0.50, which would be a fraction of a cent per summary. Whether
the cheaper ones are good enough here is a measurement to take against the ten saved
outputs below, not a default to assume.

Ships the whole path end to end with exactly one consumer: **claim-denial-pareto**,
aggregate figures only. One report, so that everything underneath it is exercised by
something real rather than designed in the abstract.

What lands:

- **`AiAnalysisService`** — the `Services/` layer `AiAnalysis` has never had. Provider
  client, per-report prompt, prompt caching, structured outputs.
- **The field allowlist**, per report, declared in code, plus the test that fails if any
  key outside it reaches the request body. This is the control that makes "no personal
  data left the building" a thing you can demonstrate rather than assert — which is what
  IRR § 50 asks of the hospital as controller.
- **Schema**: `allow_ai_analysis` on `general_settings`, provider configuration, and
  `ai_analysis_runs` — report, user, model, token counts, latency, and a **SHA-256 of the
  exact payload sent**. Without that last column there is no answer to "what did you send
  them" a year from now.
- **A capability and its seed.** `RoleAccess::hasPermission()` treats a missing
  `role_permissions` row as *not granted*, so this is non-optional or the feature is
  silently denied.
- **The panel** on the claim-denial-pareto screen.

### Four decisions worth arguing

**The model never computes.** Every figure in the output must already exist in the input.
That is partly the law — Code Execution is outside the BAA, so the model has no
calculator — and mostly good sense: a model that adds up a column will eventually add it
up wrong, next to the report's own correct total. The prompt says so, and AI-5 adds a
check that enforces it.

**Nothing is persisted into the record.** Output is generated per view and thrown away.
`ai_analysis_runs` records *that* a summary was generated and what was sent, never the
text. A paragraph stored against a patient is a note in the record — discoverable,
disclosable, subject to the amendment right in `Amendments` — and that is a decision
nobody has taken. Until somebody does, it is transient.

**Failure is visible.** If the provider is unreachable, rate-limited or refuses, the panel
says so. It never shows a stale summary and never silently shows nothing. The Mailer spent
two months failing into `error_log` where nobody read it; the same mistake is cheaper to
avoid than to find.

**Ten saved outputs, judged by a person.** Before the panel goes to anyone else, run it
over ten real denial months and have somebody who knows the revenue cycle say whether the
answers are right. Not an eval harness — ten outputs and a verdict. If they are not
useful, the honest conclusion is that this phase is where the project stops, and that is
much cheaper to learn here than at AI-5.

---

## AI-2 — The wildcard audit — **DONE** (21 November 2026)

`scratch/scan_select_star.php`. **84 methods use a wildcard select; 62 of them would
return at least one identifier column.**

### It does not execute anything, and that is the design

The obvious way to learn what a method returns is to call it and look at the keys. The
methods in question include `saveCounts()`, `approve()`, `send()`, `receive()`,
`cancel()`, `deleteImage()` and `releaseQuarantine()`. Calling those to find out what they
select would write to the database, dispatch stock and delete an image.

So the wildcard is resolved statically: find the table the alias belongs to — matching
`SELECT d.*` to the `JOIN … d` rather than to the first table named, which matters in
every multi-table query here — and ask `information_schema` what columns it has. Read-only
against live: `SHOW COLUMNS` and nothing else.

### Two reports were in the wrong tier

- **`ClinicalQualityScorecardService::getDeliveries`** returns `obstetric_deliveries.*`:
  `patient_id`, `patient_name`. A maternity record, listed as Tier 1 because the text scan
  could not see past the wildcard.
- **`NarcoticsVaultService::getMovements`** returns `narcotics_vault_movements.*`:
  `patient_id`. A controlled-drug movement against a named patient.

Both moved to Tier 3 in the build list. Everything else still on Tier 1 exposes only
`created_by` / `updated_by`, which the allowlist strips and a test now names column by
column.

### It also found two allowlist entries that were wrong

`financial_executive_overview` and `ar_aging_matrix` were written from what those reports
sounded like, before their queries had been read. Every field name in both was wrong, so
each would have projected to an empty payload. Deleted rather than corrected: neither
report is wired into `AiReports`, and an allowlist for a report nobody can request is a
wrong decision wearing the costume of a right one. They come back with their reports in
AI-3.

One thing AI-3 inherits from this: `getAgingMatrix` keeps its aging data in a nested
`buckets` map and `project()` drops nested values on purpose, so that report needs
flattening in `AiReports` before an allowlist can describe it at all.

### The distinction worth keeping

A wildcard that exposes nothing today is **not** an allowlist. It is a column list that
happens to be safe, and the next migration can change it without anybody deciding to. That
is the whole argument for `AiPayload` existing alongside this scan rather than instead
of it.

### Still open

- The scan covers the report-bearing modules. Wildcards elsewhere are unexamined, which
  is fine until a report from elsewhere is added.
- A near miss worth not forgetting: `CensusService::sheet` exposes `patient_name` and
  `patient_no`; the Tier 1 entry is `CensusReportService::report`, which is clean. Two
  classes, similar names, very different contents.

---

## AI-2 — as originally planned

**Size: S.** After AI-1.

43 of the 128 methods the scanner called clean use `SELECT *` or `SELECT t.*`, so the
scan could not see what they return. `getClaimDenialParetoAnalytics` was one of them, and
its hidden `SELECT d.* FROM billing_claim_denials` worklist — `patient_id`,
`encounter_id`, `service_date` — is the reason this phase exists rather than being assumed
away.

Run each of the 43, record the keys that actually come back, and turn each into an
allowlist declaration with a test. The scanner in `scratch/scan_report_identifiers.php`
lists them.

This is not throwaway work: the allowlist declarations are what AI-3 and AI-4 consume, and
the tests are the same tests. It is listed as its own phase because it is the step most
likely to be skipped under time pressure, and it is the one that catches the next
worklist.

---

## AI-3 — The rest of Tier 1 financial — **DONE** (21 November 2026)

Five more reports: executive overview, cost-centre margins, monthly trends, the AR aging
matrix and doctor commission metrics. Six registered in all. A shared panel component,
mounted four times. 100 tests in the analysis suite, 91 in the guard suite.

### Every shape was observed, not read off the SQL

AI-2 deleted two allowlist entries written from what a report sounded like. So each of
these five was built by **calling the getter against the test database and reading the
keys that came back**, and the registry says so. Three further Tier 1 financial reports
— sales by item, summary by service code, and services — are deliberately **not** here:
they have no rows in the test database, so their shapes could only have been read off
their SQL, which is the mistake that made AI-2 necessary.

### Three things the registry had to learn

- **A branch that is a nested map.** `getAgingMatrix` keeps its aging inside
  `buckets`, and `project()` drops nested values on purpose — so the one report about
  ageing would have arrived with no ages in it. Reports may now declare a `shape`
  transform, run *before* projection, so the allowlist still names every field that
  leaves. `flattenAgingBuckets` turns the map into `bucket_0_30_balance` and friends.
- **A getter with a different signature.** `getMonthlyTrends(int $limitMonths = 6)`
  takes an int, and handing it a filters array is a TypeError. `args: 'none'` exists
  because of exactly one method, and would have been a runtime crash on first use.
- **A report with no rows.** `getCommissionMetrics` returns a flat map of totals.
  `project()` already normalises a non-list array into a single row, so `branch: null`
  was enough.

### Two branches rejected in favour of better ones

`getExecutiveOverview` offers `ward_yield_rankings` (41 columns of `SELECT *`, including
`id`, `calculated_source` and timestamps) and `ward_class_benchmarks` (13, ward-class
level). `getCostCenterMargins` offers `departments` (33 columns of raw table) and
`cost_center_groups` (10). Neither rejected branch names a patient; both are rows the
model would have to read past to find the figures, and both would cost more to send.

### The test that matters most here

The analysis suite now walks **`AiReports::REPORTS` itself** — not a list written in the
test, which would drift the first time somebody adds a report and forgets — builds each
one against the real database, and asserts no identifying key and no nested structure
survived. A new report is covered by that the moment it is registered.

### A test that had served its purpose

AI-2 asserted the two deleted allowlist entries stayed gone. AI-3 brought both back with
real field names, so that assertion became wrong. It is replaced by the thing it was
actually protecting: the **invented** field names must never come back. One of them,
`net_revenue`, turned out to be a real column on `ward_class_benchmarks` — a guess that
happened to land — so it is excluded from that check rather than asserted against.

### Still open

- Three Tier 1 financial reports await data to observe, as above.
- The shared panel is mounted on the pareto screen and the financial BI dashboard. The
  AR aging and doctor commission screens have registered reports and no panel yet.
- Still nobody has judged an answer. Six reports can now be analysed and none ever has
  been.

---

## AI-3 — as originally planned

**Size: M.** After AI-2.

Executive overview, monthly trends, cost-centre margins, sales by item, summary by service
code, services, the AR aging matrix, doctor commissions.

Same mechanism as AI-1, repeated. The work is per-report prompts and allowlists, not
plumbing. Worth doing before anything clinical for the reason the plan gives: a wrong
answer here is checkable against a known total and nobody is harmed.

**The AR aging matrix is buckets and totals. The per-account list underneath it is Tier 3
and stays out** — the allowlist is what keeps those apart, and this is the first phase
where the two live in the same screen.

---

## AI-4 — Operations, pharmacy, procurement — **DONE** (21 November 2026)

Eleven more reports: daily census, four theatre reports, the narcotics vault, blood
inventory, three procurement reports and stock-count variance. **Seventeen registered in
all.** A tab-aware panel on the theatre reports screen. 151 tests in the analysis suite.

### A near miss, and the permanent check it produced

The candidate probe reads each getter **before calling it** and refuses anything
containing INSERT, UPDATE, DELETE, REPLACE or TRUNCATE. That was not ceremony:

> `NearExpiryQuarantineService::runQuarantineScan` — **WRITES (UPDATE, INSERT)**

It was on the Tier 1 "buildable now" report list in the build list. It reads like a
report. It quarantines stock. Calling it to find out what it returned would have
quarantined inventory in the test database, and registering it would have meant an
analysis panel mutating the database every time somebody clicked it.

Caught by a check in a throwaway probe, which is the wrong place for a check that matters
— so the analysis suite now walks `AiReports::REPORTS`, reads each registered getter's
body and **asserts it does not write**, with `runQuarantineScan` named by name so the
reason survives. Seventeen reports, seventeen assertions, and the eighteenth is written
the moment somebody registers one.

### Everything else was already built

Eleven reports and not one new mechanism. `branch: null` for the flat stat maps
(narcotics, blood), a named `summary` branch for the theatre reports, `context` for the
census period — all of it AI-3's machinery, used as intended. The registry-walking test
from AI-3 picked up all eleven without being touched, which is what it was for.

### Branches rejected

`or_volume` offers `by_surgeon`. The `summary` branch is registered instead: a count of
surgeons rather than a list of them. `pharmacy_dashboard::overview` is **not** registered
at all — its figures live three levels down in nested maps (`low_stock.totals`,
`expiry.buckets`) and it would need a shape transform of its own. Worth doing; not worth
guessing at.

### Still open

- `ErReportService::report` and `LabReportService::report` take two required arguments
  each, and `compute30DayDailyConsumption` takes a drug id — it is a per-drug calculation
  rather than a report. All three skipped rather than guessed at.
- The pharmacy dashboard, procurement reports and stock-count screens have registered
  reports and no panel. Both of those screens re-render their whole body on load, so a
  panel needs to sit outside it, the way the theatre one now does.
- Seventeen reports can be analysed. None ever has been.

---

## AI-4 — as originally planned

**Size: M.** After AI-3.

Census, ER, lab, radiology and OR reports; the pharmacy dashboard; drug inventory, lots,
recalls, near-expiry quarantine, narcotics vault movements, reorder policy consumption;
stock counts; the five procurement reports; blood bank inventory stats.

The largest group by count and the least contentious by content — stock movements and
theatre utilisation name nobody. Expect this phase to be mostly prompt-writing.

**Where "next action" output starts earning its keep**: near-expiry quarantine and reorder
policy are where a ranked list of what to deal with first is worth more than a paragraph.
Still advice to a person, never an action.

---

## AI-5 — Clinical quality — **DONE** (21 November 2026)

Seven reports added, **two already-shipped reports removed**, and one new mechanism: every
numeral in a generated answer is now checked against the payload before anything is
rendered. **Twenty-two reports registered** (24 added minus the 2 withdrawn). 206 tests in
the analysis suite, 91 in the guard suite.

The removals are the more valuable half of this phase.

### Reading the blood inventory quarantines blood

AI-4 ended with a check that no registered report's getter writes to the database, after
`NearExpiryQuarantineService::runQuarantineScan` — which quarantines stock — turned up on
the Tier 1 report list. That check read the getter's own body.

AI-5's candidate probe followed `$this->` calls instead, and found three writers:

| Method | How it writes | State |
|---|---|---|
| `ClinicalQualityAnalyticsService::getSummaryMetrics` | `backfillRange()` → `calculateForDate()` → `INSERT INTO analytics_clinical_quality_daily` | caught before registering |
| `ArAgingService::getAgingMatrix` | `recalculateAgingBuckets()` → `UPDATE billing_ar_accounts` | **registered since AI-3** |
| `BloodInventoryService::getInventoryStats` | `autoQuarantineExpiredUnits()` → `UPDATE blood_inventory_units` | **registered since AI-4** |

So for two phases, clicking Analyse on the AR aging screen re-aged every account, and
clicking it on the blood inventory screen quarantined expired units. The second is the
same failure `runQuarantineScan` was caught for — in the registry, one method call out of
the regex's reach, added in the very phase that introduced the check.

These three services lazily materialise their own derived data when read. For a dashboard
that is sensible. For an analysis button it is disqualifying, and not only on principle:
the "nothing that writes" rule is what keeps this feature outside IRR § 46(b), and a
button that quarantines stock is hard to describe as processing that decides nothing.

Both reports are de-registered. Their allowlists are kept, which is **not** the thing AI-2
warned against — those entries were invented, these were observed and are correct. What is
missing is a read-only path to the same figures, which means splitting the recalculation
out of a getter in three modules that have nothing to do with this feature. That is a
change somebody should make on purpose.

The check in `tests/test_ai_analysis.php` now follows `$this->` calls to a bounded depth,
reports the path rather than the verdict, and is **asserted against `getSummaryMetrics` by
name** — so a refactor that quietly stops following calls fails there rather than silently
clearing the next writer.

### The figures check

`AiFigures` — every numeral in the generated text must appear in the payload that was
sent. It runs after the ledger and before the cache, and both halves of that are
deliberate: after the ledger because the tokens were spent whatever the text says, and a
run that cost money and was then discarded is the most useful thing this ledger can
record; before the cache because storing a failed answer would turn one invented figure
into every future view of that report, served free and therefore for ever.

**The whole answer is discarded, not the offending sentence.** A paragraph with one
invented number in it is not partially trustworthy.

**The hard part was false positives, not the comparison.** A naive version refuses almost
every real answer, because all of this is legitimate text containing numerals that the
payload's *values* do not hold:

- "the 30-day readmission rate" — from the key `readmissions_30d_count`
- "4.1 per 1,000 device-days" — from the key `cauti_rate_per_1000`
- "Level 1 arrivals" — from a label string in the payload
- "1. Readmissions are above target" — a numbered list, not a figure

So the supported set is harvested from the payload's **keys** and its **string values** as
well as its numbers, and ordered-list markers are stripped first. Rounding is allowed
(4.567 supports "4.6" and "5"); conversion is not (0.41 does not support "41%"), because
rounding never changes a value's magnitude. Eighteen tests, and most of them are about
not crying wolf — a check that misfires gets switched off by whoever is on shift.

**What it cannot do, stated as tests rather than left in a comment:**

- It checks **provenance, not meaning**. If 25 is a discharge count and the answer calls
  it a death count, every numeral checks out and the sentence is still wrong. No amount of
  tightening changes that.
- Numbers written as words pass unexamined.
- It says nothing about whether a finding is clinically sound.

**There is no setting to turn it off**, and that is a decision rather than an omission:
nobody has yet seen a single real answer from this system, so any threshold would be a
guess dressed as configuration. The failure direction is safe — a false positive shows no
analysis rather than a wrong one — and the unsupported numerals go back to the caller and
into `ai_analysis_runs.reason`, so a check that misfires shows up as data a person can
read.

It applies to **every** report, not only the clinical ones. A fabricated peso total is the
same defect with a cheaper consequence, and a check that applies to some answers is a
check somebody has to remember.

### The clinical reports, and the ones refused

Built: `clinical_trends` (the daily series), `clinical_safety_scorecard`,
`er_acuity_timeliness`, and four from the statutory annual return — `ahsr_kpis`,
`ahsr_morbidity_top10`, `ahsr_mortality_top10`, `ahsr_surgical_obstetric`.

Two new shape transforms, for two reasons neither of which existed before:

- **`flattenScorecard`** — every one of the scorecard's five branches is a map with maps
  inside it, and `project()` drops nested values, so the unflattened report would have
  sent a reporting period and nothing else: a scorecard with no scores.
- **`pluckAcuityBreakdown`** — `branch` names one key of a result and that is all it can
  do, so a list nested inside a branch needs a transform to reach it at all.

Three things the transform deliberately does not lift, and the third is the one worth
keeping: `label` and `device_name` (static display text), `generated_at` (a timestamp in
the payload changes the hash on every call, so the cache would never hit and every view
would be billed), and **`top_causes` and `top_indications`** — lists of clinical free text
somebody typed. `AiPayload::SCRUB` is empty, and the rule it states is that a free-text
column that has not been through the scrubber does not leave. These are the first reports
to test that rule rather than merely declare it.

**SSI is a count and nothing else**, which is correct rather than missing: a surgical site
infection is not device-associated, so there are no device-days to divide by and the
service returns no rate, benchmark or status for it. The first version of the transform
looped it in with CAUTI, CLABSI and VAP and produced four fields that were always empty —
an allowlist naming fields that never arrive, which is the AI-2 mistake in a smaller key.

`getWardBreakdown` is **deferred, not refused**: it requires `ward_id > 0` and joins
`hospital_wards`, which is empty in the test database, so it returns nothing however much
analytics data is backfilled and its shape could only be read off its SQL. It is the
fourth report held back on those grounds.

### A fixture that had to be written before a test meant anything

`clinical_trends` reads `analytics_clinical_quality_daily` and does **not** create the
days it reports on — that is `getSummaryMetrics`' backfill, which is exactly why
`getSummaryMetrics` is not a report. So the suite materialises the table with the cron's
own `backfillRange` before the registry walk runs, and asserts the rows are there. Without
that, `clinical_trends` would have been checked for leaked identifiers against **zero
rows** and passed for free. A suite reassured by an empty payload is not checking anything.

### Panels

Four, on three screens: the daily series on the clinical quality dashboard (one panel for
four chart tabs, because they are four views of one series), the scorecard and the ER
acuity breakdown on the safety scorecard screen, and the statutory figures on the AHSR
screen.

The clinical quality dashboard's **KPI cards are deliberately not what gets analysed.**
They come from `getSummaryMetrics`. The daily series behind the charts is the same data
without the write.

### Still open

- **The clinical sign-off has not happened.** The wording in the prompts and the panel
  notes is mine. "Infection rate is rising on Ward 3" is a clinical claim however it was
  produced, and this phase was supposed to end with somebody qualified reading the
  phrasing. It cannot happen before there is an answer to read.
- **Still nobody has judged an answer.** Twenty-two reports can be analysed; none ever
  has. This is now the oldest open item in the project and the one the next phase is worth
  the least without.
- One capability, `ai_analysis`, gates every report. The cross-cutting note in this
  document says "a capability per surface"; the implementation has one. Today only admin
  is granted it, so the divergence is theoretical — but a clinician who can analyse
  theatre figures would also be able to analyse the mortality return, and that is a
  decision nobody has taken.
- Three AHSR table reports are registered with no panel: four Analyse buttons on one
  screen is a worse screen. They are reachable through `POST /ai/analyse`.
- `getWardBreakdown` and the three Tier 1 financial reports still await data to observe.

---

## AI-5 — as originally planned

**Size: M, plus a sign-off that is not code.** After AI-4.

`ClinicalQualityAnalyticsService` — summary metrics, trends, ward breakdown — plus the
scorecard deliveries and the AHSR overview. All aggregate; all cleared by the scan; all
confirmed by AI-2.

This is the first phase whose output reaches a clinical audience, so two things are added
rather than assumed:

- **A figures check.** Every number in the generated text must appear in the input that
  was sent. Extract the numerals from the output, compare against the payload, and refuse
  to render if one is invented. The prompt already forbids computing; this is the part
  that notices when it happened anyway.
- **Clinical sign-off on the wording**, exactly as M19's section headings and empty-list
  sentences needed it. "Infection rate is rising on Ward 3" is a clinical claim however it
  was produced.

**What stays out:** incident log, critical TAT, HAI-SSI, readmission-mortality and
surgical-safety *list* reports. They carry `patient_name` and belong to AI-6.

---

## AI-6 — Tier 2: dropping the name columns

**Size: S, plus a decision.** After AI-5.

Eight reports whose only identifier is a single `patient_name` or employee-name column,
carried for display: the five quality and safety lists, two inventory reports, and
`StockLevelService::lowStock`.

Dropping that column from what is *sent* makes each of them Tier 1. The work is trivial.
It is a phase of its own because the decision is not: somebody should say out loud that
these reports are being analysed with the names removed, rather than a column quietly
disappearing from a projection.

**Staff are data subjects too.** The employee-name cases are the same decision in a lower
key, not a lesser one.

---

## AI-7 — The de-identification bridge

**Size: M.** **Blocked on Question 4** of `docs/ai-analysis-legal-brief.md`: is a
de-identified or aggregated dataset outside the DPA's scope?

`DeidentificationService` already implements the 18-identifier Safe Harbor scrub, free-text
scrubbing, pseudonyms, a re-identification vault held back from recipients, and a signed
attestation. It was built for research datasets. This phase routes Tier 3 reports through
it on the way to the allowlist.

Two things to get right:

- **Free text is the hard part, not the columns.** `root_cause_analysis`,
  `assignment_notes` and their kin can hold a name somebody typed, and no column name
  reveals it. Everything free-text goes through `scrubFreeText()` or it does not go.
- **The re-identification vault never leaves.** Pseudonyms go out; the key stays. The
  service already works this way — the phase must not undo it for convenience.

**Caveat carried from the brief:** Safe Harbor is a HIPAA construct and the DPA has no
statutory equivalent. Scrubbing is strong evidence that a subject is no longer
identifiable; it is not an automatic answer. That is Question 4, and it is why this phase
is blocked rather than merely later.

---

## AI-8 — Tier 3, identified

**Size: L.** **Blocked on Question 1** (does IRR § 22(e) reach a processor that is not a
medical practitioner or institution), **on the signed BAA, and on the HIPAA-ready
organisation.** All three, not any one.

Sixteen patient-level reports: superbill, eligibility, chart activity, charts out,
syndromic surveillance, payment processing, insurance distribution, indigent patients,
unique seen patients, prepayment balances, the receipts and collections set, the patient
ledger, cash receipts by provider, the patient quality and safety summary.

If AI-7 lands and is enough, most of these are better served de-identified and this phase
may never be needed. It is written down so that "we could do this identified" stays a
decision somebody takes rather than a thing that happens.

---

## AI-9 — Replace the mock

**Size: M.** **After AI-8's gates, plus clinical sign-off.** Last, not first.

`AiAnalysisController::healthAssessment` — `POST /ai/health-assessment` — reads a patient's
problems, allergies and vitals, is hard-coded to hypertension and diabetes, and allows the
`patient` role. It is the only AI surface already wired up, which makes it the most
tempting place to start and the worst one.

What it needs beyond a provider:

- the server-assembles-the-payload rule at the top of this document, which it currently
  violates;
- `PortalGuard` on the patient path, with its own capability and a `portal_audit_logs`
  row, like every M0–M19 feature;
- the `verification_status` gate from M19 — a model summarising a `Refuted` problem as
  fact is the exact failure M19 existed to fix;
- clinical sign-off on what it may and may not say.

Until then it stays as it is: a mock that is honest about being one.

---

## Cross-cutting, decided once in AI-1 and not revisited per phase

- **Cost.** The Batch API is outside the BAA and inaccessible to a HIPAA-ready org, so
  there is no 50% discount and **prompt caching carries the cost**. Stable content first
  (system prompt, per-report instructions), volatile last (the figures). Verify with
  `usage.cache_read_input_tokens`; if it is zero across repeated runs something is
  silently invalidating the prefix.
- **Rate limits and retries.** A 429 backs off and the panel says it is busy. It does not
  queue, and it does not retry forever.
- **Who may see it.** A capability per surface, seeded. An AI summary of the financial BI
  dashboard is not for everyone who can open the dashboard.
- **Where the figures come from.** The report's own query, always. The model is given
  numbers; it never fetches, never computes, never writes.

## What is excluded, unchanged

`PerformanceEvaluations`, anything that writes, the scored instruments (`Phq9`, `Gad7`,
M15a's red-flag screening) and the blank-form printers — `docs/ai-analysis-plan.md` §C.

The "nothing that writes" rule is also what keeps this outside IRR § 46(b), which requires
notifying the Commission of automated processing that becomes the sole basis of a decision
significantly affecting a data subject. It was written for clinical safety. Treat it now
as a boundary rather than a preference.
