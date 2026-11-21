# AI analysis across the reports — what would be covered

Asked for on 21 November 2026: *"apply AI analysis to all of the reports."* This is the
list that has to be agreed before any of it is built.

---

## Read this first: there is no AI in the system today

`AiAnalysis` is one controller, 141 lines, one route — `POST /ai/health-assessment` — and
it is a **mock**. Verbatim from the file:

```php
// Mock AI analysis process
// In a real scenario, this would call an external API like OpenAI or Gemini
sleep(2); // Simulate network delay
```

What follows that `sleep` is a short list of `stripos($problem['title'], 'hypertension')`
string matches and a reader of the `*_abn` flag columns that the vitals table already
computes. No model, no API key, no provider. Nothing in `backend/.env`, nothing in
`backend/config/`, nothing anywhere in the tree.

So "apply AI analysis to all the reports" is one of two quite different projects:

- **Copy the mock everywhere.** Cheap, fast, and on a readmission-mortality report or a
  claim-denial pareto it would be actively harmful — a confident paragraph that was never
  computed from anything, printed next to real numbers that were.
- **Connect a real model.** That is the one worth doing, and the list below assumes it.
  It needs three decisions that are not code, in §A.

**Nothing below should be built until §A is settled.**

---

## §A Three decisions that come before the first line of code

> **Decision 1 answered, 21 November 2026 — see §A0 below. Decisions 2 and 3 are still open.**

**1. Which provider, and does PHI leave the building?**
Every report in §1, §3 and §8 contains PHI. Sending it to OpenAI, Anthropic or Google
makes that vendor a business associate under 45 CFR § 164.502(e), which means a signed
BAA before the first request — not after. This system already has a `BusinessAssociates`
module and a `business_associate_agreements` table; that is where the signed agreement
would be recorded, and the absence of a row there is the answer to "are we allowed to
send this yet".

The alternative is a model that runs on hospital hardware, where no PHI leaves and no BAA
is needed. Slower, cheaper per call, more to operate.

**2. Does the output get stored, and is it part of the record?**
A generated paragraph attached to a patient's quality summary is either a note in the
record — discoverable, disclosable, subject to the amendment right in `Amendments` — or
it is a transient view that is never written down. Pick one deliberately. The safest
start is: generated per view, never persisted, never printed on anything that leaves the
building.

**3. Who may see it, and how is that gated?**
`RoleAccess::hasPermission()` treats a missing `role_permissions` row as *not granted*, so
each surface needs its own capability and its own seed. An AI summary of the financial BI
dashboard is not for everyone who can see the dashboard.

---

## §A0 The provider: Anthropic's first-party Claude API, on a HIPAA-ready organisation

Picked on 21 November 2026. The reasoning, and what it rules out, is below — because
three of the four exclusions change what can be built, not just who is billed.

### What is covered, and what is not

Anthropic will sign a BAA for the **first-party API only**, and the organisation must be
put into a *HIPAA-ready* configuration: the Primary Owner signs the BAA, then Anthropic
sales turns the organisation on for PHI. It is not a toggle in the Console, so it has a
lead time and must be started before anything else on this list.

Covered, on that organisation:

- **Messages API** — and within it, **prompt caching** and **structured outputs**, both of
  which this design depends on.
- Token Counting, Models, Org Management, Compliance APIs.

**Not covered, and not accessible at all to a HIPAA-ready org:**

| Feature | Consequence here |
|---|---|
| **Batch API** | No 50% batch discount. Nightly runs over many reports are ordinary Messages calls, billed in full. **This changes the cost model** — budget for it. |
| **Files API** | A report cannot be uploaded as a file. Its rows go in the request body, so the prompt has to stay small by design. |
| **Code Execution** | The model cannot compute. It reads figures the report's own SQL produced. That was already the rule in the suggested order; now it is also enforced by what is available. |
| **Web Fetch, external MCP** | No reaching outside. Fine — nothing here needs it. |
| **Managed Agents** | Not eligible for a BAA. The agent surface is out; this is a plain request/response integration. |

Covered Models require 30-day retention and cannot be used from a zero-retention
organisation — HIPAA-ready and ZDR are mutually exclusive, so this organisation runs with
standard retention and that is the trade being accepted.

### Why this one

- It is the only option whose BAA scope can be stated feature by feature, which is what
  §A asked for. "The vendor is HIPAA compliant" is not an answer; the table above is.
- Anthropic's BAA **does not extend to Claude through AWS Bedrock or Google Vertex**.
  Going through a cloud provider means relying on that provider's agreement instead, and
  this hospital has no AWS or GCP footprint to build that on.
- Model quality matters more here than it looks. Every report in §1 is one where a
  plausible-but-wrong paragraph is worse than no paragraph.

Default model: **`claude-opus-5-5`**. Cheaper models exist in the same API and the same
BAA (Sonnet, Haiku) and are a per-report decision to make with measurements, not a
default to assume.

### The real alternative, which was not picked

**A model running on hospital hardware.** No PHI leaves the building, no BAA, no
cross-border question, no per-token bill. It loses on output quality and adds a server
to operate and an evaluation burden nobody here has capacity for today.

It stays the right answer if the answer to the next section is "no".

### Before any of this: the law that actually applies here

This system is written against HIPAA throughout — 45 CFR citations in the audit logger,
the retention rules, the amendment right. But this is a **Philippine hospital**:
PhilHealth in 27 files, DOH disease-surveillance and AHSR reporting, pesos in the
reports. The governing law is the **Data Privacy Act of 2012 (RA 10173)** and the
National Privacy Commission, not HIPAA.

A BAA is a HIPAA instrument. It is worth having and it is not the thing that makes this
lawful here. Sending patient data to a processor abroad engages the NPC's rules on
outsourcing and cross-border transfer, which want their own agreement and their own
basis. **Someone qualified has to answer that before the first request carries PHI** —
the `inference_geo` request parameter can pin where inference runs, but which value is
acceptable is a legal answer, not a technical one.

The honest position: the provider is picked, and whether PHI may be sent to it is not a
question this document can close.

**Taken up 21 November 2026: `docs/ai-analysis-legal-brief.md`.** It puts the four
questions to the DPO and counsel with the IRR sections read directly, and identifies the
one that unblocks the most work for the least legal effort — whether de-identified or
aggregate data is outside the DPA's scope at all. If it is, the first report in the
suggested order (claim-denial-pareto) can be built from aggregates while the rest is
still being decided.
### What this means for the integration

- **The official Anthropic PHP SDK, through Composer.** This project has no
  `composer.json` and no `vendor/` — the hand-rolled `Mailer` exists precisely because
  there is no Composer here. Introducing it is a real change to how this is deployed, and
  it is still the right call: hand-maintained HTTP against a moving API is how the Mailer
  ended up with a multiline-greeting bug nobody found for two months.
  PHP 8.2.12 with curl and openssl is present, so raw HTTPS is the fallback if the
  deployment cannot take Composer.
- **Prompt caching carries the cost**, since Batch is unavailable. The system prompt and
  the per-report instructions are stable; the figures are not. Stable content first,
  volatile last.
- **Structured outputs, not prose.** The response comes back in a known shape, so a
  malformed answer fails as a parse error rather than being rendered to a clinician.

---
## §B What "AI analysis" means per report type

It is not one feature. Four different things, and they need to be named separately or the
work will drift:

| Kind | What it does | Fits |
|---|---|---|
| **Narrative summary** | Turns a table into a paragraph a human can read | Dashboards, scorecards |
| **Anomaly callout** | "This week's figure is outside the pattern of the last 12" | Trend reports |
| **Driver analysis** | "The rise is concentrated in two wards and one payer" | BI, denials, margins |
| **Next action** | "These 14 accounts are worth chasing first" | AR, collections, recalls |

A report that only ever shows one number does not need any of them.

---

## The list

Grouped by what the hospital would gain, most valuable first. **60 report screens live in
`frontend/src/modules/reports/` alone**, plus 80 routes in the `Reports` module and the
report surfaces of about a dozen other modules.

### §1 Clinical quality and safety — highest value, highest risk

These are the reports where a pattern nobody noticed costs something real.

| Module / screen | Kind |
|---|---|
| `Reports` → clinical-quality-dashboard (summary, trends, ward-breakdown) | narrative + driver |
| `Reports` → clinical-safety-scorecard | narrative + anomaly |
| `Reports` → hai-ssi (healthcare-associated / surgical site infection) | anomaly + driver |
| `Reports` → readmission-mortality | anomaly + driver |
| `Reports` → surgical-safety | narrative |
| `Reports` → critical-tat (critical result turnaround) | anomaly + next action |
| `Reports` → incident-log | narrative + driver |
| `Reports` → syndromic-surveillance | anomaly |
| `Reports` → regulatory-disease-surveillance | anomaly |
| `Reports` → patient-quality-summary | narrative |
| `CqmValuesets` / standard-measures, amc-measures | narrative |

**Do not start here.** Start where a wrong answer is cheap, and come back once the
plumbing is trusted. A model that invents an infection trend is worse than no model.

### §2 Financial and revenue cycle — best place to start

Wrong answers are visible, checkable against a known total, and nobody is harmed.

| Module / screen | Kind |
|---|---|
| `Reports` → financial-bi-dashboard (overview, trends) | narrative + driver |
| `ClaimDenials` → claim-denial-pareto | driver + next action |
| `Reports` → departmental-profitability, cost-center-margins | driver |
| `ArAging` (matrix, accounts, detail) | next action |
| `Reports` → collections, receipts-summary, cash-receipts, front-receipts | narrative |
| `Reports` → sales-by-item, financial-summary-service-code | driver |
| `Reports` → prepayment-balances, patient-ledger-by-date | next action |
| `DoctorCommissions`, `Payroll` → commission pull | narrative |

**Recommended first build: claim-denial-pareto.** The data is small, the question is
genuinely hard for a human ("why are we being denied"), the answer is checkable, and
nothing clinical is at stake.

### §3 Operations and patient flow

| Module / screen | Kind |
|---|---|
| `Reports` → daily-summary, flow-board | narrative |
| `Census` → census, census sheet | anomaly |
| `Er` → ER report and wait times | anomaly + next action |
| `Icu` → ICU report | narrative |
| `Reports` → appointments, encounters, appointments-encounters | anomaly |
| `Reports` → chart-activity, charts-out | next action |
| `PatientFlow` → queue and token reports | anomaly |
| `OrManagement` → or-reports | driver |

### §4 Pharmacy, inventory and supply

| Module / screen | Kind |
|---|---|
| `PharmacyReports`, `PharmacyDashboard` | narrative + anomaly |
| `Reports` → inventory-activity, inventory-transactions, inventory-list | anomaly |
| `DrugInventory`, `StockLevels`, `LotTrace` → expiry and movement | next action |
| `Procurement` → procurement-reports | driver |
| `Suppliers`, `SupplierInvoices`, `PurchaseOrders` | driver |

### §5 Workforce

| Module / screen | Kind |
|---|---|
| `Attendance`, `DutyRosters` | anomaly |
| `Payroll` | narrative |
| `PerformanceEvaluations` | **excluded — see §C** |
| `StaffCredentials` → expiry | next action |

### §6 Compliance and audit

| Module / screen | Kind |
|---|---|
| `Audit` → HIPAA audit log export | anomaly |
| `Disclosures` → accounting of disclosures report | narrative |
| `SecurityIncidents` | narrative + driver |
| `Reports` → real-world-testing, alerts-log | narrative |
| `Backup` → disaster recovery drill results | narrative |

### §7 Clinical reference reports

| Module / screen | Kind |
|---|---|
| `Reports` → rx-report, referrals, immunization-registry | narrative |
| `Lab` → result trends | anomaly |
| `Radiology` → report turnaround | anomaly |
| `PatientProcedureResults` → procedure-reports, procedures-statistics | narrative |

### §8 Patient-facing — a separate decision, not part of "all the reports"

The existing mock is already reachable by a patient: `/ai/health-assessment` allows the
`patient` role. Extending AI to anything a patient reads is a different question with
different rules, and M19 is the precedent — the lists on that screen had to be gated on
`verification_status` because showing a patient something a clinician had ruled out is a
safety problem. A generated paragraph has no verification status at all.

If it happens, it needs the same treatment every M0–M19 feature got: `PortalGuard`, its
own capability, a `portal_audit_logs` row, and clinical sign-off on the wording. Listed
here so it is a decision rather than an oversight.

---

## §C Deliberately excluded

- **`PerformanceEvaluations`.** Generated commentary on a named member of staff, kept in a
  system of record, is an employment-law problem rather than a feature.
- **Anything that writes.** Analysis reads and reports. It does not change a dose, a
  schedule, a price or a claim.
- **Diagnosis and triage.** `Phq9`, `Gad7`, `ScreeningTools` and M15a's red-flag screening
  are scored instruments with validated thresholds. A model second-guessing them replaces
  something defensible with something that is not.
- **Reports with no pattern to find** — blank forms, superbill and demographics form
  printers, `custom-report-template`.

---

## Suggested order

**Built out as nine phases in `docs/ai-analysis-roadmap.md` on 21 November 2026.**
The order below is the reasoning; that document is the plan of work.

1. §A. Pick the provider and settle the BAA question. Nothing starts before this.
2. One shared service — `AiAnalysisService` with a real provider behind it, a capability
   gate, a per-report prompt, and a hard rule that the figures come from the report's own
   query and are never invented by the model.
3. **claim-denial-pareto** as the first report, as argued in §2.
4. The rest of §2.
5. §3 and §4.
6. §1, once the plumbing has been wrong a few times and been caught.
7. §6, §7.
8. §8 only as its own discussion.

## What this does not include

Replacing the mock on `/ai/health-assessment` is not on this list and should be its own
piece of work. It is the one AI surface patients and clinicians can already reach, it is
hard-coded to hypertension and diabetes, and whatever is decided in §A has to apply to it
first.
