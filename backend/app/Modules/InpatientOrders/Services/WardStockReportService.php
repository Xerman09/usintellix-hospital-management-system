<?php

namespace App\Modules\InpatientOrders\Services;

use App\Core\Database;
use App\Modules\Alerts\Services\AlertService;
use App\Modules\NursingStaff\Services\NursingStaffService;
use PDO;

/**
 * Ward stock report (department medicine stock, Phase 3): what the wards' cabinets were used
 * for, per department and per patient, the override log and the dangerous-drug counts.
 *
 * "Used" = taken out of the cabinet and given (cabinet_withdrawals, status given) plus doses
 * taken straight from the cabinet's stock on the MAR (supply 'stock' at the cabinet). Wasted
 * and returned are shown apart; cost is the lots' unit cost, charged is what the patients were
 * charged for those doses.
 */
class WardStockReportService
{
    public const VIEWERS = ['admin', 'pharmacist', 'charge_nurse'];
    /** Who reviews overrides. */
    public const REVIEWERS = ['admin', 'pharmacist'];

    /** filters: from?, to? (Y-m-d; default the last 7 days), ward_id? */
    public function report(array $filters, array $actor): array
    {
        $db = Database::connection();
        $today = (string) $db->query("SELECT CURDATE()")->fetchColumn();
        $to = self::date($filters['to'] ?? null) ?? $today;
        $from = self::date($filters['from'] ?? null) ?? gmdate('Y-m-d', strtotime("{$to} 00:00:00 UTC") - 6 * 86400);
        if ($from > $to) {
            [$from, $to] = [$to, $from];
        }
        $cabs = (new RestockService())->cabinets();
        // A charge nurse sees their own wards.
        if (($actor['role'] ?? '') === 'charge_nurse') {
            $mine = (new NursingStaffService())->wardIds((int) $actor['id']);
            if ($mine) {
                $cabs = array_filter($cabs, fn($c) => in_array((int) $c['ward_id'], $mine, true));
            }
        }
        $wardOptions = array_values(array_map(fn($c) => ['id' => (int) $c['ward_id'], 'name' => $c['ward_name'], 'cabinet' => $c['cabinet_name']], $cabs));
        if (!empty($filters['ward_id'])) {
            $cabs = array_filter($cabs, fn($c) => (int) $c['ward_id'] === (int) $filters['ward_id']);
        }
        $base = ['from' => $from, 'to' => $to, 'ward_id' => !empty($filters['ward_id']) ? (int) $filters['ward_id'] : null, 'wards' => $wardOptions,
            'can_review' => in_array($actor['role'] ?? '', self::REVIEWERS, true), 'can_resolve' => in_array($actor['role'] ?? '', DdCountService::RESOLVERS, true)];
        if (!$cabs) {
            return $base + ['departments' => [], 'patients' => [], 'overrides' => [], 'dd_counts' => [], 'totals' => null];
        }
        $in = implode(',', array_map('intval', array_keys($cabs)));
        $range = ['f' => "{$from} 00:00:00", 't' => gmdate('Y-m-d', strtotime("{$to} 00:00:00 UTC") + 86400) . ' 00:00:00'];

        $w = $db->prepare(
            "SELECT w.id, w.warehouse_id, w.admission_id, w.drug_id, w.status, w.quantity, w.is_override,
                    o.drug_name, du.name AS unit_name, a.patient_name, a.patient_mrn, a.admission_number, a.patient_id,
                    (SELECT SUM(l.quantity * COALESCE(l.unit_cost, 0)) FROM cabinet_withdrawal_lots l WHERE l.withdrawal_id = w.id) AS cost
             FROM cabinet_withdrawals w JOIN inpatient_med_orders o ON o.id = w.order_id JOIN inpatient_admissions a ON a.id = w.admission_id
             JOIN drugs d ON d.id = w.drug_id LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             WHERE w.warehouse_id IN ({$in}) AND w.withdrawn_at >= :f AND w.withdrawn_at < :t"
        );
        $w->execute($range);
        $direct = $db->prepare(
            "SELECT r.id, r.warehouse_id, r.admission_id, o.drug_id, r.stock_quantity AS quantity, o.drug_name, du.name AS unit_name,
                    a.patient_name, a.patient_mrn, a.admission_number, a.patient_id,
                    (SELECT SUM(l.quantity * COALESCE(l.unit_cost, 0)) FROM inpatient_med_admin_lots l WHERE l.administration_id = r.id AND l.returned_at IS NULL) AS cost
             FROM inpatient_med_administrations r JOIN inpatient_med_orders o ON o.id = r.order_id JOIN inpatient_admissions a ON a.id = r.admission_id
             JOIN drugs d ON d.id = o.drug_id LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             WHERE r.supply_source = 'stock' AND r.status = 'given' AND r.voided_at IS NULL AND r.warehouse_id IN ({$in})
               AND r.given_at >= :f AND r.given_at < :t"
        );
        $direct->execute($range);
        $ch = $db->prepare(
            "SELECT r.warehouse_id, r.admission_id, o.drug_id, ch.net_amount FROM inpatient_med_charges ch
             JOIN inpatient_med_administrations r ON r.id = ch.administration_id JOIN inpatient_med_orders o ON o.id = r.order_id
             WHERE ch.status = 'charged' AND r.warehouse_id IN ({$in}) AND r.given_at >= :f AND r.given_at < :t"
        );
        $ch->execute($range);

        $dept = [];
        $pat = [];
        $blank = fn() => ['used' => 0.0, 'doses' => 0, 'wasted' => 0.0, 'returned' => 0.0, 'out' => 0.0, 'cost' => 0.0, 'charged' => 0.0, 'overrides' => 0];
        $add = function (array $r, string $kind, float $qty, float $cost) use (&$dept, &$pat, $cabs, $blank) {
            $wh = (int) $r['warehouse_id'];
            $drug = (int) $r['drug_id'];
            $dept[$wh] ??= ['warehouse_id' => $wh, 'ward_id' => (int) $cabs[$wh]['ward_id'], 'ward_name' => $cabs[$wh]['ward_name'],
                'cabinet_name' => $cabs[$wh]['cabinet_name'], 'totals' => $blank(), 'drugs' => []];
            $dept[$wh]['drugs'][$drug] ??= ['drug_id' => $drug, 'drug_name' => $r['drug_name'], 'unit_name' => $r['unit_name'] ?: 'unit'] + $blank();
            $adm = (int) $r['admission_id'];
            $pat[$adm] ??= ['admission_id' => $adm, 'patient_id' => $r['patient_id'] !== null ? (int) $r['patient_id'] : null, 'patient_name' => $r['patient_name'],
                'patient_mrn' => $r['patient_mrn'], 'admission_number' => $r['admission_number'], 'ward_name' => $cabs[$wh]['ward_name'], 'totals' => $blank(), 'drugs' => []];
            $pat[$adm]['drugs'][$drug] ??= ['drug_id' => $drug, 'drug_name' => $r['drug_name'], 'unit_name' => $r['unit_name'] ?: 'unit'] + $blank();
            foreach ([&$dept[$wh]['totals'], &$dept[$wh]['drugs'][$drug], &$pat[$adm]['totals'], &$pat[$adm]['drugs'][$drug]] as &$t) {
                if ($kind === 'charged') {
                    $t['charged'] += $cost;
                    continue;
                }
                $t[$kind] += $qty;
                if ($kind === 'used') {
                    $t['doses']++;
                }
                if (in_array($kind, ['used', 'wasted', 'out'], true)) {
                    $t['cost'] += $cost;
                }
                if (!empty($r['is_override'])) {
                    $t['overrides']++;
                }
            }
            unset($t);
        };
        foreach ($w->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $kind = ['given' => 'used', 'wasted' => 'wasted', 'returned' => 'returned', 'open' => 'out'][$r['status']];
            $add($r, $kind, (float) $r['quantity'], $kind === 'returned' ? 0.0 : (float) $r['cost']);
        }
        foreach ($direct->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $add($r, 'used', (float) $r['quantity'], (float) $r['cost']);
        }
        $names = [];
        foreach (array_merge(...array_map(fn($d) => array_values($d['drugs']), array_values($dept) ?: [['drugs' => []]])) as $d) {
            $names[$d['drug_id']] = $d;
        }
        foreach ($ch->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $n = $names[(int) $r['drug_id']] ?? null;
            if ($n && isset($dept[(int) $r['warehouse_id']], $pat[(int) $r['admission_id']])) {
                $add($r + ['drug_name' => $n['drug_name'], 'unit_name' => $n['unit_name']], 'charged', 0.0, (float) $r['net_amount']);
            }
        }
        $round = function (array $x) {
            foreach (['used', 'wasted', 'returned', 'out'] as $k) {
                $x[$k] = round($x[$k], 3);
            }
            $x['cost'] = round($x['cost'], 2);
            $x['charged'] = round($x['charged'], 2);
            return $x;
        };
        $shape = fn(array $rows) => array_values(array_map(function ($g) use ($round) {
            $g['totals'] = $round($g['totals']);
            $g['drugs'] = array_values(array_map($round, $g['drugs']));
            usort($g['drugs'], fn($a, $b) => $b['used'] <=> $a['used'] ?: strcmp($a['drug_name'], $b['drug_name']));
            return $g;
        }, $rows));
        $departments = $shape($dept);
        $patients = $shape($pat);
        usort($patients, fn($a, $b) => $b['totals']['charged'] <=> $a['totals']['charged'] ?: strcmp($a['patient_name'], $b['patient_name']));
        $sum = fn(string $k) => round(array_sum(array_map(fn($d) => $d['totals'][$k], $departments)), 2);

        return $base + [
            'departments' => $departments,
            'patients' => $patients,
            'totals' => ['doses' => (int) $sum('doses'), 'cost' => $sum('cost'), 'charged' => $sum('charged'), 'wasted_lines' => count(array_filter($departments, fn($d) => $d['totals']['wasted'] > 0)),
                'overrides' => (int) $sum('overrides')],
            'overrides' => $this->overrides($in, $range),
            'dd_counts' => $this->counts($in, $range),
        ];
    }

    /** The pharmacist reviews an override (after verifying or rejecting the order). */
    public function reviewOverride(int $withdrawalId, string $note, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::REVIEWERS, true)) {
            return ['success' => false, 'message' => 'Overrides are reviewed by the pharmacy.', 'forbidden' => true];
        }
        $db = Database::connection();
        $stmt = $db->prepare("SELECT is_override, override_reviewed_at FROM cabinet_withdrawals WHERE id = :id");
        $stmt->execute(['id' => $withdrawalId]);
        $w = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$w || !(int) $w['is_override']) {
            return ['success' => false, 'message' => 'Override not found.', 'not_found' => true];
        }
        if ($w['override_reviewed_at']) {
            return ['success' => false, 'message' => 'Already reviewed.'];
        }
        $note = trim($note);
        if ($note === '') {
            return ['success' => false, 'message' => 'Add a review note (e.g. appropriate — STAT order, verified after).', 'errors' => ['note' => 'Required.']];
        }
        $db->prepare("UPDATE cabinet_withdrawals SET override_reviewed_by = :u, override_reviewed_at = NOW(), override_review_note = :n WHERE id = :id")
            ->execute(['u' => (int) $actor['id'], 'n' => mb_substr($note, 0, 255), 'id' => $withdrawalId]);
        AlertService::resolveByKey("override:{$withdrawalId}", (int) $actor['id'], 'Reviewed');
        return ['success' => true, 'message' => 'Override reviewed.'];
    }

    /** Override log: taken before verification, the reason, what became of the order, the review. */
    private function overrides(string $in, array $range): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT w.id, w.withdrawn_at, w.quantity, w.status, w.override_reason, w.override_reviewed_at, w.override_review_note,
                    o.drug_name, o.status AS order_status, o.verified_at, o.rejected_reason, a.patient_name, a.admission_number, hw.ward_name,
                    du.name AS unit_name, " . self::nameSql('w.withdrawn_by') . " AS withdrawn_by_name, " . self::nameSql('o.ordered_by') . " AS ordered_by_name,
                    " . self::nameSql('o.verified_by') . " AS verified_by_name, " . self::nameSql('w.override_reviewed_by') . " AS reviewed_by_name
             FROM cabinet_withdrawals w JOIN inpatient_med_orders o ON o.id = w.order_id JOIN inpatient_admissions a ON a.id = w.admission_id
             LEFT JOIN hospital_wards hw ON hw.stock_warehouse_id = w.warehouse_id
             JOIN drugs d ON d.id = w.drug_id LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             WHERE w.is_override = 1 AND w.warehouse_id IN ({$in}) AND w.withdrawn_at >= :f AND w.withdrawn_at < :t
             ORDER BY w.override_reviewed_at IS NOT NULL, w.withdrawn_at DESC"
        );
        $stmt->execute($range);
        return array_map(fn($r) => [
            'id' => (int) $r['id'], 'withdrawn_at' => $r['withdrawn_at'], 'ward_name' => $r['ward_name'], 'patient_name' => $r['patient_name'],
            'admission_number' => $r['admission_number'], 'drug_name' => $r['drug_name'], 'quantity' => (float) $r['quantity'], 'unit_name' => $r['unit_name'] ?: 'unit',
            'status' => $r['status'], 'reason' => $r['override_reason'], 'withdrawn_by_name' => $r['withdrawn_by_name'], 'ordered_by_name' => $r['ordered_by_name'],
            'order_status' => $r['order_status'], 'verified_at' => $r['verified_at'], 'verified_by_name' => $r['verified_at'] ? $r['verified_by_name'] : null,
            'rejected_reason' => $r['rejected_reason'],
            'reviewed_at' => $r['override_reviewed_at'], 'reviewed_by_name' => $r['override_reviewed_at'] ? $r['reviewed_by_name'] : null, 'review_note' => $r['override_review_note'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    private function counts(string $in, array $range): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id FROM dd_counts WHERE warehouse_id IN ({$in}) AND counted_at >= :f AND counted_at < :t ORDER BY status = 'discrepancy' DESC, counted_at DESC LIMIT 300"
        );
        $stmt->execute($range);
        $svc = new DdCountService();
        return array_map(fn($id) => $svc->count((int) $id), $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    private static function date($v): ?string
    {
        if (!is_string($v) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) {
            return null;
        }
        [$y, $m, $d] = array_map('intval', explode('-', $v));
        return checkdate($m, $d, $y) ? $v : null;
    }

    private static function nameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                 FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL
                 WHERE nu.id = {$column} LIMIT 1)";
    }
}
