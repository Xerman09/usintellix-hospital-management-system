<?php

namespace App\Modules\LabRanges\Services;

use App\Core\Database;
use PDO;

/**
 * Administration > Critical Lab Ranges: the normal range and critical limits of each lab test
 * (lab_result_ranges), used to flag results Normal / Abnormal / Critical (LabFlagService).
 */
class LabRangeService
{
    public const EDIT_ROLES = ['admin'];
    public const VIEW_ROLES = ['admin', 'doctor', 'lab_technician', 'clinician', 'nurse', 'charge_nurse'];
    private const NUMBERS = ['normal_low', 'normal_high', 'critical_low', 'critical_high'];

    public function list(): array
    {
        $rows = Database::connection()->query(
            "SELECT r.*, (SELECT COUNT(*) FROM patient_procedure_results p WHERE p.range_id = r.id AND p.deleted_at IS NULL) AS results_flagged
             FROM lab_result_ranges r ORDER BY r.is_active DESC, r.name, r.units"
        )->fetchAll(PDO::FETCH_ASSOC);
        return array_map(fn($r) => $this->shape($r), $rows);
    }

    /** data: id? (update), name, code?, aliases?, units?, normal_low?, normal_high?, critical_low?, critical_high?, critical_values?, normal_values?, notes?, is_active? */
    public function save(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::EDIT_ROLES, true)) {
            return ['success' => false, 'message' => 'Critical ranges are set up by an admin.', 'forbidden' => true];
        }
        $db = Database::connection();
        $id = (int) ($data['id'] ?? 0);
        if ($id && !$this->find($id)) {
            return ['success' => false, 'message' => 'Range not found.', 'not_found' => true];
        }
        $errors = [];
        $text = fn(string $k, int $max) => ($v = trim((string) ($data[$k] ?? ''))) !== '' ? mb_substr($v, 0, $max) : null;
        $v = [
            'name' => $text('name', 150), 'code' => $text('code', 100), 'aliases' => $text('aliases', 255), 'units' => (string) $text('units', 50),
            'critical_values' => $text('critical_values', 255), 'normal_values' => $text('normal_values', 255), 'notes' => $text('notes', 255),
            'is_active' => array_key_exists('is_active', $data) ? (!empty($data['is_active']) ? 1 : 0) : 1,
        ];
        if ($v['name'] === null) {
            $errors['name'] = 'Enter the test name (e.g. Potassium).';
        }
        foreach (self::NUMBERS as $k) {
            $raw = trim((string) ($data[$k] ?? ''));
            if ($raw === '') {
                $v[$k] = null;
            } elseif (!is_numeric($raw)) {
                $errors[$k] = 'Enter a number, or leave it blank.';
            } else {
                $v[$k] = (float) $raw;
            }
        }
        if (!$errors) {
            $pairs = [['normal_low', 'normal_high', 'The normal low must be below the normal high.'],
                ['critical_low', 'normal_low', 'The critical low must be below the normal range.'],
                ['normal_high', 'critical_high', 'The critical high must be above the normal range.'],
                ['critical_low', 'critical_high', 'The critical low must be below the critical high.']];
            foreach ($pairs as [$a, $b, $msg]) {
                if ($v[$a] !== null && $v[$b] !== null && $v[$a] >= $v[$b]) {
                    $errors[$b] = $msg;
                    break;
                }
            }
        }
        if (!$errors && $v['critical_low'] === null && $v['critical_high'] === null && $v['critical_values'] === null
            && $v['normal_low'] === null && $v['normal_high'] === null && $v['normal_values'] === null) {
            $errors['critical_high'] = 'Set at least one limit (critical or normal) or the critical text values.';
        }
        if (!$errors) {
            $dup = $db->prepare("SELECT id FROM lab_result_ranges WHERE name = :n AND units = :u AND id <> :id");
            $dup->execute(['n' => $v['name'], 'u' => $v['units'], 'id' => $id]);
            if ($dup->fetchColumn()) {
                $errors['name'] = "{$v['name']} already has a range in " . ($v['units'] !== '' ? $v['units'] : 'these units') . '.';
            }
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        if ($id) {
            $sets = implode(', ', array_map(fn($k) => "{$k} = :{$k}", array_keys($v)));
            $db->prepare("UPDATE lab_result_ranges SET {$sets}, updated_at = :now, updated_by = :u WHERE id = :id")
                ->execute($v + ['now' => $now, 'u' => (int) $actor['id'], 'id' => $id]);
        } else {
            $cols = array_keys($v);
            $db->prepare("INSERT INTO lab_result_ranges (" . implode(', ', $cols) . ", created_at, created_by) VALUES (:" . implode(', :', $cols) . ", :now, :u)")
                ->execute($v + ['now' => $now, 'u' => (int) $actor['id']]);
            $id = (int) $db->lastInsertId();
        }
        return ['success' => true, 'message' => "Range for {$v['name']} saved. New results are flagged with it; results already saved keep their flag.", 'data' => $this->shape($this->find($id))];
    }

    public function delete(int $id, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::EDIT_ROLES, true)) {
            return ['success' => false, 'message' => 'Critical ranges are set up by an admin.', 'forbidden' => true];
        }
        $r = $this->find($id);
        if (!$r) {
            return ['success' => false, 'message' => 'Range not found.', 'not_found' => true];
        }
        Database::connection()->prepare("DELETE FROM lab_result_ranges WHERE id = :id")->execute(['id' => $id]);
        return ['success' => true, 'message' => "Range for {$r['name']} removed."];
    }

    /** Try a value: how would this result be flagged? data: code?, name, value, units?, reference_range? */
    public function test(array $data): array
    {
        $svc = new LabFlagService();
        $f = $svc->flag($data);
        $range = $f['range_id'] ? $this->find($f['range_id']) : null;
        return $f + ['range' => $range ? $this->shape($range) : null];
    }

    private function find(int $id): ?array
    {
        $stmt = Database::connection()->prepare("SELECT r.*, 0 AS results_flagged FROM lab_result_ranges r WHERE r.id = :id");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function shape(array $r): array
    {
        $n = fn($v) => $v !== null ? (float) $v : null;
        return [
            'id' => (int) $r['id'], 'name' => $r['name'], 'code' => $r['code'], 'aliases' => $r['aliases'], 'units' => $r['units'],
            'normal_low' => $n($r['normal_low']), 'normal_high' => $n($r['normal_high']),
            'critical_low' => $n($r['critical_low']), 'critical_high' => $n($r['critical_high']),
            'critical_values' => $r['critical_values'], 'normal_values' => $r['normal_values'], 'notes' => $r['notes'],
            'is_active' => (int) $r['is_active'] === 1, 'results_flagged' => (int) ($r['results_flagged'] ?? 0),
            'updated_at' => $r['updated_at'] ?? $r['created_at'],
        ];
    }
}
