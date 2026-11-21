<?php

namespace App\Modules\AiAnalysis\Services;

use App\Modules\ArAging\Services\ArAgingService;
use App\Modules\BloodBank\Services\BloodInventoryService;
use App\Modules\Census\Services\CensusReportService;
use App\Modules\DoctorCommissions\Services\DoctorCommissionService;
use App\Modules\DrugInventory\Services\NarcoticsVaultService;
use App\Modules\OrManagement\Services\OrReportService;
use App\Modules\Procurement\Services\ProcurementReportService;
use App\Modules\Reports\Services\ClinicalQualityAnalyticsService;
use App\Modules\Reports\Services\ClinicalQualityScorecardService;
use App\Modules\Reports\Services\FinancialBusinessIntelligenceService;
use App\Modules\Reports\Services\RegulatoryAhsrExportService;
use App\Modules\StockCounts\Services\StockCountService;

/**
 * Which reports may be analysed, how the server builds each one, and what it
 * is asked about them.
 *
 * This is where "the server assembles the payload" stops being a principle and
 * becomes a mechanism. A caller names a key from this table and passes the
 * report's own filters; this class runs the report's existing service method,
 * takes the one branch of the result that may be sent, and hands it to
 * `AiPayload` to be projected. At no point does anything from the request body
 * reach the payload except the filters.
 *
 * ADDING A REPORT IS FOUR LINES AND A DECISION.
 *
 * The decision is which branch of the result may leave. That is not a detail:
 * `claim_denial_pareto` returns seven branches and one of them,
 * `denial_worklist`, is 50 rows of `SELECT d.*` over `billing_claim_denials`
 * -- patient_id, encounter_id, service_date, patient_responsibility. Naming the
 * branch here and the fields in AiPayload is two independent statements of the
 * same intent, and a report has to pass both.
 */
class AiReports
{
    /**
     * report key => how to build it.
     *
     *   label   -- what a person calls it
     *   source  -- [class, method] on the report's own service
     *   branch  -- the key in that method's result holding the rows to send,
     *              or null when the method returns the rows directly
     *   args    -- 'filters' (default) passes the filters array; 'none' calls
     *              the method with no arguments
     *   shape   -- optional static method on this class, run over the rows
     *              before projection
     *   context -- scalar branches sent alongside, already aggregate
     *   asks    -- what the model is asked to do with it
     *
     * EVERY SHAPE BELOW WAS OBSERVED, NOT INFERRED. AI-2 deleted two allowlist
     * entries written from what a report sounded like; each of these was built
     * by calling the getter against the test database and reading the keys that
     * came back. Three further Tier 1 financial reports -- sales by item,
     * summary by service code, and services -- are deliberately absent: they
     * have no rows in the test database, so their shapes could only have been
     * read off their SQL, which is the mistake AI-2 caught.
     */
    public const REPORTS = [
        'claim_denial_pareto' => [
            'label' => 'Claim denial pareto',
            'source' => [FinancialBusinessIntelligenceService::class, 'getClaimDenialParetoAnalytics'],
            'branch' => 'pareto_root_causes',
            'context' => ['summary_month'],
            'asks' => 'Explain where denied money is concentrated, which categories are worth attacking first, '
                . 'and what the overturn rates suggest about which denials are worth appealing.',
        ],

        // ward_class_benchmarks, not ward_yield_rankings. Both are ward-level
        // and neither names a patient, but the rankings branch is a 41-column
        // SELECT * including id, calculated_source and timestamps -- rows the
        // model would have to read past to find the figures.
        'financial_executive_overview' => [
            'label' => 'Financial executive overview',
            'source' => [FinancialBusinessIntelligenceService::class, 'getExecutiveOverview'],
            'branch' => 'ward_class_benchmarks',
            'context' => ['summary_month'],
            'asks' => 'Compare the ward classes on occupancy, revenue per available bed and margin, and say '
                . 'which class is carrying the hospital and which is not paying for itself.',
        ],

        // cost_center_groups, for the same reason: `departments` is 33 columns
        // of raw table.
        'financial_cost_center_margins' => [
            'label' => 'Cost centre margins',
            'source' => [FinancialBusinessIntelligenceService::class, 'getCostCenterMargins'],
            'branch' => 'cost_center_groups',
            'context' => ['summary_month'],
            'asks' => 'Say which kinds of cost centre are contributing margin and which are consuming it, and '
                . 'what the direct cost mix suggests about where the money goes.',
        ],

        // getMonthlyTrends(int $limitMonths = 6) -- not (array $filters) like
        // every other report here. Passing filters to it is a TypeError, which
        // is why `args` exists at all.
        'financial_monthly_trends' => [
            'label' => 'Financial monthly trends',
            'source' => [FinancialBusinessIntelligenceService::class, 'getMonthlyTrends'],
            'branch' => 'trend_series',
            'args' => 'none',
            'context' => ['months_count'],
            'asks' => 'Describe the direction of occupancy, revenue and margin across these months. Say plainly '
                . 'if there are too few months to call a trend.',
        ],

        // `ar_aging_matrix` WAS HERE FROM AI-3 AND IS DE-REGISTERED IN AI-5,
        // because ArAgingService::getAgingMatrix calls
        // $this->recalculateAgingBuckets(), which runs UPDATE
        // billing_ar_accounts. It re-ages every account before reporting on
        // them.
        //
        // AI-4's write check read the getter's own body and found nothing,
        // because there is nothing there to find: the write is one call down.
        // AI-5 deepened the check to follow $this-> calls and this is one of
        // two reports it caught that were already shipped.
        //
        // The allowlist entry and flattenAgingBuckets() stay. That is not the
        // thing AI-2 warned about -- an allowlist written from a guess for a
        // report nobody can request. Both were observed against real rows and
        // both are correct; what is missing is a read-only way to get the
        // matrix, which means splitting the recalculation out of the getter in
        // a module that has nothing to do with this feature. That is a change
        // somebody should make deliberately, not a side effect of adding an
        // analysis panel.

        // No rows at all: this getter returns a flat map of totals, which
        // project() normalises into a single row.
        'doctor_commission_metrics' => [
            'label' => 'Doctor commission metrics',
            'source' => [DoctorCommissionService::class, 'getCommissionMetrics'],
            'branch' => null,
            'asks' => 'Summarise the commission position: what has been earned, what is withheld, what is still '
                . 'to be paid out.',
        ],

        // ---------------- AI-4: operations, pharmacy, procurement ----------
        //
        // Same rule as AI-3: each shape below was observed by calling the
        // getter, and each getter was first read to confirm it does not write.
        // That check was not ceremony -- `NearExpiryQuarantineService::
        // runQuarantineScan` was on the Tier 1 report list and contains UPDATE
        // and INSERT. It quarantines stock. It is not a report and is not here.

        'census_daily' => [
            'label' => 'Daily census',
            'source' => [CensusReportService::class, 'report'],
            'branch' => 'series',
            'context' => ['from', 'to', 'group'],
            'asks' => 'Describe how occupancy and length of stay moved over this period, and whether admissions '
                . 'and discharges are in balance.',
        ],

        // The `summary` branch of each OR report, not the by_* lists.
        // `volume` in particular offers `by_surgeon`, which names staff.
        'or_utilisation' => [
            'label' => 'Theatre utilisation',
            'source' => [OrReportService::class, 'utilization'],
            'branch' => 'summary',
            'context' => ['operating_days'],
            'asks' => 'Say how well theatre time is being used and what the gap between booked and used time '
                . 'suggests.',
        ],

        'or_timeliness' => [
            'label' => 'Theatre timeliness',
            'source' => [OrReportService::class, 'timeliness'],
            'branch' => 'summary',
            'context' => ['grace_minutes'],
            'asks' => 'Say whether first cases start on time and whether turnovers are within target.',
        ],

        'or_volume' => [
            'label' => 'Theatre volume',
            'source' => [OrReportService::class, 'volume'],
            'branch' => 'summary',
            'asks' => 'Summarise the case volume for this period.',
        ],

        'or_compliance' => [
            'label' => 'Surgical safety checklist compliance',
            'source' => [OrReportService::class, 'compliance'],
            'branch' => 'summary',
            'asks' => 'Say which part of the checklist is least complete and what the issue counts suggest. '
                . 'Do not speculate about individual cases -- you have counts, not cases.',
        ],

        'narcotics_vault_stats' => [
            'label' => 'Narcotics vault',
            'source' => [NarcoticsVaultService::class, 'getVaultStats'],
            'branch' => null,
            'asks' => 'Summarise the vault position and flag anything unresolved.',
        ],

        // `blood_inventory_stats` WAS HERE FROM AI-4 AND IS DE-REGISTERED IN
        // AI-5, for the same reason and with a sharper edge:
        // BloodInventoryService::getInventoryStats calls
        // $this->autoQuarantineExpiredUnits(), which runs UPDATE
        // blood_inventory_units.
        //
        // Reading the blood inventory quarantines expired blood. That is
        // exactly the failure AI-4's check was written to prevent after
        // runQuarantineScan -- and it was already registered, one call out of
        // the regex's reach, in the same phase that added the check. The
        // lesson is not about blood or stock: it is that a check which stops
        // at the first method body will keep clearing the thing it exists to
        // catch.

        'procurement_open_orders' => [
            'label' => 'Open purchase orders',
            'source' => [ProcurementReportService::class, 'openOrders'],
            'branch' => 'totals',
            'asks' => 'Say how much is committed and how much of it is late.',
        ],

        'procurement_supplier_performance' => [
            'label' => 'Supplier performance',
            'source' => [ProcurementReportService::class, 'supplierPerformance'],
            'branch' => 'totals',
            'asks' => 'Say what the on-time and rejection rates mean for the value being received.',
        ],

        'procurement_price_differences' => [
            'label' => 'Purchase price differences',
            'source' => [ProcurementReportService::class, 'priceDifferences'],
            'branch' => 'totals',
            'asks' => 'Say whether the hospital is being over- or under-charged against agreed prices, and by '
                . 'how much on balance.',
        ],

        'stock_count_variance' => [
            'label' => 'Stock count variance',
            'source' => [StockCountService::class, 'report'],
            'branch' => 'totals',
            'asks' => 'Say what the gain and loss totals suggest about counting accuracy or shrinkage.',
        ],

        // ---------------- AI-5: clinical quality ---------------------------
        //
        // The first reports here whose readers are clinicians, which is why
        // AiFigures exists from this phase on: every numeral in the answer is
        // checked against the payload before anything is rendered.
        //
        // TWO CANDIDATES WERE REFUSED, and the reasons are the useful part.
        //
        // ClinicalQualityAnalyticsService::getSummaryMetrics -- WRITES. Not in
        // its own body, which is why AI-4's check cleared it: its third
        // statement is $this->backfillRange(...), which reaches
        // calculateForDate(), which contains INSERT INTO
        // analytics_clinical_quality_daily. It materialises any missing day in
        // the range before reporting on it. Registering it would have meant an
        // analysis panel writing thirty rows of derived analytics every time
        // somebody clicked it. The write check in tests/test_ai_analysis.php
        // now follows $this-> calls rather than reading one body.
        //
        // ClinicalQualityAnalyticsService::getWardBreakdown -- UNOBSERVABLE.
        // It requires ward_id > 0 and joins hospital_wards, and the test
        // database has no wards at all, so it returns zero rows however much
        // analytics data is backfilled. Its shape could only be read off its
        // SQL, which is the mistake AI-2 was written to stop. It is the fourth
        // report deferred on these grounds, with the three Tier 1 financial
        // ones.

        'clinical_trends' => [
            'label' => 'Clinical quality daily trends',
            'source' => [ClinicalQualityAnalyticsService::class, 'getTrends'],
            'branch' => 'series',
            'context' => ['from', 'to', 'ward_id'],
            'asks' => 'Describe how occupancy, length of stay and bed turnover moved across these days, and '
                . 'whether readmissions, deaths or infections cluster anywhere in the period. Daily counts in '
                . 'single figures are noise, not signal -- say so rather than reading a trend into them.',
        ],

        // The whole result, flattened. Every branch of this report is a nested
        // map and project() drops nested values, so without the transform the
        // safety scorecard would arrive as a single row holding a period and
        // nothing else.
        'clinical_safety_scorecard' => [
            'label' => 'Hospital safety scorecard',
            'source' => [ClinicalQualityScorecardService::class, 'getScorecardOverview'],
            'branch' => null,
            'shape' => 'flattenScorecard',
            'asks' => 'Say which of the four safety pillars is pulling the composite score down, and how each '
                . 'rate sits against its benchmark. These are rates over a short window: where a numerator is '
                . 'small, say that the rate is unstable rather than that it is good or bad.',
        ],

        // Two levels down -- er_turnaround.acuity_breakdown -- which `branch`
        // cannot reach, so a transform plucks it.
        'er_acuity_timeliness' => [
            'label' => 'ER door-to-doctor by acuity',
            'source' => [ClinicalQualityScorecardService::class, 'getScorecardOverview'],
            'branch' => null,
            'shape' => 'pluckAcuityBreakdown',
            'asks' => 'Say which acuity levels are being seen within target and which are not. The sickest '
                . 'patients matter most here: weigh level 1 and 2 above the rest.',
        ],

        // The statutory annual return. Population-level by construction: these
        // tables exist to be sent to a health authority as counts.
        'ahsr_kpis' => [
            'label' => 'Annual statistical report KPIs',
            'source' => [RegulatoryAhsrExportService::class, 'getAhsrOverview'],
            'branch' => 'kpis',
            'context' => ['reporting_year'],
            'asks' => 'Summarise the hospital\'s year as these statutory figures describe it: throughput, '
                . 'mortality, surgical output and deliveries. Say which figures a health authority would '
                . 'question.',
        ],

        'ahsr_morbidity_top10' => [
            'label' => 'Annual statistical report: leading causes of morbidity',
            'source' => [RegulatoryAhsrExportService::class, 'getAhsrOverview'],
            'branch' => 'morbidity_top10',
            'context' => ['reporting_year'],
            'asks' => 'Say what the ranked discharge diagnoses and their age distributions show about who this '
                . 'hospital treats. Do not infer causes.',
        ],

        'ahsr_mortality_top10' => [
            'label' => 'Annual statistical report: leading causes of mortality',
            'source' => [RegulatoryAhsrExportService::class, 'getAhsrOverview'],
            'branch' => 'mortality_top10',
            'context' => ['reporting_year'],
            'asks' => 'Describe what the ranked causes of death and the under-48-hour split show. Case fatality '
                . 'rates here are counts over a year, not a judgement on any department -- write them as '
                . 'figures, not as blame.',
        ],

        'ahsr_surgical_obstetric' => [
            'label' => 'Annual statistical report: surgical and obstetric output',
            'source' => [RegulatoryAhsrExportService::class, 'getAhsrOverview'],
            'branch' => 'surgical_obstetric',
            'context' => ['reporting_year'],
            'asks' => 'Say how surgical and obstetric volume splits between elective and emergency, and what '
                . 'the mix suggests about theatre and delivery-room load.',
        ],
    ];

    /**
     * The aging matrix keeps its aging inside a nested `buckets` map, and
     * project() drops nested values on purpose -- so without this the one
     * report about ageing would arrive with no ages in it.
     *
     * Flattened to `bucket_0_30_balance` and friends rather than sent nested,
     * because the allowlist can only name fields it can see. A nested shape
     * would have to be allowlisted recursively, which is a bigger mechanism
     * than any report here has yet needed.
     */
    public static function flattenAgingBuckets(array $rows): array
    {
        $out = [];

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $buckets = $row['buckets'] ?? [];
            unset($row['buckets']);

            if (is_array($buckets)) {
                foreach ($buckets as $label => $bucket) {
                    $key = 'bucket_' . str_replace(['-', '+'], ['_', '_plus'], (string) $label);
                    $row[$key . '_count'] = is_array($bucket) ? ($bucket['count'] ?? 0) : 0;
                    $row[$key . '_balance'] = is_array($bucket) ? ($bucket['balance'] ?? 0) : 0;
                }
            }

            $out[] = $row;
        }

        return $out;
    }

    /**
     * The safety scorecard, flattened into one row.
     *
     * Every one of its five branches is a map with maps inside it --
     * safety_index.pillar_breakdown, hai_devices.cauti, csection.ntsv -- and
     * project() drops nested values, so the unflattened report would have sent
     * a period and nothing else: a scorecard with no scores.
     *
     * Three things are deliberately NOT lifted, and they are the interesting
     * part of this function:
     *
     *   - `label` and `device_name` on each infection block. Static display
     *     text. The key already says which device.
     *   - `top_causes` (readmission) and `top_indications` (caesarean). Both
     *     are lists of clinical free text somebody typed, and SCRUB is empty.
     *     A free-text column that has not been through the scrubber does not
     *     leave, which is the rule AiPayload states and this is the first
     *     report that tests it.
     *   - `generated_at`. A timestamp in the payload changes the hash on every
     *     call, so the cache would never hit and every view would be billed.
     *
     * @param array $result The whole getScorecardOverview() result.
     */
    public static function flattenScorecard(array $result): array
    {
        $row = [];

        $index = is_array($result['safety_index'] ?? null) ? $result['safety_index'] : [];
        $row['composite_score'] = $index['composite_score'] ?? null;
        $row['max_score'] = $index['max_score'] ?? null;
        $row['performance_grade'] = $index['performance_grade'] ?? null;

        foreach (['readmission_points', 'hai_device_points', 'er_turnaround_pts', 'csection_points'] as $pillar) {
            $row['pillar_' . $pillar] = ($index['pillar_breakdown'][$pillar] ?? null);
        }

        $readm = is_array($result['readmission'] ?? null) ? $result['readmission'] : [];

        foreach ([
            'readmission_rate_pct', 'total_readmissions', 'total_discharges',
            'preventable_count', 'avg_days_to_return', 'cms_benchmark_pct', 'variance_from_target',
        ] as $field) {
            $row[$field] = $readm[$field] ?? null;
        }

        $row['readmission_status'] = $readm['status'] ?? null;

        $hai = is_array($result['hai_devices'] ?? null) ? $result['hai_devices'] : [];
        $row['composite_device_rate_per_1000'] = $hai['composite_device_rate_per_1000'] ?? null;
        $row['total_device_cases'] = $hai['total_device_cases'] ?? null;
        $row['total_device_days'] = $hai['total_device_days'] ?? null;

        // Three device-associated infections, each with its own denominator.
        foreach (['cauti', 'clabsi', 'vap'] as $device) {
            $block = is_array($hai[$device] ?? null) ? $hai[$device] : [];

            foreach (['cases', 'device_days', 'rate_per_1000', 'benchmark', 'status'] as $field) {
                $row[$device . '_' . $field] = $block[$field] ?? null;
            }
        }

        // SSI is a count and nothing else, and that is correct rather than
        // missing: a surgical site infection is not device-associated, so
        // there are no device-days to divide by and the service returns no
        // rate, benchmark or status for it. Looping it in with the other three
        // produced four fields that were always empty, and an allowlist naming
        // fields that never arrive is the AI-2 mistake in a smaller key.
        $row['ssi_cases'] = $hai['ssi']['cases'] ?? null;

        $er = is_array($result['er_turnaround'] ?? null) ? $result['er_turnaround'] : [];

        foreach ([
            'total_er_visits', 'median_door_to_doctor_mins', 'p90_door_to_doctor_mins',
            'avg_door_to_doctor_mins', 'median_door_to_triage_mins', 'national_target_mins',
        ] as $field) {
            $row[$field] = $er[$field] ?? null;
        }

        $row['er_status'] = $er['status'] ?? null;

        $cs = is_array($result['csection'] ?? null) ? $result['csection'] : [];

        foreach (['total_deliveries', 'csection_count', 'overall_csection_rate', 'who_benchmark_pct'] as $field) {
            $row[$field] = $cs[$field] ?? null;
        }

        $row['csection_status'] = $cs['status'] ?? null;

        $ntsv = is_array($cs['ntsv'] ?? null) ? $cs['ntsv'] : [];
        $row['ntsv_total'] = $ntsv['ntsv_total'] ?? null;
        $row['ntsv_csection'] = $ntsv['ntsv_csection'] ?? null;
        $row['ntsv_rate_pct'] = $ntsv['ntsv_rate_pct'] ?? null;
        $row['ntsv_target_pct'] = $ntsv['target_pct'] ?? null;
        $row['ntsv_status'] = $ntsv['status'] ?? null;

        $breakdown = is_array($cs['breakdown'] ?? null) ? $cs['breakdown'] : [];

        foreach (['vaginal_spontaneous', 'vaginal_assisted', 'cesarean_elective', 'cesarean_emergency'] as $field) {
            $row['delivery_' . $field] = $breakdown[$field] ?? null;
        }

        return [array_filter($row, static fn ($v) => $v !== null)];
    }

    /**
     * The ER acuity breakdown, which lives two levels down.
     *
     * `branch` names one key of the result and that is all it can do, so a
     * list nested inside a branch needs a transform to reach it. Registered as
     * its own report rather than folded into the scorecard row: five rows of
     * seven fields flattened into one row would be thirty-five columns with
     * the level encoded in their names, which is a table pretending not to be
     * one.
     *
     * @param array $result The whole getScorecardOverview() result.
     */
    public static function pluckAcuityBreakdown(array $result): array
    {
        $rows = $result['er_turnaround']['acuity_breakdown'] ?? [];

        return is_array($rows) ? array_values(array_filter($rows, 'is_array')) : [];
    }

    /**
     * The stable instructions. Byte-identical between calls, on purpose: this
     * is the cached prefix, and a timestamp or a per-request id in here would
     * silently throw away the saving.
     *
     * Most of it is prohibitions. That is the right proportion for a tool whose
     * failure mode is a confident paragraph next to real numbers.
     */
    public const SYSTEM_PROMPT = <<<'PROMPT'
You are analysing a management report for a hospital's staff. You are writing for people
who know this hospital and this report; they do not need the report explained back to them.

RULES, IN ORDER OF IMPORTANCE.

1. EVERY NUMBER YOU WRITE MUST APPEAR IN THE DATA YOU WERE GIVEN. Do not add, average,
   project, extrapolate or convert. You have no calculator and no other source. If a
   question would need arithmetic you cannot do by reading a value off the rows, say what
   the rows show and stop.

2. SAY WHAT THE DATA SHOWS, NOT WHAT WOULD BE REASSURING. If the figures are unremarkable,
   say so in one line. A report with nothing interesting in it is a useful answer.

3. YOU ARE NOT DECIDING ANYTHING. A person reads this and acts, or does not. Never write
   as though an action has been taken or will be taken automatically.

4. THE DATA IS AGGREGATE AND CONTAINS NO PATIENTS. Do not speculate about individual
   patients, staff or cases, and do not ask for records: you will not be given any.

5. IF THE DATA IS TOO THIN TO SUPPORT A CONCLUSION, SAY THAT. "Three categories over one
   month is not enough to call a trend" is a better answer than a trend.

FORMAT. Reply as JSON and nothing else, in this exact shape:

{
  "summary": "two or three sentences, plain prose",
  "findings": ["each finding one sentence, most important first, at most five"],
  "watch": ["anything the figures hint at but do not establish, at most three"]
}

Write in plain English. No markdown, no headings, no bullet characters inside the strings.
Amounts are Philippine pesos; write them as they appear in the data.
PROMPT;

    public static function knows(string $reportKey): bool
    {
        return array_key_exists($reportKey, self::REPORTS)
            && AiPayload::knows($reportKey);
    }

    /** @return array<string, string> key => label, for the client. */
    public static function available(): array
    {
        $out = [];

        foreach (self::REPORTS as $key => $report) {
            if (AiPayload::knows($key)) {
                $out[$key] = $report['label'];
            }
        }

        return $out;
    }

    /**
     * Build the payload for a report, server-side, from its own query.
     *
     * @param array $filters The report's own filters, as its service method
     *                       already understands them. Never data.
     *
     * @return array{rows: array, context: array, dropped: array}
     *
     * @throws \InvalidArgumentException when the report is unknown.
     */
    public static function build(string $reportKey, array $filters): array
    {
        if (!self::knows($reportKey)) {
            throw new \InvalidArgumentException("\"{$reportKey}\" is not a report that may be analysed.");
        }

        $report = self::REPORTS[$reportKey];
        [$class, $method] = $report['source'];

        // Not every report getter takes a filters array -- getMonthlyTrends
        // takes an int and raises a TypeError if handed one.
        $result = ($report['args'] ?? 'filters') === 'none'
            ? (new $class())->{$method}()
            : (new $class())->{$method}($filters);

        if (!is_array($result)) {
            return ['rows' => [], 'context' => [], 'dropped' => []];
        }

        // One named branch, or the whole result when the getter returns its
        // rows directly. Everything else the report returns stays here --
        // including, for the pareto report, the 50-row patient-level worklist.
        $rows = $report['branch'] === null ? $result : ($result[$report['branch']] ?? []);

        if (!is_array($rows)) {
            $rows = [];
        }

        // A declared reshaping, before the allowlist sees the rows -- so the
        // allowlist still names every field that leaves, including the ones
        // this created.
        if (!empty($report['shape'])) {
            $rows = self::{$report['shape']}($rows);
        }

        $projected = AiPayload::project($reportKey, $rows);

        $context = [];

        foreach ($report['context'] ?? [] as $key) {
            if (isset($result[$key]) && is_scalar($result[$key])) {
                $context[$key] = $result[$key];
            }
        }

        return [
            'rows' => $projected['rows'],
            'context' => $context,
            'dropped' => $projected['dropped'],
        ];
    }

    /** The volatile half of the request: this report's figures and what to do with them. */
    public static function userTurn(string $reportKey, array $payload): string
    {
        $report = self::REPORTS[$reportKey] ?? ['label' => $reportKey, 'asks' => 'Summarise this report.'];

        return "Report: {$report['label']}\n\n"
            . "Task: {$report['asks']}\n\n"
            . "Data:\n"
            . json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
}
