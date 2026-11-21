<?php

namespace App\Modules\AiAnalysis\Services;

use App\Modules\ArAging\Services\ArAgingService;
use App\Modules\BloodBank\Services\BloodInventoryService;
use App\Modules\Census\Services\CensusReportService;
use App\Modules\DoctorCommissions\Services\DoctorCommissionService;
use App\Modules\DrugInventory\Services\NarcoticsVaultService;
use App\Modules\OrManagement\Services\OrReportService;
use App\Modules\Procurement\Services\ProcurementReportService;
use App\Modules\Reports\Services\FinancialBusinessIntelligenceService;
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

        'ar_aging_matrix' => [
            'label' => 'AR aging matrix',
            'source' => [ArAgingService::class, 'getAgingMatrix'],
            'branch' => 'matrix',
            'shape' => 'flattenAgingBuckets',
            'asks' => 'Say which payers are slow and where the balance is concentrated by age. Note anything '
                . 'sitting beyond ninety days.',
        ],

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

        'blood_inventory_stats' => [
            'label' => 'Blood inventory',
            'source' => [BloodInventoryService::class, 'getInventoryStats'],
            'branch' => null,
            'asks' => 'Summarise what is available against what is quarantined, reserved or close to expiry.',
        ],

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
