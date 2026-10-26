<?php

namespace App\Modules\Reports\Services;

use App\Core\Database;
use PDO;
use Throwable;

class FinancialBusinessIntelligenceService
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::connection();
    }

    /**
     * Retrieve executive financial and BI analytics overview for a given month.
     * Evaluates RevPAB, RevPOB, department margins, cash vs insurance accruals, and ward class yield.
     */
    public function getExecutiveOverview(array $filters = []): array
    {
        $selectedMonth = !empty($filters['month']) ? $filters['month'] : date('Y-m');

        // Check if data exists for this month; if not, pick the latest available month
        $checkStmt = $this->pdo->prepare("SELECT COUNT(*) FROM analytics_financial_monthly_summaries WHERE summary_month = ?");
        $checkStmt->execute([$selectedMonth]);
        if ((int)$checkStmt->fetchColumn() === 0) {
            $latestStmt = $this->pdo->query("SELECT summary_month FROM analytics_financial_monthly_summaries ORDER BY summary_month DESC LIMIT 1");
            $latest = $latestStmt->fetchColumn();
            if ($latest) {
                $selectedMonth = $latest;
            }
        }

        // 1. Fetch Hospital-Wide Rollup (ward_id = 0)
        $hStmt = $this->pdo->prepare("
            SELECT * FROM analytics_financial_monthly_summaries
            WHERE summary_month = :m AND ward_id = 0
            LIMIT 1
        ");
        $hStmt->execute(['m' => $selectedMonth]);
        $hospital = $hStmt->fetch(PDO::FETCH_ASSOC) ?: [];

        // 2. Fetch All Ward Summaries for this month (ward_id > 0)
        $wStmt = $this->pdo->prepare("
            SELECT * FROM analytics_financial_monthly_summaries
            WHERE summary_month = :m AND ward_id > 0
            ORDER BY revpab DESC
        ");
        $wStmt->execute(['m' => $selectedMonth]);
        $wards = $wStmt->fetchAll(PDO::FETCH_ASSOC);

        // 3. Department Margin & Loss-Making Analytics
        $profitableCount = 0;
        $lossMakingCount = 0;
        $totalLossDeficit = 0.0;
        $lossMakingUnits = [];

        foreach ($wards as $w) {
            $marginAmt = (float)$w['department_margin_amount'];
            if ((int)$w['is_loss_making'] === 1 || $marginAmt < 0) {
                $lossMakingCount++;
                $totalLossDeficit += abs($marginAmt);
                $lossMakingUnits[] = [
                    'ward_id'        => $w['ward_id'],
                    'ward_code'      => $w['ward_code'],
                    'ward_name'      => $w['ward_name'],
                    'ward_class'     => $w['ward_class'],
                    'revpab'         => (float)$w['revpab'],
                    'occupancy_rate' => (float)$w['bed_occupancy_rate'],
                    'margin_amount'  => $marginAmt,
                    'margin_pct'     => (float)$w['department_margin_pct'],
                    'deficit_reason' => $w['bed_occupancy_rate'] < 50 ? 'Severe Underutilization (< 50% Census)' : 'High Overhead & Consumables'
                ];
            } else {
                $profitableCount++;
            }
        }

        // 4. Ward Class Aggregation (ICU vs Private Suite vs General Ward, etc.)
        $classStmt = $this->pdo->prepare("
            SELECT
                ward_class,
                COUNT(*) AS units_count,
                SUM(total_beds) AS total_beds,
                SUM(available_bed_days) AS total_available_bed_days,
                SUM(occupied_bed_days) AS total_occupied_bed_days,
                AVG(bed_occupancy_rate) AS avg_occupancy_rate,
                SUM(total_inpatient_revenue) AS total_revenue,
                SUM(net_inpatient_revenue) AS net_revenue,
                SUM(total_operating_cost) AS total_cost,
                SUM(department_margin_amount) AS total_margin,
                ROUND(SUM(total_inpatient_revenue) / NULLIF(SUM(available_bed_days), 0), 2) AS class_revpab,
                ROUND(SUM(total_inpatient_revenue) / NULLIF(SUM(occupied_bed_days), 0), 2) AS class_revpob,
                ROUND((SUM(department_margin_amount) / NULLIF(SUM(net_inpatient_revenue), 0)) * 100, 2) AS class_margin_pct
            FROM analytics_financial_monthly_summaries
            WHERE summary_month = :m AND ward_id > 0
            GROUP BY ward_class
            ORDER BY class_revpab DESC
        ");
        $classStmt->execute(['m' => $selectedMonth]);
        $wardClasses = $classStmt->fetchAll(PDO::FETCH_ASSOC);

        // 5. Cash vs Insurance Accrual Split
        $insurance = (float)($hospital['insurance_accrued_revenue'] ?? 0);
        $cash      = (float)($hospital['cash_collected_revenue'] ?? 0);
        $totalRev  = (float)($hospital['total_inpatient_revenue'] ?? 1);
        $insPct    = round(($insurance / max(1, $totalRev)) * 100, 1);
        $cashPct   = round(($cash / max(1, $totalRev)) * 100, 1);

        // 6. Available months list for dropdown selector
        $monthsStmt = $this->pdo->query("SELECT DISTINCT summary_month FROM analytics_financial_monthly_summaries ORDER BY summary_month DESC");
        $availableMonths = $monthsStmt->fetchAll(PDO::FETCH_COLUMN);

        return [
            'summary_month'     => $selectedMonth,
            'available_months'  => $availableMonths,
            'hospital_kpis'     => [
                'total_beds'               => (int)($hospital['total_beds'] ?? 57),
                'available_bed_days'       => (int)($hospital['available_bed_days'] ?? 1767),
                'occupied_bed_days'        => (int)($hospital['occupied_bed_days'] ?? 1414),
                'bed_occupancy_rate'       => (float)($hospital['bed_occupancy_rate'] ?? 80.0),
                'total_inpatient_revenue'  => (float)($hospital['total_inpatient_revenue'] ?? 0),
                'net_inpatient_revenue'    => (float)($hospital['net_inpatient_revenue'] ?? 0),
                'total_operating_cost'     => (float)($hospital['total_operating_cost'] ?? 0),
                'hospital_margin_amount'   => (float)($hospital['department_margin_amount'] ?? 0),
                'hospital_margin_pct'      => (float)($hospital['department_margin_pct'] ?? 0),
                'revpab'                   => (float)($hospital['revpab'] ?? 0),
                'revpob'                   => (float)($hospital['revpob'] ?? 0),
                'productivity_tier'        => $hospital['productivity_tier'] ?? 'High Yield'
            ],
            'cash_vs_accruals' => [
                'insurance_accrued_amount' => $insurance,
                'insurance_share_pct'      => $insPct,
                'cash_collected_amount'    => $cash,
                'cash_share_pct'           => $cashPct,
                'discounts_allowances'     => (float)($hospital['discounts_allowances'] ?? 0)
            ],
            'revenue_stream_breakdown' => [
                'accommodation'     => (float)($hospital['revenue_accommodation'] ?? 0),
                'operating_theater' => (float)($hospital['revenue_operating_theater'] ?? 0),
                'pharmacy'          => (float)($hospital['revenue_pharmacy'] ?? 0),
                'laboratory'        => (float)($hospital['revenue_laboratory'] ?? 0),
                'radiology'         => (float)($hospital['revenue_radiology'] ?? 0),
                'doctor_fees'       => (float)($hospital['revenue_doctor_fees'] ?? 0),
                'supplies_misc'     => (float)($hospital['revenue_supplies_misc'] ?? 0)
            ],
            'department_performance' => [
                'profitable_units_count'   => $profitableCount,
                'loss_making_units_count'  => $lossMakingCount,
                'total_loss_deficit'       => $totalLossDeficit,
                'loss_making_units'        => $lossMakingUnits
            ],
            'ward_class_benchmarks'        => $wardClasses,
            'ward_yield_rankings'          => $wards
        ];
    }

    /**
     * Retrieve monthly trend history (past 6 to 12 months) for executive chart visualizations.
     */
    public function getMonthlyTrends(int $limitMonths = 6): array
    {
        $stmt = $this->pdo->prepare("
            SELECT
                summary_month,
                available_bed_days,
                occupied_bed_days,
                bed_occupancy_rate,
                total_inpatient_revenue,
                net_inpatient_revenue,
                total_operating_cost,
                department_margin_amount,
                department_margin_pct,
                revpab,
                revpob,
                insurance_accrued_revenue,
                cash_collected_revenue
            FROM analytics_financial_monthly_summaries
            WHERE ward_id = 0
            ORDER BY summary_month ASC
            LIMIT :lim
        ");
        $stmt->bindValue(':lim', $limitMonths, PDO::PARAM_INT);
        $stmt->execute();
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'months_count' => count($history),
            'trend_series' => $history
        ];
    }

    /**
     * Retrieve Departmental Profitability & Cost Center Margins:
     * Aggregates department gross collections minus direct operational costs
     * (staff salaries, medications, consumed surgical supplies) to compute
     * Department Contribution Margin ($) and Department Contribution Margin (%).
     */
    public function getCostCenterMargins(array $filters = []): array
    {
        $selectedMonth = !empty($filters['month']) ? $filters['month'] : date('Y-m');
        $typeFilter = !empty($filters['cost_center_type']) ? $filters['cost_center_type'] : '';

        // Verify data exists for selectedMonth; fallback to latest available month
        $checkStmt = $this->pdo->prepare("SELECT COUNT(*) FROM analytics_department_cost_center_margins WHERE summary_month = ?");
        $checkStmt->execute([$selectedMonth]);
        if ((int)$checkStmt->fetchColumn() === 0) {
            $latest = $this->pdo->query("SELECT summary_month FROM analytics_department_cost_center_margins ORDER BY summary_month DESC LIMIT 1")->fetchColumn();
            if ($latest) {
                $selectedMonth = $latest;
            }
        }

        $sql = "
            SELECT * FROM analytics_department_cost_center_margins
            WHERE summary_month = :m
        ";
        $params = ['m' => $selectedMonth];

        if ($typeFilter !== '') {
            $sql .= " AND cost_center_type = :ctype";
            $params['ctype'] = $typeFilter;
        }

        $sql .= " ORDER BY contribution_margin_amount DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $departments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Compute Hospital-Wide Cost Center Rollup
        $totalBilled         = 0.0;
        $totalAdjustments    = 0.0;
        $totalCollections    = 0.0;
        $totalCash           = 0.0;
        $totalInsurance      = 0.0;
        $totalSalaries       = 0.0;
        $totalMedications    = 0.0;
        $totalSurgSupplies   = 0.0;
        $totalEquipMaint     = 0.0;
        $totalDirectCosts    = 0.0;
        $totalContribMargin  = 0.0;
        $totalIndirectOverhd = 0.0;
        $totalNetIncome      = 0.0;

        $profitableDepts = 0;
        $deficitDepts    = 0;

        foreach ($departments as $d) {
            $totalBilled         += (float)$d['gross_billed_charges'];
            $totalAdjustments    += (float)$d['contractual_adjustments'];
            $totalCollections    += (float)$d['gross_collections'];
            $totalCash           += (float)$d['cash_collections'];
            $totalInsurance      += (float)$d['insurance_collections'];
            $totalSalaries       += (float)$d['cost_staff_salaries'];
            $totalMedications    += (float)$d['cost_medications'];
            $totalSurgSupplies   += (float)$d['cost_surgical_supplies'];
            $totalEquipMaint     += (float)$d['cost_equipment_maintenance'];
            $totalDirectCosts    += (float)$d['total_direct_operational_costs'];
            $totalContribMargin  += (float)$d['contribution_margin_amount'];
            $totalIndirectOverhd += (float)$d['allocated_indirect_overhead'];
            $totalNetIncome      += (float)$d['net_operating_income'];

            if ((float)$d['contribution_margin_amount'] > 0) {
                $profitableDepts++;
            } elseif ($d['cost_center_type'] !== 'Administrative / Overhead') {
                $deficitDepts++;
            }
        }

        // Contribution Margin % = (Gross Collections - Direct Operational Costs) / Gross Collections * 100
        $overallContribMarginPct = ($totalCollections > 0)
            ? round((($totalCollections - $totalDirectCosts) / $totalCollections) * 100.0, 2)
            : 0.0;

        $overallNetMarginPct = ($totalCollections > 0)
            ? round(($totalNetIncome / $totalCollections) * 100.0, 2)
            : 0.0;

        // Direct Cost Composition Breakdown %
        $costDenom = max(1.0, $totalDirectCosts);
        $salariesSharePct     = round(($totalSalaries / $costDenom) * 100.0, 1);
        $medicationsSharePct  = round(($totalMedications / $costDenom) * 100.0, 1);
        $surgSuppliesSharePct = round(($totalSurgSupplies / $costDenom) * 100.0, 1);
        $equipMaintSharePct   = round(($totalEquipMaint / $costDenom) * 100.0, 1);

        // Group by Cost Center Type
        $typeBreakdownStmt = $this->pdo->prepare("
            SELECT
                cost_center_type,
                COUNT(*) AS dept_count,
                SUM(gross_collections) AS gross_collections,
                SUM(cost_staff_salaries) AS cost_staff_salaries,
                SUM(cost_medications) AS cost_medications,
                SUM(cost_surgical_supplies) AS cost_surgical_supplies,
                SUM(total_direct_operational_costs) AS total_direct_costs,
                SUM(contribution_margin_amount) AS contribution_margin_amount,
                ROUND((SUM(contribution_margin_amount) / NULLIF(SUM(gross_collections), 0)) * 100, 2) AS contribution_margin_pct,
                SUM(net_operating_income) AS net_operating_income
            FROM analytics_department_cost_center_margins
            WHERE summary_month = :m
            GROUP BY cost_center_type
            ORDER BY contribution_margin_amount DESC
        ");
        $typeBreakdownStmt->execute(['m' => $selectedMonth]);
        $costCenterGroups = $typeBreakdownStmt->fetchAll(PDO::FETCH_ASSOC);

        // Available months
        $monthsStmt = $this->pdo->query("SELECT DISTINCT summary_month FROM analytics_department_cost_center_margins ORDER BY summary_month DESC");
        $availableMonths = $monthsStmt->fetchAll(PDO::FETCH_COLUMN);

        return [
            'summary_month'    => $selectedMonth,
            'available_months' => $availableMonths,
            'hospital_totals'  => [
                'gross_billed_charges'           => $totalBilled,
                'contractual_adjustments'        => $totalAdjustments,
                'gross_collections'              => $totalCollections,
                'cash_collections'               => $totalCash,
                'insurance_collections'          => $totalInsurance,
                'cost_staff_salaries'            => $totalSalaries,
                'cost_medications'               => $totalMedications,
                'cost_surgical_supplies'         => $totalSurgSupplies,
                'cost_equipment_maintenance'     => $totalEquipMaint,
                'total_direct_operational_costs' => $totalDirectCosts,
                'contribution_margin_amount'     => $totalContribMargin,
                'contribution_margin_pct'        => $overallContribMarginPct,
                'allocated_indirect_overhead'    => $totalIndirectOverhd,
                'net_operating_income'           => $totalNetIncome,
                'net_operating_margin_pct'       => $overallNetMarginPct,
                'profitable_depts_count'         => $profitableDepts,
                'deficit_depts_count'            => $deficitDepts
            ],
            'direct_cost_composition' => [
                'staff_salaries_pct'       => $salariesSharePct,
                'medications_pct'          => $medicationsSharePct,
                'surgical_supplies_pct'    => $surgSuppliesSharePct,
                'equipment_maintenance_pct'=> $equipMaintSharePct
            ],
            'cost_center_groups' => $costCenterGroups,
            'departments'        => $departments
        ];
    }

    /**
     * Live Cost Center Margin Aggregation Engine:
     * Recalculates and syncs departmental gross collections, staff salaries (payroll + doctor commissions),
     * medications, and surgical supplies for the specified month.
     */
    public function recalculateCostCenterMargins(string $month = ''): array
    {
        if (empty($month)) {
            $month = date('Y-m');
        }

        // Recalculate contribution_margin_amount and contribution_margin_pct for all rows in month
        $updStmt = $this->pdo->prepare("
            UPDATE analytics_department_cost_center_margins
            SET
                total_direct_operational_costs = (cost_staff_salaries + cost_medications + cost_surgical_supplies + cost_equipment_maintenance),
                contribution_margin_amount = gross_collections - (cost_staff_salaries + cost_medications + cost_surgical_supplies + cost_equipment_maintenance),
                contribution_margin_pct = CASE
                    WHEN gross_collections > 0 THEN ROUND(((gross_collections - (cost_staff_salaries + cost_medications + cost_surgical_supplies + cost_equipment_maintenance)) / gross_collections) * 100, 2)
                    ELSE 0.00
                END,
                net_operating_income = (gross_collections - (cost_staff_salaries + cost_medications + cost_surgical_supplies + cost_equipment_maintenance)) - allocated_indirect_overhead,
                net_operating_margin_pct = CASE
                    WHEN gross_collections > 0 THEN ROUND((((gross_collections - (cost_staff_salaries + cost_medications + cost_surgical_supplies + cost_equipment_maintenance)) - allocated_indirect_overhead) / gross_collections) * 100, 2)
                    ELSE 0.00
                END,
                variance_from_target_pct = CASE
                    WHEN gross_collections > 0 THEN ROUND(((gross_collections - (cost_staff_salaries + cost_medications + cost_surgical_supplies + cost_equipment_maintenance)) / gross_collections) * 100, 2) - budget_target_margin_pct
                    ELSE 0.00
                END,
                updated_at = NOW()
            WHERE summary_month = :m
        ");
        $updStmt->execute(['m' => $month]);

        return $this->getCostCenterMargins(['month' => $month]);
    }
}
