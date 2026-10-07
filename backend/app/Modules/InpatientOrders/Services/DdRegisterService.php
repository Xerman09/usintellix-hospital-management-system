<?php

namespace App\Modules\InpatientOrders\Services;

use App\Core\Database;
use PDO;

/**
 * The dangerous-drugs (DD) register: every dose of a dangerous drug (RA 9165) given on the
 * wards, numbered per medicine, with the witness and any amount wasted. Entries are written
 * by MarService when the dose is recorded and are never deleted (a mistake is voided).
 */
class DdRegisterService
{
    /** filters: from?, to? (Y-m-d, default the last 30 days), ward?, drug_id? */
    public function list(array $filters): array
    {
        $db = Database::connection();
        $today = (string) $db->query("SELECT CURDATE()")->fetchColumn();
        $to = self::date($filters['to'] ?? null) ?? $today;
        $from = self::date($filters['from'] ?? null) ?? gmdate('Y-m-d', strtotime($to . ' 00:00:00 UTC') - 30 * 86400);
        if ($from > $to) {
            [$from, $to] = [$to, $from];
        }
        $where = ['r.given_at >= :from', 'r.given_at < :to + INTERVAL 1 DAY'];
        $params = ['from' => $from, 'to' => $to];
        if (!empty($filters['drug_id'])) {
            $where[] = 'r.drug_id = :drug';
            $params['drug'] = (int) $filters['drug_id'];
        }
        if (!empty($filters['ward'])) {
            $where[] = 'r.ward_name = :ward';
            $params['ward'] = (string) $filters['ward'];
        }
        $stmt = $db->prepare("SELECT r.* FROM dd_register r WHERE " . implode(' AND ', $where) . " ORDER BY r.given_at DESC, r.id DESC LIMIT 2000");
        $stmt->execute($params);
        $rows = array_map(fn($r) => [
            'id' => (int) $r['id'], 'entry_no' => (int) $r['entry_no'], 'drug_id' => (int) $r['drug_id'], 'drug_name' => $r['drug_name'],
            'given_at' => $r['given_at'], 'patient_id' => $r['patient_id'] !== null ? (int) $r['patient_id'] : null,
            'patient_name' => $r['patient_name'], 'patient_mrn' => $r['patient_mrn'], 'ward' => $r['ward_name'], 'bed' => $r['bed'],
            'dose_amount' => (float) $r['dose'], 'dose_unit' => $r['dose_unit'], 'dose' => self::num($r['dose']) . " {$r['dose_unit']}", 'route' => $r['route'],
            'wasted_amount' => $r['wasted_amount'] !== null ? (float) $r['wasted_amount'] : null, 'wasted_unit' => $r['wasted_unit'],
            'wasted' => $r['wasted_amount'] !== null ? self::num($r['wasted_amount']) . " {$r['wasted_unit']}" : null, 'waste_note' => $r['waste_note'],
            'given_by' => $r['given_by_name'], 'witness' => $r['witness_name'], 'prescriber' => $r['prescriber_name'],
            'voided' => $r['voided_at'] !== null, 'voided_at' => $r['voided_at'], 'voided_by' => $r['voided_by_name'], 'void_reason' => $r['void_reason'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        // Totals per medicine (valid entries only), by unit.
        $totals = [];
        foreach ($rows as $r) {
            if ($r['voided']) {
                continue;
            }
            $id = $r['drug_id'];
            $totals[$id] ??= ['drug_name' => $r['drug_name'], 'doses' => 0, 'given' => [], 'wasted' => []];
            $totals[$id]['doses']++;
            $totals[$id]['given'][$r['dose_unit']] = ($totals[$id]['given'][$r['dose_unit']] ?? 0) + $r['dose_amount'];
            if ($r['wasted_amount']) {
                $totals[$id]['wasted'][$r['wasted_unit']] = ($totals[$id]['wasted'][$r['wasted_unit']] ?? 0) + $r['wasted_amount'];
            }
        }
        $fmt = fn(array $byUnit) => implode(' + ', array_map(fn($u, $v) => self::num($v) . " {$u}", array_keys($byUnit), $byUnit));
        return [
            'from' => $from, 'to' => $to,
            'entries' => $rows,
            'totals' => array_values(array_map(fn($t) => ['drug_name' => $t['drug_name'], 'doses' => $t['doses'], 'given' => $fmt($t['given']),
                'wasted' => $t['wasted'] ? $fmt($t['wasted']) : null], $totals)),
            'drugs' => $db->query(
                "SELECT id, name FROM drugs WHERE controlled_class LIKE 'Dangerous Drug%' AND deleted_at IS NULL ORDER BY name"
            )->fetchAll(PDO::FETCH_ASSOC),
            'wards' => $db->query("SELECT DISTINCT ward_name FROM dd_register WHERE ward_name IS NOT NULL ORDER BY ward_name")->fetchAll(PDO::FETCH_COLUMN),
        ];
    }

    private static function date($v): ?string
    {
        if (!is_string($v) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) {
            return null;
        }
        [$y, $m, $d] = array_map('intval', explode('-', $v));
        return checkdate($m, $d, $y) ? $v : null;
    }

    private static function num($v): string
    {
        return rtrim(rtrim(number_format((float) $v, 3, '.', ''), '0'), '.');
    }
}
