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

## AI-1 — The spine, and one report through it

**Size: L.** Nothing before it. Needs an API key — *not* the HIPAA-ready organisation,
because nothing in this phase sends personal data.

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

## AI-2 — The wildcard audit

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

## AI-3 — The rest of Tier 1 financial

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

## AI-4 — Operations, pharmacy, procurement

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

## AI-5 — Clinical quality

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
