<?php

namespace App\Modules\AiAnalysis\Services;

use App\Modules\Reports\Services\FinancialBusinessIntelligenceService;

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
     *   branch  -- the key in that method's result holding the rows to send
     *   context -- scalar branches sent alongside, already aggregate
     *   asks    -- what the model is asked to do with it
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
    ];

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

        $result = (new $class())->{$method}($filters);

        if (!is_array($result)) {
            return ['rows' => [], 'context' => [], 'dropped' => []];
        }

        // One named branch. Everything else the report returns stays here --
        // including, for this report, the 50-row patient-level worklist.
        $rows = $result[$report['branch']] ?? [];

        $projected = AiPayload::project($reportKey, is_array($rows) ? $rows : []);

        $context = [];

        foreach ($report['context'] as $key) {
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
