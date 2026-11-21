# AI analytics: the build list

The modules to touch, in build order, with each report placed by **whether it carries
personal data** — because that, and not usefulness, is what decides when it can be built.

Companion to `docs/ai-analysis-plan.md` (what and why) and
`docs/ai-analysis-legal-brief.md` (the four questions for counsel).

---

## How each report was placed, and what that is worth

Every `*Service.php` under the report-bearing modules was scanned method by method for
columns and joins that name a person: `patient_id`, `patient_no`, `patient_name`,
`first_name`, `last_name`, `birthdate`, `mrn`, `email`, phone and address columns,
`employee_id`, `user_id`, and `FROM`/`JOIN` against `patients` or `employees`.

**252 report-ish methods. 128 mention no identifier; 124 do.**

Two honest limits on that number, and the first one matters:

1. **43 of the 128 use `SELECT *` or `SELECT t.*`**, so the scan cannot see what they
   return. `getClaimDenialParetoAnalytics()` is one of them: its pareto distribution is a
   clean `GROUP BY denial_category`, and then section 5 of the same method runs
   `SELECT d.* FROM billing_claim_denials` for a 50-row worklist — and that table has
   `patient_id`, `encounter_id` and `service_date`. **The scan called that method clean. It
   is not.** Every method marked ✻ below needs its result keys inspected at runtime before
   anything is sent. That inspection is the allowlist test described under Tier 0, so it is
   work that has to happen anyway.
2. A text scan sees columns, not meaning. A free-text `root_cause_analysis` or
   `assignment_notes` column can carry a name somebody typed, and no column name reveals
   that. Free text goes through `DeidentificationService::scrubFreeText()` or it does not
   go.

So: **85 methods are clean and select explicit columns.** Those are the solid ground.

---

## Tier 0 — the plumbing. Build first, carries no report data at all

Nothing here sends anything. It is the part that makes every later tier safe, and none of
it waits on counsel.

| Module | What changes |
|---|---|
| **`AiAnalysis`** | Gains the `Services/` layer it has never had: a real provider client, the per-report prompt, prompt caching, structured outputs. The existing 141-line mock controller stays untouched until last (see Tier 4). |
| **`AiAnalysis`** | **The field allowlist** — a per-report declaration of exactly which keys may leave, and a test that fails if any other key reaches the request body. This is the control that makes "no personal data left the building" demonstrable rather than asserted, which is what IRR § 50 asks of the hospital as controller. |
| **`GeneralSettings`** | `allow_ai_analysis` master switch, plus the provider configuration. A hospital that wants none of this turns it off in one place. |
| **`Roles`** (seed) | A capability per surface. `RoleAccess::hasPermission()` treats a missing `role_permissions` row as *not granted*, so each one needs a non-optional seed — an AI summary of the financial BI dashboard is not for everyone who can open the dashboard. |
| **`Audit`** | A row per generation: which report, which user, how many tokens, and the hash of what was sent. Without the last one there is no way to answer "what did you send them" a year from now. |

**Needs from you:** an Anthropic API key. For Tier 1 it need not be the HIPAA-ready
organisation, because none of Tier 1 sends personal data.

---

## Tier 1 — buildable now. No identifiers, no legal gate

✻ = uses `SELECT *`; confirm the result keys before sending.

### Financial and revenue cycle
| Module | Method |
|---|---|
| `Reports` · FinancialBusinessIntelligenceService | `getClaimDenialParetoAnalytics` ✻ — **build this one first**, pareto groups only, never section 5's worklist |
| `Reports` · FinancialBusinessIntelligenceService | `getExecutiveOverview` ✻, `getMonthlyTrends`, `getCostCenterMargins` ✻ |
| `Reports` · ReportService | `getSalesByItemReport`, `getFinancialSummaryByServiceCodeReport`, `getServicesReport` |
| `ArAging` | `getAgingMatrix` — the matrix is buckets and totals; the per-account list is Tier 3 |
| `DoctorCommissions` | `getCommissionMetrics`, `getDoctorStatements` |

### Clinical quality — aggregate, and a genuine surprise
| Module | Method |
|---|---|
| `Reports` · ClinicalQualityAnalyticsService | `getSummaryMetrics` ✻, `getTrends`, `getWardBreakdown` |
| ~~`Reports` · ClinicalQualityScorecardService~~ | ~~`getDeliveries`~~ — **moved to Tier 3 by AI-2** |
| `Reports` · RegulatoryAhsrExportService | `getAhsrOverview` ✻ |

The clinical quality dashboard — the highest-value surface in the whole plan — turns out
to be rates and counts by ward with no patient column anywhere. If the ✻ checks hold, the
most useful analysis in §1 of the plan is also among the least legally fraught.

### Operations
| Module | Method |
|---|---|
| `Census` · CensusReportService | `report` |
| `Er` · ErReportService | `report` |
| `Lab` · LabReportService | `report` |
| `Radiology` · RadReportService | `report` |
| `OrManagement` · OrReportService | `utilization` ✻, `timeliness`, `volume`, `compliance` |
| `Reports` · ReportService | `getDailySummaryReport`, `getEncountersReport`, `getAppointmentsEncountersReport` |

### Pharmacy, inventory and supply
| Module | Method |
|---|---|
| `PharmacyDashboard` | `overview` |
| `DrugInventory` | `listLots`, `listDrugs`, `listDestructions` ✻ |
| ~~`DrugInventory` · NearExpiryQuarantineService~~ | ~~`runQuarantineScan`~~ — **NOT A REPORT. It contains UPDATE and INSERT: it quarantines stock. Removed by AI-4.** |
| `DrugInventory` · LotRecallTraceService | `searchLots`, `listRecalls` ✻ |
| `DrugInventory` · NarcoticsVaultService | `getVaultStats` — ~~`getMovements`~~ **moved to Tier 3 by AI-2** |
| `StockLevels` · PharmacyReorderPolicyService | `compute30DayDailyConsumption` |
| `StockCounts` | `report` ✻ |
| `Procurement` · ProcurementReportService | `openOrders`, `supplierPerformance`, `spend`, `priceHistory`, `priceDifferences` |
| `BloodBank` · BloodInventoryService | `getInventoryStats` |

---

### What AI-2 corrected here, 21 November 2026

The ✻ marks above said "confirm the result keys before sending". That was done, by
resolving every wildcard against `information_schema` rather than by running the methods
— forty-three of them include `saveCounts()`, `approve()`, `send()`, `receive()` and
`deleteImage()`, so calling them to find out what they select would have written to the
database and dispatched stock. `scratch/scan_select_star.php` does it statically.

**84 methods use a wildcard select. 62 of them would return at least one identifier
column.** Two of those were on the Tier 1 list above and should not have been:

- **`ClinicalQualityScorecardService::getDeliveries`** returns `obstetric_deliveries.*`,
  which carries **`patient_id` and `patient_name`**. A maternity record. Listed here as
  clean because the text scan could not see past `SELECT *`.
- **`NarcoticsVaultService::getMovements`** returns `narcotics_vault_movements.*`, which
  carries **`patient_id`** — a controlled-drug movement against a named patient, which is
  about as sensitive as anything in this database.

Both move to Tier 3.

The remaining wildcards on the Tier 1 list expose only `created_by` / `updated_by` — a
staff user id with no name attached. They stay, because the allowlist strips them and
there is now a test naming each one. That is the distinction worth holding on to: a
wildcard that exposes nothing *today* is not an allowlist, it is a column list that
happens to be safe, and the next migration can change it without anybody deciding to.

A near miss worth recording: `CensusService::sheet` exposes `patient_name` and
`patient_no`, and the Tier 1 entry is `CensusReportService::report`, which is clean. Two
classes, similar names, very different contents.
## Tier 2 — one column away

These are summary reports whose only identifier is a single `patient_name` or employee
name column, carried for display. Drop it from the allowlist and the rest is Tier 1. They
are listed separately rather than merged because dropping a column from what is *sent* is
a deliberate act that someone should sign off, not a silent omission.

| Module | Method | The one column |
|---|---|---|
| `Reports` · ReportService | `getIncidentLogReport` | `patient_name` |
| `Reports` · ReportService | `getCriticalTATReport` | `patient_name` |
| `Reports` · ReportService | `getHAIReport` | `patient_name` |
| `Reports` · ReportService | `getReadmissionMortalityReport` | `patient_name` |
| `Reports` · ReportService | `getSurgicalSafetyReport` | `patient_name` |
| `Reports` · ReportService | `getInventoryActivityReport` | employee first/last name |
| `Reports` · ReportService | `getInventoryTransactionsReport` | employee first/last name |
| `StockLevels` · StockLevelService | `lowStock` | employee first/last name |

Staff are data subjects too. An employee name is personal data even though it is not
health data, so these are the same decision in a lower key.

---

## Tier 3 — blocked until counsel answers

Patient-level by construction. Nothing is sent from these until Question 1 (does IRR
§ 22(e) reach a processor that is not a medical practitioner or institution) or Question 4
(is de-identified data out of scope) is answered. If Question 4 clears, every one of them
becomes reachable through `DeidentificationService`.

`Reports` · ReportService — `getSuperbillReport`, `getEligibilityReport`,
`getChartActivityReport`, `getChartsOutReport`, `getSyndromicSurveillanceReport`,
`getPaymentProcessingReport`, `getInsuranceDistributionReport`, `getIndigentPatientsReport`,
`getUniqueSeenPatientsReport`, `getPrepaymentBalancesReport`, `getFrontOfficeReceiptsReport`,
`getReceiptsSummaryReport`, `getCollectionsReport`, `getPatientLedgerByDateReport`,
`getCashReceiptsByProviderReport`, `getPatientQualitySafetySummary`

Plus, from the plan's §7 and §8: `Lab` result trends per patient, `PatientProcedureResults`,
`Immunizations` registry, and anything patient-facing.

---

## Tier 4 — the existing mock, last

`AiAnalysis::healthAssessment` — `POST /ai/health-assessment`, called from
`frontend/src/modules/patients/patients.service.js`. It is the one AI surface patients and
clinicians can already reach, it is hard-coded to hypertension and diabetes, and it reads
a patient's problems, allergies and vitals. Replacing the mock with a real model is
therefore a Tier 3 action with a patient audience, and it belongs on the far side of both
the legal answer and clinical sign-off — not first, however tempting it is as the only
thing already wired up.

---

## Order

The phases are in `docs/ai-analysis-roadmap.md`; this is the summary.

1. Tier 0, end to end, with `getClaimDenialParetoAnalytics` as the single consumer.
2. The ✻ runtime key check for everything in Tier 1, as allowlist tests.
3. The rest of Tier 1 financial, then operations, then pharmacy.
4. Tier 1 clinical quality — same mechanism, but it is the first tier where a wrong
   summary reaches a clinical audience, so it goes after the plumbing has been wrong a few
   times and been caught.
5. Tier 2, once somebody signs off on dropping the name columns.
6. Tier 3 and 4 only after counsel.

## Excluded entirely

Unchanged from `docs/ai-analysis-plan.md` §C: `PerformanceEvaluations`, anything that
writes, the scored instruments (`Phq9`, `Gad7`, M15a red-flag screening), and the
blank-form printers. The "nothing that writes" rule is now also what keeps this outside
IRR § 46(b), which requires notifying the Commission of automated processing that becomes
the sole basis of a decision significantly affecting a data subject.
