<?php

namespace App\Modules\Reports\Services;

use App\Core\Database;
use PDO;
use Throwable;

class ClinicalQualityAnalyticsService
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::connection();
    }

    /**
     * Compute and aggregate clinical quality and hospital utilization KPIs for a single census date.
     * Computes metrics hospital-wide (ward_id = 0) and for each distinct hospital ward.
     */
    public function calculateForDate(string $targetDate, string $source = 'nightly_cron'): array
    {
        // 1. Fetch all active wards
        $wardStmt = $this->pdo->query("SELECT id, ward_code, ward_name, total_beds_count FROM hospital_wards WHERE is_active = 1 ORDER BY id");
        $activeWards = $wardStmt->fetchAll(PDO::FETCH_ASSOC);

        // Include Hospital-Wide (ward_id = 0)
        $targets = array_merge([
            ['id' => 0, 'ward_code' => 'ALL', 'ward_name' => 'All Wards / Entire Hospital', 'total_beds_count' => 0]
        ], $activeWards);

        $results = [];

        foreach ($targets as $w) {
            $wardId = (int)$w['id'];
            $wardName = $w['ward_name'];

            // A. Total Available Beds
            if ($wardId > 0) {
                $bStmt = $this->pdo->prepare("SELECT COUNT(*) FROM hospital_beds WHERE ward_id = ? AND is_active = 1");
                $bStmt->execute([$wardId]);
                $availBeds = (int)$bStmt->fetchColumn();
                if ($availBeds === 0 && !empty($w['total_beds_count'])) {
                    $availBeds = (int)$w['total_beds_count'];
                }
            } else {
                $bStmt = $this->pdo->query("SELECT COUNT(*) FROM hospital_beds WHERE is_active = 1");
                $availBeds = (int)$bStmt->fetchColumn();
                if ($availBeds === 0) {
                    $availBeds = (int)$this->pdo->query("SELECT SUM(total_beds_count) FROM hospital_wards WHERE is_active = 1")->fetchColumn() ?: 47;
                }
            }

            // B. Maintenance / Blocked Beds
            if ($wardId > 0) {
                $mStmt = $this->pdo->prepare("SELECT COUNT(*) FROM hospital_beds WHERE ward_id = ? AND is_active = 1 AND status IN ('Maintenance', 'Blocked')");
                $mStmt->execute([$wardId]);
                $blockedBeds = (int)$mStmt->fetchColumn();
            } else {
                $blockedBeds = (int)$this->pdo->query("SELECT COUNT(*) FROM hospital_beds WHERE is_active = 1 AND status IN ('Maintenance', 'Blocked')")->fetchColumn();
            }

            // C. Occupied Beds at Census Date (Inpatients present on targetDate)
            $occSql = "
                SELECT COUNT(DISTINCT id) FROM inpatient_admissions
                WHERE DATE(admission_date) <= :dt
                  AND (discharge_date IS NULL OR DATE(discharge_date) >= :dt)
            ";
            $occParams = ['dt' => $targetDate];
            if ($wardId > 0) {
                $occSql .= " AND ward_id = :ward";
                $occParams['ward'] = $wardId;
            }
            $occStmt = $this->pdo->prepare($occSql);
            $occStmt->execute($occParams);
            $occupiedBeds = (int)$occStmt->fetchColumn();

            // Guard: occupied beds cannot exceed available beds unless surge overflow
            $vacantBeds = max(0, $availBeds - $occupiedBeds);

            // D. Admissions on Target Date
            $admSql = "SELECT COUNT(*) FROM inpatient_admissions WHERE DATE(admission_date) = :dt";
            $admParams = ['dt' => $targetDate];
            if ($wardId > 0) {
                $admSql .= " AND ward_id = :ward";
                $admParams['ward'] = $wardId;
            }
            $admStmt = $this->pdo->prepare($admSql);
            $admStmt->execute($admParams);
            $admissionsCount = (int)$admStmt->fetchColumn();

            // E. Live Discharges on Target Date
            $disSql = "
                SELECT COUNT(*) FROM inpatient_admissions
                WHERE DATE(discharge_date) = :dt
                  AND status = 'Discharged'
                  AND (discharge_disposition IS NULL OR discharge_disposition != 'Expired')
            ";
            $disParams = ['dt' => $targetDate];
            if ($wardId > 0) {
                $disSql .= " AND ward_id = :ward";
                $disParams['ward'] = $wardId;
            }
            $disStmt = $this->pdo->prepare($disSql);
            $disStmt->execute($disParams);
            $dischargesCount = (int)$disStmt->fetchColumn();

            // F. Inpatient Deaths on Target Date
            $dthSql = "
                SELECT COUNT(*) FROM inpatient_admissions
                WHERE (DATE(discharge_date) = :dt OR DATE(updated_at) = :dt)
                  AND (status = 'Deceased' OR discharge_disposition = 'Expired')
            ";
            $dthParams = ['dt' => $targetDate];
            if ($wardId > 0) {
                $dthSql .= " AND ward_id = :ward";
                $dthParams['ward'] = $wardId;
            }
            $dthStmt = $this->pdo->prepare($dthSql);
            $dthStmt->execute($dthParams);
            $deathsCount = (int)$dthStmt->fetchColumn();

            // G. Total Discharge Days (Sum of LOS for patients who left on targetDate)
            $staySql = "
                SELECT SUM(GREATEST(1, DATEDIFF(DATE(discharge_date), DATE(admission_date)))) AS total_days
                FROM inpatient_admissions
                WHERE DATE(discharge_date) = :dt
                  AND status IN ('Discharged', 'Deceased')
            ";
            $stayParams = ['dt' => $targetDate];
            if ($wardId > 0) {
                $staySql .= " AND ward_id = :ward";
                $stayParams['ward'] = $wardId;
            }
            $stayStmt = $this->pdo->prepare($staySql);
            $stayStmt->execute($stayParams);
            $totalDischargeDays = (int)($stayStmt->fetchColumn() ?: 0);

            // Calculations:
            // 1. Bed Occupancy Rate (BOR %): (Occupied / Available) * 100
            $borPercentage = ($availBeds > 0)
                ? round(($occupiedBeds / $availBeds) * 100.0, 2)
                : 0.00;

            // 2. Average Length of Stay (ALOS in days): Total Stay Days / Total Separations (Discharges + Deaths)
            $totalSeparations = $dischargesCount + $deathsCount;
            $alosDays = ($totalSeparations > 0 && $totalDischargeDays > 0)
                ? round($totalDischargeDays / $totalSeparations, 2)
                : 0.00;

            // 3. Bed Turnover Interval (BTI in days): Vacant Bed Days / Total Discharges
            $btiDays = ($totalSeparations > 0)
                ? round($vacantBeds / $totalSeparations, 2)
                : round($vacantBeds / max(1, $availBeds), 2);

            // 4. Turnover Rate
            $turnoverRate = ($availBeds > 0)
                ? round($totalSeparations / $availBeds, 2)
                : 0.00;

            // H. 30-Day Unplanned Readmissions on Target Date
            $readmSql = "
                SELECT COUNT(*) FROM readmission_mortality_records
                WHERE readmission_status = 'Unplanned Readmission (Within 30 Days)'
                  AND (readmission_date = :dt OR (readmission_date IS NULL AND index_discharge_date = :dt))
            ";
            $readmParams = ['dt' => $targetDate];
            if ($wardId > 0) {
                $readmSql .= " AND (ward_bed LIKE :wname OR department LIKE :wname)";
                $readmParams['wname'] = "%{$wardName}%";
            }
            $readmStmt = $this->pdo->prepare($readmSql);
            $readmStmt->execute($readmParams);
            $readmissionsCount = (int)$readmStmt->fetchColumn();

            $readmissionRatePct = ($dischargesCount > 0)
                ? round(($readmissionsCount / $dischargesCount) * 100.0, 2)
                : ($readmissionsCount > 0 ? 100.00 : 0.00);

            // I. Inpatient Mortality Rate %
            $mortalityRatePct = ($totalSeparations > 0)
                ? round(($deathsCount / $totalSeparations) * 100.0, 2)
                : 0.00;

            // J. HAI & SSI Infections Detected on Target Date
            $haiSql = "
                SELECT COUNT(*) FROM hai_ssi_infections
                WHERE (onset_date = :dt OR DATE(report_date) = :dt)
            ";
            $haiParams = ['dt' => $targetDate];
            if ($wardId > 0) {
                $haiSql .= " AND (department LIKE :wname OR ward_bed LIKE :wname)";
                $haiParams['wname'] = "%{$wardName}%";
            }
            $haiStmt = $this->pdo->prepare($haiSql);
            $haiStmt->execute($haiParams);
            $haiCount = (int)$haiStmt->fetchColumn();

            $haiRatePer1000 = ($occupiedBeds > 0)
                ? round(($haiCount / $occupiedBeds) * 1000.0, 2)
                : 0.00;

            // K. Insert / Upsert into analytics_clinical_quality_daily
            $upsertSql = "
                INSERT INTO analytics_clinical_quality_daily (
                    census_date,
                    ward_id,
                    ward_name,
                    total_available_beds,
                    occupied_beds,
                    vacant_beds,
                    maintenance_blocked_beds,
                    admissions_count,
                    discharges_count,
                    inpatient_deaths_count,
                    transfers_in_count,
                    transfers_out_count,
                    total_discharge_days,
                    bor_percentage,
                    alos_days,
                    bti_days,
                    turnover_rate,
                    readmissions_30d_count,
                    readmission_rate_pct,
                    mortality_rate_pct,
                    hai_ssi_cases_count,
                    hai_rate_per_1000,
                    aggregation_source,
                    calculated_at
                ) VALUES (
                    :census_date,
                    :ward_id,
                    :ward_name,
                    :total_available_beds,
                    :occupied_beds,
                    :vacant_beds,
                    :maintenance_blocked_beds,
                    :admissions_count,
                    :discharges_count,
                    :inpatient_deaths_count,
                    0,
                    0,
                    :total_discharge_days,
                    :bor_percentage,
                    :alos_days,
                    :bti_days,
                    :turnover_rate,
                    :readmissions_30d_count,
                    :readmission_rate_pct,
                    :mortality_rate_pct,
                    :hai_ssi_cases_count,
                    :hai_rate_per_1000,
                    :aggregation_source,
                    NOW()
                )
                ON DUPLICATE KEY UPDATE
                    ward_name                = VALUES(ward_name),
                    total_available_beds     = VALUES(total_available_beds),
                    occupied_beds            = VALUES(occupied_beds),
                    vacant_beds              = VALUES(vacant_beds),
                    maintenance_blocked_beds = VALUES(maintenance_blocked_beds),
                    admissions_count         = VALUES(admissions_count),
                    discharges_count         = VALUES(discharges_count),
                    inpatient_deaths_count   = VALUES(inpatient_deaths_count),
                    total_discharge_days     = VALUES(total_discharge_days),
                    bor_percentage           = VALUES(bor_percentage),
                    alos_days                = VALUES(alos_days),
                    bti_days                 = VALUES(bti_days),
                    turnover_rate            = VALUES(turnover_rate),
                    readmissions_30d_count   = VALUES(readmissions_30d_count),
                    readmission_rate_pct     = VALUES(readmission_rate_pct),
                    mortality_rate_pct       = VALUES(mortality_rate_pct),
                    hai_ssi_cases_count      = VALUES(hai_ssi_cases_count),
                    hai_rate_per_1000        = VALUES(hai_rate_per_1000),
                    aggregation_source       = VALUES(aggregation_source),
                    calculated_at            = NOW()
            ";

            $stmtUpsert = $this->pdo->prepare($upsertSql);
            $stmtUpsert->execute([
                'census_date'              => $targetDate,
                'ward_id'                  => $wardId,
                'ward_name'                => $wardName,
                'total_available_beds'     => $availBeds,
                'occupied_beds'            => $occupiedBeds,
                'vacant_beds'              => $vacantBeds,
                'maintenance_blocked_beds' => $blockedBeds,
                'admissions_count'         => $admissionsCount,
                'discharges_count'         => $dischargesCount,
                'inpatient_deaths_count'   => $deathsCount,
                'total_discharge_days'     => $totalDischargeDays,
                'bor_percentage'           => $borPercentage,
                'alos_days'                => $alosDays,
                'bti_days'                 => $btiDays,
                'turnover_rate'            => $turnoverRate,
                'readmissions_30d_count'   => $readmissionsCount,
                'readmission_rate_pct'     => $readmissionRatePct,
                'mortality_rate_pct'       => $mortalityRatePct,
                'hai_ssi_cases_count'      => $haiCount,
                'hai_rate_per_1000'        => $haiRatePer1000,
                'aggregation_source'       => $source
            ]);

            $results[] = [
                'ward_id'        => $wardId,
                'ward_name'      => $wardName,
                'available_beds' => $availBeds,
                'occupied_beds'  => $occupiedBeds,
                'bor_percentage' => $borPercentage,
                'alos_days'      => $alosDays,
                'bti_days'       => $btiDays
            ];
        }

        return [
            'census_date' => $targetDate,
            'processed'   => count($results),
            'wards'       => $results
        ];
    }

    /**
     * Backfill a date range (e.g. past 30 days) to populate historical trend data.
     */
    public function backfillRange(string $startDate, string $endDate, string $source = 'manual_recalc'): array
    {
        $current = strtotime($startDate);
        $end = strtotime($endDate);
        $datesProcessed = [];

        while ($current <= $end) {
            $dt = date('Y-m-d', $current);
            $this->calculateForDate($dt, $source);
            $datesProcessed[] = $dt;
            $current = strtotime("+1 day", $current);
        }

        return [
            'success'         => true,
            'start_date'      => $startDate,
            'end_date'        => $endDate,
            'days_calculated' => count($datesProcessed),
            'dates'           => $datesProcessed
        ];
    }

    /**
     * Retrieve executive summary KPIs over a specified period.
     */
    public function getSummaryMetrics(array $filters = []): array
    {
        $today = date('Y-m-d');
        $to = !empty($filters['to']) ? $filters['to'] : $today;
        $from = !empty($filters['from']) ? $filters['from'] : date('Y-m-d', strtotime('-29 days', strtotime($to)));
        $wardId = isset($filters['ward_id']) && $filters['ward_id'] !== '' ? (int)$filters['ward_id'] : 0;

        // Ensure records are present for today and the range; if none, backfill past 30 days
        $checkStmt = $this->pdo->prepare("SELECT COUNT(*) FROM analytics_clinical_quality_daily WHERE census_date BETWEEN ? AND ? AND ward_id = ?");
        $checkStmt->execute([$from, $to, $wardId]);
        if ((int)$checkStmt->fetchColumn() === 0) {
            $this->backfillRange($from, $to, 'realtime_snapshot');
        }

        $sql = "
            SELECT
                COUNT(DISTINCT census_date) AS total_days,
                SUM(total_available_beds)   AS sum_available_bed_days,
                SUM(occupied_beds)          AS sum_occupied_bed_days,
                SUM(vacant_beds)            AS sum_vacant_bed_days,
                SUM(admissions_count)       AS total_admissions,
                SUM(discharges_count)       AS total_discharges,
                SUM(inpatient_deaths_count) AS total_deaths,
                SUM(total_discharge_days)   AS total_discharge_stay_days,
                SUM(readmissions_30d_count) AS total_readmissions,
                SUM(hai_ssi_cases_count)    AS total_hai_cases,
                AVG(bor_percentage)         AS avg_bor_percentage,
                AVG(alos_days)              AS avg_alos_days,
                AVG(bti_days)               AS avg_bti_days
            FROM analytics_clinical_quality_daily
            WHERE census_date BETWEEN :from AND :to
              AND ward_id = :ward_id
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['from' => $from, 'to' => $to, 'ward_id' => $wardId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $availBedDays = (int)($row['sum_available_bed_days'] ?? 0);
        $occBedDays   = (int)($row['sum_occupied_bed_days'] ?? 0);
        $vacantBedDays= (int)($row['sum_vacant_bed_days'] ?? 0);
        $discharges   = (int)($row['total_discharges'] ?? 0);
        $deaths       = (int)($row['total_deaths'] ?? 0);
        $stayDays     = (int)($row['total_discharge_stay_days'] ?? 0);
        $readmissions = (int)($row['total_readmissions'] ?? 0);
        $haiCases     = (int)($row['total_hai_cases'] ?? 0);

        // Mathematical Standards:
        // Bed Occupancy Rate (BOR %): (Total Inpatient Bed Days Occupied / Total Available Bed Days) * 100
        $trueBor = ($availBedDays > 0)
            ? round(($occBedDays / $availBedDays) * 100.0, 1)
            : round((float)($row['avg_bor_percentage'] ?? 0.0), 1);

        // Average Length of Stay (ALOS in days): Total Inpatient Discharge Days / Total Discharges
        $trueAlos = ($discharges + $deaths > 0 && $stayDays > 0)
            ? round($stayDays / ($discharges + $deaths), 1)
            : round((float)($row['avg_alos_days'] ?? 0.0), 1);

        // Bed Turnover Interval (BTI in days): Vacant Bed Days / Total Discharges
        $trueBti = ($discharges + $deaths > 0)
            ? round($vacantBedDays / ($discharges + $deaths), 1)
            : round((float)($row['avg_bti_days'] ?? 0.0), 1);

        // 30-Day Readmission Rate %
        $readmRate = ($discharges > 0)
            ? round(($readmissions / $discharges) * 100.0, 1)
            : 0.0;

        // Inpatient Mortality Rate %
        $mortalityRate = ($discharges + $deaths > 0)
            ? round(($deaths / ($discharges + $deaths)) * 100.0, 1)
            : 0.0;

        // HAI rate per 1,000 occupied bed-days
        $haiRate = ($occBedDays > 0)
            ? round(($haiCases / $occBedDays) * 1000.0, 2)
            : 0.0;

        // Live Real-Time Current Snapshot (Most recent census date)
        $snapSql = "
            SELECT * FROM analytics_clinical_quality_daily
            WHERE ward_id = :ward_id
            ORDER BY census_date DESC
            LIMIT 1
        ";
        $snapStmt = $this->pdo->prepare($snapSql);
        $snapStmt->execute(['ward_id' => $wardId]);
        $latest = $snapStmt->fetch(PDO::FETCH_ASSOC) ?: [];

        // Benchmarks Evaluation:
        // BOR: 75% - 85% is optimal
        $borStatus = ($trueBor >= 75.0 && $trueBor <= 85.0) ? 'Optimal' : ($trueBor < 75.0 ? 'Underutilized' : 'Capacity Strain');
        // ALOS: typical target <= 4.5 days for general acute hospital
        $alosStatus = ($trueAlos <= 5.0) ? 'Favorable' : 'Extended Stay';
        // Readmission: CMS threshold < 8.0%
        $readmStatus = ($readmRate <= 8.0) ? 'Compliant' : 'Above Benchmark';

        return [
            'period' => [
                'from' => $from,
                'to'   => $to,
                'days' => (int)($row['total_days'] ?? 0)
            ],
            'ward' => [
                'id'   => $wardId,
                'name' => $wardId === 0 ? 'All Wards / Entire Hospital' : ($latest['ward_name'] ?? 'Selected Ward')
            ],
            'metrics' => [
                'bed_occupancy_rate'        => $trueBor,
                'bor_status'                => $borStatus,
                'average_length_of_stay'    => $trueAlos,
                'alos_status'               => $alosStatus,
                'bed_turnover_interval_days'=> $trueBti,
                'readmission_rate_pct'      => $readmRate,
                'readmission_status'        => $readmStatus,
                'mortality_rate_pct'        => $mortalityRate,
                'total_admissions'          => (int)($row['total_admissions'] ?? 0),
                'total_discharges'          => $discharges,
                'total_deaths'              => $deaths,
                'total_occupied_bed_days'   => $occBedDays,
                'total_available_bed_days'  => $availBedDays,
                'total_vacant_bed_days'     => $vacantBedDays,
                'total_readmissions_30d'    => $readmissions,
                'total_hai_ssi_cases'       => $haiCases,
                'hai_rate_per_1000'         => $haiRate
            ],
            'current_snapshot' => [
                'date'             => $latest['census_date'] ?? $today,
                'available_beds'   => (int)($latest['total_available_beds'] ?? 0),
                'occupied_beds'    => (int)($latest['occupied_beds'] ?? 0),
                'vacant_beds'      => (int)($latest['vacant_beds'] ?? 0),
                'blocked_beds'     => (int)($latest['maintenance_blocked_beds'] ?? 0),
                'bor_today'        => (float)($latest['bor_percentage'] ?? 0.0),
                'admissions_today' => (int)($latest['admissions_count'] ?? 0),
                'discharges_today' => (int)($latest['discharges_count'] ?? 0)
            ]
        ];
    }

    /**
     * Retrieve daily series data for trend visualizations (SVG charts).
     */
    public function getTrends(array $filters = []): array
    {
        $to = !empty($filters['to']) ? $filters['to'] : date('Y-m-d');
        $from = !empty($filters['from']) ? $filters['from'] : date('Y-m-d', strtotime('-29 days', strtotime($to)));
        $wardId = isset($filters['ward_id']) && $filters['ward_id'] !== '' ? (int)$filters['ward_id'] : 0;

        $sql = "
            SELECT
                census_date,
                ward_name,
                total_available_beds,
                occupied_beds,
                vacant_beds,
                maintenance_blocked_beds,
                admissions_count,
                discharges_count,
                inpatient_deaths_count,
                total_discharge_days,
                bor_percentage,
                alos_days,
                bti_days,
                readmissions_30d_count,
                readmission_rate_pct,
                mortality_rate_pct,
                hai_ssi_cases_count
            FROM analytics_clinical_quality_daily
            WHERE census_date BETWEEN :from AND :to
              AND ward_id = :ward_id
            ORDER BY census_date ASC
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['from' => $from, 'to' => $to, 'ward_id' => $wardId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'from'    => $from,
            'to'      => $to,
            'ward_id' => $wardId,
            'series'  => $rows
        ];
    }

    /**
     * Retrieve ward-by-ward comparative utilization metrics.
     */
    public function getWardBreakdown(array $filters = []): array
    {
        $to = !empty($filters['to']) ? $filters['to'] : date('Y-m-d');
        $from = !empty($filters['from']) ? $filters['from'] : date('Y-m-d', strtotime('-29 days', strtotime($to)));

        $sql = "
            SELECT
                d.ward_id,
                w.ward_code,
                COALESCE(w.ward_name, d.ward_name) as ward_name,
                w.ward_type,
                MAX(d.total_available_beds) AS capacity_beds,
                AVG(d.bor_percentage)       AS avg_bor_percentage,
                AVG(d.alos_days)            AS avg_alos_days,
                AVG(d.bti_days)             AS avg_bti_days,
                SUM(d.admissions_count)     AS total_admissions,
                SUM(d.discharges_count)     AS total_discharges,
                SUM(d.inpatient_deaths_count) AS total_deaths,
                SUM(d.occupied_beds)        AS total_patient_days,
                SUM(d.readmissions_30d_count) AS total_readmissions,
                SUM(d.hai_ssi_cases_count)  AS total_hai_cases
            FROM analytics_clinical_quality_daily d
            INNER JOIN hospital_wards w ON d.ward_id = w.id
            WHERE d.census_date BETWEEN :from AND :to
              AND d.ward_id > 0
            GROUP BY d.ward_id, w.ward_code, w.ward_name, w.ward_type
            ORDER BY capacity_beds DESC, avg_bor_percentage DESC
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['from' => $from, 'to' => $to]);
        $wards = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($wards as &$w) {
            $w['avg_bor_percentage'] = round((float)$w['avg_bor_percentage'], 1);
            $w['avg_alos_days'] = round((float)$w['avg_alos_days'], 1);
            $w['avg_bti_days'] = round((float)$w['avg_bti_days'], 1);
            $w['readmission_rate_pct'] = ((int)$w['total_discharges'] > 0)
                ? round(((int)$w['total_readmissions'] / (int)$w['total_discharges']) * 100.0, 1)
                : 0.0;
        }

        return [
            'from'  => $from,
            'to'    => $to,
            'wards' => $wards
        ];
    }
}
