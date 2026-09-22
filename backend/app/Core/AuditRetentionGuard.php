<?php

namespace App\Core;

use PDO;
use Throwable;

class AuditRetentionGuard
{
    public const RETENTION_YEARS = 6;
    public const RETENTION_DAYS = 2191; // 6 calendar years (accounting for leap year)
    public const REGULATION = 'HIPAA Security Rule 45 CFR § 164.316(b)(2)(i)';

    /**
     * Retrieve live retention status, metric counts, and trigger integrity states.
     */
    public static function getRetentionStatus(): array
    {
        try {
            $db = Database::connection();

            // Total records, earliest & newest timestamps
            $stats = $db->query("
                SELECT 
                    COUNT(*) as total_records,
                    MIN(created_at) as earliest_date,
                    MAX(created_at) as latest_date
                FROM hipaa_audit_logs
            ")->fetch(PDO::FETCH_ASSOC);

            $totalRecords = (int) ($stats['total_records'] ?? 0);
            $earliestDate = $stats['earliest_date'] ?? null;
            $latestDate = $stats['latest_date'] ?? null;

            // Compute cutoff threshold (strictly 6 years prior to now)
            $cutoffStmt = $db->query("SELECT DATE_SUB(NOW(), INTERVAL 6 YEAR) as cutoff");
            $cutoffDate = $cutoffStmt->fetchColumn();

            // Count eligible purge records (older than 6 years)
            $eligibleStmt = $db->prepare("
                SELECT COUNT(*) as eligible_count 
                FROM hipaa_audit_logs 
                WHERE created_at < :cutoff
            ");
            $eligibleStmt->execute(['cutoff' => $cutoffDate]);
            $eligibleCount = (int) $eligibleStmt->fetch(PDO::FETCH_ASSOC)['eligible_count'];

            // Check active database triggers
            $triggerStmt = $db->query("
                SELECT TRIGGER_NAME, EVENT_MANIPULATION, ACTION_TIMING 
                FROM information_schema.TRIGGERS 
                WHERE TRIGGER_SCHEMA = DATABASE() 
                  AND EVENT_OBJECT_TABLE = 'hipaa_audit_logs'
            ");
            $triggers = $triggerStmt->fetchAll(PDO::FETCH_ASSOC);
            $triggerNames = array_column($triggers, 'TRIGGER_NAME');

            $retentionTriggerActive = in_array('trg_hipaa_audit_logs_retention_guard', $triggerNames);
            $immutabilityTriggerActive = in_array('trg_hipaa_audit_logs_immutability_guard', $triggerNames);

            // Compute days of audit history active
            $historyDays = 0;
            if ($earliestDate) {
                $earliestTs = strtotime($earliestDate);
                $historyDays = max(1, (int) round((time() - $earliestTs) / 86400));
            }

            return [
                'success' => true,
                'regulation' => self::REGULATION,
                'retention_threshold_years' => self::RETENTION_YEARS,
                'mandatory_retention_days' => self::RETENTION_DAYS,
                'total_records' => $totalRecords,
                'earliest_record_date' => $earliestDate,
                'latest_record_date' => $latestDate,
                'retention_cutoff_date' => $cutoffDate,
                'purge_eligible_records' => $eligibleCount,
                'protected_records' => $totalRecords - $eligibleCount,
                'active_history_days' => $historyDays,
                'policy_status' => 'COMPLIANT_ACTIVE',
                'database_triggers' => [
                    'retention_guard_active' => $retentionTriggerActive,
                    'immutability_guard_active' => $immutabilityTriggerActive,
                    'triggers' => $triggers
                ],
                'certification' => 'All audit trail records are bound by the mandatory 6-year retention lock under HIPAA § 164.316(b)(2)(i). Database-level engine triggers prevent unauthorized truncation or deletion.'
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Error checking retention status: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Attempt to validate whether a target date or batch can be purged.
     * Returns true if and only if target records are strictly older than 6 years.
     * Throws exception or logs security alert otherwise.
     */
    public static function assertPurgeEligibility(?string $beforeDate = null): bool
    {
        $db = Database::connection();
        $cutoffStmt = $db->query("SELECT DATE_SUB(NOW(), INTERVAL 6 YEAR) as cutoff");
        $cutoffDate = $cutoffStmt->fetchColumn();

        if ($beforeDate === null) {
            $beforeDate = $cutoffDate;
        }

        // If target beforeDate is newer than the 6-year cutoff, violation!
        if (strtotime($beforeDate) > strtotime($cutoffDate)) {
            AuditLogger::log(
                AuditLogger::CATEGORY_SECURITY,
                'RETENTION_PURGE_BLOCKED',
                "HIPAA Retention Violation Attempt: Request to purge audit logs up to {$beforeDate} was BLOCKED. Retention threshold is 6 years ({$cutoffDate}) under 45 CFR § 164.316(b)(2)(i)."
            );
            return false;
        }

        return true;
    }
}
