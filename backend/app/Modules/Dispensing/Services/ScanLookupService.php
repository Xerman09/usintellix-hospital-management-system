<?php

namespace App\Modules\Dispensing\Services;

use App\Core\Database;
use App\Modules\DrugInventory\Services\NearExpiryQuarantineService;
use App\Modules\DrugInventory\Services\PharmacyBatchRecallService;
use PDO;

/**
 * Pharmacy > Dispensing: resolving a scanned code.
 *
 * Three lookups, one per thing the pharmacy scans at the counter:
 *
 *   rx()      the Rx number on the prescription slip  -> which prescription
 *   patient() the patient number on the wristband/ID  -> which patient
 *   lot()     the barcode on the medicine pack        -> which drug and lots
 *
 * Each answers with found = true/false rather than a 404, because "no match"
 * is an ordinary outcome when someone scans the wrong label, not an error the
 * caller should treat as a broken request.
 *
 * Two deliberate limits:
 *
 *   * Only the identifiers that are actually printed on labels are matched:
 *     prescriptions.rx_number, patients.patient_no, drugs.barcode and
 *     drug_inventory_lots.lot_number. patients.id_document_number is NOT
 *     matched -- it is field-level encrypted, and a passport or national ID
 *     number is not something the pharmacy should be able to search on.
 *   * Only the fields needed to confirm identity come back. A scan is an
 *     identity check, so it answers "is this the right patient/medicine", not
 *     "tell me about this patient".
 */
class ScanLookupService
{
    /** Who may use these lookups: the same people who may dispense. */
    public const ROLES = DispensingService::ROLES;

    /** A scanner can send padding, newlines or lower case; labels are upper case. */
    private static function normalise(string $code): string
    {
        return strtoupper(trim(preg_replace('/[\s\x00-\x1F]+/', '', $code) ?? ''));
    }

    /**
     * The Rx number on a prescription slip.
     *
     * Matched exactly (case-insensitively), never by prefix: RX-2026-0028 must
     * not open RX-2026-00280.
     */
    public function rx(string $code): array
    {
        $needle = self::normalise($code);
        if ($needle === '') {
            return ['found' => false, 'code' => $code, 'message' => 'Nothing was scanned.'];
        }

        $stmt = Database::connection()->prepare(
            "SELECT p.id, p.rx_number, p.dispense_status, p.prescribed_date, p.status,
                    pt.id AS patient_id, pt.patient_no,
                    TRIM(CONCAT_WS(' ', pt.first_name, pt.last_name)) AS patient_name
             FROM prescriptions p
             JOIN patients pt ON pt.id = p.patient_id
             WHERE UPPER(p.rx_number) = :code AND p.deleted_at IS NULL
             LIMIT 1"
        );
        $stmt->execute(['code' => $needle]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return [
                'found' => false,
                'code' => $needle,
                'message' => "No prescription has the number {$needle}. Check the slip, or find it in the queue.",
            ];
        }

        return [
            'found' => true,
            'code' => $needle,
            'prescription' => [
                'id' => (int) $row['id'],
                'rx_number' => $row['rx_number'],
                'dispense_status' => $row['dispense_status'],
                'status' => $row['status'],
                'prescribed_date' => $row['prescribed_date'],
                'patient_id' => (int) $row['patient_id'],
                'patient_no' => $row['patient_no'],
                'patient_name' => $row['patient_name'],
            ],
            'message' => "{$row['rx_number']} for {$row['patient_name']}.",
        ];
    }

    /**
     * The patient number on a wristband or ID card.
     *
     * `expected_patient_id` is the patient the pharmacist is about to hand
     * medicine to. When it is given, the verdict is the thing that matters:
     * matches_expected tells the screen whether to let the handover continue.
     */
    public function patient(string $code, ?int $expectedPatientId = null): array
    {
        $needle = self::normalise($code);
        if ($needle === '') {
            return ['found' => false, 'code' => $code, 'message' => 'Nothing was scanned.'];
        }

        $stmt = Database::connection()->prepare(
            "SELECT id, patient_no, TRIM(CONCAT_WS(' ', first_name, last_name)) AS name, sex, birthdate
             FROM patients
             WHERE UPPER(patient_no) = :code AND deleted_at IS NULL
             LIMIT 1"
        );
        $stmt->execute(['code' => $needle]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return [
                'found' => false,
                'code' => $needle,
                'matches_expected' => $expectedPatientId !== null ? false : null,
                'message' => "No patient has the number {$needle}.",
            ];
        }

        $matches = $expectedPatientId !== null ? ((int) $row['id'] === $expectedPatientId) : null;

        return [
            'found' => true,
            'code' => $needle,
            'matches_expected' => $matches,
            'patient' => [
                'id' => (int) $row['id'],
                'patient_no' => $row['patient_no'],
                'name' => $row['name'],
                'sex' => $row['sex'],
                // Age, not birthdate: enough to confirm a person at the counter
                // without handing out their date of birth on every scan.
                'age' => $row['birthdate'] ? (new \DateTime($row['birthdate']))->diff(new \DateTime())->y : null,
            ],
            'message' => $matches === false
                ? "This is {$row['name']} ({$row['patient_no']}), who is NOT the patient on this prescription."
                : "{$row['name']} ({$row['patient_no']}).",
        ];
    }

    /**
     * The barcode on a medicine pack.
     *
     * A pack barcode normally identifies the PRODUCT (drugs.barcode, an EAN-13
     * here), while the lot number is printed alongside it -- so the code is
     * tried as a lot number first and then as a drug barcode, and the caller is
     * told which it matched.
     *
     * With `expected_drug_id`, the verdict is what matters: matches_expected
     * answers "is the pack in my hand the medicine I am about to dispense".
     * With `warehouse_id`, only lots at that location are returned, because a
     * dispensing comes from one location.
     *
     * Every lot carries why it cannot be used, if it cannot -- expired,
     * near-expiry quarantine, retired, or under recall -- using the same two
     * services dispense() itself uses, so a scan cannot say a lot is fine when
     * dispensing would refuse it.
     */
    public function lot(string $code, ?int $expectedDrugId = null, ?int $warehouseId = null): array
    {
        $needle = self::normalise($code);
        if ($needle === '') {
            return ['found' => false, 'code' => $code, 'message' => 'Nothing was scanned.'];
        }

        $db = Database::connection();

        // A lot number is the more specific match, so it is tried first.
        $stmt = $db->prepare(
            "SELECT DISTINCT l.drug_id FROM drug_inventory_lots l
             WHERE UPPER(l.lot_number) = :code AND l.deleted_at IS NULL"
        );
        $stmt->execute(['code' => $needle]);
        $drugIds = array_map('intval', array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'drug_id'));
        $matched = $drugIds ? 'lot' : null;

        if (!$drugIds) {
            $stmt = $db->prepare(
                "SELECT id FROM drugs WHERE UPPER(barcode) = :code AND deleted_at IS NULL LIMIT 1"
            );
            $stmt->execute(['code' => $needle]);
            $drugId = $stmt->fetchColumn();
            if ($drugId !== false) {
                $drugIds = [(int) $drugId];
                $matched = 'drug';
            }
        }

        if (!$drugIds) {
            return [
                'found' => false,
                'code' => $needle,
                'matched' => null,
                'matches_expected' => $expectedDrugId !== null ? false : null,
                'message' => "Nothing in the catalog or in stock matches {$needle}.",
            ];
        }

        $drugs = $db->query(
            "SELECT id, name, generic_name, strength, barcode, is_high_alert, is_lasa
             FROM drugs WHERE id IN (" . implode(',', $drugIds) . ")"
        )->fetchAll(PDO::FETCH_ASSOC);

        $params = ['code' => $needle];
        $where = "l.drug_id IN (" . implode(',', $drugIds) . ") AND l.deleted_at IS NULL";
        if ($matched === 'lot') {
            $where .= " AND UPPER(l.lot_number) = :code";
        }
        if ($warehouseId !== null) {
            $where .= " AND l.warehouse_id = :wh";
            $params['wh'] = $warehouseId;
        }

        $stmt = $db->prepare(
            "SELECT l.id, l.drug_id, l.lot_number, l.expires_date, l.quantity_on_hand,
                    l.is_active, l.is_quarantined, l.quarantine_reason,
                    l.warehouse_id, w.name AS warehouse_name
             FROM drug_inventory_lots l
             JOIN warehouses w ON w.id = l.warehouse_id
             WHERE {$where}
             ORDER BY l.expires_date IS NULL, l.expires_date, l.id"
        );
        if ($matched !== 'lot') {
            unset($params['code']);
        }
        $stmt->execute($params);

        $lots = array_map(function (array $l) {
            $blocked = NearExpiryQuarantineService::isLotBlocked($l, 60);
            if (!$blocked) {
                $recall = PharmacyBatchRecallService::isLotRecalled((int) $l['drug_id'], (string) $l['lot_number']);
                if ($recall) {
                    $blocked = "Under active recall {$recall['recall_number']} ({$recall['reason']}).";
                }
            }
            if (!$blocked && (float) $l['quantity_on_hand'] <= 0) {
                $blocked = 'This lot is empty.';
            }

            return [
                'id' => (int) $l['id'],
                'drug_id' => (int) $l['drug_id'],
                'lot_number' => $l['lot_number'],
                'expires_date' => $l['expires_date'],
                'quantity' => (float) $l['quantity_on_hand'],
                'warehouse_id' => (int) $l['warehouse_id'],
                'warehouse_name' => $l['warehouse_name'],
                'is_dispensable' => $blocked === null,
                'blocked_reason' => $blocked,
            ];
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));

        $matches = $expectedDrugId !== null ? in_array($expectedDrugId, $drugIds, true) : null;
        $primary = $drugs[0] ?? null;
        $usable = array_values(array_filter($lots, fn($l) => $l['is_dispensable']));

        if ($matches === false) {
            $message = 'This is ' . ($primary['name'] ?? 'another medicine')
                . ', which is NOT the medicine on this line.';
        } elseif (!$lots) {
            $message = ($primary['name'] ?? $needle) . ' has no stock'
                . ($warehouseId !== null ? ' at this location.' : '.');
        } elseif (!$usable) {
            $message = ($primary['name'] ?? $needle) . ': no usable lot. '
                . ($lots[0]['blocked_reason'] ?? '');
        } else {
            $message = ($primary['name'] ?? $needle) . ': ' . count($usable) . ' usable lot(s).';
        }

        return [
            'found' => true,
            'code' => $needle,
            'matched' => $matched,
            'matches_expected' => $matches,
            'drugs' => array_map(fn($d) => [
                'id' => (int) $d['id'],
                'name' => $d['name'],
                'generic_name' => $d['generic_name'],
                'strength' => $d['strength'],
                'barcode' => $d['barcode'],
                'is_high_alert' => (bool) $d['is_high_alert'],
                'is_lasa' => (bool) $d['is_lasa'],
            ], $drugs),
            'lots' => $lots,
            'message' => $message,
        ];
    }
}
