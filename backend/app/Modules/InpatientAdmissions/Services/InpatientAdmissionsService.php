<?php

namespace App\Modules\InpatientAdmissions\Services;

use App\Core\Database;
use PDO;
use Exception;

class InpatientAdmissionsService
{
    /**
     * Get live census whiteboard data including wards, beds, and KPI analytics
     */
    public function getCensusWhiteboard(?string $wardCode = null, ?string $status = null, ?string $search = null): array
    {
        $db = Database::connection();

        // 1. Fetch Wards with aggregate bed statistics
        $wardSql = "
            SELECT 
                w.*,
                COUNT(b.id) AS actual_bed_count,
                SUM(CASE WHEN b.status = 'Available' THEN 1 ELSE 0 END) AS available_beds,
                SUM(CASE WHEN b.status = 'Occupied' THEN 1 ELSE 0 END) AS occupied_beds,
                SUM(CASE WHEN b.status = 'Pending Discharge' THEN 1 ELSE 0 END) AS pending_discharge_beds,
                SUM(CASE WHEN b.status = 'Dirty / Turnover' THEN 1 ELSE 0 END) AS dirty_beds,
                SUM(CASE WHEN b.status IN ('Maintenance', 'Blocked') THEN 1 ELSE 0 END) AS maintenance_beds
            FROM hospital_wards w
            LEFT JOIN hospital_beds b ON w.id = b.ward_id AND b.is_active = 1
            WHERE w.is_active = 1
            GROUP BY w.id
            ORDER BY w.id ASC
        ";
        $wards = $db->query($wardSql)->fetchAll(PDO::FETCH_ASSOC);

        // 2. Build filter conditions for Beds
        $where = ['b.is_active = 1'];
        $params = [];

        if (!empty($wardCode) && $wardCode !== 'all') {
            $where[] = 'w.ward_code = :ward_code';
            $params['ward_code'] = $wardCode;
        }

        if (!empty($status) && $status !== 'all') {
            $where[] = 'b.status = :status';
            $params['status'] = $status;
        }

        if (!empty($search)) {
            $where[] = '(b.bed_number LIKE :search OR b.room_number LIKE :search OR a.patient_name LIKE :search OR a.patient_mrn LIKE :search OR a.attending_physician LIKE :search OR a.admitting_diagnosis LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        $whereClause = implode(' AND ', $where);

        $bedSql = "
            SELECT 
                b.*,
                w.ward_code,
                w.ward_name,
                w.ward_type,
                w.floor_location AS ward_location,
                a.id AS admission_id,
                a.admission_number,
                a.patient_id,
                a.patient_name,
                a.patient_mrn,
                a.patient_age,
                a.gender AS patient_gender,
                a.admission_date,
                a.admission_source,
                a.admission_type,
                a.admitting_diagnosis,
                a.attending_physician,
                a.primary_nurse,
                a.isolation_precautions,
                a.expected_discharge_date,
                a.status AS admission_status,
                TIMESTAMPDIFF(DAY, a.admission_date, NOW()) AS los_days,
                TIMESTAMPDIFF(HOUR, a.admission_date, NOW()) AS los_hours
            FROM hospital_beds b
            JOIN hospital_wards w ON b.ward_id = w.id
            LEFT JOIN inpatient_admissions a ON b.current_admission_id = a.id
            WHERE {$whereClause}
            ORDER BY w.id ASC, b.room_number ASC, b.bed_number ASC
        ";
        $stmt = $db->prepare($bedSql);
        $stmt->execute($params);
        $beds = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 3. System-wide Census & Quality Analytics (KPIs)
        $kpiSql = "
            SELECT 
                COUNT(*) AS total_beds,
                SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS available_count,
                SUM(CASE WHEN status = 'Occupied' THEN 1 ELSE 0 END) AS occupied_count,
                SUM(CASE WHEN status = 'Pending Discharge' THEN 1 ELSE 0 END) AS pending_discharge_count,
                SUM(CASE WHEN status = 'Dirty / Turnover' THEN 1 ELSE 0 END) AS dirty_turnover_count,
                SUM(CASE WHEN status IN ('Maintenance', 'Blocked') THEN 1 ELSE 0 END) AS maintenance_count
            FROM hospital_beds
            WHERE is_active = 1
        ";
        $kpis = $db->query($kpiSql)->fetch(PDO::FETCH_ASSOC) ?: [];

        $totalBeds = (int) ($kpis['total_beds'] ?? 0);
        $occupiedCount = (int) ($kpis['occupied_count'] ?? 0);
        $pendingCount = (int) ($kpis['pending_discharge_count'] ?? 0);
        $availableCount = (int) ($kpis['available_count'] ?? 0);
        $dirtyCount = (int) ($kpis['dirty_turnover_count'] ?? 0);
        $maintCount = (int) ($kpis['maintenance_count'] ?? 0);

        // Bed Occupancy Rate (BOR %) = (Occupied + Pending Discharge) / Total Active Beds * 100
        $activeInpatients = $occupiedCount + $pendingCount;
        $bor = $totalBeds > 0 ? round(($activeInpatients / $totalBeds) * 100, 1) : 0.0;

        // ALOS (Average Length of Stay in days for current admitted patients)
        $alosSql = "
            SELECT 
                ROUND(AVG(TIMESTAMPDIFF(DAY, admission_date, NOW())), 1) AS avg_los_days,
                COUNT(CASE WHEN isolation_precautions != 'Standard' THEN 1 END) AS isolation_count
            FROM inpatient_admissions
            WHERE status IN ('Admitted', 'Pending Discharge')
        ";
        $alosData = $db->query($alosSql)->fetch(PDO::FETCH_ASSOC) ?: [];
        $alos = (float) ($alosData['avg_los_days'] ?? 0.0);
        $isolationCount = (int) ($alosData['isolation_count'] ?? 0);

        // 4. Recent Transfers Feed (last 10)
        $transferSql = "
            SELECT 
                t.*,
                fw.ward_name AS from_ward_name,
                fb.bed_number AS from_bed_number,
                tw.ward_name AS to_ward_name,
                tb.bed_number AS to_bed_number,
                adm.admission_number,
                adm.patient_name,
                adm.patient_mrn
            FROM inpatient_transfers t
            JOIN hospital_wards fw ON t.from_ward_id = fw.id
            JOIN hospital_beds fb ON t.from_bed_id = fb.id
            JOIN hospital_wards tw ON t.to_ward_id = tw.id
            JOIN hospital_beds tb ON t.to_bed_id = tb.id
            JOIN inpatient_admissions adm ON t.admission_id = adm.id
            ORDER BY t.transfer_time DESC
            LIMIT 10
        ";
        $transfers = $db->query($transferSql)->fetchAll(PDO::FETCH_ASSOC);

        return [
            'wards' => $wards,
            'beds'  => $beds,
            'kpis'  => [
                'total_beds'              => $totalBeds,
                'available_count'         => $availableCount,
                'occupied_count'          => $occupiedCount,
                'pending_discharge_count' => $pendingCount,
                'dirty_turnover_count'    => $dirtyCount,
                'maintenance_count'       => $maintCount,
                'bed_occupancy_rate'      => $bor,
                'alos_days'               => $alos,
                'isolation_count'         => $isolationCount,
                'active_inpatients'       => $activeInpatients,
            ],
            'recent_transfers' => $transfers,
        ];
    }

    /**
     * Get all active wards with bed counts
     */
    public function getWards(): array
    {
        $db = Database::connection();
        $sql = "
            SELECT 
                w.*,
                COUNT(b.id) AS bed_count,
                SUM(CASE WHEN b.status = 'Available' THEN 1 ELSE 0 END) AS available_beds
            FROM hospital_wards w
            LEFT JOIN hospital_beds b ON w.id = b.ward_id AND b.is_active = 1
            WHERE w.is_active = 1
            GROUP BY w.id
            ORDER BY w.id ASC
        ";
        return $db->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get beds filtered by ward and/or status
     */
    public function getBeds(?int $wardId = null, ?string $status = null): array
    {
        $db = Database::connection();
        $where = ['b.is_active = 1'];
        $params = [];

        if ($wardId) {
            $where[] = 'b.ward_id = :ward_id';
            $params['ward_id'] = $wardId;
        }

        if ($status && $status !== 'all') {
            $where[] = 'b.status = :status';
            $params['status'] = $status;
        }

        $whereClause = implode(' AND ', $where);
        $sql = "
            SELECT b.*, w.ward_name, w.ward_code, w.ward_type
            FROM hospital_beds b
            JOIN hospital_wards w ON b.ward_id = w.id
            WHERE {$whereClause}
            ORDER BY w.id ASC, b.bed_number ASC
        ";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get detailed information for an admission
     */
    public function getAdmissionDetails(int $id): ?array
    {
        $db = Database::connection();
        $sql = "
            SELECT 
                a.*,
                w.ward_name,
                w.ward_code,
                w.ward_type,
                w.floor_location,
                b.bed_number,
                b.room_number,
                b.bed_type,
                b.status AS bed_status,
                TIMESTAMPDIFF(DAY, a.admission_date, NOW()) AS los_days
            FROM inpatient_admissions a
            JOIN hospital_wards w ON a.ward_id = w.id
            JOIN hospital_beds b ON a.bed_id = b.id
            WHERE a.id = :id
        ";
        $stmt = $db->prepare($sql);
        $stmt->execute(['id' => $id]);
        $adm = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$adm) {
            return null;
        }

        // Fetch transfer history
        $tSql = "
            SELECT 
                t.*,
                fw.ward_name AS from_ward_name,
                fb.bed_number AS from_bed_number,
                tw.ward_name AS to_ward_name,
                tb.bed_number AS to_bed_number
            FROM inpatient_transfers t
            JOIN hospital_wards fw ON t.from_ward_id = fw.id
            JOIN hospital_beds fb ON t.from_bed_id = fb.id
            JOIN hospital_wards tw ON t.to_ward_id = tw.id
            JOIN hospital_beds tb ON t.to_bed_id = tb.id
            WHERE t.admission_id = :admission_id
            ORDER BY t.transfer_time ASC
        ";
        $tStmt = $db->prepare($tSql);
        $tStmt->execute(['admission_id' => $id]);
        $adm['transfers'] = $tStmt->fetchAll(PDO::FETCH_ASSOC);

        return $adm;
    }

    /**
     * Admit a patient into a hospital bed
     */
    public function admitPatient(array $data, ?int $userId = null): array
    {
        $db = Database::connection();
        $db->beginTransaction();

        try {
            $bedId = (int) ($data['bed_id'] ?? 0);
            if ($bedId <= 0) {
                throw new Exception('A valid hospital bed must be selected for admission.');
            }

            // Verify bed exists and is Available
            $bedStmt = $db->prepare('SELECT * FROM hospital_beds WHERE id = :id FOR UPDATE');
            $bedStmt->execute(['id' => $bedId]);
            $bed = $bedStmt->fetch(PDO::FETCH_ASSOC);

            if (!$bed) {
                throw new Exception('Selected hospital bed does not exist.');
            }
            if ($bed['status'] !== 'Available') {
                throw new Exception("Bed {$bed['bed_number']} is currently marked as '{$bed['status']}' and cannot accept admissions.");
            }

            $wardId = (int) $bed['ward_id'];

            // Generate unique admission number ADM-YYYY-XXXX
            $year = date('Y');
            $countStmt = $db->query("SELECT COUNT(*) FROM inpatient_admissions WHERE YEAR(created_at) = {$year}");
            $count = (int) $countStmt->fetchColumn();
            $admissionNumber = sprintf('ADM-%s-%04d', $year, $count + 1);

            // Patient details
            $patientId   = !empty($data['patient_id']) ? (int) $data['patient_id'] : null;
            $patientName = trim($data['patient_name'] ?? '');
            $patientMrn  = trim($data['patient_mrn'] ?? '');
            $patientAge  = !empty($data['patient_age']) ? (int) $data['patient_age'] : null;
            $gender      = trim($data['gender'] ?? 'Unknown');

            // If patient_id or MRN provided, resolve missing details from patients table
            if ($patientId || $patientMrn) {
                $pSql = $patientId 
                    ? 'SELECT id, patient_no, first_name, last_name, sex, birthdate FROM patients WHERE id = :pid LIMIT 1'
                    : 'SELECT id, patient_no, first_name, last_name, sex, birthdate FROM patients WHERE patient_no = :pmrn LIMIT 1';
                $pStmt = $db->prepare($pSql);
                $pStmt->execute($patientId ? ['pid' => $patientId] : ['pmrn' => $patientMrn]);
                $pRow = $pStmt->fetch(PDO::FETCH_ASSOC);

                if ($pRow) {
                    $patientId   = (int) $pRow['id'];
                    $patientMrn  = $pRow['patient_no'];
                    $patientName = trim($pRow['first_name'] . ' ' . $pRow['last_name']);
                    $gender      = ucfirst($pRow['sex'] ?: $gender);
                    if (!empty($pRow['birthdate'])) {
                        $patientAge = (int) date_diff(date_create($pRow['birthdate']), date_create('today'))->y;
                    }
                }
            }

            if (empty($patientName)) {
                throw new Exception('Patient Name or valid Patient selection is required.');
            }

            $admissionDate        = !empty($data['admission_date']) ? $data['admission_date'] : date('Y-m-d H:i:s');
            $admissionSource      = $data['admission_source'] ?? 'Outpatient Clinic';
            $admissionType        = $data['admission_type'] ?? 'Elective';
            $admittingDiagnosis   = trim($data['admitting_diagnosis'] ?? 'General Medical Observation');
            $attendingPhysician   = trim($data['attending_physician'] ?? 'Hospitalist On-Duty');
            $primaryNurse         = trim($data['primary_nurse'] ?? '');
            $isolationPrecautions = $data['isolation_precautions'] ?? 'Standard';
            $expectedDischarge    = !empty($data['expected_discharge_date']) ? $data['expected_discharge_date'] : null;

            // Insert admission
            $insSql = "
                INSERT INTO inpatient_admissions (
                    admission_number, patient_id, patient_name, patient_mrn, patient_age, gender,
                    ward_id, bed_id, admission_date, admission_source, admission_type,
                    admitting_diagnosis, attending_physician, primary_nurse, isolation_precautions,
                    expected_discharge_date, status, created_by
                ) VALUES (
                    :admission_number, :patient_id, :patient_name, :patient_mrn, :patient_age, :gender,
                    :ward_id, :bed_id, :admission_date, :admission_source, :admission_type,
                    :admitting_diagnosis, :attending_physician, :primary_nurse, :isolation_precautions,
                    :expected_discharge_date, 'Admitted', :created_by
                )
            ";
            $insStmt = $db->prepare($insSql);
            $insStmt->execute([
                'admission_number'        => $admissionNumber,
                'patient_id'              => $patientId,
                'patient_name'            => $patientName,
                'patient_mrn'             => $patientMrn,
                'patient_age'             => $patientAge,
                'gender'                  => $gender,
                'ward_id'                 => $wardId,
                'bed_id'                  => $bedId,
                'admission_date'          => $admissionDate,
                'admission_source'        => $admissionSource,
                'admission_type'          => $admissionType,
                'admitting_diagnosis'     => $admittingDiagnosis,
                'attending_physician'     => $attendingPhysician,
                'primary_nurse'           => $primaryNurse,
                'isolation_precautions'   => $isolationPrecautions,
                'expected_discharge_date' => $expectedDischarge,
                'created_by'              => $userId,
            ]);

            $newAdmId = (int) $db->lastInsertId();

            // Update Bed status to Occupied
            $updBed = $db->prepare("
                UPDATE hospital_beds 
                SET status = 'Occupied', current_admission_id = :adm_id, updated_at = NOW() 
                WHERE id = :bed_id
            ");
            $updBed->execute(['adm_id' => $newAdmId, 'bed_id' => $bedId]);

            $db->commit();

            return $this->getAdmissionDetails($newAdmId);
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    /**
     * Transfer patient to a different bed / ward
     */
    public function transferPatient(int $admissionId, array $data, ?int $userId = null): array
    {
        $db = Database::connection();
        $db->beginTransaction();

        try {
            // Load admission
            $admStmt = $db->prepare('SELECT * FROM inpatient_admissions WHERE id = :id FOR UPDATE');
            $admStmt->execute(['id' => $admissionId]);
            $adm = $admStmt->fetch(PDO::FETCH_ASSOC);

            if (!$adm) {
                throw new Exception('Inpatient admission record not found.');
            }
            if ($adm['status'] === 'Discharged') {
                throw new Exception('Cannot transfer an already discharged patient.');
            }

            $fromWardId = (int) $adm['ward_id'];
            $fromBedId  = (int) $adm['bed_id'];

            $toBedId = (int) ($data['to_bed_id'] ?? 0);
            if ($toBedId <= 0 || $toBedId === $fromBedId) {
                throw new Exception('Please select a valid new destination bed for transfer.');
            }

            // Check target bed
            $tBedStmt = $db->prepare('SELECT * FROM hospital_beds WHERE id = :id FOR UPDATE');
            $tBedStmt->execute(['id' => $toBedId]);
            $toBed = $tBedStmt->fetch(PDO::FETCH_ASSOC);

            if (!$toBed) {
                throw new Exception('Destination bed not found.');
            }
            if ($toBed['status'] !== 'Available') {
                throw new Exception("Destination bed {$toBed['bed_number']} is {$toBed['status']} and not available.");
            }

            $toWardId = (int) $toBed['ward_id'];
            $reason   = trim($data['transfer_reason'] ?? 'Clinical escalation/routine transfer');
            $notes    = trim($data['transfer_notes'] ?? '');
            $byUser   = trim($data['transferred_by'] ?? 'Inpatient ADT Service');

            // Log transfer
            $transSql = "
                INSERT INTO inpatient_transfers (
                    admission_id, patient_id, from_ward_id, from_bed_id, to_ward_id, to_bed_id,
                    transfer_time, transfer_reason, transfer_notes, transferred_by
                ) VALUES (
                    :admission_id, :patient_id, :from_ward_id, :from_bed_id, :to_ward_id, :to_bed_id,
                    NOW(), :transfer_reason, :transfer_notes, :transferred_by
                )
            ";
            $transStmt = $db->prepare($transSql);
            $transStmt->execute([
                'admission_id'    => $admissionId,
                'patient_id'      => $adm['patient_id'],
                'from_ward_id'    => $fromWardId,
                'from_bed_id'     => $fromBedId,
                'to_ward_id'      => $toWardId,
                'to_bed_id'       => $toBedId,
                'transfer_reason' => $reason,
                'transfer_notes'  => $notes,
                'transferred_by'  => $byUser,
            ]);

            // Release source bed -> Dirty / Turnover (per hospital infection control protocol)
            $db->prepare("
                UPDATE hospital_beds 
                SET status = 'Dirty / Turnover', current_admission_id = NULL, updated_at = NOW() 
                WHERE id = :bed_id
            ")->execute(['bed_id' => $fromBedId]);

            // Assign destination bed -> Occupied
            $db->prepare("
                UPDATE hospital_beds 
                SET status = 'Occupied', current_admission_id = :adm_id, updated_at = NOW() 
                WHERE id = :bed_id
            ")->execute(['adm_id' => $admissionId, 'bed_id' => $toBedId]);

            // Update admission location
            $db->prepare("
                UPDATE inpatient_admissions 
                SET ward_id = :ward_id, bed_id = :bed_id, updated_at = NOW() 
                WHERE id = :adm_id
            ")->execute([
                'ward_id' => $toWardId,
                'bed_id'  => $toBedId,
                'adm_id'  => $admissionId,
            ]);

            $db->commit();
            return $this->getAdmissionDetails($admissionId);
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    /**
     * Mark patient as Pending Discharge (discharge order written, awaiting clearance/meds)
     */
    public function markPendingDischarge(int $admissionId, ?string $notes = null): array
    {
        $db = Database::connection();
        $db->beginTransaction();

        try {
            $admStmt = $db->prepare('SELECT * FROM inpatient_admissions WHERE id = :id FOR UPDATE');
            $admStmt->execute(['id' => $admissionId]);
            $adm = $admStmt->fetch(PDO::FETCH_ASSOC);

            if (!$adm) {
                throw new Exception('Admission record not found.');
            }

            // Update admission status
            $db->prepare("
                UPDATE inpatient_admissions 
                SET status = 'Pending Discharge', updated_at = NOW() 
                WHERE id = :id
            ")->execute(['id' => $admissionId]);

            // Update bed status
            $db->prepare("
                UPDATE hospital_beds 
                SET status = 'Pending Discharge', updated_at = NOW() 
                WHERE id = :bed_id
            ")->execute(['bed_id' => $adm['bed_id']]);

            $db->commit();
            return $this->getAdmissionDetails($admissionId);
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    /**
     * Discharge patient from hospital
     * Note: Bed transitions directly to 'Dirty / Turnover' awaiting Housekeeping Terminal Cleaning
     */
    public function dischargePatient(int $admissionId, array $data, ?int $userId = null): array
    {
        $db = Database::connection();
        $db->beginTransaction();

        try {
            $admStmt = $db->prepare('SELECT * FROM inpatient_admissions WHERE id = :id FOR UPDATE');
            $admStmt->execute(['id' => $admissionId]);
            $adm = $admStmt->fetch(PDO::FETCH_ASSOC);

            if (!$adm) {
                throw new Exception('Admission record not found.');
            }
            if ($adm['status'] === 'Discharged') {
                throw new Exception('Patient is already discharged.');
            }

            $bedId = (int) $adm['bed_id'];
            $dischargeDate = !empty($data['discharge_date']) ? $data['discharge_date'] : date('Y-m-d H:i:s');
            $disposition   = trim($data['discharge_disposition'] ?? 'Discharged Home with Self-Care');
            $notes         = trim($data['discharge_notes'] ?? '');
            $physician     = trim($data['discharge_physician'] ?? $adm['attending_physician']);

            // Update admission to Discharged
            $updAdm = $db->prepare("
                UPDATE inpatient_admissions 
                SET status = 'Discharged', 
                    discharge_date = :discharge_date, 
                    discharge_disposition = :disposition, 
                    discharge_notes = :notes, 
                    discharge_physician = :physician,
                    updated_at = NOW()
                WHERE id = :id
            ");
            $updAdm->execute([
                'discharge_date' => $dischargeDate,
                'disposition'    => $disposition,
                'notes'          => $notes,
                'physician'      => $physician,
                'id'             => $admissionId,
            ]);

            // Vacate bed and set to Dirty / Turnover for Housekeeping sanitization
            $updBed = $db->prepare("
                UPDATE hospital_beds 
                SET status = 'Dirty / Turnover', current_admission_id = NULL, updated_at = NOW() 
                WHERE id = :bed_id
            ");
            $updBed->execute(['bed_id' => $bedId]);

            $db->commit();
            return $this->getAdmissionDetails($admissionId);
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    /**
     * Update bed status (e.g., Housekeeping terminal sanitization sign-off, or maintenance hold)
     */
    public function updateBedStatus(int $bedId, string $status, ?string $notes = null): array
    {
        $db = Database::connection();
        $db->beginTransaction();

        try {
            $bedStmt = $db->prepare('SELECT * FROM hospital_beds WHERE id = :id FOR UPDATE');
            $bedStmt->execute(['id' => $bedId]);
            $bed = $bedStmt->fetch(PDO::FETCH_ASSOC);

            if (!$bed) {
                throw new Exception('Hospital bed not found.');
            }

            $allowed = ['Available', 'Occupied', 'Pending Discharge', 'Dirty / Turnover', 'Maintenance', 'Blocked'];
            if (!in_array($status, $allowed, true)) {
                throw new Exception("Invalid bed status '{$status}'.");
            }

            // Guard: Cannot mark an active occupied bed as Available directly without discharge
            if ($status === 'Available' && !empty($bed['current_admission_id'])) {
                throw new Exception('Bed has an active patient admission. Please discharge or transfer the patient before setting bed to Available.');
            }

            $stmt = $db->prepare("
                UPDATE hospital_beds 
                SET status = :status, updated_at = NOW() 
                WHERE id = :id
            ");
            $stmt->execute(['status' => $status, 'id' => $bedId]);

            $db->commit();

            // Return updated bed row
            $refreshed = $db->prepare('SELECT b.*, w.ward_name, w.ward_code FROM hospital_beds b JOIN hospital_wards w ON b.ward_id = w.id WHERE b.id = :id');
            $refreshed->execute(['id' => $bedId]);
            return $refreshed->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    /**
     * Create a new hospital ward
     */
    public function createWard(array $data): array
    {
        $db = Database::connection();
        
        $wardCode   = strtoupper(trim($data['ward_code'] ?? ''));
        $wardName   = trim($data['ward_name'] ?? '');
        $wardType   = trim($data['ward_type'] ?? 'Medical');
        $location   = trim($data['floor_location'] ?? '2nd Floor - Inpatient Wing');
        $genderRest = trim($data['gender_restriction'] ?? 'All');
        $headNurse  = trim($data['head_nurse'] ?? '');

        if (empty($wardCode) || empty($wardName)) {
            throw new Exception('Ward Code and Ward Name are required.');
        }

        $stmt = $db->prepare("
            INSERT INTO hospital_wards (
                ward_code, ward_name, ward_type, floor_location, gender_restriction, head_nurse, is_active
            ) VALUES (
                :code, :name, :type, :loc, :gender, :nurse, 1
            )
        ");
        $stmt->execute([
            'code'   => $wardCode,
            'name'   => $wardName,
            'type'   => $wardType,
            'loc'    => $location,
            'gender' => $genderRest,
            'nurse'  => $headNurse,
        ]);

        $id = (int) $db->lastInsertId();
        $w = $db->prepare('SELECT * FROM hospital_wards WHERE id = :id');
        $w->execute(['id' => $id]);
        return $w->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Create a new hospital bed
     */
    public function createBed(array $data): array
    {
        $db = Database::connection();

        $wardId    = (int) ($data['ward_id'] ?? 0);
        $bedNumber = trim($data['bed_number'] ?? '');
        $roomNumber= trim($data['room_number'] ?? '');
        $bedType   = trim($data['bed_type'] ?? 'Standard Acute Bed');
        $features  = trim($data['features'] ?? '');

        if ($wardId <= 0 || empty($bedNumber) || empty($roomNumber)) {
            throw new Exception('Ward selection, Bed Number, and Room Number are required.');
        }

        $stmt = $db->prepare("
            INSERT INTO hospital_beds (
                ward_id, bed_number, room_number, bed_type, status, features, is_active
            ) VALUES (
                :ward_id, :bed_number, :room_number, :bed_type, 'Available', :features, 1
            )
        ");
        $stmt->execute([
            'ward_id'     => $wardId,
            'bed_number'  => $bedNumber,
            'room_number' => $roomNumber,
            'bed_type'    => $bedType,
            'features'    => $features,
        ]);

        $id = (int) $db->lastInsertId();
        
        // Update ward total bed count
        $db->prepare("
            UPDATE hospital_wards 
            SET total_beds_count = (SELECT COUNT(*) FROM hospital_beds WHERE ward_id = :wid AND is_active = 1) 
            WHERE id = :wid
        ")->execute(['wid' => $wardId]);

        $b = $db->prepare('SELECT b.*, w.ward_name, w.ward_code FROM hospital_beds b JOIN hospital_wards w ON b.ward_id = w.id WHERE b.id = :id');
        $b->execute(['id' => $id]);
        return $b->fetch(PDO::FETCH_ASSOC);
    }
}
