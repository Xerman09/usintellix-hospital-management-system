<?php

namespace App\Modules\PatientProcedureOrders\Services;

use App\Core\Database;
use App\Modules\PatientProcedureOrders\Models\PatientProcedureOrder;
use App\Modules\ProcedureOrderConfigs\Models\ProcedureOrderConfig;
use App\Modules\Patients\Models\Patient;
use PDO;
use Throwable;

class PatientProcedureOrderService
{
    public const STATUSES = ['pending', 'collected', 'resulted', 'reviewed', 'cancelled'];

    /**
     * List orders, optionally filtered by patient/date range/status/
     * provider/lab, joined with everything the "Procedure Orders and
     * Reports" table needs to display without a second round-trip.
     */
    public function list(array $filters = []): array
    {
        $sql = "SELECT o.id, o.patient_id, o.procedure_order_config_id, o.provider_id, o.vendor_facility_id,
                       o.order_date, o.ext_time_collected, o.specimen, o.status, o.reported_at, o.created_at,
                       p.patient_no,
                       CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name, p.suffix) AS patient_name,
                       poc.name AS procedure_name, poc.identifying_code, poc.standard_code,
                       e.first_name AS provider_first_name, e.last_name AS provider_last_name,
                       f.name AS vendor_name,
                       (SELECT COUNT(*) FROM patient_procedure_results r
                        WHERE r.patient_procedure_order_id = o.id AND r.deleted_at IS NULL) AS result_count
                FROM patient_procedure_orders o
                JOIN patients p ON p.id = o.patient_id
                JOIN procedure_order_configs poc ON poc.id = o.procedure_order_config_id
                LEFT JOIN providers pr ON pr.id = o.provider_id
                LEFT JOIN employees e ON e.id = pr.employee_id
                LEFT JOIN facilities f ON f.id = o.vendor_facility_id
                WHERE o.deleted_at IS NULL";

        $params = [];

        if (!empty($filters['patient_id'])) {
            $sql .= " AND o.patient_id = :patient_id";
            $params['patient_id'] = $filters['patient_id'];
        }

        if (!empty($filters['from'])) {
            $sql .= " AND o.order_date >= :from";
            $params['from'] = $filters['from'];
        }

        if (!empty($filters['to'])) {
            $sql .= " AND o.order_date <= :to";
            $params['to'] = $filters['to'];
        }

        if (!empty($filters['status'])) {
            $sql .= " AND o.status = :status";
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['provider_id'])) {
            $sql .= " AND o.provider_id = :provider_id";
            $params['provider_id'] = $filters['provider_id'];
        }

        if (!empty($filters['vendor_facility_id'])) {
            $sql .= " AND o.vendor_facility_id = :vendor_facility_id";
            $params['vendor_facility_id'] = $filters['vendor_facility_id'];
        }

        $sql .= " ORDER BY o.order_date DESC, o.id DESC";

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Place a new order for a patient ("Order Procedure").
     */
    public function register(array $data, int $createdBy): array
    {
        $errors = $this->validate($data);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        try {
            $id = (new PatientProcedureOrder())->create([
                'patient_id'                => $data['patient_id'],
                'procedure_order_config_id' => $data['procedure_order_config_id'],
                'provider_id'               => $data['provider_id'] ?? null,
                'vendor_facility_id'        => $data['vendor_facility_id'] ?? null,
                'order_date'                => $data['order_date'],
                'ext_time_collected'        => $data['ext_time_collected'] ?? null,
                'specimen'                  => $data['specimen'] ?? null,
                'status'                    => 'pending',
                'created_at'                => date('Y-m-d H:i:s'),
                'created_by'                => $createdBy
            ]);

            if (!$id) {
                throw new \RuntimeException('Failed to create order.');
            }

            return ['success' => true, 'message' => 'Procedure ordered successfully.', 'data' => ['patient_procedure_order_id' => $id]];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Failed to place the order.'];
        }
    }

    /**
     * Update an order's status/specimen/collection time/reported date.
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $order = (new PatientProcedureOrder())->where('id', $id)->first();

        if (!$order || $order['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Order not found.'];
        }

        $errors = [];

        if (isset($data['status']) && !in_array($data['status'], self::STATUSES, true)) {
            $errors['status'] = 'Invalid status.';
        }

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $payload = ['updated_at' => date('Y-m-d H:i:s'), 'updated_by' => $updatedBy];

        foreach (['status', 'specimen', 'ext_time_collected', 'reported_at'] as $field) {
            if (array_key_exists($field, $data)) {
                $payload[$field] = $data[$field] !== '' ? $data[$field] : null;
            }
        }

        (new PatientProcedureOrder())->update($payload, $id);

        return ['success' => true, 'message' => 'Order updated successfully.'];
    }

    /**
     * Soft-delete (cancel/remove) an order. Its results cascade with it
     * (real FK cascade doesn't fire on soft-delete, so they're marked
     * deleted alongside it).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $order = (new PatientProcedureOrder())->where('id', $id)->first();

        if (!$order || $order['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Order not found.'];
        }

        $now = date('Y-m-d H:i:s');

        (new PatientProcedureOrder())->update(['deleted_at' => $now, 'deleted_by' => $deletedBy], $id);

        Database::connection()->prepare(
            "UPDATE patient_procedure_results SET deleted_at = ?, deleted_by = ? WHERE patient_procedure_order_id = ? AND deleted_at IS NULL"
        )->execute([$now, $deletedBy, $id]);

        return ['success' => true, 'message' => 'Order removed successfully.'];
    }

    private function validate(array $data): array
    {
        $errors = [];

        if (empty($data['patient_id'])) {
            $errors['patient_id'] = 'Patient is required.';
        } else {
            $patient = (new Patient())->where('id', $data['patient_id'])->first();

            if (!$patient || $patient['deleted_at'] !== null) {
                $errors['patient_id'] = 'Patient not found.';
            }
        }

        if (empty($data['procedure_order_config_id'])) {
            $errors['procedure_order_config_id'] = 'Procedure is required.';
        } else {
            $config = (new ProcedureOrderConfig())->where('id', $data['procedure_order_config_id'])->first();

            if (!$config || $config['deleted_at'] !== null) {
                $errors['procedure_order_config_id'] = 'Procedure not found.';
            } elseif ($config['procedure_tier'] !== 'procedure_order') {
                $errors['procedure_order_config_id'] = 'Only a Procedure Order tier item can be ordered.';
            }
        }

        if (empty($data['order_date'])) {
            $errors['order_date'] = 'Order date is required.';
        }

        return $errors;
    }
}
