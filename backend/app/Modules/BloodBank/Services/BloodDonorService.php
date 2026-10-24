<?php

namespace App\Modules\BloodBank\Services;

use App\Core\Database;
use PDO;
use RuntimeException;

class BloodDonorService
{
    public const ABO_GROUPS = ['A', 'B', 'AB', 'O', 'unknown'];
    public const RH_FACTORS = ['positive', 'negative', 'unknown'];

    public const ELIGIBILITY_STATUSES = [
        'eligible' => 'Eligible to Donate',
        'temporary_deferred' => 'Temporarily Deferred',
        'permanently_deferred' => 'Permanently Deferred (High Risk / Reactive TTI)',
        'pending_screening' => 'Pending Complete Screening'
    ];

    public static function nextDonorNumber(PDO $db, ?int $year = null): string
    {
        $year = $year ?: (int) date('Y');
        $st = $db->prepare("SELECT last_seq FROM blood_donor_counters WHERE prefix_year = :yr FOR UPDATE");
        $st->execute(['yr' => $year]);
        $row = $st->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $next = ((int) $row['last_seq']) + 1;
            $upd = $db->prepare("UPDATE blood_donor_counters SET last_seq = :seq WHERE prefix_year = :yr");
            $upd->execute(['seq' => $next, 'yr' => $year]);
        } else {
            $next = 1;
            $ins = $db->prepare("INSERT INTO blood_donor_counters (prefix_year, last_seq) VALUES (:yr, 1)");
            $ins->execute(['yr' => $year]);
        }

        return sprintf('BD-%d-%05d', $year, $next);
    }

    /**
     * Automated Donor Eligibility Evaluation
     */
    public static function evaluateDonorEligibility(array $data): array
    {
        $weight = isset($data['weight_kg']) ? (float) $data['weight_kg'] : 0.0;
        $hb = isset($data['hemoglobin_g_dl']) && $data['hemoglobin_g_dl'] !== '' ? (float) $data['hemoglobin_g_dl'] : null;
        $gender = strtolower((string) ($data['gender'] ?? 'male'));

        $hiv = $data['hiv_screen'] ?? 'pending';
        $hbv = $data['hbv_screen'] ?? 'pending';
        $hcv = $data['hcv_screen'] ?? 'pending';
        $syphilis = $data['syphilis_screen'] ?? 'pending';
        $malaria = $data['malaria_screen'] ?? 'pending';

        // 1. Permanent deferral: Any reactive viral/infectious marker or high-risk exposure
        if ($hiv === 'reactive' || $hbv === 'reactive' || $hcv === 'reactive') {
            return [
                'status' => 'permanently_deferred',
                'reason' => 'Reactive Transfusion-Transmissible Infection (TTI) screen: HIV/HBV/HCV.',
                'until' => null
            ];
        }

        // 2. Weight safety check (minimum 50.0 kg)
        if ($weight < 50.0) {
            return [
                'status' => 'temporary_deferred',
                'reason' => sprintf('Body weight (%s kg) is below minimum 50.0 kg blood volume donor safety limit.', $weight),
                'until' => date('Y-m-d', strtotime('+30 days'))
            ];
        }

        // 3. Hemoglobin check (Female >= 12.5, Male >= 13.0)
        if ($hb !== null) {
            $minHb = $gender === 'female' ? 12.5 : 13.0;
            if ($hb < $minHb) {
                return [
                    'status' => 'temporary_deferred',
                    'reason' => sprintf('Hemoglobin (%s g/dL) is below required %s g/dL minimum.', $hb, $minHb),
                    'until' => date('Y-m-d', strtotime('+30 days'))
                ];
            }
        }

        // 4. Temporary questionnaire deferrals
        if (!empty($data['has_recent_tattoo_piercing'])) {
            return [
                'status' => 'temporary_deferred',
                'reason' => 'Recent tattoo or body piercing within last 12 months (window period precaution).',
                'until' => date('Y-m-d', strtotime('+180 days'))
            ];
        }

        if (!empty($data['has_recent_travel_malaria']) || $malaria === 'reactive') {
            return [
                'status' => 'temporary_deferred',
                'reason' => 'Endemic malaria travel history or reactive antigen screen.',
                'until' => date('Y-m-d', strtotime('+90 days'))
            ];
        }

        if ($syphilis === 'reactive') {
            return [
                'status' => 'temporary_deferred',
                'reason' => 'Reactive Syphilis screen (VDRL/RPR) - defer for treatment and re-testing.',
                'until' => date('Y-m-d', strtotime('+90 days'))
            ];
        }

        // 5. If screening is pending
        if ($hiv === 'pending' || $hbv === 'pending' || $hcv === 'pending' || $syphilis === 'pending' || $malaria === 'pending' || $hb === null) {
            return [
                'status' => 'pending_screening',
                'reason' => 'TTI laboratory screening or physical assessment pending.',
                'until' => null
            ];
        }

        return [
            'status' => 'eligible',
            'reason' => 'Full clinical screening and non-reactive TTI serology complete. Cleared for blood donation.',
            'until' => null
        ];
    }

    /**
     * Register or update a blood donor record
     */
    public function registerDonor(array $data, array $actor): array
    {
        $db = Database::connection();
        $firstName = trim((string) ($data['first_name'] ?? ''));
        $lastName = trim((string) ($data['last_name'] ?? ''));
        $birthdate = trim((string) ($data['birthdate'] ?? ''));
        $gender = strtolower((string) ($data['gender'] ?? 'male'));
        $phone = trim((string) ($data['phone'] ?? ''));

        if (empty($firstName) || empty($lastName)) {
            return ['success' => false, 'message' => 'Donor first and last name are required.'];
        }
        if (empty($birthdate) || !strtotime($birthdate)) {
            return ['success' => false, 'message' => 'Valid birthdate is required.'];
        }

        // Donor age check (18 - 65 standard)
        $age = (int) date_diff(date_create($birthdate), date_create(date('Y-m-d')))->y;
        if ($age < 17 || $age > 65) {
            return ['success' => false, 'message' => "Donor age is {$age} years. Voluntary donors must be between 17 and 65 years old."];
        }

        $weight = (float) ($data['weight_kg'] ?? 0);
        if ($weight <= 0) {
            return ['success' => false, 'message' => 'Donor weight is required.'];
        }

        $abo = $data['abo_group'] ?? 'unknown';
        if (!in_array($abo, self::ABO_GROUPS, true)) $abo = 'unknown';

        $rh = $data['rh_factor'] ?? 'unknown';
        if (!in_array($rh, self::RH_FACTORS, true)) $rh = 'unknown';

        $eval = self::evaluateDonorEligibility($data);

        $donorId = (int) ($data['id'] ?? 0);
        if ($donorId > 0) {
            // Update
            $upd = $db->prepare(
                "UPDATE blood_donors
                 SET first_name = :fn, middle_name = :mn, last_name = :ln, birthdate = :bd,
                     gender = :gen, phone = :ph, email = :em, national_id = :nid, address = :addr,
                     abo_group = :abo, rh_factor = :rh, kell_antigen = :kell, weight_kg = :wt,
                     hemoglobin_g_dl = :hb, blood_pressure_systolic = :bps, blood_pressure_diastolic = :bpd,
                     pulse_rate = :pulse, temperature_c = :temp,
                     hiv_screen = :hiv, hbv_screen = :hbv, hcv_screen = :hcv,
                     syphilis_screen = :syph, malaria_screen = :mal,
                     has_recent_tattoo_piercing = :tat, has_recent_travel_malaria = :trav,
                     has_high_risk_exposure = :exp, has_recent_illness = :ill,
                     questionnaire_notes = :qnotes,
                     eligibility_status = :status, deferral_reason = :def_reason, deferred_until = :def_until,
                     screened_by = :uid, screened_at = NOW(), updated_at = NOW()
                 WHERE id = :id"
            );
            $upd->execute([
                'fn' => $firstName,
                'mn' => trim((string) ($data['middle_name'] ?? '')) ?: null,
                'ln' => $lastName,
                'bd' => $birthdate,
                'gen' => in_array($gender, ['male', 'female', 'other'], true) ? $gender : 'male',
                'ph' => $phone,
                'em' => trim((string) ($data['email'] ?? '')) ?: null,
                'nid' => trim((string) ($data['national_id'] ?? '')) ?: null,
                'addr' => trim((string) ($data['address'] ?? '')) ?: null,
                'abo' => $abo,
                'rh' => $rh,
                'kell' => $data['kell_antigen'] ?? 'unknown',
                'wt' => $weight,
                'hb' => isset($data['hemoglobin_g_dl']) && $data['hemoglobin_g_dl'] !== '' ? (float) $data['hemoglobin_g_dl'] : null,
                'bps' => !empty($data['blood_pressure_systolic']) ? (int) $data['blood_pressure_systolic'] : null,
                'bpd' => !empty($data['blood_pressure_diastolic']) ? (int) $data['blood_pressure_diastolic'] : null,
                'pulse' => !empty($data['pulse_rate']) ? (int) $data['pulse_rate'] : null,
                'temp' => !empty($data['temperature_c']) ? (float) $data['temperature_c'] : null,
                'hiv' => $data['hiv_screen'] ?? 'pending',
                'hbv' => $data['hbv_screen'] ?? 'pending',
                'hcv' => $data['hcv_screen'] ?? 'pending',
                'syph' => $data['syphilis_screen'] ?? 'pending',
                'mal' => $data['malaria_screen'] ?? 'pending',
                'tat' => !empty($data['has_recent_tattoo_piercing']) ? 1 : 0,
                'trav' => !empty($data['has_recent_travel_malaria']) ? 1 : 0,
                'exp' => !empty($data['has_high_risk_exposure']) ? 1 : 0,
                'ill' => !empty($data['has_recent_illness']) ? 1 : 0,
                'qnotes' => trim((string) ($data['questionnaire_notes'] ?? '')) ?: null,
                'status' => $eval['status'],
                'def_reason' => $eval['reason'],
                'def_until' => $eval['until'],
                'uid' => (int) $actor['id'],
                'id' => $donorId
            ]);

            return [
                'success' => true,
                'message' => "Blood donor record updated. Status: " . self::ELIGIBILITY_STATUSES[$eval['status']],
                'id' => $donorId,
                'eligibility_status' => $eval['status']
            ];
        }

        // New donor registration
        $donorNo = self::nextDonorNumber($db);
        $ins = $db->prepare(
            "INSERT INTO blood_donors (
                donor_number, first_name, middle_name, last_name, birthdate,
                gender, phone, email, national_id, address,
                abo_group, rh_factor, kell_antigen, weight_kg,
                hemoglobin_g_dl, blood_pressure_systolic, blood_pressure_diastolic,
                pulse_rate, temperature_c,
                hiv_screen, hbv_screen, hcv_screen, syphilis_screen, malaria_screen,
                has_recent_tattoo_piercing, has_recent_travel_malaria,
                has_high_risk_exposure, has_recent_illness, questionnaire_notes,
                eligibility_status, deferral_reason, deferred_until,
                screened_by, screened_at, created_at
            ) VALUES (
                :no, :fn, :mn, :ln, :bd,
                :gen, :ph, :em, :nid, :addr,
                :abo, :rh, :kell, :wt,
                :hb, :bps, :bpd, :pulse, :temp,
                :hiv, :hbv, :hcv, :syph, :mal,
                :tat, :trav, :exp, :ill, :qnotes,
                :status, :def_reason, :def_until,
                :uid, NOW(), NOW()
            )"
        );

        $ins->execute([
            'no' => $donorNo,
            'fn' => $firstName,
            'mn' => trim((string) ($data['middle_name'] ?? '')) ?: null,
            'ln' => $lastName,
            'bd' => $birthdate,
            'gen' => in_array($gender, ['male', 'female', 'other'], true) ? $gender : 'male',
            'ph' => $phone,
            'em' => trim((string) ($data['email'] ?? '')) ?: null,
            'nid' => trim((string) ($data['national_id'] ?? '')) ?: null,
            'addr' => trim((string) ($data['address'] ?? '')) ?: null,
            'abo' => $abo,
            'rh' => $rh,
            'kell' => $data['kell_antigen'] ?? 'unknown',
            'wt' => $weight,
            'hb' => isset($data['hemoglobin_g_dl']) && $data['hemoglobin_g_dl'] !== '' ? (float) $data['hemoglobin_g_dl'] : null,
            'bps' => !empty($data['blood_pressure_systolic']) ? (int) $data['blood_pressure_systolic'] : null,
            'bpd' => !empty($data['blood_pressure_diastolic']) ? (int) $data['blood_pressure_diastolic'] : null,
            'pulse' => !empty($data['pulse_rate']) ? (int) $data['pulse_rate'] : null,
            'temp' => !empty($data['temperature_c']) ? (float) $data['temperature_c'] : null,
            'hiv' => $data['hiv_screen'] ?? 'pending',
            'hbv' => $data['hbv_screen'] ?? 'pending',
            'hcv' => $data['hcv_screen'] ?? 'pending',
            'syph' => $data['syphilis_screen'] ?? 'pending',
            'mal' => $data['malaria_screen'] ?? 'pending',
            'tat' => !empty($data['has_recent_tattoo_piercing']) ? 1 : 0,
            'trav' => !empty($data['has_recent_travel_malaria']) ? 1 : 0,
            'exp' => !empty($data['has_high_risk_exposure']) ? 1 : 0,
            'ill' => !empty($data['has_recent_illness']) ? 1 : 0,
            'qnotes' => trim((string) ($data['questionnaire_notes'] ?? '')) ?: null,
            'status' => $eval['status'],
            'def_reason' => $eval['reason'],
            'def_until' => $eval['until'],
            'uid' => (int) $actor['id']
        ]);

        $newId = (int) $db->lastInsertId();

        return [
            'success' => true,
            'message' => "Donor registered as {$donorNo}. Status: " . self::ELIGIBILITY_STATUSES[$eval['status']],
            'id' => $newId,
            'donor_number' => $donorNo,
            'eligibility_status' => $eval['status']
        ];
    }

    /**
     * List registered blood donors with filtering
     */
    public function listDonors(array $filters): array
    {
        $db = Database::connection();
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['abo_group'])) {
            $where[] = 'd.abo_group = :abo';
            $params['abo'] = $filters['abo_group'];
        }

        if (!empty($filters['rh_factor'])) {
            $where[] = 'd.rh_factor = :rh';
            $params['rh'] = $filters['rh_factor'];
        }

        if (!empty($filters['eligibility_status'])) {
            $where[] = 'd.eligibility_status = :status';
            $params['status'] = $filters['eligibility_status'];
        }

        if (!empty($filters['q'])) {
            $q = '%' . trim($filters['q']) . '%';
            $where[] = '(d.donor_number LIKE :q1 OR d.phone LIKE :q2 OR CONCAT(d.first_name, " ", d.last_name) LIKE :q3 OR d.national_id LIKE :q4)';
            $params['q1'] = $q;
            $params['q2'] = $q;
            $params['q3'] = $q;
            $params['q4'] = $q;
        }

        $sql = "SELECT d.*, u.username AS screened_by_username
                FROM blood_donors d
                LEFT JOIN users u ON u.id = d.screened_by
                WHERE " . implode(' AND ', $where) . "
                ORDER BY d.id DESC
                LIMIT 100";

        $st = $db->prepare($sql);
        $st->execute($params);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);

        $now = date('Y-m-d');
        foreach ($rows as &$r) {
            $r['full_name'] = trim("{$r['first_name']} {$r['middle_name']} {$r['last_name']}");
            $r['age'] = (int) date_diff(date_create($r['birthdate']), date_create($now))->y;
            $r['blood_type_formatted'] = ($r['abo_group'] !== 'unknown') ? "{$r['abo_group']} " . ($r['rh_factor'] === 'positive' ? 'Rh+' : ($r['rh_factor'] === 'negative' ? 'Rh-' : '')) : 'Pending Typing';
            $r['eligibility_label'] = self::ELIGIBILITY_STATUSES[$r['eligibility_status']] ?? $r['eligibility_status'];
        }

        return $rows;
    }

    /**
     * Get single donor profile
     */
    public function getDonor(int $id): ?array
    {
        $db = Database::connection();
        $st = $db->prepare(
            "SELECT d.*, u.username AS screened_by_username
             FROM blood_donors d
             LEFT JOIN users u ON u.id = d.screened_by
             WHERE d.id = :id
             LIMIT 1"
        );
        $st->execute(['id' => $id]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) return null;

        $now = date('Y-m-d');
        $row['full_name'] = trim("{$row['first_name']} {$row['middle_name']} {$row['last_name']}");
        $row['age'] = (int) date_diff(date_create($row['birthdate']), date_create($now))->y;
        $row['blood_type_formatted'] = ($row['abo_group'] !== 'unknown') ? "{$row['abo_group']} " . ($row['rh_factor'] === 'positive' ? 'Rh+' : ($row['rh_factor'] === 'negative' ? 'Rh-' : '')) : 'Pending Typing';
        $row['eligibility_label'] = self::ELIGIBILITY_STATUSES[$row['eligibility_status']] ?? $row['eligibility_status'];
        return $row;
    }

    /**
     * Summary dashboard counters
     */
    public function getStats(): array
    {
        $db = Database::connection();
        $total = (int) $db->query("SELECT COUNT(*) FROM blood_donors")->fetchColumn();
        $eligible = (int) $db->query("SELECT COUNT(*) FROM blood_donors WHERE eligibility_status = 'eligible'")->fetchColumn();
        $tempDeferred = (int) $db->query("SELECT COUNT(*) FROM blood_donors WHERE eligibility_status = 'temporary_deferred'")->fetchColumn();
        $permDeferred = (int) $db->query("SELECT COUNT(*) FROM blood_donors WHERE eligibility_status = 'permanently_deferred'")->fetchColumn();
        $pendingScreening = (int) $db->query("SELECT COUNT(*) FROM blood_donors WHERE eligibility_status = 'pending_screening'")->fetchColumn();

        // Blood group inventory potential breakdown
        $groups = $db->query(
            "SELECT CONCAT(abo_group, ' ', rh_factor) AS grp, COUNT(*) as cnt
             FROM blood_donors
             WHERE eligibility_status = 'eligible' AND abo_group <> 'unknown'
             GROUP BY abo_group, rh_factor"
        )->fetchAll(PDO::FETCH_KEY_PAIR);

        return [
            'total_registered' => $total,
            'eligible_donors' => $eligible,
            'temporary_deferred' => $tempDeferred,
            'permanently_deferred' => $permDeferred,
            'pending_screening' => $pendingScreening,
            'eligible_by_group' => $groups
        ];
    }
}
