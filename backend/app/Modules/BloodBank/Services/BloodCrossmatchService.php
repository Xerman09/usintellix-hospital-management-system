<?php

namespace App\Modules\BloodBank\Services;

use App\Core\Database;
use PDO;
use RuntimeException;

class BloodCrossmatchService
{
    /**
     * Immunological compatibility rule check:
     * PRBC Compatibility:
     * Recipient O can only receive O
     * Recipient A can receive A, O
     * Recipient B can receive B, O
     * Recipient AB can receive AB, A, B, O (Universal recipient)
     * Rh- can only safely receive Rh- (unless extreme emergency); Rh+ can receive Rh+ or Rh-
     */
    public static function checkAboRhCompatibility(string $recipientAbo, string $recipientRh, string $donorAbo, string $donorRh, string $componentType): array
    {
        $recAbo = strtoupper(trim($recipientAbo));
        $donAbo = strtoupper(trim($donorAbo));
        $recRh = strtolower(trim($recipientRh));
        $donRh = strtolower(trim($donorRh));

        // For Red Blood Cells (PRBC / Whole Blood):
        if (in_array($componentType, ['prbc', 'whole_blood'], true)) {
            $aboCompatible = false;
            if ($recAbo === 'AB') {
                $aboCompatible = true; // Universal recipient
            } elseif ($recAbo === 'A' && in_array($donAbo, ['A', 'O'], true)) {
                $aboCompatible = true;
            } elseif ($recAbo === 'B' && in_array($donAbo, ['B', 'O'], true)) {
                $aboCompatible = true;
            } elseif ($recAbo === 'O' && $donAbo === 'O') {
                $aboCompatible = true; // O can only receive O
            }

            $rhCompatible = ($recRh === 'positive') || ($donRh === 'negative');

            if (!$aboCompatible) {
                return [
                    'compatible' => false,
                    'fatal_risk' => true,
                    'message' => "FATAL ABO INCOMPATIBILITY: Recipient is Group {$recAbo}, but donor unit is Group {$donAbo}. Acute hemolytic transfusion reaction risk!"
                ];
            }

            if (!$rhCompatible) {
                return [
                    'compatible' => false,
                    'fatal_risk' => false,
                    'message' => "Rh(D) INCOMPATIBILITY WARNING: Recipient is Rh Negative, but donor unit is Rh Positive. Risk of anti-D alloimmunization."
                ];
            }
        }

        // For Plasma (FFP / Cryo): ABO rules are reversed (AB is universal plasma donor, O is universal plasma recipient)
        if (in_array($componentType, ['ffp', 'cryoprecipitate'], true)) {
            $plasmaCompatible = false;
            if ($recAbo === 'O') {
                $plasmaCompatible = true; // O recipient can take any plasma
            } elseif ($recAbo === 'A' && in_array($donAbo, ['A', 'AB'], true)) {
                $plasmaCompatible = true;
            } elseif ($recAbo === 'B' && in_array($donAbo, ['B', 'AB'], true)) {
                $plasmaCompatible = true;
            } elseif ($recAbo === 'AB' && $donAbo === 'AB') {
                $plasmaCompatible = true;
            }

            if (!$plasmaCompatible) {
                return [
                    'compatible' => false,
                    'fatal_risk' => false,
                    'message' => "Plasma ABO incompatibility: Recipient {$recAbo} should not receive {$donAbo} plasma with anti-A/anti-B isohemagglutinins."
                ];
            }
        }

        return [
            'compatible' => true,
            'fatal_risk' => false,
            'message' => "ABO/Rh compatibility verified: Recipient ({$recAbo} {$recRh}) compatible with Donor ({$donAbo} {$donRh})."
        ];
    }

    public static function nextCrossmatchNumber(PDO $db, ?int $year = null): string
    {
        $year = $year ?: (int) date('Y');
        $st = $db->prepare("SELECT last_seq FROM blood_crossmatch_counters WHERE prefix_year = :yr FOR UPDATE");
        $st->execute(['yr' => $year]);
        $row = $st->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $next = ((int) $row['last_seq']) + 1;
            $upd = $db->prepare("UPDATE blood_crossmatch_counters SET last_seq = :seq WHERE prefix_year = :yr");
            $upd->execute(['seq' => $next, 'yr' => $year]);
        } else {
            $next = 1;
            $ins = $db->prepare("INSERT INTO blood_crossmatch_counters (prefix_year, last_seq) VALUES (:yr, 1)");
            $ins->execute(['yr' => $year]);
        }

        return sprintf('XM-%d-%05d', $year, $next);
    }

    /**
     * Automatic Release of Expired 48-Hour Reservation Holds
     * If reservation_expires_at < NOW() and reservation_status == 'active_hold',
     * releases the blood unit back to 'available' status.
     */
    public function releaseExpiredReservations(): int
    {
        $db = Database::connection();
        $now = date('Y-m-d H:i:s');

        // Find expired active holds
        $st = $db->prepare(
            "SELECT id, blood_unit_id, crossmatch_number
             FROM blood_crossmatches
             WHERE reservation_status = 'active_hold'
               AND reservation_expires_at < :now"
        );
        $st->execute(['now' => $now]);
        $expired = $st->fetchAll(PDO::FETCH_ASSOC);

        $count = 0;
        foreach ($expired as $xm) {
            // Mark crossmatch hold as expired
            $db->prepare("UPDATE blood_crossmatches SET reservation_status = 'hold_expired', updated_at = NOW() WHERE id = :id")
               ->execute(['id' => $xm['id']]);

            // Release blood inventory unit
            $db->prepare(
                "UPDATE blood_inventory_units
                 SET status = 'available',
                     reserved_for_patient_id = NULL,
                     reserved_until = NULL,
                     updated_at = NOW()
                 WHERE id = :uid AND status = 'crossmatched_reserved'"
            )->execute(['uid' => $xm['blood_unit_id']]);

            $count++;
        }

        return $count;
    }

    /**
     * Perform Crossmatch & Place 48-Hour Reservation Hold
     */
    public function performCrossmatchAndReserve(array $data, array $actor): array
    {
        $db = Database::connection();
        $this->releaseExpiredReservations();

        $patientId = (int) ($data['patient_id'] ?? 0);
        $unitId = (int) ($data['blood_unit_id'] ?? 0);
        if ($patientId <= 0 || $unitId <= 0) {
            return ['success' => false, 'message' => 'Valid patient ID and blood inventory unit ID are required.'];
        }

        // 1. Fetch patient
        $patSt = $db->prepare("SELECT id, patient_no, first_name, last_name, blood_type FROM patients WHERE id = :id LIMIT 1");
        $patSt->execute(['id' => $patientId]);
        $patient = $patSt->fetch(PDO::FETCH_ASSOC);
        if (!$patient) {
            return ['success' => false, 'message' => 'Patient record not found.'];
        }

        $patBloodType = trim($patient['blood_type'] ?: ($data['patient_blood_type'] ?? ''));
        if (empty($patBloodType)) {
            return ['success' => false, 'message' => 'Patient ABO/Rh blood type is not documented in chart. Must perform Type & Screen first.'];
        }

        // Parse patient ABO and Rh
        preg_match('/^(A|B|AB|O)\s*([+-]|pos|neg)?/i', $patBloodType, $mPat);
        $patAbo = $mPat[1] ?? 'O';
        $patRh = (isset($mPat[2]) && in_array(strtolower($mPat[2]), ['-', 'neg'], true)) ? 'negative' : 'positive';

        // 2. Fetch blood inventory unit
        $unitSt = $db->prepare("SELECT * FROM blood_inventory_units WHERE id = :id LIMIT 1");
        $unitSt->execute(['id' => $unitId]);
        $unit = $unitSt->fetch(PDO::FETCH_ASSOC);
        if (!$unit) {
            return ['success' => false, 'message' => 'Blood inventory unit not found.'];
        }

        if ($unit['status'] !== 'available') {
            return ['success' => false, 'message' => "Blood unit {$unit['unit_number']} is currently {$unit['status']} and cannot be crossmatched."];
        }

        // 3. Automated Immunological ABO/Rh Screening
        $compatCheck = self::checkAboRhCompatibility($patAbo, $patRh, $unit['abo_group'], $unit['rh_factor'], $unit['component_type']);
        if (!$compatCheck['compatible'] && !empty($compatCheck['fatal_risk'])) {
            return ['success' => false, 'message' => $compatCheck['message'], 'fatal_incompatibility' => true];
        }

        // 4. Lab Serological Test Phases
        $isSpin = $data['immediate_spin_major'] ?? 'compatible';
        $thermo = $data['thermo_phase_37c_major'] ?? 'compatible';
        $ahg = $data['ahg_phase_major'] ?? 'compatible';
        $minor = $data['minor_crossmatch_result'] ?? 'compatible';

        $isOverallCompatible = ($isSpin === 'compatible' && $thermo === 'compatible' && $ahg === 'compatible');
        $overallStatus = $isOverallCompatible ? 'compatible' : 'incompatible';

        if (!$isOverallCompatible && empty($data['force_least_incompatible'])) {
            return [
                'success' => false,
                'message' => "Crossmatch is serologically INCOMPATIBLE (Agglutination detected in AHG/Coombs phase). Cannot reserve unit without clinical override.",
                'serological_incompatibility' => true
            ];
        }

        if (!$isOverallCompatible && !empty($data['force_least_incompatible'])) {
            $overallStatus = 'least_incompatible_approved';
        }

        // 5. Place 48-Hour Reservation Hold
        $xmNumber = self::nextCrossmatchNumber($db);
        $now = date('Y-m-d H:i:s');
        $expiresAt = date('Y-m-d H:i:s', strtotime('+48 hours'));

        $indication = trim((string) ($data['clinical_indication'] ?? 'Scheduled surgical transfusion hold'));
        $surgeryDate = !empty($data['scheduled_surgery_date']) ? $data['scheduled_surgery_date'] : null;
        $license = trim((string) ($data['medtech_license_no'] ?? 'PRC-MT-ACTIVE'));
        $donorBloodType = $unit['abo_group'] . ($unit['rh_factor'] === 'positive' ? '+' : '-');

        $ins = $db->prepare(
            "INSERT INTO blood_crossmatches (
                crossmatch_number, patient_id, blood_unit_id, order_id,
                patient_blood_type, donor_unit_number, donor_blood_type, component_type,
                immediate_spin_major, thermo_phase_37c_major, ahg_phase_major, minor_crossmatch_result,
                overall_compatibility, compatibility_notes, reservation_status, reserved_at,
                reservation_expires_at, clinical_indication, scheduled_surgery_date,
                performed_by, medtech_license_no, created_at
            ) VALUES (
                :xm, :pid, :uid, :oid,
                :pat_bt, :don_un, :don_bt, :ctype,
                :is_spin, :thermo, :ahg, :minor,
                :overall, :notes, 'active_hold', :now,
                :exp_at, :ind, :surg_date,
                :by, :lic, NOW()
            )"
        );

        $ins->execute([
            'xm' => $xmNumber,
            'pid' => $patientId,
            'uid' => $unitId,
            'oid' => !empty($data['order_id']) ? (int) $data['order_id'] : null,
            'pat_bt' => $patBloodType,
            'don_un' => $unit['unit_number'],
            'don_bt' => $donorBloodType,
            'ctype' => $unit['component_type'],
            'is_spin' => $isSpin,
            'thermo' => $thermo,
            'ahg' => $ahg,
            'minor' => $minor,
            'overall' => $overallStatus,
            'notes' => trim((string) ($data['compatibility_notes'] ?? '')) ?: null,
            'now' => $now,
            'exp_at' => $expiresAt,
            'ind' => $indication,
            'surg_date' => $surgeryDate,
            'by' => (int) $actor['id'],
            'lic' => $license
        ]);

        $xmId = (int) $db->lastInsertId();

        // Lock inventory unit to crossmatched_reserved
        $updUnit = $db->prepare(
            "UPDATE blood_inventory_units
             SET status = 'crossmatched_reserved',
                 reserved_for_patient_id = :pid,
                 reserved_until = :exp_at,
                 updated_at = NOW()
             WHERE id = :uid"
        );
        $updUnit->execute([
            'pid' => $patientId,
            'exp_at' => $expiresAt,
            'uid' => $unitId
        ]);

        return [
            'success' => true,
            'message' => "Crossmatch {$xmNumber} COMPATIBLE. Unit {$unit['unit_number']} locked on 48-hour reservation hold until {$expiresAt}.",
            'id' => $xmId,
            'crossmatch_number' => $xmNumber,
            'reservation_expires_at' => $expiresAt,
            'overall_compatibility' => $overallStatus
        ];
    }

    /**
     * Cancel / Release Crossmatch Reservation Hold early
     */
    public function releaseReservation(int $crossmatchId, ?string $reason, array $actor): array
    {
        $db = Database::connection();
        $st = $db->prepare("SELECT * FROM blood_crossmatches WHERE id = :id LIMIT 1");
        $st->execute(['id' => $crossmatchId]);
        $xm = $st->fetch(PDO::FETCH_ASSOC);

        if (!$xm) {
            return ['success' => false, 'message' => 'Crossmatch record not found.'];
        }

        if ($xm['reservation_status'] !== 'active_hold') {
            return ['success' => false, 'message' => "Reservation hold is already {$xm['reservation_status']}."];
        }

        // Update crossmatch
        $db->prepare(
            "UPDATE blood_crossmatches
             SET reservation_status = 'cancelled_released',
                 released_at = NOW(),
                 released_by = :uid,
                 release_reason = :reason,
                 updated_at = NOW()
             WHERE id = :id"
        )->execute([
            'uid' => (int) $actor['id'],
            'reason' => $reason ?: 'Surgery concluded / reservation hold cancelled by clinician',
            'id' => $crossmatchId
        ]);

        // Release inventory unit
        $db->prepare(
            "UPDATE blood_inventory_units
             SET status = 'available',
                 reserved_for_patient_id = NULL,
                 reserved_until = NULL,
                 updated_at = NOW()
             WHERE id = :uid AND status = 'crossmatched_reserved'"
        )->execute(['uid' => $xm['blood_unit_id']]);

        return [
            'success' => true,
            'message' => "Reservation hold for Crossmatch {$xm['crossmatch_number']} released. Unit returned to available inventory."
        ];
    }

    /**
     * List Crossmatches
     */
    public function listCrossmatches(array $filters): array
    {
        $db = Database::connection();
        $this->releaseExpiredReservations();

        $where = ['1=1'];
        $params = [];

        if (!empty($filters['reservation_status'])) {
            $where[] = 'xm.reservation_status = :status';
            $params['status'] = $filters['reservation_status'];
        }

        if (!empty($filters['patient_id'])) {
            $where[] = 'xm.patient_id = :pid';
            $params['pid'] = (int) $filters['patient_id'];
        }

        if (!empty($filters['q'])) {
            $q = '%' . trim($filters['q']) . '%';
            $where[] = '(xm.crossmatch_number LIKE :q1 OR xm.donor_unit_number LIKE :q2 OR p.patient_no LIKE :q3 OR CONCAT(p.first_name, " ", p.last_name) LIKE :q4)';
            $params['q1'] = $q;
            $params['q2'] = $q;
            $params['q3'] = $q;
            $params['q4'] = $q;
        }

        $sql = "SELECT xm.*,
                       p.patient_no, p.first_name, p.last_name, p.birthdate,
                       u.username AS performed_by_username,
                       TIMESTAMPDIFF(HOUR, NOW(), xm.reservation_expires_at) AS hours_until_expiration
                FROM blood_crossmatches xm
                JOIN patients p ON p.id = xm.patient_id
                LEFT JOIN users u ON u.id = xm.performed_by
                WHERE " . implode(' AND ', $where) . "
                ORDER BY xm.id DESC
                LIMIT 100";

        $st = $db->prepare($sql);
        $st->execute($params);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$r) {
            $r['patient_name'] = trim("{$r['first_name']} {$r['last_name']}");
            $r['is_expired'] = ($r['hours_until_expiration'] !== null && $r['hours_until_expiration'] <= 0);
        }

        return $rows;
    }

    /**
     * Crossmatch Summary Stats
     */
    public function getStats(): array
    {
        $db = Database::connection();
        $this->releaseExpiredReservations();

        $activeHolds = (int) $db->query("SELECT COUNT(*) FROM blood_crossmatches WHERE reservation_status = 'active_hold'")->fetchColumn();
        $expiringIn12h = (int) $db->query("SELECT COUNT(*) FROM blood_crossmatches WHERE reservation_status = 'active_hold' AND reservation_expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 12 HOUR)")->fetchColumn();
        $issuedToday = (int) $db->query("SELECT COUNT(*) FROM blood_crossmatches WHERE reservation_status = 'issued' AND DATE(updated_at) = CURDATE()")->fetchColumn();

        return [
            'active_reservation_holds' => $activeHolds,
            'expiring_within_12h' => $expiringIn12h,
            'issued_today' => $issuedToday
        ];
    }
}
