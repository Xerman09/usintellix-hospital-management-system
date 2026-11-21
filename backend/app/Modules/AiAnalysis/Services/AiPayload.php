<?php

namespace App\Modules\AiAnalysis\Services;

/**
 * What may leave the building, named field by field.
 *
 * This is the control that makes "no personal data was sent" something the
 * hospital can demonstrate rather than assert -- which is what the Data Privacy
 * Act asks of a controller that outsources processing (IRR § 50). See
 * docs/ai-analysis-legal-brief.md.
 *
 * TWO RULES, AND NEITHER IS NEGOTIABLE.
 *
 * ONE: THE SERVER ASSEMBLES THE PAYLOAD. A caller names a report; it never
 * supplies the data. The existing mock on /ai/health-assessment works the other
 * way round -- the browser posts a `data` blob and the controller reads it back
 * out -- and with a real model behind it that would mean the browser deciding
 * what leaves the hospital, with this file allowlisting whatever the client
 * chose to send. assertServerAssembled() refuses such a request outright rather
 * than filtering it, because a request shaped like that is a caller that has
 * misunderstood something, not a payload to clean up.
 *
 * TWO: AN UNKNOWN REPORT SENDS NOTHING. There is no default allowlist and no
 * "pass through what looks safe". Adding a report means writing its fields
 * down here, which is a small deliberate act and exactly the point at which
 * somebody looks at the columns.
 *
 * ON DROPPING RATHER THAN FAILING. When a report gains a column the allowlist
 * removes it. That is the safe direction, and a silent one, so project()
 * returns the names it dropped and AiGuardService writes them into the ledger.
 * Drift shows up as data instead of waiting to be noticed.
 *
 * FREE TEXT. A column of prose can hold a name somebody typed, and no column
 * name reveals that. Fields listed in SCRUB go through the Safe Harbor
 * free-text scrubber before they are sent. A free-text column that is not in
 * SCRUB should not be in the allowlist either.
 */
class AiPayload
{
    /**
     * Report key => the only keys that may be sent from each row.
     *
     * Deliberately short. Everything here is an aggregate: counts, sums and
     * category labels. Nothing here is a person.
     */
    public const ALLOWLIST = [
        // The first report through this, per docs/ai-analysis-roadmap.md AI-1.
        // Note what is NOT here: billing_claim_denials carries patient_id,
        // encounter_id and service_date, and the same endpoint returns a 50-row
        // worklist built from SELECT d.* that contains all three. The pareto
        // groups below are the only part that may be sent.
        // Field names taken from the rows FinancialBusinessIntelligenceService
        // actually builds, not from the SQL above them.
        //
        // Two fields that exist on those rows are deliberately absent:
        // `immediate_correction` and `recommended_strategy`. Both are static
        // advice the hospital wrote into $categoryMeta and the CARC dictionary.
        // Sending them would feed the model its own conclusions and get them
        // back as findings -- an answer that looks like analysis and is a
        // quotation. If the advice is worth showing it should be shown as the
        // hospital's, next to the summary, not laundered through a model.
        'claim_denial_pareto' => [
            'denial_category',
            'category_label',
            'carc_codes',
            'primary_carc_title',
            'claims_count',
            'denied_amount',
            'recovered_amount',
            'dollar_share_pct',
            'count_share_pct',
            'cumulative_pareto_pct',
            'overturn_rate_pct',
            'preventability',
            'responsible_owner',
        ],

        // Two further entries lived here until AI-2 and have been removed.
        //
        // `financial_executive_overview` and `ar_aging_matrix` were written
        // from what those reports sounded like rather than from their queries,
        // and AI-2 established that every field name in both was wrong --
        // getExecutiveOverview returns ward_code / revpab / margin_pct, not
        // gross_revenue; getAgingMatrix returns payer_category and a nested
        // `buckets` map, not a flat bucket column. Projected through those
        // entries each report would have sent an empty payload.
        //
        // They are deleted rather than corrected because neither report is
        // wired into AiReports yet, and an allowlist for a report nobody can
        // request is not coverage -- it is a wrong decision that looks like a
        // right one. Each comes back when AI-3 adds its report, which is the
        // moment somebody reads the columns.
        //
        // One thing AI-2 turned up that AI-3 will have to solve first:
        // getAgingMatrix keeps its aging data inside a nested `buckets` map,
        // and project() drops nested values on purpose. That report needs
        // flattening in AiReports before an allowlist can describe it.
    ];

    /**
     * Fields whose contents are prose and must be scrubbed before sending.
     *
     * None of the three reports above carries free text today. The list exists
     * so that the first report that does cannot be added without a decision
     * about it.
     */
    public const SCRUB = [];

    /**
     * Refuse a request that carries its own data.
     *
     * @throws \InvalidArgumentException
     */
    public static function assertServerAssembled(array $request): void
    {
        foreach (['data', 'payload', 'rows', 'records'] as $forbidden) {
            if (array_key_exists($forbidden, $request)) {
                throw new \InvalidArgumentException(
                    "This endpoint builds its own payload from the report. Remove \"{$forbidden}\" from the request."
                );
            }
        }
    }

    public static function knows(string $reportKey): bool
    {
        return array_key_exists($reportKey, self::ALLOWLIST);
    }

    /**
     * Project a report's rows down to what may be sent.
     *
     * @param array $rows A list of rows, or a single associative row.
     *
     * @return array{rows: array, dropped: array} dropped is the distinct key
     *         names removed, for the ledger.
     *
     * @throws \InvalidArgumentException when the report has no allowlist.
     */
    public static function project(string $reportKey, array $rows): array
    {
        if (!self::knows($reportKey)) {
            throw new \InvalidArgumentException(
                "No field allowlist is declared for \"{$reportKey}\", so nothing can be sent for it."
            );
        }

        $allowed = array_flip(self::ALLOWLIST[$reportKey]);

        // A single row is accepted and normalised, so a caller cannot slip a
        // bare associative array past the list by accident.
        if ($rows !== [] && !array_is_list($rows)) {
            $rows = [$rows];
        }

        $out = [];
        $dropped = [];

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $clean = [];

            foreach ($row as $key => $value) {
                if (!isset($allowed[$key])) {
                    $dropped[$key] = true;
                    continue;
                }

                // Nested structures are not projected, so they are not sent.
                // A report that needs one has to say so here first.
                if (is_array($value) || is_object($value)) {
                    $dropped[$key] = true;
                    continue;
                }

                $clean[$key] = $value;
            }

            if ($clean !== []) {
                $out[] = $clean;
            }
        }

        return ['rows' => $out, 'dropped' => array_keys($dropped)];
    }
}
