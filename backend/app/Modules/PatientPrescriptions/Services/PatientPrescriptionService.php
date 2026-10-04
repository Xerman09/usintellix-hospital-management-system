<?php

namespace App\Modules\PatientPrescriptions\Services;

use App\Core\Database;
use App\Modules\GeneralSettings\Services\GeneralSettingService;
use App\Modules\Medications\Models\Medication;
use App\Modules\PatientPrescriptions\Models\PatientPrescription;
use PDO;

class PatientPrescriptionService
{
    /**
     * Detail fields that can be set on a patient prescription record,
     * beyond the patient/medication link itself.
     */
    private const DETAIL_FIELDS = [
        'title', 'begin_date', 'end_date', 'quantity', 'dosage', 'route',
        'frequency', 'refills', 'directions', 'substitution_allowed', 'pharmacy',
        'comments', 'coding', 'occurrence', 'outcome', 'classification_type',
        'verification_status', 'referred_by', 'destination'
    ];

    /**
     * List a patient's recorded prescriptions.
     */
    public function list(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT pp.id, pp.patient_id, pp.medication_id, pp.drug_id, pp.title, pp.begin_date, pp.end_date,
                    pp.quantity, pp.dosage, pp.route, pp.frequency, pp.refills, pp.directions,
                    pp.substitution_allowed, pp.pharmacy, pp.comments, pp.coding,
                    pp.occurrence, pp.outcome, pp.classification_type, pp.verification_status,
                    pp.referred_by, pp.destination, pp.created_at, pp.updated_at,
                    d.name AS drug_name, d.strength AS drug_strength, du.name AS drug_unit_name,
                    pp.prescription_id, pp.line_no, rx.rx_number, rx.prescribed_date, rx.status AS prescription_status
             FROM patient_prescriptions pp
             LEFT JOIN prescriptions rx ON rx.id = pp.prescription_id
             LEFT JOIN drugs d ON d.id = pp.drug_id
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             WHERE pp.patient_id = :patient_id AND pp.deleted_at IS NULL
             ORDER BY rx.prescribed_date DESC, pp.prescription_id DESC, pp.line_no, pp.title"
        );

        $stmt->execute(['patient_id' => $patientId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $refills = \App\Modules\Dispensing\Services\DispensingService::refillInfo(array_column($rows, 'id'));

        return array_map(fn($r) => $r + ($refills[(int) $r['id']] ?? []), $rows);
    }

    /**
     * Record a prescription for a patient. The drug may optionally reference
     * the medications catalog; the title is always stored directly since it
     * may be freely typed instead of catalog-selected.
     */
    public function store(int $patientId, ?int $medicationId, int $createdBy, array $details = [], ?int $drugId = null): array
    {
        $drug = null;

        if ($drugId) {
            $drug = $this->findDrug($drugId);

            if (!$drug) {
                return [
                    'success' => false,
                    'message' => 'The selected medicine is no longer in the Drug Catalog.'
                ];
            }

            // Dangerous drugs need the prescription checks (own slip, prescriber's S2).
            if ($drug['controlled_class'] === PrescriptionService::DANGEROUS_CLASS) {
                return [
                    'success' => false,
                    'message' => 'Dangerous drugs must be written as a New Prescription, which checks the S2 license.'
                ];
            }
        }

        $title = trim((string) ($details['title'] ?? ''));

        // Picked from the catalog with no title typed: use the catalog name.
        if ($title === '' && $drug) {
            $title = $drug['name'];
        }

        if ($title === '') {
            return [
                'success' => false,
                'message' => 'Title is required.'
            ];
        }

        if ($medicationId) {
            $medication = (new Medication())->where('id', $medicationId)->first();

            if (!$medication || $medication['deleted_at'] !== null) {
                return [
                    'success' => false,
                    'message' => 'Selected medication does not exist.'
                ];
            }
        }

        $data = $this->filterDetails($details);
        $data['title'] = $title;
        $data['patient_id'] = $patientId;
        $data['medication_id'] = $medicationId ?: null;
        $data['drug_id'] = $drug ? (int) $drug['id'] : null;
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['created_by'] = $createdBy;

        // A single medicine recorded this way gets a slip of its own.
        $db = Database::connection();
        $ownsTransaction = !$db->inTransaction();
        $ownsTransaction ? $db->beginTransaction() : $db->exec('SAVEPOINT single_prescription');

        try {
            $date = !empty($data['begin_date']) ? substr((string) $data['begin_date'], 0, 10) : date('Y-m-d');
            $db->prepare(
                "INSERT INTO prescriptions (rx_number, patient_id, prescriber_user_id, prescribed_date, valid_until, refill_until, status, created_at, created_by)
                 VALUES (:tmp, :patient, :prescriber, :date, :valid_until, :refill_until, 'active', :now, :user)"
            )->execute([
                'tmp' => 'NEW-' . bin2hex(random_bytes(8)), 'patient' => $patientId, 'prescriber' => $createdBy, 'date' => $date,
                'valid_until' => date('Y-m-d', strtotime($date . ' +' . GeneralSettingService::prescriptionValidityDays() . ' days')),
                'refill_until' => (int) ($data['refills'] ?? 0) > 0 ? date('Y-m-d', strtotime($date . ' +' . GeneralSettingService::refillValidityDays() . ' days')) : null,
                'now' => $data['created_at'], 'user' => $createdBy
            ]);
            $slipId = (int) $db->lastInsertId();
            $db->prepare("UPDATE prescriptions SET rx_number = :n WHERE id = :id")
               ->execute(['n' => 'RX-' . substr($date, 0, 4) . '-' . str_pad((string) $slipId, 5, '0', STR_PAD_LEFT), 'id' => $slipId]);

            $data['prescription_id'] = $slipId;
            $data['line_no'] = 1;
            $id = (new PatientPrescription())->create($data);
            \App\Modules\Dispensing\Services\DispensingService::refreshStatus($slipId);

            $ownsTransaction ? $db->commit() : $db->exec('RELEASE SAVEPOINT single_prescription');
        } catch (\Throwable $e) {
            $ownsTransaction ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT single_prescription');
            throw $e;
        }

        if (!$id) {
            return [
                'success' => false,
                'message' => 'Failed to record prescription.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Prescription added successfully.',
            'data' => ['id' => $id]
        ];
    }

    /**
     * Update the detail fields on an existing patient prescription record.
     */
    /**
     * $drugId: false = leave the catalog link as is; null = unlink;
     * an id = link to that Drug Catalog item.
     */
    public function update(int $id, array $details, int $updatedBy, int|null|false $drugId = false): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Prescription record not found.'
            ];
        }

        if ($blocked = $this->lockedForDispensing($record)) {
            return ['success' => false, 'message' => $blocked];
        }

        $drug = null;

        if ($drugId) {
            $drug = $this->findDrug($drugId);

            if ($drug && $drug['controlled_class'] === PrescriptionService::DANGEROUS_CLASS && (int) ($record['drug_id'] ?? 0) !== $drugId) {
                return ['success' => false, 'message' => 'Dangerous drugs must be written as a New Prescription, which checks the S2 license.'];
            }

            // Keeping an existing link to an item since made inactive is fine; choosing it anew is not.
            if (!$drug && (int) ($record['drug_id'] ?? 0) !== $drugId) {
                return [
                    'success' => false,
                    'message' => 'The selected medicine is no longer in the Drug Catalog.'
                ];
            }
        }

        $title = trim((string) ($details['title'] ?? ''));

        if ($title === '' && $drug) {
            $title = $drug['name'];
        }

        if ($title === '') {
            return [
                'success' => false,
                'message' => 'Title is required.'
            ];
        }

        $data = $this->filterDetails($details);
        $data['title'] = $title;
        if ($drugId !== false) {
            $data['drug_id'] = $drugId ?: null;
        }
        $data['updated_at'] = date('Y-m-d H:i:s');
        $data['updated_by'] = $updatedBy;

        (new PatientPrescription())->update($data, $id);

        if (!empty($record['prescription_id'])) {
            \App\Modules\Dispensing\Services\DispensingService::refreshStatus((int) $record['prescription_id']);
        }

        return [
            'success' => true,
            'message' => 'Prescription updated successfully.'
        ];
    }

    /**
     * Keep only recognized detail fields, converting empty strings to NULL
     * and normalizing substitution_allowed to a strict 0/1.
     */
    private function filterDetails(array $details): array
    {
        $result = [];

        foreach (self::DETAIL_FIELDS as $field) {
            if ($field === 'title' || !array_key_exists($field, $details)) {
                continue;
            }

            if ($field === 'substitution_allowed') {
                $result[$field] = in_array($details[$field], [1, '1', true, 'true'], true) ? 1 : 0;
                continue;
            }

            if ($field === 'refills') {
                $result[$field] = $details[$field] === '' ? null : (int) $details[$field];
                continue;
            }

            $result[$field] = $details[$field] === '' ? null : $details[$field];
        }

        return $result;
    }

    /**
     * Drug Catalog items a prescriber can choose, with what's usable in
     * stock (on hand at active locations, less expired lots) and the
     * item's prescription templates. q matches name, generic or brand
     * name; without q, the first items alphabetically.
     */
    public function drugOptions(string $q, int $limit = 30): array
    {
        $db = Database::connection();
        $params = ['today' => date('Y-m-d')];
        $where = 'd.deleted_at IS NULL AND d.is_active = 1';

        $q = trim($q);
        if ($q !== '') {
            $like = '%' . addcslashes($q, '%_\\') . '%';
            $where .= ' AND (d.name LIKE :q1 OR d.generic_name LIKE :q2 OR d.brand_name LIKE :q3)';
            $params += ['q1' => $like, 'q2' => $like, 'q3' => $like];
        }

        $stmt = $db->prepare(
            "SELECT d.id, d.name, d.generic_name, d.brand_name, d.strength, d.product_type,
                    d.requires_prescription, d.controlled_class, d.is_high_alert, d.is_lasa, d.allow_inventory,
                    df.name AS dosage_form, ar.name AS route_name, du.name AS unit_name,
                    COALESCE(stock.usable, 0) AS usable, COALESCE(stock.locations, 0) AS locations
             FROM drugs d
             LEFT JOIN dosage_forms df ON df.id = d.dosage_form_id
             LEFT JOIN administration_routes ar ON ar.id = d.route_id
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN (
                 SELECT l.drug_id, SUM(l.quantity_on_hand) AS usable, COUNT(DISTINCT l.warehouse_id) AS locations
                 FROM drug_inventory_lots l
                 JOIN warehouses w ON w.id = l.warehouse_id AND w.deleted_at IS NULL AND w.is_active = 1
                 WHERE l.deleted_at IS NULL AND l.is_active = 1 AND l.quantity_on_hand > 0
                   AND (l.expires_date IS NULL OR l.expires_date >= :today)
                 GROUP BY l.drug_id
             ) stock ON stock.drug_id = d.id
             WHERE {$where}
             ORDER BY d.product_type <> 'Drug', d.name
             LIMIT " . max(1, min(100, $limit))
        );
        $stmt->execute($params);
        $drugs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $templates = [];
        if ($drugs) {
            $ids = implode(',', array_map(fn($d) => (int) $d['id'], $drugs));
            foreach ($db->query(
                "SELECT id, drug_id, name, schedule, interval_type, basic_units, refills, is_standard
                 FROM drug_prescription_templates
                 WHERE deleted_at IS NULL AND drug_id IN ({$ids})
                 ORDER BY is_standard DESC, id"
            )->fetchAll(PDO::FETCH_ASSOC) as $t) {
                $templates[(int) $t['drug_id']][] = [
                    'id' => (int) $t['id'], 'name' => $t['name'], 'schedule' => $t['schedule'], 'interval_type' => $t['interval_type'],
                    'basic_units' => $t['basic_units'], 'refills' => (int) $t['refills'], 'is_standard' => (bool) $t['is_standard']
                ];
            }
        }

        return array_map(fn($d) => [
            'id' => (int) $d['id'],
            'name' => $d['name'],
            'generic_name' => $d['generic_name'],
            'brand_name' => $d['brand_name'],
            'strength' => $d['strength'],
            'dosage_form' => $d['dosage_form'],
            'route_name' => $d['route_name'],
            'unit_name' => $d['unit_name'],
            'product_type' => $d['product_type'],
            'requires_prescription' => (bool) $d['requires_prescription'],
            'controlled_class' => $d['controlled_class'] !== 'None' ? $d['controlled_class'] : null,
            'is_high_alert' => (bool) $d['is_high_alert'],
            'is_lasa' => (bool) $d['is_lasa'],
            'is_stocked' => (bool) $d['allow_inventory'],
            'usable' => round((float) $d['usable'], 3),
            'locations' => (int) $d['locations'],
            'templates' => $templates[(int) $d['id']] ?? []
        ], $drugs);
    }

    /** An active, not-deleted Drug Catalog item. */
    private function findDrug(int $id): ?array
    {
        $stmt = Database::connection()->prepare("SELECT id, name, controlled_class FROM drugs WHERE id = :id AND deleted_at IS NULL AND is_active = 1");
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /** A medicine on a prescription the pharmacy has dispensed from can't be changed. */
    private function lockedForDispensing(array $record): ?string
    {
        if (empty($record['prescription_id'])) {
            return null;
        }

        $stmt = Database::connection()->prepare("SELECT dispense_status FROM prescriptions WHERE id = :id");
        $stmt->execute(['id' => (int) $record['prescription_id']]);
        $status = $stmt->fetchColumn();

        return in_array($status, ['pending', 'none', false], true)
            ? null
            : 'The pharmacy has already dispensed from this prescription, so it can\'t be changed.';
    }

    public function find(int $id): ?array
    {
        return (new PatientPrescription())->where('id', $id)->first();
    }

    /**
     * Soft-delete a recorded patient prescription.
     */
    public function remove(int $id, int $deletedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Prescription record not found.'
            ];
        }

        if ($blocked = $this->lockedForDispensing($record)) {
            return ['success' => false, 'message' => $blocked];
        }

        $now = date('Y-m-d H:i:s');

        (new PatientPrescription())->update([
            'deleted_at' => $now,
            'deleted_by' => $deletedBy
        ], $id);

        // Removing a slip's last medicine removes the slip.
        if (!empty($record['prescription_id'])) {
            Database::connection()->prepare(
                "UPDATE prescriptions SET deleted_at = :now, deleted_by = :user
                 WHERE id = :id AND deleted_at IS NULL
                   AND NOT EXISTS (SELECT 1 FROM patient_prescriptions WHERE prescription_id = :id2 AND deleted_at IS NULL)"
            )->execute(['now' => $now, 'user' => $deletedBy, 'id' => (int) $record['prescription_id'], 'id2' => (int) $record['prescription_id']]);
            \App\Modules\Dispensing\Services\DispensingService::refreshStatus((int) $record['prescription_id']);
        }

        return [
            'success' => true,
            'message' => 'Prescription removed successfully.'
        ];
    }
}
