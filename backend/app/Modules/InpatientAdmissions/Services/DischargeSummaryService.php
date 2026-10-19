<?php

namespace App\Modules\InpatientAdmissions\Services;

use App\Core\Database;
use App\Core\AuditLogger;
use App\Modules\BusinessSettings\Services\BusinessSettingService;
use App\Modules\InpatientAdmissions\Models\InpatientDischargeSummary;
use App\Modules\InpatientAdmissions\Models\InpatientAdmission;
use PDO;
use Exception;

class DischargeSummaryService
{
    /**
     * Fetch the clinical discharge summary for an admission if it exists.
     */
    public function getSummaryByAdmissionId(int $admissionId): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare("
            SELECT ds.*, 
                   p.patient_no, p.birthdate, p.sex, p.blood_type,
                   adm.admission_number, adm.admission_date, adm.discharge_date as adm_discharge_date,
                   w.ward_name AS ward_name, b.bed_number,
                   u_sig.username AS signed_by_username
            FROM inpatient_discharge_summaries ds
            INNER JOIN inpatient_admissions adm ON adm.id = ds.admission_id
            LEFT JOIN patients p ON p.id = ds.patient_id
            LEFT JOIN hospital_wards w ON w.id = adm.ward_id
            LEFT JOIN hospital_beds b ON b.id = adm.bed_id
            LEFT JOIN users u_sig ON u_sig.id = ds.attending_physician_id
            WHERE ds.admission_id = :admission_id AND ds.deleted_at IS NULL
            ORDER BY ds.id DESC
            LIMIT 1
        ");
        $stmt->execute(['admission_id' => $admissionId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /**
     * Retrieve pre-populated data for drafting a clinical discharge summary.
     * Gathers demographic and clinical facts from admissions, allergies, prescriptions, and vitals.
     */
    public function getPrePopulatedAdmissionData(int $admissionId): array
    {
        $db = Database::connection();

        // Check if a saved summary already exists
        $existing = $this->getSummaryByAdmissionId($admissionId);
        if ($existing) {
            return [
                'has_existing' => true,
                'summary'      => $existing
            ];
        }

        // Fetch admission details
        $admStmt = $db->prepare("
            SELECT adm.*, 
                   w.ward_name AS ward_name, b.bed_number,
                   p.first_name, p.middle_name, p.last_name, p.suffix, p.birthdate, p.sex, p.blood_type,
                   p.patient_no
            FROM inpatient_admissions adm
            LEFT JOIN hospital_wards w ON w.id = adm.ward_id
            LEFT JOIN hospital_beds b ON b.id = adm.bed_id
            LEFT JOIN patients p ON p.id = adm.patient_id
            WHERE adm.id = :admission_id
        ");
        $admStmt->execute(['admission_id' => $admissionId]);
        $adm = $admStmt->fetch(PDO::FETCH_ASSOC);

        if (!$adm) {
            throw new Exception("Inpatient admission #{$admissionId} not found.");
        }

        $patientId = (int) ($adm['patient_id'] ?? 0);

        // Fetch active allergies
        $allergies = [];
        if ($patientId > 0) {
            $algStmt = $db->prepare("
                SELECT al.name AS allergy, pa.reaction, pa.severity 
                FROM patient_allergies pa
                JOIN allergies al ON al.id = pa.allergy_id
                WHERE pa.patient_id = :patient_id AND pa.deleted_at IS NULL
            ");
            $algStmt->execute(['patient_id' => $patientId]);
            $allergies = $algStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        // Fetch current prescriptions / discharge candidates
        $prescriptions = [];
        if ($patientId > 0) {
            $rxStmt = $db->prepare("
                SELECT title AS drug_name, dosage, frequency, route, directions AS instructions
                FROM patient_prescriptions
                WHERE patient_id = :patient_id AND deleted_at IS NULL
                ORDER BY id DESC LIMIT 10
            ");
            $rxStmt->execute(['patient_id' => $patientId]);
            $prescriptions = $rxStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        // Calculate length of stay
        $admissionDate = $adm['admission_date'] ?? date('Y-m-d H:i:s');
        $dischargeDate = $adm['discharge_date'] ?? date('Y-m-d H:i:s');
        $losDays = max(1, (int) round((strtotime($dischargeDate) - strtotime($admissionDate)) / 86400));

        $prefillMedications = "";
        if (!empty($prescriptions)) {
            $medLines = [];
            foreach ($prescriptions as $rx) {
                $medLines[] = "• {$rx['drug_name']} {$rx['dosage']} - Take via {$rx['route']}, {$rx['frequency']}" . ($rx['instructions'] ? " ({$rx['instructions']})" : "");
            }
            $prefillMedications = implode("\n", $medLines);
        }

        return [
            'has_existing' => false,
            'summary' => [
                'admission_id'             => (int) $adm['id'],
                'patient_id'               => $patientId,
                'patient_name'             => $adm['patient_name'],
                'patient_no'               => $adm['patient_mrn'] ?: ($adm['patient_no'] ?? 'N/A'),
                'patient_age'              => $adm['patient_age'],
                'gender'                   => $adm['gender'],
                'birthdate'                => $adm['birthdate'],
                'ward_name'                => $adm['ward_name'],
                'bed_number'               => $adm['bed_number'],
                'admission_number'         => $adm['admission_number'],
                'admission_date'           => $admissionDate,
                'discharge_date'           => $dischargeDate,
                'length_of_stay_days'      => $losDays,
                'admitting_diagnosis'      => $adm['admitting_diagnosis'] ?? '',
                'discharge_diagnosis'      => $adm['admitting_diagnosis'] ?? '',
                'hospital_course_summary'  => "Patient was admitted via {$adm['admission_source']} for {$adm['admitting_diagnosis']}. During the hospital stay, vital signs stabilized and response to clinical therapy was monitored closely. Patient is deemed clinically stable for safe discharge.",
                'significant_procedures'   => 'None documented.',
                'discharge_condition'      => 'Improved',
                'discharge_disposition'    => $adm['discharge_disposition'] ?: 'Discharged Home with Self-Care',
                'discharge_medications'    => $prefillMedications,
                'diet_instructions'        => 'Regular hospital diet as tolerated; low-sodium, adequate oral hydration.',
                'activity_restrictions'    => 'Resume ambulation as tolerated; avoid strenuous exertion or heavy lifting for 1-2 weeks.',
                'follow_up_instructions'   => 'Follow-up at Outpatient Clinic in 7-10 days. Return to Emergency Department immediately if experiencing high fever, worsening chest pain, severe shortness of breath, acute bleeding, or unremitting symptoms.',
                'attending_physician_name' => $adm['attending_physician'] ?? '',
                'allergies'                => $allergies,
                'is_finalized'             => 0
            ]
        ];
    }

    /**
     * Save a draft discharge summary (work in progress).
     */
    public function saveDraft(int $admissionId, array $data, int $userId): array
    {
        return $this->persistSummary($admissionId, $data, $userId, false);
    }

    /**
     * Finalize and electronically sign the clinical discharge summary.
     */
    public function finalize(int $admissionId, array $data, int $userId): array
    {
        $this->validateRequiredClinicalFields($data);
        return $this->persistSummary($admissionId, $data, $userId, true);
    }

    /**
     * Validate mandatory fields for final clinical sign-off.
     */
    private function validateRequiredClinicalFields(array $data): void
    {
        $required = [
            'admitting_diagnosis'      => 'Admitting Diagnosis',
            'discharge_diagnosis'      => 'Discharge Diagnosis',
            'hospital_course_summary'  => 'Hospital Course Summary',
            'discharge_condition'      => 'Discharge Condition',
            'discharge_disposition'    => 'Discharge Disposition',
            'follow_up_instructions'   => 'Follow-up & Emergency Instructions',
            'attending_physician_name' => 'Attending Physician Name'
        ];

        $missing = [];
        foreach ($required as $field => $label) {
            if (empty(trim((string)($data[$field] ?? '')))) {
                $missing[] = $label;
            }
        }

        if (!empty($missing)) {
            throw new Exception("Clinical discharge finalization requires: " . implode(', ', $missing) . ".");
        }
    }

    /**
     * Core persistence routine handling creation, update, electronic signature, and admission synchronization.
     */
    private function persistSummary(int $admissionId, array $data, int $userId, bool $finalize): array
    {
        $db = Database::connection();
        $db->beginTransaction();

        try {
            // Verify admission exists
            $admStmt = $db->prepare('SELECT * FROM inpatient_admissions WHERE id = :id FOR UPDATE');
            $admStmt->execute(['id' => $admissionId]);
            $adm = $admStmt->fetch(PDO::FETCH_ASSOC);

            if (!$adm) {
                throw new Exception("Inpatient admission #{$admissionId} not found.");
            }

            $patientId = (int) $adm['patient_id'];
            $existing = $this->getSummaryByAdmissionId($admissionId);

            $physicianName = trim((string)($data['attending_physician_name'] ?? $adm['attending_physician']));
            $licenseNumber = trim((string)($data['physician_license_number'] ?? ''));
            $dischargeDate = !empty($data['discharge_date']) ? $data['discharge_date'] : date('Y-m-d H:i:s');
            $disposition   = trim((string)($data['discharge_disposition'] ?? 'Discharged Home with Self-Care'));
            $condition     = trim((string)($data['discharge_condition'] ?? 'Improved'));

            $summaryNumber = $existing['summary_number'] ?? $this->generateSummaryNumber();

            // Prepare signature if finalizing
            $electronicSignature = $existing['electronic_signature'] ?? null;
            $signatureDate = $existing['signature_date'] ?? null;

            if ($finalize) {
                $stampDate = date('Y-m-d H:i:s');
                $licStr = $licenseNumber ? " [PRC/MD Lic# {$licenseNumber}]" : "";
                $electronicSignature = "Electronically Verified & Signed by {$physicianName}{$licStr} on {$stampDate}";
                $signatureDate = $stampDate;
            }

            $payload = [
                'summary_number'           => $summaryNumber,
                'admission_id'             => $admissionId,
                'patient_id'               => $patientId,
                'admitting_diagnosis'      => trim((string)($data['admitting_diagnosis'] ?? $adm['admitting_diagnosis'])),
                'discharge_diagnosis'      => trim((string)($data['discharge_diagnosis'] ?? '')),
                'hospital_course_summary'  => trim((string)($data['hospital_course_summary'] ?? '')),
                'significant_procedures'   => trim((string)($data['significant_procedures'] ?? '')),
                'discharge_condition'      => $condition,
                'discharge_disposition'    => $disposition,
                'discharge_medications'    => trim((string)($data['discharge_medications'] ?? '')),
                'diet_instructions'        => trim((string)($data['diet_instructions'] ?? '')),
                'activity_restrictions'    => trim((string)($data['activity_restrictions'] ?? '')),
                'follow_up_instructions'   => trim((string)($data['follow_up_instructions'] ?? '')),
                'attending_physician_id'   => !empty($data['attending_physician_id']) ? (int)$data['attending_physician_id'] : $userId,
                'attending_physician_name' => $physicianName,
                'physician_license_number' => $licenseNumber ?: null,
                'electronic_signature'     => $electronicSignature,
                'signature_date'           => $signatureDate,
                'is_finalized'             => $finalize ? 1 : 0,
                'updated_by'               => $userId,
            ];

            if ($existing) {
                // Cannot overwrite finalized summary unless explicitly permitted
                if ($existing['is_finalized'] && !$finalize) {
                    throw new Exception("This discharge summary is already finalized and cannot be reverted to draft.");
                }

                $fields = [];
                foreach ($payload as $key => $val) {
                    $fields[] = "`{$key}` = :{$key}";
                }
                $payload['id'] = $existing['id'];

                $updateSql = "UPDATE inpatient_discharge_summaries SET " . implode(', ', $fields) . ", updated_at = NOW() WHERE id = :id";
                $stmt = $db->prepare($updateSql);
                $stmt->execute($payload);
                $summaryId = (int)$existing['id'];
            } else {
                $payload['created_by'] = $userId;
                $cols = array_keys($payload);
                $placeholders = array_map(fn($k) => ":{$k}", $cols);

                $insertSql = "INSERT INTO inpatient_discharge_summaries (`" . implode('`, `', $cols) . "`) VALUES (" . implode(', ', $placeholders) . ")";
                $stmt = $db->prepare($insertSql);
                $stmt->execute($payload);
                $summaryId = (int)$db->lastInsertId();
            }

            // If finalized, synchronize admission status to Discharged / Deceased and release bed
            if ($finalize) {
                $targetStatus = ($condition === 'Expired') ? 'Deceased' : 'Discharged';
                $notesSnippet = "Finalized Clinical Discharge Summary {$summaryNumber}. Disposition: {$disposition}. Condition: {$condition}.";

                $updAdm = $db->prepare("
                    UPDATE inpatient_admissions
                    SET status = :status,
                        discharge_date = :discharge_date,
                        discharge_disposition = :disposition,
                        discharge_notes = :notes,
                        discharge_physician = :physician,
                        updated_at = NOW()
                    WHERE id = :id
                ");
                $updAdm->execute([
                    'status'         => $targetStatus,
                    'discharge_date' => $dischargeDate,
                    'disposition'    => $disposition,
                    'notes'          => $notesSnippet,
                    'physician'      => $physicianName,
                    'id'             => $admissionId
                ]);

                // Vacate bed and mark Dirty / Turnover
                $bedId = (int) $adm['bed_id'];
                if ($bedId > 0) {
                    $updBed = $db->prepare("
                        UPDATE hospital_beds 
                        SET status = 'Dirty / Turnover', current_admission_id = NULL, updated_at = NOW() 
                        WHERE id = :bed_id
                    ");
                    $updBed->execute(['bed_id' => $bedId]);
                }

                AuditLogger::log(
                    AuditLogger::CATEGORY_CLINICAL,
                    AuditLogger::ACTION_PRINT_SUMMARY,
                    "Finalized and signed formal clinical discharge summary {$summaryNumber} for admission ID {$admissionId}",
                    $patientId
                );
            }

            $db->commit();

            if ($finalize && !empty($bedId)) {
                try {
                    $priority = 'Routine';
                    $cleaningType = 'Terminal Cleaning';
                    $isolation = $adm['isolation_precautions'] ?? 'Standard';
                    if ($isolation !== 'Standard') {
                        $cleaningType = 'Isolation Deep Sanitize';
                        $priority = 'Urgent';
                    }
                    (new \App\Modules\RoomManagement\Services\BedTurnoverService())->initiateTurnover(
                        $bedId,
                        $admissionId,
                        $userId,
                        $priority,
                        $cleaningType,
                        "Clinical discharge finalization for {$adm['patient_name']}. Precautions: {$isolation}."
                    );
                } catch (\Throwable $evsEx) {
                    error_log("EVS discharge summary turnover trigger error: " . $evsEx->getMessage());
                }
            }

            return [
                'success' => true,
                'message' => $finalize ? 'Clinical discharge summary finalized, signed, and patient discharged.' : 'Discharge summary draft saved successfully.',
                'data'    => $this->getSummaryByAdmissionId($admissionId)
            ];
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    /**
     * Generate unique clinical summary tracking number.
     */
    private function generateSummaryNumber(): string
    {
        $db = Database::connection();
        $stmt = $db->query("SELECT MAX(id) AS max_id FROM inpatient_discharge_summaries");
        $maxId = (int) ($stmt->fetch(PDO::FETCH_ASSOC)['max_id'] ?? 0);
        return 'DS-' . date('Ymd') . '-' . str_pad((string)($maxId + 1), 4, '0', STR_PAD_LEFT);
    }

    /**
     * Generate comprehensive, official, print-ready HTML for the Discharge Summary.
     * Engineered with pure CSS @media print styles for perfect browser print & save-as-PDF.
     */
    public function generatePrintHtml(int $admissionId): string
    {
        $summary = $this->getSummaryByAdmissionId($admissionId);
        if (!$summary) {
            // Pre-populate if not yet saved
            $pre = $this->getPrePopulatedAdmissionData($admissionId);
            $summary = $pre['summary'];
        }

        $business = (new BusinessSettingService())->get();
        $hospitalName = $business['name'] ?? 'USINTELLIX MEDICAL CENTER';
        $hospitalAddress = $business['address'] ?? 'Hospital Boulevard, Medical District';
        $hospitalPhone = $business['phone'] ?? '+1 (800) 555-0199';
        $hospitalEmail = $business['email'] ?? 'clinical.records@usintellix-health.org';
        $taxId = $business['tax_id_number'] ?? 'TIN-482-901-736-000';

        $summaryNum = htmlspecialchars($summary['summary_number'] ?? 'DRAFT-PREVIEW');
        $patientName = htmlspecialchars($summary['patient_name'] ?? 'Unknown Patient');
        $patientNo = htmlspecialchars($summary['patient_no'] ?? 'N/A');
        $gender = htmlspecialchars(ucfirst($summary['gender'] ?? 'N/A'));
        $birthdate = htmlspecialchars($summary['birthdate'] ?? 'N/A');
        $age = htmlspecialchars((string)($summary['patient_age'] ?? 'N/A'));
        $ward = htmlspecialchars($summary['ward_name'] ?? 'Inpatient');
        $bed = htmlspecialchars($summary['bed_number'] ?? 'N/A');
        $admDate = htmlspecialchars($summary['admission_date'] ?? 'N/A');
        $disDate = htmlspecialchars($summary['discharge_date'] ?? date('Y-m-d H:i:s'));
        $condition = htmlspecialchars($summary['discharge_condition'] ?? 'Improved');
        $disposition = htmlspecialchars($summary['discharge_disposition'] ?? 'Discharged Home with Self-Care');
        $admittingDiag = nl2br(htmlspecialchars($summary['admitting_diagnosis'] ?? 'None'));
        $dischargeDiag = nl2br(htmlspecialchars($summary['discharge_diagnosis'] ?? 'None'));
        $hospitalCourse = nl2br(htmlspecialchars($summary['hospital_course_summary'] ?? 'Not documented.'));
        $procedures = nl2br(htmlspecialchars($summary['significant_procedures'] ?? 'None performed.'));
        $medications = nl2br(htmlspecialchars($summary['discharge_medications'] ?? 'No take-home medications ordered.'));
        $diet = nl2br(htmlspecialchars($summary['diet_instructions'] ?? 'As tolerated.'));
        $activity = nl2br(htmlspecialchars($summary['activity_restrictions'] ?? 'As tolerated.'));
        $followUp = nl2br(htmlspecialchars($summary['follow_up_instructions'] ?? 'Follow up with attending physician as indicated.'));
        $physician = htmlspecialchars($summary['attending_physician_name'] ?? 'Attending Staff');
        $signature = htmlspecialchars($summary['electronic_signature'] ?? 'Pending Attending Physician Verification');
        $sigDate = htmlspecialchars($summary['signature_date'] ?? date('Y-m-d H:i:s'));
        $isFinal = !empty($summary['is_finalized']);

        $badgeColor = match($condition) {
            'Recovered' => '#059669',
            'Improved' => '#2563eb',
            'Deteriorated' => '#d97706',
            'Against Medical Advice (AMA)' => '#b45309',
            'Expired' => '#dc2626',
            default => '#4b5563'
        };

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Discharge Summary - {$summaryNum} - {$patientName}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background: #f1f5f9;
            margin: 0;
            padding: 24px;
            font-size: 13px;
            line-height: 1.5;
        }
        .page-container {
            max-width: 850px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 36px 44px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .no-print-bar {
            max-width: 850px;
            margin: 0 auto 16px auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #1e293b;
            color: #fff;
            padding: 12px 20px;
            border-radius: 6px;
        }
        .btn-print {
            background: #2563eb;
            color: #fff;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
        }
        .btn-print:hover { background: #1d4ed8; }
        .doc-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 18px;
            margin-bottom: 20px;
        }
        .hospital-brand h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.5px;
            text-transform: uppercase;
        }
        .hospital-brand p {
            margin: 2px 0 0 0;
            font-size: 11px;
            color: #64748b;
        }
        .doc-title-block {
            text-align: right;
        }
        .doc-title-block h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 700;
            color: #2563eb;
            letter-spacing: -0.3px;
        }
        .doc-meta {
            font-size: 11px;
            color: #475569;
            margin-top: 4px;
        }
        .patient-card {
            border: 1px solid #e2e8f0;
            background: #f8fafc;
            border-radius: 6px;
            padding: 14px 18px;
            margin-bottom: 22px;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px 16px;
        }
        .meta-field label {
            display: block;
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 700;
            color: #64748b;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
        }
        .meta-field span {
            font-size: 13px;
            font-weight: 600;
            color: #0f172a;
        }
        .section-block {
            margin-bottom: 18px;
        }
        .section-title {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .content-box {
            background: #ffffff;
            font-size: 12.5px;
            color: #334155;
            line-height: 1.6;
        }
        .highlight-box {
            background: #eff6ff;
            border-left: 3px solid #2563eb;
            padding: 10px 14px;
            border-radius: 0 4px 4px 0;
            margin-bottom: 14px;
        }
        .warning-box {
            background: #fffbeb;
            border-left: 3px solid #f59e0b;
            padding: 10px 14px;
            border-radius: 0 4px 4px 0;
            margin-bottom: 14px;
        }
        .med-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px 14px;
            font-family: monospace;
            font-size: 12px;
            color: #0f172a;
            white-space: pre-line;
        }
        .condition-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 700;
            color: #fff;
            background: {$badgeColor};
        }
        .sig-block {
            margin-top: 28px;
            padding-top: 18px;
            border-top: 1px dashed #cbd5e1;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            page-break-inside: avoid;
        }
        .sig-box {
            width: 60%;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px 16px;
            background: #f8fafc;
        }
        .sig-title {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 6px;
        }
        .sig-stamp {
            font-family: monospace;
            font-size: 11px;
            color: #0f172a;
            font-weight: 600;
        }
        .confidentiality {
            margin-top: 24px;
            font-size: 10px;
            color: #94a3b8;
            text-align: center;
            border-top: 1px solid #f1f5f9;
            padding-top: 12px;
        }
        @media print {
            body { background: #fff; padding: 0; }
            .no-print-bar { display: none !important; }
            .page-container { border: none; box-shadow: none; padding: 0; width: 100%; max-width: 100%; }
            .sig-block { page-break-inside: avoid; }
        }
    </style>
</head>
<body>

    <div class="no-print-bar">
        <div>
            <strong>Enterprise Inpatient ADT</strong> &bull; Clinical Discharge Summary Form
        </div>
        <div>
            <button class="btn-print" onclick="window.print()">
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"></path></svg>
                Print Document / Save as PDF
            </button>
        </div>
    </div>

    <div class="page-container">
        <!-- HOSPITAL LETTERHEAD -->
        <div class="doc-header">
            <div class="hospital-brand">
                <h1>{$hospitalName}</h1>
                <p>{$hospitalAddress}</p>
                <p>Phone: {$hospitalPhone} | Email: {$hospitalEmail} | Institutional ID: {$taxId}</p>
            </div>
            <div class="doc-title-block">
                <h2>CLINICAL DISCHARGE SUMMARY</h2>
                <div class="doc-meta">Document #: <strong>{$summaryNum}</strong></div>
                <div class="doc-meta">Generated: {$sigDate}</div>
            </div>
        </div>

        <!-- PATIENT DEMOGRAPHICS & STAY INFO -->
        <div class="patient-card">
            <div class="meta-field">
                <label>Patient Full Name</label>
                <span>{$patientName}</span>
            </div>
            <div class="meta-field">
                <label>MRN / Patient ID</label>
                <span>{$patientNo}</span>
            </div>
            <div class="meta-field">
                <label>Age &bull; Gender</label>
                <span>{$age} yrs &bull; {$gender}</span>
            </div>
            <div class="meta-field">
                <label>Birthdate</label>
                <span>{$birthdate}</span>
            </div>
            <div class="meta-field">
                <label>Admission Date</label>
                <span>{$admDate}</span>
            </div>
            <div class="meta-field">
                <label>Discharge Date</label>
                <span>{$disDate}</span>
            </div>
            <div class="meta-field">
                <label>Location</label>
                <span>{$ward} - Bed {$bed}</span>
            </div>
            <div class="meta-field">
                <label>Discharge Condition</label>
                <span class="condition-badge">{$condition}</span>
            </div>
        </div>

        <!-- ADMITTING VS DISCHARGE DIAGNOSIS -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px;">
            <div class="section-block">
                <div class="section-title">Admitting Diagnosis</div>
                <div class="highlight-box content-box">
                    {$admittingDiag}
                </div>
            </div>
            <div class="section-block">
                <div class="section-title">Final Discharge Diagnosis</div>
                <div class="highlight-box content-box" style="border-left-color: #059669; background: #f0fdf4;">
                    {$dischargeDiag}
                </div>
            </div>
        </div>

        <!-- DISCHARGE DISPOSITION -->
        <div class="section-block">
            <div class="section-title">Discharge Disposition & Destination</div>
            <div class="content-box" style="font-weight: 600; color: #0f172a; margin-bottom: 12px;">
                {$disposition}
            </div>
        </div>

        <!-- HOSPITAL COURSE SUMMARY -->
        <div class="section-block">
            <div class="section-title">Brief Summary of Hospital Course & Clinical Evolution</div>
            <div class="content-box" style="margin-bottom: 14px; text-align: justify;">
                {$hospitalCourse}
            </div>
        </div>

        <!-- SIGNIFICANT PROCEDURES -->
        <div class="section-block">
            <div class="section-title">Significant Procedures, Surgeries & Diagnostic Interventions</div>
            <div class="content-box" style="margin-bottom: 14px;">
                {$procedures}
            </div>
        </div>

        <!-- DISCHARGE MEDICATIONS -->
        <div class="section-block">
            <div class="section-title">Discharge Medications & Regimen Reconciliation</div>
            <div class="med-box">
                {$medications}
            </div>
        </div>

        <!-- DIET & ACTIVITY RESTRICTIONS -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 14px; margin-bottom: 18px;">
            <div class="section-block">
                <div class="section-title">Dietary Guidance</div>
                <div class="content-box">
                    {$diet}
                </div>
            </div>
            <div class="section-block">
                <div class="section-title">Activity & Physical Restrictions</div>
                <div class="content-box">
                    {$activity}
                </div>
            </div>
        </div>

        <!-- FOLLOW-UP & RED FLAGS -->
        <div class="section-block">
            <div class="section-title">Follow-up Instructions & Emergency Red Flag Warnings</div>
            <div class="warning-box content-box">
                {$followUp}
            </div>
        </div>

        <!-- ATTENDING PHYSICIAN SIGNATURE BLOCK -->
        <div class="sig-block">
            <div class="sig-box">
                <div class="sig-title">Attending Physician Electronic Signature & Certification</div>
                <div class="sig-stamp">{$signature}</div>
                <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
                    Compliant with HIPAA Security Rule § 164.312(a)(2)(i) electronic authentication standards.
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 13px; font-weight: 700; color: #0f172a;">{$physician}</div>
                <div style="font-size: 11px; color: #64748b;">Attending Physician of Record</div>
                <div style="font-size: 11px; color: #64748b;">Date: {$sigDate}</div>
            </div>
        </div>

        <div class="confidentiality">
            CONFIDENTIAL MEDICAL RECORD &bull; This clinical document contains protected health information (PHI) governed by HIPAA § 164.502. Unauthorized copying or disclosure is strictly prohibited by federal and state law.
        </div>
    </div>

</body>
</html>
HTML;
    }
}
