<?php

namespace App\Modules\PatientProcedureResults\Services;

use App\Core\Database;
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
                    is_abnormal, value, units, reference_range, created_at
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
                    r.is_abnormal, r.value, r.units, r.reference_range,
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

        try {
            $pdo->beginTransaction();

            $del = $pdo->prepare(
                "UPDATE patient_procedure_results SET deleted_at = ?, deleted_by = ? WHERE patient_procedure_order_id = ? AND deleted_at IS NULL"
            );
            $del->execute([$now, $userId, $orderId]);

            $insert = $pdo->prepare(
                "INSERT INTO patient_procedure_results
                    (patient_procedure_order_id, code, name, result_date, end_date, is_abnormal, value, units, reference_range, created_at, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );

            foreach ($rows as $row) {
                $insert->execute([
                    $orderId,
                    $row['code'] ?? null,
                    $row['name'],
                    $row['result_date'] ?? null ?: null,
                    $row['end_date'] ?? null ?: null,
                    !empty($row['is_abnormal']) ? 1 : 0,
                    $row['value'] ?? null,
                    $row['units'] ?? null,
                    $row['reference_range'] ?? null,
                    $now,
                    $userId
                ]);
            }

            $updateOrder = $pdo->prepare(
                "UPDATE patient_procedure_orders SET status = 'resulted', reported_at = ?, updated_at = ?, updated_by = ? WHERE id = ?"
            );
            $updateOrder->execute([$now, $now, $userId, $orderId]);

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            return ['success' => false, 'message' => 'Failed to save results.'];
        }

        return ['success' => true, 'message' => 'Results saved successfully.'];
    }
}
