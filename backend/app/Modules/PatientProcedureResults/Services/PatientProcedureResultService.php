<?php

namespace App\Modules\PatientProcedureResults\Services;

use App\Core\Database;
use App\Modules\LabRanges\Services\LabFlagService;
use App\Modules\PatientProcedureOrders\Models\PatientProcedureOrder;
use PDO;
use Throwable;

class PatientProcedureResultService
{
    /**
     * All result rows for one order, in entry order.
     */
    public function listForOrder(int $orderId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, patient_procedure_order_id, code, name, result_date, end_date,
                    is_abnormal, flag, flag_detail, value, units, reference_range, created_at
             FROM patient_procedure_results
             WHERE patient_procedure_order_id = ? AND deleted_at IS NULL
             ORDER BY id ASC"
        );
        $stmt->execute([$orderId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Every result row ever recorded for a patient, across all their
     * orders -- the raw material for the "Labs" trend report (its
     * item picker and both the List and Matrix output modes are all
     * derived from this same set client-side).
     */
    public function listForPatient(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT r.id, r.patient_procedure_order_id, r.code, r.name, r.result_date, r.end_date,
                    r.is_abnormal, r.flag, r.flag_detail, r.value, r.units, r.reference_range,
                    o.order_date, o.id AS order_id
             FROM patient_procedure_results r
             JOIN patient_procedure_orders o ON o.id = r.patient_procedure_order_id
             WHERE o.patient_id = ? AND r.deleted_at IS NULL AND o.deleted_at IS NULL
             ORDER BY COALESCE(r.result_date, o.order_date) ASC, r.id ASC"
        );
        $stmt->execute([$patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Replace every result row for an order with the given set in one
     * transaction, matching the screenshot's single "Save" button that
     * commits the whole "Results and Recommendations" table at once.
     */
    public function saveForOrder(int $orderId, array $rows, int $userId): array
    {
        $order = (new PatientProcedureOrder())->where('id', $orderId)->first();

        if (!$order || $order['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Order not found.'];
        }

        $errors = [];
        foreach ($rows as $index => $row) {
            if (empty($row['name'])) {
                $errors["rows.$index.name"] = 'Result name is required.';
            }
        }

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $pdo = Database::connection();
        $now = date('Y-m-d H:i:s');
        $flags = [];
        $owns = !$pdo->inTransaction();

        try {
            $owns ? $pdo->beginTransaction() : $pdo->exec('SAVEPOINT ppr_save');

            $del = $pdo->prepare(
                "UPDATE patient_procedure_results SET deleted_at = ?, deleted_by = ? WHERE patient_procedure_order_id = ? AND deleted_at IS NULL"
            );
            $del->execute([$now, $userId, $orderId]);

            $insert = $pdo->prepare(
                "INSERT INTO patient_procedure_results
                    (patient_procedure_order_id, code, name, result_date, end_date, is_abnormal, flag, flag_detail, range_id, value, units, reference_range, created_at, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );

            // Each result flagged Normal / Abnormal / Critical against the admin's ranges.
            $flagger = new LabFlagService();
            foreach ($rows as $row) {
                $f = $flagger->flag($row);
                $insert->execute([
                    $orderId,
                    $row['code'] ?? null,
                    $row['name'],
                    $row['result_date'] ?? null ?: null,
                    $row['end_date'] ?? null ?: null,
                    $f['is_abnormal'],
                    $f['flag'],
                    $f['detail'],
                    $f['range_id'],
                    $row['value'] ?? null,
                    $row['units'] ?? null,
                    $row['reference_range'] ?? null,
                    $now,
                    $userId
                ]);
                $flags[] = ['name' => $row['name'], 'value' => $row['value'] ?? null, 'units' => $row['units'] ?? null] + $f;
            }

            $updateOrder = $pdo->prepare(
                "UPDATE patient_procedure_orders SET status = 'resulted', reported_at = ?, updated_at = ?, updated_by = ? WHERE id = ?"
            );
            $updateOrder->execute([$now, $now, $userId, $orderId]);

            $owns ? $pdo->commit() : $pdo->exec('RELEASE SAVEPOINT ppr_save');
        } catch (Throwable $e) {
            $owns ? ($pdo->inTransaction() && $pdo->rollBack()) : $pdo->exec('ROLLBACK TO SAVEPOINT ppr_save');
            error_log('results save failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to save results.'];
        }

        $critical = array_values(array_filter($flags, fn($f) => $f['flag'] === 'critical'));
        $abnormal = count(array_filter($flags, fn($f) => $f['flag'] === 'abnormal'));
        $message = 'Results saved.';
        if ($critical) {
            $message .= ' ' . count($critical) . ' CRITICAL: ' . implode('; ', array_map(fn($c) => trim("{$c['name']} {$c['value']} {$c['units']}") . " — {$c['detail']}", $critical)) . '.';
        }
        if ($abnormal) {
            $message .= " {$abnormal} abnormal.";
        }

        return ['success' => true, 'message' => $message, 'data' => ['flags' => $flags, 'critical' => count($critical), 'abnormal' => $abnormal]];
    }

    /** Ticked abnormal by hand (not worked out from a range); results from before flags count as by hand. */
    public static function markedByHand(array $r): bool
    {
        return ($r['flag_detail'] ?? null) === 'Marked abnormal' || (($r['flag'] ?? null) === null && (int) ($r['is_abnormal'] ?? 0) === 1);
    }

    /** CSV columns a result import may have ("name" and "value" required). */
    public const IMPORT_COLUMNS = ['code', 'name', 'value', 'units', 'reference_range', 'result_date', 'end_date', 'abnormal'];

    /**
     * Import results for an order from a CSV file (e.g. exported by an analyzer or a reference
     * lab). Each row is flagged like a typed result. Imported rows are added to the order's
     * results; a row with the same code (or, without a code, the same name) replaces the one there.
     */
    public function importForOrder(int $orderId, array $file, int $userId): array
    {
        if (empty($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            return ['success' => false, 'message' => 'Choose the CSV file to import.'];
        }
        $handle = fopen($file['tmp_name'], 'r');
        if (!$handle) {
            return ['success' => false, 'message' => 'Unable to read the file.'];
        }
        $header = fgetcsv($handle);
        if ($header === false) {
            fclose($handle);
            return ['success' => false, 'message' => 'The file is empty.'];
        }
        $col = [];
        foreach ($header as $i => $h) {
            $col[strtolower(trim(preg_replace('/^\xEF\xBB\xBF/', '', (string) $h)))] = $i;
        }
        if (!isset($col['name'], $col['value'])) {
            fclose($handle);
            return ['success' => false, 'message' => 'The file needs "name" and "value" columns. Columns: ' . implode(', ', self::IMPORT_COLUMNS) . '.'];
        }
        $imported = [];
        $skipped = [];
        $line = 1;
        while (($r = fgetcsv($handle)) !== false) {
            $line++;
            $v = fn(string $c) => isset($col[$c], $r[$col[$c]]) ? trim((string) $r[$col[$c]]) : '';
            if ($v('name') === '') {
                if (array_filter($r, fn($x) => trim((string) $x) !== '')) {
                    $skipped[] = "line {$line}: no name";
                }
                continue;
            }
            $date = fn(string $c) => preg_match('/^\d{4}-\d{2}-\d{2}/', $v($c)) ? substr($v($c), 0, 10) : null;
            $imported[] = [
                'code' => $v('code') ?: null, 'name' => mb_substr($v('name'), 0, 255), 'value' => mb_substr($v('value'), 0, 100) ?: null,
                'units' => mb_substr($v('units'), 0, 50) ?: null, 'reference_range' => mb_substr($v('reference_range'), 0, 100) ?: null,
                'result_date' => $date('result_date') ?? date('Y-m-d'), 'end_date' => $date('end_date'),
                'is_abnormal' => in_array(strtolower($v('abnormal')), ['1', 'y', 'yes', 'true', 'h', 'l', 'a', 'abnormal'], true),
            ];
        }
        fclose($handle);
        if (!$imported) {
            return ['success' => false, 'message' => 'No results found in the file.' . ($skipped ? ' Skipped: ' . implode(', ', $skipped) : '')];
        }
        $key = fn(array $x) => $x['code'] ? 'c:' . strtolower($x['code']) : 'n:' . strtolower($x['name']);
        $new = array_flip(array_map($key, $imported));
        // Results already there keep only a hand-made "abnormal" mark; their flag is worked out again.
        $kept = array_values(array_map(fn($x) => ['is_abnormal' => self::markedByHand($x)] + $x,
            array_filter($this->listForOrder($orderId), fn($x) => !isset($new[$key($x)]))));
        $res = $this->saveForOrder($orderId, array_merge($kept, $imported), $userId);
        if (!$res['success']) {
            return $res;
        }
        $res['message'] = count($imported) . ' result(s) imported. ' . $res['message'] . ($skipped ? ' Skipped: ' . implode(', ', $skipped) . '.' : '');
        return $res;
    }
}
