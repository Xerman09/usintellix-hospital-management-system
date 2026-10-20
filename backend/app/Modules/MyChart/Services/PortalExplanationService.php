<?php

namespace App\Modules\MyChart\Services;

use App\Core\Database;
use PDO;

/**
 * The plain-language explanations shown under a result in My Chart (Phase 2).
 *
 * Matching is by name first, because that is what a result row always carries --
 * the lab's analytes have no identifying_code. An imaging row does carry the study
 * code, so a code match is tried first where there is one. See schema 303.
 *
 * The hospital edits the wording itself (Laboratory settings), so nothing here is
 * hard-coded: a seeded row is only a starting point.
 */
class PortalExplanationService
{
    /** Who may read the list, and who may edit the wording. */
    public const VIEW_ROLES = ['admin', 'doctor', 'clinician', 'lab_technician', 'radiologic_technologist'];
    public const EDIT_ROLES = ['admin'];

    /**
     * Explanations for a set of result rows, keyed by the row's name so the caller can
     * line them up. One query, whatever the number of rows.
     *
     * @param array $rows each with 'name' and optionally 'code'
     * @return array<string, array>
     */
    public static function forRows(array $rows, string $kind = 'lab'): array
    {
        $names = array_values(array_unique(array_filter(array_map(static fn($r) => trim((string) ($r['name'] ?? '')), $rows))));
        $codes = array_values(array_unique(array_filter(array_map(static fn($r) => trim((string) ($r['code'] ?? '')), $rows))));

        if (!$names && !$codes) {
            return [];
        }

        $db = Database::connection();
        $params = ['kind' => $kind];
        $where = [];

        if ($names) {
            $in = [];
            foreach ($names as $i => $n) {
                $in[] = ":n{$i}";
                $params["n{$i}"] = $n;
            }
            $where[] = 'e.name IN (' . implode(', ', $in) . ')';
        }
        if ($codes) {
            $in = [];
            foreach ($codes as $i => $c) {
                $in[] = ":c{$i}";
                $params["c{$i}"] = $c;
            }
            $where[] = 'e.code IN (' . implode(', ', $in) . ')';
        }

        $stmt = $db->prepare(
            "SELECT e.code, e.name, e.what_it_measures, e.why_ordered, e.high_means, e.low_means, e.source
             FROM portal_test_explanations e
             WHERE e.kind = :kind AND e.is_active = 1 AND (" . implode(' OR ', $where) . ")"
        );
        $stmt->execute($params);

        $byName = [];
        $byCode = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $out = [
                'what_it_measures' => $row['what_it_measures'],
                'why_ordered' => $row['why_ordered'],
                'high_means' => $row['high_means'],
                'low_means' => $row['low_means'],
                'source' => $row['source'],
            ];
            $byName[mb_strtolower($row['name'])] = $out;
            if ($row['code'] !== null && $row['code'] !== '') {
                $byCode[mb_strtolower($row['code'])] = $out;
            }
        }

        $out = [];
        foreach ($rows as $r) {
            $name = trim((string) ($r['name'] ?? ''));
            $code = mb_strtolower(trim((string) ($r['code'] ?? '')));
            $hit = ($code !== '' && isset($byCode[$code])) ? $byCode[$code] : ($byName[mb_strtolower($name)] ?? null);
            if ($hit) {
                $out[$name] = $hit;
            }
        }

        return $out;
    }

    // ------------------------------------------------------------------
    // The staff screen (Laboratory settings)
    // ------------------------------------------------------------------

    /** Every explanation, with the analytes and studies that still have none. */
    public static function listAll(string $q = ''): array
    {
        $db = Database::connection();
        $params = [];
        $where = '';

        if ($q !== '') {
            $where = "WHERE e.name LIKE :q OR e.code LIKE :q2";
            $params = ['q' => "%{$q}%", 'q2' => "%{$q}%"];
        }

        $stmt = $db->prepare(
            "SELECT e.id, e.kind, e.code, e.name, e.what_it_measures, e.why_ordered, e.high_means, e.low_means,
                    e.source, e.is_active, e.updated_at
             FROM portal_test_explanations e
             {$where}
             ORDER BY e.kind, e.name"
        );
        $stmt->execute($params);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Analytes and studies a patient can meet that nothing explains yet.
        $missing = $db->query(
            "SELECT 'lab' AS kind, NULL AS code, c.name
             FROM procedure_order_configs c
             WHERE c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL
               AND NOT EXISTS (SELECT 1 FROM portal_test_explanations e WHERE e.kind = 'lab' AND e.name = c.name)
             GROUP BY c.name
             UNION ALL
             SELECT 'imaging', c.identifying_code, c.name
             FROM procedure_order_configs c
             WHERE c.rad_modality IS NOT NULL AND c.deleted_at IS NULL
               AND NOT EXISTS (SELECT 1 FROM portal_test_explanations e WHERE e.kind = 'imaging' AND e.name = c.name)
             ORDER BY kind, name"
        )->fetchAll(PDO::FETCH_ASSOC);

        return [
            'items' => array_map(static fn(array $r) => $r + ['is_active' => (int) $r['is_active'] === 1], $items),
            'missing' => $missing,
            'counts' => ['explained' => count($items), 'missing' => count($missing)],
        ];
    }

    /**
     * Add or change one explanation. Keyed on (kind, name), so saving the same name
     * twice edits it instead of creating a second row.
     */
    public static function save(array $data, int $actorId): array
    {
        $kind = ($data['kind'] ?? 'lab') === 'imaging' ? 'imaging' : 'lab';
        $name = trim((string) ($data['name'] ?? ''));
        $code = trim((string) ($data['code'] ?? ''));

        if ($name === '') {
            return ['success' => false, 'message' => 'Which test is this about?', 'errors' => ['name' => 'The test name is required.']];
        }

        $text = static fn($v) => ($v === null || trim((string) $v) === '') ? null : trim((string) $v);

        if ($text($data['what_it_measures'] ?? null) === null) {
            return ['success' => false, 'message' => 'Say what the test measures.',
                'errors' => ['what_it_measures' => 'A patient needs at least this much.']];
        }

        $db = Database::connection();
        $stmt = $db->prepare(
            "INSERT INTO portal_test_explanations
                (kind, code, name, what_it_measures, why_ordered, high_means, low_means, source, is_active, created_at, created_by)
             VALUES (:kind, :code, :name, :what, :why, :high, :low, :source, :active, NOW(), :by)
             ON DUPLICATE KEY UPDATE
                code = VALUES(code), what_it_measures = VALUES(what_it_measures), why_ordered = VALUES(why_ordered),
                high_means = VALUES(high_means), low_means = VALUES(low_means), source = VALUES(source),
                is_active = VALUES(is_active), updated_at = NOW(), updated_by = VALUES(created_by)"
        );
        $stmt->execute([
            'kind' => $kind,
            'code' => $code === '' ? null : $code,
            'name' => $name,
            'what' => $text($data['what_it_measures'] ?? null),
            'why' => $text($data['why_ordered'] ?? null),
            'high' => $text($data['high_means'] ?? null),
            'low' => $text($data['low_means'] ?? null),
            'source' => $text($data['source'] ?? null),
            'active' => (int) ($data['is_active'] ?? 1) === 1 ? 1 : 0,
            'by' => $actorId,
        ]);

        return ['success' => true, 'message' => "Saved. Patients will read this under “{$name}”."];
    }
}
