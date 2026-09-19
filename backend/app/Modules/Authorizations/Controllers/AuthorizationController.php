<?php

namespace App\Modules\Authorizations\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Core\Request;
use App\Core\Session;
use PDO;

class AuthorizationController extends Controller
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * GET /authorizations
     * Retrieve authorizations list (clinical sign-offs and insurance prior auths)
     */
    public function index(): void
    {
        $request = new Request();
        $tab = $request->input('tab', 'all');
        $patientNo = trim((string) $request->input('patient_no', ''));
        $patientId = $request->input('patient_id') ? (int) $request->input('patient_id') : null;
        $status = trim((string) $request->input('status', ''));
        $search = trim((string) $request->input('search', ''));

        // Resolve patient by patient_no if provided
        $patient = null;
        if (!empty($patientNo)) {
            $stmt = $this->db->prepare("SELECT id, patient_no, first_name, last_name, birthdate, sex FROM patients WHERE patient_no = ? AND deleted_at IS NULL LIMIT 1");
            $stmt->execute([$patientNo]);
            $patient = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($patient) {
                $patientId = (int) $patient['id'];
            }
        } elseif (!empty($patientId)) {
            $stmt = $this->db->prepare("SELECT id, patient_no, first_name, last_name, birthdate, sex FROM patients WHERE id = ? AND deleted_at IS NULL LIMIT 1");
            $stmt->execute([$patientId]);
            $patient = $stmt->fetch(PDO::FETCH_ASSOC);
        }

        // 1. Fetch Clinical Authorizations (Review / Sign-Off Queue)
        // Aggregates clinical_authorizations + encounter_soap_notes + encounter_clinical_note_items
        $clinicalAuths = [];
        if ($tab === 'all' || $tab === 'clinical') {
            // A. Standalone / dedicated clinical authorizations
            $sqlCa = "
                SELECT 
                    CAST(ca.id AS CHAR) AS id,
                    'queue' AS source_type,
                    ca.patient_id,
                    ca.encounter_id,
                    ca.document_type,
                    ca.document_id,
                    ca.author_name,
                    ca.author_role,
                    ca.title,
                    ca.service_date,
                    ca.content,
                    ca.status,
                    ca.authorized_by_id,
                    ca.authorized_by_name,
                    ca.authorized_at,
                    ca.comments,
                    ca.created_at,
                    p.patient_no,
                    CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS patient_name,
                    e.date_of_service AS encounter_date,
                    e.reason_for_visit AS encounter_reason
                FROM clinical_authorizations ca
                LEFT JOIN patients p ON ca.patient_id = p.id
                LEFT JOIN encounters e ON ca.encounter_id = e.id
                WHERE 1=1
            ";
            $paramsCa = [];
            if (!empty($patientId)) {
                $sqlCa .= " AND ca.patient_id = ?";
                $paramsCa[] = $patientId;
            }
            if (!empty($status) && $status !== 'all') {
                $sqlCa .= " AND ca.status = ?";
                $paramsCa[] = strtolower($status);
            }
            if (!empty($search)) {
                $sqlCa .= " AND (ca.title LIKE ? OR ca.author_name LIKE ? OR ca.content LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ? OR p.patient_no LIKE ?)";
                $kw = "%{$search}%";
                $paramsCa = array_merge($paramsCa, [$kw, $kw, $kw, $kw, $kw, $kw]);
            }
            $stmtCa = $this->db->prepare($sqlCa);
            $stmtCa->execute($paramsCa);
            $itemsCa = $stmtCa->fetchAll(PDO::FETCH_ASSOC);

            // B. Live Encounter SOAP Notes from chart documentation
            $sqlSoap = "
                SELECT 
                    CONCAT('soap_', s.id) AS id,
                    'soap' AS source_type,
                    e.patient_id,
                    s.encounter_id,
                    'Encounter SOAP Note' AS document_type,
                    s.id AS document_id,
                    COALESCE(NULLIF(s.author_name, ''), u.username, 'Clinical Staff') AS author_name,
                    'Clinical Staff' AS author_role,
                    CONCAT('Encounter #', e.id, ' Progress SOAP Note') AS title,
                    COALESCE(s.created_at, e.date_of_service) AS service_date,
                    CONCAT(
                        CASE WHEN s.subjective IS NOT NULL AND s.subjective != '' THEN CONCAT('SUBJECTIVE:\n', s.subjective, '\n\n') ELSE '' END,
                        CASE WHEN s.objective IS NOT NULL AND s.objective != '' THEN CONCAT('OBJECTIVE:\n', s.objective, '\n\n') ELSE '' END,
                        CASE WHEN s.assessment IS NOT NULL AND s.assessment != '' THEN CONCAT('ASSESSMENT:\n', s.assessment, '\n\n') ELSE '' END,
                        CASE WHEN s.plan IS NOT NULL AND s.plan != '' THEN CONCAT('PLAN:\n', s.plan) ELSE '' END
                    ) AS content,
                    CASE WHEN sig.id IS NOT NULL THEN 'authorized' ELSE 'pending' END AS status,
                    sig.signer_user_id AS authorized_by_id,
                    sig.signer_name AS authorized_by_name,
                    sig.signed_at AS authorized_at,
                    sig.amendment AS comments,
                    s.created_at,
                    p.patient_no,
                    CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS patient_name,
                    e.date_of_service AS encounter_date,
                    e.reason_for_visit AS encounter_reason
                FROM encounter_soap_notes s
                JOIN encounters e ON s.encounter_id = e.id
                JOIN patients p ON e.patient_id = p.id
                LEFT JOIN users u ON s.created_by = u.id
                LEFT JOIN encounter_soap_note_signatures sig ON s.id = sig.soap_note_id
                WHERE s.deleted_at IS NULL
            ";
            $paramsSoap = [];
            if (!empty($patientId)) {
                $sqlSoap .= " AND e.patient_id = ?";
                $paramsSoap[] = $patientId;
            }
            if (!empty($status) && $status !== 'all') {
                if (strtolower($status) === 'authorized') {
                    $sqlSoap .= " AND sig.id IS NOT NULL";
                } elseif (strtolower($status) === 'pending') {
                    $sqlSoap .= " AND sig.id IS NULL";
                } else {
                    $sqlSoap .= " AND 1=0";
                }
            }
            if (!empty($search)) {
                $sqlSoap .= " AND (s.subjective LIKE ? OR s.assessment LIKE ? OR s.plan LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ? OR p.patient_no LIKE ?)";
                $kw = "%{$search}%";
                $paramsSoap = array_merge($paramsSoap, [$kw, $kw, $kw, $kw, $kw, $kw]);
            }
            $stmtSoap = $this->db->prepare($sqlSoap);
            $stmtSoap->execute($paramsSoap);
            $itemsSoap = $stmtSoap->fetchAll(PDO::FETCH_ASSOC);

            // Merge and sort
            $clinicalAuths = array_merge($itemsCa, $itemsSoap);
            usort($clinicalAuths, function ($a, $b) {
                if ($a['status'] === 'pending' && $b['status'] !== 'pending') return -1;
                if ($a['status'] !== 'pending' && $b['status'] === 'pending') return 1;
                return strcmp($b['service_date'] ?? '', $a['service_date'] ?? '');
            });
            $clinicalAuths = array_slice($clinicalAuths, 0, 100);
        }

        // 2. Fetch Prior Authorizations (Insurance Pre-Certifications)
        $priorAuths = [];
        if ($tab === 'all' || $tab === 'prior_auth') {
            $sql = "
                SELECT 
                    pa.id,
                    pa.patient_id,
                    pa.insurance_id,
                    pa.payer_name,
                    pa.auth_number,
                    pa.cpt_code,
                    pa.service_description,
                    pa.units_approved,
                    pa.units_used,
                    (pa.units_approved - pa.units_used) AS units_remaining,
                    pa.start_date,
                    pa.end_date,
                    pa.provider_name,
                    pa.status,
                    pa.notes,
                    pa.created_at,
                    p.patient_no,
                    CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS patient_name,
                    CASE 
                        WHEN pa.end_date < CURDATE() AND pa.status = 'Active' THEN 'Expired'
                        ELSE pa.status
                    END AS effective_status
                FROM prior_authorizations pa
                LEFT JOIN patients p ON pa.patient_id = p.id
                WHERE pa.deleted_at IS NULL
            ";
            $params = [];

            if (!empty($patientId)) {
                $sql .= " AND pa.patient_id = ?";
                $params[] = $patientId;
            }

            if (!empty($status) && $status !== 'all') {
                $sql .= " AND pa.status = ?";
                $params[] = $status;
            }

            if (!empty($search)) {
                $sql .= " AND (pa.auth_number LIKE ? OR pa.cpt_code LIKE ? OR pa.service_description LIKE ? OR pa.payer_name LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ? OR p.patient_no LIKE ?)";
                $kw = "%{$search}%";
                $params = array_merge($params, [$kw, $kw, $kw, $kw, $kw, $kw, $kw]);
            }

            $sql .= " ORDER BY pa.status = 'Active' DESC, pa.end_date ASC LIMIT 100";
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $priorAuths = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        // 3. Aggregate Summary Statistics
        $statsWherePatient = !empty($patientId) ? " WHERE patient_id = " . (int)$patientId : "";
        $statsWherePatientPa = !empty($patientId) ? " AND patient_id = " . (int)$patientId : "";

        $pendingClinical = (int) $this->db->query("SELECT COUNT(*) FROM clinical_authorizations {$statsWherePatient} " . (!empty($patientId) ? "AND" : "WHERE") . " status = 'pending'")->fetchColumn();
        $authorizedClinical = (int) $this->db->query("SELECT COUNT(*) FROM clinical_authorizations {$statsWherePatient} " . (!empty($patientId) ? "AND" : "WHERE") . " status = 'authorized'")->fetchColumn();
        $activePriorAuth = (int) $this->db->query("SELECT COUNT(*) FROM prior_authorizations WHERE deleted_at IS NULL AND status = 'Active' {$statsWherePatientPa}")->fetchColumn();
        $expiringPriorAuth = (int) $this->db->query("SELECT COUNT(*) FROM prior_authorizations WHERE deleted_at IS NULL AND status = 'Active' AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) {$statsWherePatientPa}")->fetchColumn();

        // 4. Insurances list for dropdown
        $insurances = $this->db->query("SELECT id, name, phone, payer_id FROM insurances WHERE deleted_at IS NULL ORDER BY name ASC")->fetchAll(PDO::FETCH_ASSOC);

        // 5. Patient Insurances if patient selected
        $patientInsurances = [];
        if (!empty($patientId)) {
            $stmt = $this->db->prepare("
                SELECT pi.*, i.name AS insurance_name 
                FROM patient_insurances pi 
                LEFT JOIN insurances i ON pi.insurance_id = i.id 
                WHERE pi.patient_id = ? AND pi.deleted_at IS NULL
            ");
            $stmt->execute([$patientId]);
            $patientInsurances = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        // 6. Patients list for selector
        $patients = $this->db->query("
            SELECT id, patient_no, CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) AS name 
            FROM patients 
            WHERE deleted_at IS NULL 
            ORDER BY last_name ASC, first_name ASC 
            LIMIT 200
        ")->fetchAll(PDO::FETCH_ASSOC);

        $this->success([
            'clinical_authorizations' => $clinicalAuths,
            'prior_authorizations' => $priorAuths,
            'stats' => [
                'pending_clinical' => $pendingClinical,
                'authorized_clinical' => $authorizedClinical,
                'active_prior_auth' => $activePriorAuth,
                'expiring_prior_auth' => $expiringPriorAuth
            ],
            'insurances' => $insurances,
            'patient_insurances' => $patientInsurances,
            'patient' => $patient,
            'patients' => $patients
        ], 'Authorizations retrieved successfully.');
    }

    /**
     * POST /authorizations/clinical/sign
     * Authorize or return a clinical document/encounter note
     */
    public function signClinical(): void
    {
        $request = new Request();
        $rawId = trim((string) $request->input('id'));
        $action = trim((string) $request->input('action', 'authorize')); // 'authorize' or 'return'
        $comments = trim((string) $request->input('comments', ''));
        $signerName = trim((string) $request->input('signer_name', ''));

        if (empty($rawId)) {
            $this->error('Authorization ID is required.', 400);
            return;
        }

        $sessionUser = Session::get('user');
        $userId = $sessionUser['id'] ?? null;
        if (empty($signerName)) {
            $signerName = !empty($sessionUser['username']) ? $sessionUser['username'] : 'Supervising Physician, MD';
        }

        $status = ($action === 'return') ? 'returned' : 'authorized';

        if (str_starts_with($rawId, 'soap_')) {
            $soapNoteId = (int) substr($rawId, 5);
            if ($action === 'authorize') {
                $stmt = $this->db->prepare("
                    INSERT INTO encounter_soap_note_signatures 
                        (soap_note_id, signer_user_id, signer_name, signer_role, amendment, signed_at)
                    VALUES 
                        (:soap_id, :user_id, :signer_name, 'Supervising Physician', :amendment, NOW())
                ");
                $stmt->execute([
                    'soap_id' => $soapNoteId,
                    'user_id' => $userId,
                    'signer_name' => $signerName,
                    'amendment' => $comments
                ]);
                $this->db->prepare("UPDATE encounter_soap_notes SET locked_at = NOW(), updated_at = NOW() WHERE id = ?")->execute([$soapNoteId]);
            }
        } else {
            $id = (int) $rawId;
            $stmt = $this->db->prepare("
                UPDATE clinical_authorizations 
                SET 
                    status = :status,
                    authorized_by_id = :user_id,
                    authorized_by_name = :signer_name,
                    authorized_at = NOW(),
                    comments = :comments,
                    updated_at = NOW()
                WHERE id = :id
            ");

            $stmt->execute([
                'status' => $status,
                'user_id' => $userId,
                'signer_name' => $signerName,
                'comments' => $comments,
                'id' => $id
            ]);
        }

        $this->success([
            'id' => $rawId,
            'status' => $status,
            'authorized_by_name' => $signerName,
            'authorized_at' => date('Y-m-d H:i:s')
        ], $action === 'return' ? 'Clinical note returned for revision.' : 'Clinical note authorized and signed successfully.');
    }

    /**
     * POST /authorizations/clinical/batch-sign
     * Batch sign multiple clinical authorizations
     */
    public function batchSignClinical(): void
    {
        $request = new Request();
        $ids = $request->input('ids');
        $action = trim((string) $request->input('action', 'authorize'));
        $comments = trim((string) $request->input('comments', 'Batch clinical sign-off'));
        $signerName = trim((string) $request->input('signer_name', 'Supervising Physician, MD'));

        if (!is_array($ids) || empty($ids)) {
            $this->error('No clinical authorizations selected.', 400);
            return;
        }

        $sessionUser = Session::get('user');
        $userId = $sessionUser['id'] ?? null;
        $status = ($action === 'return') ? 'returned' : 'authorized';

        $stmt = $this->db->prepare("
            UPDATE clinical_authorizations 
            SET 
                status = :status,
                authorized_by_id = :user_id,
                authorized_by_name = :signer_name,
                authorized_at = NOW(),
                comments = :comments,
                updated_at = NOW()
            WHERE id = :id
        ");

        $count = 0;
        foreach ($ids as $id) {
            $rawId = (string) $id;
            if (str_starts_with($rawId, 'soap_')) {
                $soapId = (int) substr($rawId, 5);
                if ($action === 'authorize') {
                    $sigStmt = $this->db->prepare("
                        INSERT INTO encounter_soap_note_signatures 
                            (soap_note_id, signer_user_id, signer_name, signer_role, amendment, signed_at)
                        VALUES 
                            (:soap_id, :user_id, :signer_name, 'Supervising Physician', :amendment, NOW())
                    ");
                    $sigStmt->execute([
                        'soap_id' => $soapId,
                        'user_id' => $userId,
                        'signer_name' => $signerName,
                        'amendment' => $comments
                    ]);
                    $this->db->prepare("UPDATE encounter_soap_notes SET locked_at = NOW(), updated_at = NOW() WHERE id = ?")->execute([$soapId]);
                    $count++;
                }
            } else {
                $cleanId = (int) $rawId;
                if ($cleanId > 0) {
                    $stmt->execute([
                        'status' => $status,
                        'user_id' => $userId,
                        'signer_name' => $signerName,
                        'comments' => $comments,
                        'id' => $cleanId
                    ]);
                    $count++;
                }
            }
        }

        $this->success(['count' => $count], "{$count} items successfully {$status}.");
    }

    /**
     * POST /authorizations/prior-auth/save
     * Create or update a Prior Authorization
     */
    public function savePriorAuth(): void
    {
        $request = new Request();
        $id = $request->input('id') ? (int) $request->input('id') : null;
        $patientId = $request->input('patient_id') ? (int) $request->input('patient_id') : null;
        $patientNo = trim((string) $request->input('patient_no', ''));
        $payerName = trim((string) $request->input('payer_name', ''));
        $insuranceId = $request->input('insurance_id') ? (int) $request->input('insurance_id') : null;
        $authNumber = trim((string) $request->input('auth_number', ''));
        $cptCode = trim((string) $request->input('cpt_code', ''));
        $serviceDescription = trim((string) $request->input('service_description', ''));
        $unitsApproved = (int) $request->input('units_approved', 1);
        $unitsUsed = (int) $request->input('units_used', 0);
        $startDate = trim((string) $request->input('start_date', ''));
        $endDate = trim((string) $request->input('end_date', ''));
        $providerName = trim((string) $request->input('provider_name', ''));
        $status = trim((string) $request->input('status', 'Active'));
        $notes = trim((string) $request->input('notes', ''));

        // Resolve patient by patient_no if needed
        if (empty($patientId) && !empty($patientNo)) {
            $stmt = $this->db->prepare("SELECT id FROM patients WHERE patient_no = ? LIMIT 1");
            $stmt->execute([$patientNo]);
            $patientId = $stmt->fetchColumn();
        }

        if (empty($patientId)) {
            $this->error('Patient selection is required.', 422);
            return;
        }

        if (empty($payerName)) {
            $this->error('Payer/Insurance name is required.', 422);
            return;
        }

        if (empty($authNumber)) {
            $this->error('Authorization Number is required.', 422);
            return;
        }

        if (empty($serviceDescription)) {
            $this->error('Service description is required.', 422);
            return;
        }

        if (empty($startDate) || empty($endDate)) {
            $this->error('Start date and End date are required.', 422);
            return;
        }

        $sessionUser = Session::get('user');
        $userId = $sessionUser['id'] ?? null;

        if ($id) {
            // Update existing
            $stmt = $this->db->prepare("
                UPDATE prior_authorizations 
                SET 
                    patient_id = :patient_id,
                    insurance_id = :insurance_id,
                    payer_name = :payer_name,
                    auth_number = :auth_number,
                    cpt_code = :cpt_code,
                    service_description = :service_description,
                    units_approved = :units_approved,
                    units_used = :units_used,
                    start_date = :start_date,
                    end_date = :end_date,
                    provider_name = :provider_name,
                    status = :status,
                    notes = :notes,
                    updated_at = NOW()
                WHERE id = :id
            ");
            $stmt->execute([
                'patient_id' => $patientId,
                'insurance_id' => $insuranceId,
                'payer_name' => $payerName,
                'auth_number' => $authNumber,
                'cpt_code' => $cptCode,
                'service_description' => $serviceDescription,
                'units_approved' => $unitsApproved,
                'units_used' => $unitsUsed,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'provider_name' => $providerName,
                'status' => $status,
                'notes' => $notes,
                'id' => $id
            ]);
            $this->success(['id' => $id], 'Prior authorization updated successfully.');
        } else {
            // Insert new
            $stmt = $this->db->prepare("
                INSERT INTO prior_authorizations (
                    patient_id, insurance_id, payer_name, auth_number, cpt_code, 
                    service_description, units_approved, units_used, start_date, 
                    end_date, provider_name, status, notes, created_by, created_at
                ) VALUES (
                    :patient_id, :insurance_id, :payer_name, :auth_number, :cpt_code,
                    :service_description, :units_approved, :units_used, :start_date,
                    :end_date, :provider_name, :status, :notes, :created_by, NOW()
                )
            ");
            $stmt->execute([
                'patient_id' => $patientId,
                'insurance_id' => $insuranceId,
                'payer_name' => $payerName,
                'auth_number' => $authNumber,
                'cpt_code' => $cptCode,
                'service_description' => $serviceDescription,
                'units_approved' => $unitsApproved,
                'units_used' => $unitsUsed,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'provider_name' => $providerName,
                'status' => $status,
                'notes' => $notes,
                'created_by' => $userId
            ]);
            $newId = (int) $this->db->lastInsertId();
            $this->success(['id' => $newId], 'Prior authorization created successfully.');
        }
    }

    /**
     * POST /authorizations/prior-auth/decrement
     * Decrement 1 authorized unit (logs an encounter visit usage)
     */
    public function decrementPriorAuthUnit(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if (!$id) {
            $this->error('Prior authorization ID is required.', 400);
            return;
        }

        $stmt = $this->db->prepare("SELECT id, units_approved, units_used, status FROM prior_authorizations WHERE id = ? AND deleted_at IS NULL");
        $stmt->execute([$id]);
        $pa = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$pa) {
            $this->error('Prior authorization not found.', 404);
            return;
        }

        $newUsed = (int)$pa['units_used'] + 1;
        $status = $pa['status'];
        if ($newUsed >= (int)$pa['units_approved']) {
            $status = 'Completed';
        }

        $stmt = $this->db->prepare("UPDATE prior_authorizations SET units_used = ?, status = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$newUsed, $status, $id]);

        $this->success([
            'id' => $id,
            'units_used' => $newUsed,
            'units_remaining' => max(0, (int)$pa['units_approved'] - $newUsed),
            'status' => $status
        ], 'Authorization visit unit logged successfully.');
    }

    /**
     * POST /authorizations/prior-auth/delete
     * Soft-delete a prior authorization
     */
    public function deletePriorAuth(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if (!$id) {
            $this->error('ID is required.', 400);
            return;
        }

        $stmt = $this->db->prepare("UPDATE prior_authorizations SET deleted_at = NOW() WHERE id = ?");
        $stmt->execute([$id]);

        $this->success(['id' => $id], 'Prior authorization deleted successfully.');
    }
}
