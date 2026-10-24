<?php

namespace App\Modules\BloodBank\Services;

use App\Core\Database;
use PDO;
use RuntimeException;

class BloodInventoryService
{
    /** Component preservation standards */
    public const COMPONENTS = [
        'prbc' => [
            'name' => 'Packed Red Blood Cells (PRBC)',
            'short' => 'PRBC',
            'min_temp' => 1.0,
            'max_temp' => 6.0,
            'shelf_life_days' => 42,
            'requires_agitation' => 0,
            'default_volume' => 300,
            'standard_location_type' => 'refrigerator'
        ],
        'ffp' => [
            'name' => 'Fresh Frozen Plasma (FFP)',
            'short' => 'FFP',
            'min_temp' => -35.0,
            'max_temp' => -18.0,
            'shelf_life_days' => 365,
            'requires_agitation' => 0,
            'default_volume' => 250,
            'standard_location_type' => 'deep_freezer'
        ],
        'platelets' => [
            'name' => 'Platelet Concentrate / Apheresis',
            'short' => 'Platelets',
            'min_temp' => 20.0,
            'max_temp' => 24.0,
            'shelf_life_days' => 5,
            'requires_agitation' => 1,
            'default_volume' => 250,
            'standard_location_type' => 'platelet_agitator'
        ],
        'cryoprecipitate' => [
            'name' => 'Cryoprecipitate Antihemophilic Factor',
            'short' => 'Cryo',
            'min_temp' => -35.0,
            'max_temp' => -18.0,
            'shelf_life_days' => 365,
            'requires_agitation' => 0,
            'default_volume' => 15,
            'standard_location_type' => 'deep_freezer'
        ],
        'whole_blood' => [
            'name' => 'Whole Blood (WB)',
            'short' => 'Whole Blood',
            'min_temp' => 1.0,
            'max_temp' => 6.0,
            'shelf_life_days' => 35,
            'requires_agitation' => 0,
            'default_volume' => 450,
            'standard_location_type' => 'refrigerator'
        ]
    ];

    public const UNIT_STATUSES = [
        'available' => 'Available in Stock',
        'crossmatched_reserved' => 'Crossmatched / Reserved for Patient',
        'issued' => 'Issued to OR/Ward',
        'transfused' => 'Transfused',
        'quarantined' => 'Quarantined (Cold-Chain or Expiry Lock)',
        'expired' => 'Expired',
        'discarded' => 'Discarded / Biohazard'
    ];

    /**
     * Generate standard ISBT 128 / Hospital DIN: W26-YYYY-XXXXX
     */
    public static function nextUnitNumber(PDO $db, ?int $year = null): string
    {
        $year = $year ?: (int) date('Y');
        $st = $db->prepare("SELECT last_seq FROM blood_unit_counters WHERE prefix_year = :yr FOR UPDATE");
        $st->execute(['yr' => $year]);
        $row = $st->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $next = ((int) $row['last_seq']) + 1;
            $upd = $db->prepare("UPDATE blood_unit_counters SET last_seq = :seq WHERE prefix_year = :yr");
            $upd->execute(['seq' => $next, 'yr' => $year]);
        } else {
            $next = 1;
            $ins = $db->prepare("INSERT INTO blood_unit_counters (prefix_year, last_seq) VALUES (:yr, 1)");
            $ins->execute(['yr' => $year]);
        }

        return sprintf('W26-%d-%05d', $year, $next);
    }

    /**
     * Automatic Quarantine of Expired Blood Units.
     * Flags any available or reserved unit whose expiration_date has passed (< CURDATE()) as 'quarantined'.
     */
    public function autoQuarantineExpiredUnits(): int
    {
        $db = Database::connection();
        $upd = $db->prepare(
            "UPDATE blood_inventory_units
             SET status = 'quarantined',
                 quarantine_reason = 'Automated Quarantine: Unit exceeded preservation expiration date.',
                 quarantined_at = NOW(),
                 updated_at = NOW()
             WHERE status IN ('available', 'crossmatched_reserved')
               AND expiration_date < CURDATE()"
        );
        $upd->execute();
        return $upd->rowCount();
    }

    /**
     * List inventory blood units with filters
     */
    public function listUnits(array $filters): array
    {
        $db = Database::connection();
        $this->autoQuarantineExpiredUnits();

        $where = ['1=1'];
        $params = [];

        if (!empty($filters['component_type'])) {
            $where[] = 'u.component_type = :ctype';
            $params['ctype'] = $filters['component_type'];
        }

        if (!empty($filters['abo_group'])) {
            $where[] = 'u.abo_group = :abo';
            $params['abo'] = $filters['abo_group'];
        }

        if (!empty($filters['rh_factor'])) {
            $where[] = 'u.rh_factor = :rh';
            $params['rh'] = $filters['rh_factor'];
        }

        if (!empty($filters['status'])) {
            $where[] = 'u.status = :status';
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['storage_location_id'])) {
            $where[] = 'u.storage_location_id = :loc';
            $params['loc'] = (int) $filters['storage_location_id'];
        }

        if (!empty($filters['q'])) {
            $q = '%' . trim($filters['q']) . '%';
            $where[] = '(u.unit_number LIKE :q1 OR u.shelf_slot LIKE :q2 OR d.donor_number LIKE :q3 OR loc.name LIKE :q4 OR p.patient_no LIKE :q5)';
            $params['q1'] = $q;
            $params['q2'] = $q;
            $params['q3'] = $q;
            $params['q4'] = $q;
            $params['q5'] = $q;
        }

        $sql = "SELECT u.*,
                       loc.name AS storage_location_name, loc.equipment_type, loc.current_temp_c,
                       d.donor_number, CONCAT(d.first_name, ' ', d.last_name) AS donor_name,
                       p.patient_no AS reserved_patient_no, CONCAT(p.first_name, ' ', p.last_name) AS reserved_patient_name,
                       DATEDIFF(u.expiration_date, CURDATE()) AS days_until_expiry
                FROM blood_inventory_units u
                LEFT JOIN blood_storage_locations loc ON loc.id = u.storage_location_id
                LEFT JOIN blood_donors d ON d.id = u.donor_id
                LEFT JOIN patients p ON p.id = u.reserved_for_patient_id
                WHERE " . implode(' AND ', $where) . "
                ORDER BY u.status ASC, u.expiration_date ASC
                LIMIT 100";

        $st = $db->prepare($sql);
        $st->execute($params);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$r) {
            $cfg = self::COMPONENTS[$r['component_type']] ?? null;
            $r['component_name'] = $cfg['name'] ?? strtoupper($r['component_type']);
            $r['component_short'] = $cfg['short'] ?? strtoupper($r['component_type']);
            $r['blood_type_formatted'] = "{$r['abo_group']} " . ($r['rh_factor'] === 'positive' ? 'Rh+' : 'Rh-');
            $r['status_label'] = self::UNIT_STATUSES[$r['status']] ?? $r['status'];
            $r['temp_spec_label'] = "{$r['storage_temp_min_c']}°C to {$r['storage_temp_max_c']}°C" . ($r['requires_continuous_agitation'] ? " (Agitated)" : "");
        }

        return $rows;
    }

    /**
     * Add or receive a blood product unit
     */
    public function addUnit(array $data, array $actor): array
    {
        $db = Database::connection();
        $compType = $data['component_type'] ?? '';
        if (!isset(self::COMPONENTS[$compType])) {
            return ['success' => false, 'message' => 'Valid blood component type is required (PRBC, FFP, Platelets, Cryo, WB).'];
        }

        $cfg = self::COMPONENTS[$compType];
        $abo = $data['abo_group'] ?? '';
        $rh = $data['rh_factor'] ?? '';
        if (!in_array($abo, ['A', 'B', 'AB', 'O'], true) || !in_array($rh, ['positive', 'negative'], true)) {
            return ['success' => false, 'message' => 'Valid confirmed ABO group (A, B, AB, O) and Rh factor (positive, negative) are required.'];
        }

        $collectionDate = !empty($data['collection_date']) ? $data['collection_date'] : date('Y-m-d');
        if (!empty($data['expiration_date'])) {
            $expirationDate = $data['expiration_date'];
        } else {
            $expirationDate = date('Y-m-d', strtotime("{$collectionDate} + {$cfg['shelf_life_days']} days"));
        }

        $volumeMl = !empty($data['volume_ml']) ? (int) $data['volume_ml'] : $cfg['default_volume'];
        $donorId = !empty($data['donor_id']) ? (int) $data['donor_id'] : null;
        $locId = !empty($data['storage_location_id']) ? (int) $data['storage_location_id'] : null;
        $shelf = trim((string) ($data['shelf_slot'] ?? ''));

        // If donorId provided, verify donor is eligible and ABO matches
        if ($donorId) {
            $donorSt = $db->prepare("SELECT * FROM blood_donors WHERE id = :id LIMIT 1");
            $donorSt->execute(['id' => $donorId]);
            $donor = $donorSt->fetch(PDO::FETCH_ASSOC);
            if (!$donor) {
                return ['success' => false, 'message' => 'Linked blood donor not found.'];
            }
            if ($donor['eligibility_status'] !== 'eligible') {
                return ['success' => false, 'message' => "Cannot process unit from donor {$donor['donor_number']}: Donor is {$donor['eligibility_status']}."];
            }
            if ($donor['abo_group'] !== 'unknown' && $donor['abo_group'] !== $abo) {
                return ['success' => false, 'message' => "Mismatched ABO group: Unit is labeled {$abo}, but donor {$donor['donor_number']} is typed {$donor['abo_group']}."];
            }
        }

        $unitNumber = !empty($data['unit_number']) ? trim((string) $data['unit_number']) : self::nextUnitNumber($db);

        $ins = $db->prepare(
            "INSERT INTO blood_inventory_units (
                unit_number, donor_id, collection_date, expiration_date,
                component_type, volume_ml, abo_group, rh_factor, kell_antigen,
                storage_location_id, shelf_slot, storage_temp_min_c, storage_temp_max_c,
                requires_continuous_agitation, status, created_at
            ) VALUES (
                :no, :did, :cdate, :edate,
                :ctype, :vol, :abo, :rh, :kell,
                :loc, :shelf, :tmin, :tmax,
                :agit, 'available', NOW()
            )"
        );

        $ins->execute([
            'no' => $unitNumber,
            'did' => $donorId,
            'cdate' => $collectionDate,
            'edate' => $expirationDate,
            'ctype' => $compType,
            'vol' => $volumeMl,
            'abo' => $abo,
            'rh' => $rh,
            'kell' => $data['kell_antigen'] ?? 'unknown',
            'loc' => $locId,
            'shelf' => $shelf ?: null,
            'tmin' => $cfg['min_temp'],
            'tmax' => $cfg['max_temp'],
            'agit' => $cfg['requires_agitation']
        ]);

        $unitId = (int) $db->lastInsertId();

        // Increment donor's donation counter if linked
        if ($donorId) {
            $db->prepare("UPDATE blood_donors SET total_donations = total_donations + 1, last_donation_date = :cdate WHERE id = :id")
               ->execute(['cdate' => $collectionDate, 'id' => $donorId]);
        }

        return [
            'success' => true,
            'message' => "Blood unit {$unitNumber} ({$cfg['short']} {$abo} {$rh}) registered into inventory.",
            'id' => $unitId,
            'unit_number' => $unitNumber
        ];
    }

    /**
     * Cold-Chain Temperature Check Logger
     */
    public function logColdChainTemp(int $locationId, float $tempC, ?string $notes, array $actor): array
    {
        $db = Database::connection();
        $locSt = $db->prepare("SELECT * FROM blood_storage_locations WHERE id = :id AND is_active = 1 LIMIT 1");
        $locSt->execute(['id' => $locationId]);
        $loc = $locSt->fetch(PDO::FETCH_ASSOC);
        if (!$loc) {
            return ['success' => false, 'message' => 'Storage location not found.'];
        }

        $min = (float) $loc['min_temp_c'];
        $max = (float) $loc['max_temp_c'];
        $isInRange = ($tempC >= $min && $tempC <= $max) ? 1 : 0;
        $alertTriggered = $isInRange ? 0 : 1;

        // Log reading
        $ins = $db->prepare(
            "INSERT INTO blood_cold_chain_logs (
                storage_location_id, recorded_temp_c, is_in_range, alert_triggered, logged_by, logged_at, notes
            ) VALUES (
                :loc, :temp, :in_range, :alert, :uid, NOW(), :notes
            )"
        );
        $ins->execute([
            'loc' => $locationId,
            'temp' => $tempC,
            'in_range' => $isInRange,
            'alert' => $alertTriggered,
            'uid' => (int) $actor['id'],
            'notes' => $notes ?: null
        ]);

        // Update location current temp
        $db->prepare("UPDATE blood_storage_locations SET current_temp_c = :temp, last_temp_check_at = NOW() WHERE id = :id")
           ->execute(['temp' => $tempC, 'id' => $locationId]);

        // If breached, automatically flag all units in this storage location as quarantined
        $breachedUnitsCount = 0;
        if (!$isInRange) {
            $breachNotes = sprintf("Cold-chain breach: %s temp recorded at %s°C (safe range: %s°C to %s°C).", $loc['name'], $tempC, $min, $max);
            $upd = $db->prepare(
                "UPDATE blood_inventory_units
                 SET is_cold_chain_breached = 1,
                     cold_chain_breach_notes = :notes,
                     status = 'quarantined',
                     quarantine_reason = :qreason,
                     quarantined_at = NOW(),
                     updated_at = NOW()
                 WHERE storage_location_id = :loc AND status = 'available'"
            );
            $upd->execute([
                'notes' => $breachNotes,
                'qreason' => "Quarantined due to cold-chain excursion at {$loc['name']}.",
                'loc' => $locationId
            ]);
            $breachedUnitsCount = $upd->rowCount();
        }

        return [
            'success' => true,
            'message' => $isInRange
                ? "Temperature {$tempC}°C recorded for {$loc['name']}. Normal within range."
                : "COLD-CHAIN BREACH ALERT: {$tempC}°C outside safe range ({$min}°C–{$max}°C). {$breachedUnitsCount} units quarantined.",
            'is_in_range' => (bool) $isInRange,
            'quarantined_units' => $breachedUnitsCount
        ];
    }

    /**
     * Manual Quarantine / Unquarantine Action
     */
    public function updateUnitStatus(int $unitId, string $status, ?string $reason, array $actor): array
    {
        $db = Database::connection();
        if (!isset(self::UNIT_STATUSES[$status])) {
            return ['success' => false, 'message' => 'Invalid unit status.'];
        }

        $upd = $db->prepare(
            "UPDATE blood_inventory_units
             SET status = :status,
                 quarantine_reason = CASE WHEN :status = 'quarantined' THEN :reason ELSE quarantine_reason END,
                 quarantined_at = CASE WHEN :status = 'quarantined' THEN NOW() ELSE quarantined_at END,
                 updated_at = NOW()
             WHERE id = :id"
        );
        $upd->execute([
            'status' => $status,
            'reason' => $reason ?: null,
            'id' => $unitId
        ]);

        return ['success' => true, 'message' => "Unit status updated to " . self::UNIT_STATUSES[$status]];
    }

    /**
     * Get list of storage locations
     */
    public function getStorageLocations(): array
    {
        $db = Database::connection();
        return $db->query("SELECT * FROM blood_storage_locations WHERE is_active = 1 ORDER BY equipment_type, id")->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Real-time blood bank inventory KPI counters
     */
    public function getInventoryStats(): array
    {
        $db = Database::connection();
        $this->autoQuarantineExpiredUnits();

        $totalAvailable = (int) $db->query("SELECT COUNT(*) FROM blood_inventory_units WHERE status = 'available'")->fetchColumn();
        $totalQuarantined = (int) $db->query("SELECT COUNT(*) FROM blood_inventory_units WHERE status = 'quarantined'")->fetchColumn();
        $totalReserved = (int) $db->query("SELECT COUNT(*) FROM blood_inventory_units WHERE status = 'crossmatched_reserved'")->fetchColumn();
        $nearExpiry = (int) $db->query("SELECT COUNT(*) FROM blood_inventory_units WHERE status = 'available' AND expiration_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)")->fetchColumn();

        // Breakdown by component
        $byComponent = $db->query(
            "SELECT component_type, COUNT(*) as cnt
             FROM blood_inventory_units
             WHERE status = 'available'
             GROUP BY component_type"
        )->fetchAll(PDO::FETCH_KEY_PAIR);

        // Breakdown by ABO / Rh for available units
        $byGroup = $db->query(
            "SELECT CONCAT(abo_group, ' ', rh_factor) as grp, COUNT(*) as cnt
             FROM blood_inventory_units
             WHERE status = 'available'
             GROUP BY abo_group, rh_factor"
        )->fetchAll(PDO::FETCH_KEY_PAIR);

        return [
            'total_available' => $totalAvailable,
            'total_quarantined' => $totalQuarantined,
            'total_reserved' => $totalReserved,
            'near_expiry_3days' => $nearExpiry,
            'available_by_component' => $byComponent,
            'available_by_group' => $byGroup
        ];
    }
}
