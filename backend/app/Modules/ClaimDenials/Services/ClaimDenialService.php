<?php

namespace App\Modules\ClaimDenials\Services;

use App\Core\Database;
use PDO;
use RuntimeException;

class ClaimDenialService
{
    /**
     * Atomically generate unique denial number DEN-YYYY-XXXXX
     */
    public static function generateDenialNumber(PDO $pdo): string
    {
        $year = (int)date('Y');
        $stmt = $pdo->prepare("SELECT last_number FROM billing_denial_counters WHERE counter_type = 'DENIAL' AND year = ? FOR UPDATE");
        $stmt->execute([$year]);
        $seq = $stmt->fetchColumn();

        if ($seq === false) {
            $seq = 1;
            $ins = $pdo->prepare("INSERT INTO billing_denial_counters (counter_type, year, last_number) VALUES ('DENIAL', ?, ?)");
            $ins->execute([$year, $seq]);
        } else {
            $seq = (int)$seq + 1;
            $upd = $pdo->prepare("UPDATE billing_denial_counters SET last_number = ? WHERE counter_type = 'DENIAL' AND year = ?");
            $upd->execute([$seq, $year]);
        }

        return sprintf("DEN-%04d-%05d", $year, $seq);
    }

    /**
     * Atomically generate unique appeal number APP-YYYY-XXXXX
     */
    public static function generateAppealNumber(PDO $pdo): string
    {
        $year = (int)date('Y');
        $stmt = $pdo->prepare("SELECT last_number FROM billing_denial_counters WHERE counter_type = 'APPEAL' AND year = ? FOR UPDATE");
        $stmt->execute([$year]);
        $seq = $stmt->fetchColumn();

        if ($seq === false) {
            $seq = 1;
            $ins = $pdo->prepare("INSERT INTO billing_denial_counters (counter_type, year, last_number) VALUES ('APPEAL', ?, ?)");
            $ins->execute([$year, $seq]);
        } else {
            $seq = (int)$seq + 1;
            $upd = $pdo->prepare("UPDATE billing_denial_counters SET last_number = ? WHERE counter_type = 'APPEAL' AND year = ?");
            $upd->execute([$seq, $year]);
        }

        return sprintf("APP-%04d-%05d", $year, $seq);
    }

    /**
     * Record a New Insurance Claim Denial
     */
    public function recordClaimDenial(array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $patientId = (int)($data['patient_id'] ?? 0);
        $claimNo = trim($data['claim_number'] ?? '');
        $payerName = trim($data['payer_name'] ?? '');
        $deniedAmount = (float)($data['denied_amount'] ?? 0.0);
        $billedAmount = (float)($data['billed_amount'] ?? $deniedAmount);
        $allowedAmount = (float)($data['allowed_amount'] ?? 0.0);
        $patientResp = (float)($data['patient_responsibility'] ?? 0.0);
        $serviceDate = !empty($data['service_date']) ? $data['service_date'] : date('Y-m-d');
        $denialDate = !empty($data['denial_date']) ? $data['denial_date'] : date('Y-m-d');

        if ($patientId <= 0) {
            throw new RuntimeException("Patient ID is required.");
        }
        if (empty($claimNo)) {
            throw new RuntimeException("Claim number is required.");
        }
        if (empty($payerName)) {
            throw new RuntimeException("Payer / Insurance name is required.");
        }
        if ($deniedAmount <= 0.0) {
            throw new RuntimeException("Denied amount must be greater than zero.");
        }

        $carcCode = !empty($data['carc_code']) ? trim($data['carc_code']) : 'CO-16';
        $carcDesc = !empty($data['carc_description']) ? trim($data['carc_description']) : 'Claim lacks information or has billing errors.';
        $rarcCode = !empty($data['rarc_code']) ? trim($data['rarc_code']) : null;
        $rarcDesc = !empty($data['rarc_description']) ? trim($data['rarc_description']) : null;

        $category = !empty($data['denial_category']) ? trim($data['denial_category']) : 'coding_billing_error';
        $rootCause = !empty($data['root_cause_analysis']) ? trim($data['root_cause_analysis']) : null;

        // Calculate timely filing deadline (default 90 days from denial date)
        if (!empty($data['timely_filing_deadline'])) {
            $deadline = $data['timely_filing_deadline'];
        } else {
            $deadline = date('Y-m-d', strtotime($denialDate . ' +90 days'));
        }

        // Priority determination
        $daysDiff = (int)round((strtotime($deadline) - time()) / 86400);
        if ($deniedAmount >= 5000 || $daysDiff <= 30) {
            $priority = 'urgent';
        } elseif ($deniedAmount >= 1500 || $daysDiff <= 60) {
            $priority = 'high';
        } else {
            $priority = 'medium';
        }

        $insuranceId = !empty($data['insurance_id']) ? (int)$data['insurance_id'] : null;
        $encounterId = !empty($data['encounter_id']) ? (int)$data['encounter_id'] : null;
        $folioId = !empty($data['folio_id']) ? (int)$data['folio_id'] : null;
        $remittanceEob = !empty($data['remittance_eob_number']) ? trim($data['remittance_eob_number']) : null;
        $payerId = !empty($data['payer_id']) ? trim($data['payer_id']) : null;
        $assignedTo = !empty($data['assigned_to']) ? (int)$data['assigned_to'] : null;
        $assignedName = !empty($data['assigned_to_name']) ? trim($data['assigned_to_name']) : null;

        $pdo->beginTransaction();
        try {
            $denialNo = self::generateDenialNumber($pdo);

            $ins = $pdo->prepare("
                INSERT INTO billing_claim_denials (
                    denial_number, claim_number, patient_id, insurance_id, payer_name, payer_id,
                    encounter_id, folio_id, service_date, denial_date, remittance_eob_number,
                    billed_amount, allowed_amount, denied_amount, patient_responsibility,
                    carc_code, carc_description, rarc_code, rarc_description,
                    denial_category, root_cause_analysis, priority, timely_filing_deadline,
                    status, appeal_level, assigned_to, assigned_to_name,
                    created_by, created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    'pending_review', 'none', ?, ?,
                    ?, NOW(), NOW()
                )
            ");
            $ins->execute([
                $denialNo, $claimNo, $patientId, $insuranceId, $payerName, $payerId,
                $encounterId, $folioId, $serviceDate, $denialDate, $remittanceEob,
                $billedAmount, $allowedAmount, $deniedAmount, $patientResp,
                $carcCode, $carcDesc, $rarcCode, $rarcDesc,
                $category, $rootCause, $priority, $deadline,
                $assignedTo, $assignedName,
                $userId
            ]);
            $denialId = (int)$pdo->lastInsertId();

            $pdo->commit();
            return $this->getDenialDetail($denialId);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Get Complete Detail for a Claim Denial with Patient, Payer, and Appeals History
     */
    public function getDenialDetail(int $denialId): ?array
    {
        $pdo = Database::connection();

        $stmt = $pdo->prepare("
            SELECT d.*,
                   p.patient_no,
                   p.first_name,
                   p.last_name,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.birthdate,
                   p.sex,
                   f.folio_number,
                   DATEDIFF(d.timely_filing_deadline, CURDATE()) AS days_until_deadline,
                   c.title AS carc_title,
                   c.recommended_appeal_strategy
            FROM billing_claim_denials d
            JOIN patients p ON d.patient_id = p.id
            LEFT JOIN billing_inpatient_folios f ON d.folio_id = f.id
            LEFT JOIN billing_carc_rarc_dictionary c ON d.carc_code = c.code
            WHERE d.id = ?
        ");
        $stmt->execute([$denialId]);
        $denial = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$denial) {
            return null;
        }

        // Fetch appeals submitted for this denial
        $appStmt = $pdo->prepare("
            SELECT *
            FROM billing_claim_appeals
            WHERE denial_id = ?
            ORDER BY id ASC
        ");
        $appStmt->execute([$denialId]);
        $denial['appeals'] = $appStmt->fetchAll(PDO::FETCH_ASSOC);

        return $denial;
    }

    /**
     * List Claim Denials with Dynamic Filters, Search, Timely Filing Badges, and Pagination
     */
    public function listDenials(array $filters = []): array
    {
        $pdo = Database::connection();

        $page = max(1, (int)($filters['page'] ?? 1));
        $perPage = min(100, max(5, (int)($filters['per_page'] ?? 15)));
        $offset = ($page - 1) * $perPage;

        $conditions = ["1=1"];
        $params = [];

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $conditions[] = "d.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['denial_category']) && $filters['denial_category'] !== 'all') {
            $conditions[] = "d.denial_category = ?";
            $params[] = $filters['denial_category'];
        }

        if (!empty($filters['priority']) && $filters['priority'] !== 'all') {
            $conditions[] = "d.priority = ?";
            $params[] = $filters['priority'];
        }

        if (!empty($filters['carc_code'])) {
            $conditions[] = "d.carc_code = ?";
            $params[] = $filters['carc_code'];
        }

        if (!empty($filters['payer_name'])) {
            $conditions[] = "d.payer_name LIKE ?";
            $params[] = "%" . trim($filters['payer_name']) . "%";
        }

        if (!empty($filters['q'])) {
            $term = "%" . trim($filters['q']) . "%";
            $conditions[] = "(
                d.denial_number LIKE ? OR
                d.claim_number LIKE ? OR
                d.payer_name LIKE ? OR
                d.carc_code LIKE ? OR
                p.first_name LIKE ? OR
                p.last_name LIKE ? OR
                p.patient_no LIKE ?
            )";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $whereSql = implode(" AND ", $conditions);

        // Count total
        $countStmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM billing_claim_denials d
            JOIN patients p ON d.patient_id = p.id
            WHERE {$whereSql}
        ");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        // Fetch page items
        $sql = "
            SELECT d.*,
                   p.patient_no,
                   p.first_name,
                   p.last_name,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.birthdate,
                   DATEDIFF(d.timely_filing_deadline, CURDATE()) AS days_until_deadline,
                   (SELECT COUNT(*) FROM billing_claim_appeals a WHERE a.denial_id = d.id) AS appeal_count
            FROM billing_claim_denials d
            JOIN patients p ON d.patient_id = p.id
            WHERE {$whereSql}
            ORDER BY 
                CASE WHEN d.status IN ('pending_review', 'appeal_in_progress') THEN 0 ELSE 1 END ASC,
                d.timely_filing_deadline ASC,
                d.denied_amount DESC
            LIMIT {$perPage} OFFSET {$offset}
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => (int)ceil($total / max(1, $perPage))
        ];
    }

    /**
     * Generate Structured Formal Insurance Appeal Letter
     * Auto-populates clinical arguments, legal citations, and attached evidence checklist
     */
    public function generateAppealLetterTemplate(int $denialId, array $options = []): array
    {
        $denial = $this->getDenialDetail($denialId);
        if (!$denial) {
            throw new RuntimeException("Claim denial #{$denialId} not found.");
        }

        $appealLevel = $options['appeal_level'] ?? 'level_1_reconsideration';
        $contactPerson = $options['contact_person'] ?? 'Hospital Appeals & Revenue Integrity Specialist';
        $contactPhone = $options['contact_phone'] ?? '(555) 019-2834 ext. 410';
        $customArguments = $options['custom_arguments'] ?? '';

        $levelTitle = $appealLevel === 'level_2_formal_appeal' 
            ? 'FORMAL LEVEL 2 APPEALS COMMITTEE RE-EXAMINATION' 
            : ($appealLevel === 'level_3_external_review' ? 'EXTERNAL INDEPENDENT MEDICAL REVIEW REQUEST' : 'FORMAL FIRST-LEVEL RECONSIDERATION & CLINICAL APPEAL');

        // Dynamic clinical argument based on denial category
        $clinicalArgument = "";
        $attachments = [];

        switch ($denial['denial_category']) {
            case 'medical_necessity':
                $clinicalArgument = "The services rendered to the patient were thoroughly evaluated and deemed acute and medically necessary under prevailing clinical practice standards and CMS/LCD National Coverage Determinations. Conservative management was insufficient given the patient's acute diagnostic profile. Attached medical records clearly substantiate that the patient met interqual/milliman clinical admission and procedure criteria.";
                $attachments = [
                    "Attending Physician Clinical Trajectory & Progress Notes",
                    "Laboratory, Pathology, and Diagnostic Sonogram/Radiology Reports",
                    "Pre-Operative Assessment and Operative Technique Report",
                    "Discharge Summary and Medication Reconciliation"
                ];
                break;

            case 'prior_auth_missing':
                $clinicalArgument = "Services were delivered under emergent or urgent inpatient clinical necessity to avoid imminent risk of severe patient compromise (Emergency Medical Treatment and Active Labor Act - EMTALA and Prudent Layperson Standard). Pre-authorization was either not feasible prior to immediate intervention or was timely submitted to your portal. We hereby request retroactive authorization and immediate claim adjudication.";
                $attachments = [
                    "Emergency Department Physician Evaluation & Triage Record",
                    "Prior Authorization Submission Proof / Confirmation Timestamp",
                    "Urgent Inpatient Admission Order & Vital Signs Log",
                    "Physician Certification of Emergent Medical Condition"
                ];
                break;

            case 'timely_filing':
                $clinicalArgument = "The initial electronic claim (EDI 837P) was successfully batched and transmitted to your clearinghouse within the designated contractual timely filing timeframe. Attached please find the clearinghouse 277 Electronic Claim Acknowledgment and transmission report demonstrating initial delivery well before the timely filing threshold.";
                $attachments = [
                    "Clearinghouse EDI 277 Acceptance & 999 Functional Acknowledgment Logs",
                    "Original EDI 837P Transmission Batch Report with Server Timestamps",
                    "Patient Verification and Primary Insurance Active Coverage Record"
                ];
                break;

            case 'coding_billing_error':
                $clinicalArgument = "A comprehensive coding audit of the medical record confirms that the reported CPT and HCPCS codes accurately describe distinct, separate anatomical sites and independent diagnostic investigations in strict accordance with AMA CPT and CMS NCCI editing guidelines. The appropriate procedural modifiers (-59, -X{EPSU}, -25) have been validated by our certified medical coding staff.";
                $attachments = [
                    "Operative Report detailing Distinct Anatomical Sites / Separated Lesions",
                    "Certified Professional Coder (CPC) Audit Justification Worksheet",
                    "Corrected 837 Claim Form with Updated Modifier Appended"
                ];
                break;

            default:
                $clinicalArgument = "A comprehensive audit of the medical records and billing charges demonstrates that the billed hospital care was correctly authorized, performed in accordance with standards of medical practice, and supported by attached clinical evidence.";
                $attachments = ["Patient Medical Chart & Progress Notes", "Itemized Hospital Bill & Fee Sheet"];
        }

        if (!empty($customArguments)) {
            $clinicalArgument .= "\n\nAdditional Clinical Note from Reviewer: " . trim($customArguments);
        }

        $letterBody = <<<EOT
USINTELLIX MEDICAL CENTER
Department of Revenue Integrity & Claims Appeals
100 Hospital Blvd · Suite 400 · Phone: {$contactPhone}
Date: {$denial['denial_date']}

TO:
{$denial['payer_name']}
Appeals & Grievances Review Committee
Payer ID: {$denial['payer_id']}

RE: {$levelTitle}
Patient Name: {$denial['patient_name']}
Patient MRN: {$denial['patient_no']}
Patient Date of Birth: {$denial['birthdate']}
Claim Control Number: {$denial['claim_number']}
Date(s) of Service: {$denial['service_date']}
Total Billed Amount: \${$denial['billed_amount']}
Denied Amount Under Dispute: \${$denial['denied_amount']}
Denial Reason Code: {$denial['carc_code']} - {$denial['carc_description']}
{$denial['rarc_code']} - {$denial['rarc_description']}

Dear Appeals Committee:

Please accept this letter as a formal {$levelTitle} submitted by USIntellix Medical Center on behalf of {$denial['patient_name']} regarding the adverse determination and claim denial referenced above.

SUMMARY OF DISPUTE & CLINICAL JUSTIFICATION:
{$clinicalArgument}

We respectfully submit that your adverse benefit determination was rendered in error or without full consideration of the patient's acute clinical records. Denying coverage for this indispensable medical care contradicts evidence-based standards.

ATTACHED CLINICAL DOCUMENTATION:
EOT;

        foreach ($attachments as $idx => $att) {
            $letterBody .= "\n[" . ($idx + 1) . "] " . $att;
        }

        $letterBody .= <<<EOT


Based upon the foregoing clinical evidence and contractual requirements, we respectfully request that {$denial['payer_name']} immediately overturn this denial, reprocess Claim #{$denial['claim_number']}, and issue payment in the amount of \${$denial['denied_amount']} in accordance with our participation agreement.

Thank you for your prompt re-examination of this urgent matter.

Sincerely,

{$contactPerson}
Billing & Revenue Cycle Integrity Department
USIntellix Medical Center
Phone: {$contactPhone}
EOT;

        return [
            'denial' => $denial,
            'appeal_level' => $appealLevel,
            'level_title' => $levelTitle,
            'letter_body' => $letterBody,
            'attachments' => $attachments,
            'clinical_argument' => $clinicalArgument
        ];
    }

    /**
     * Submit Formal Appeal Package
     */
    public function submitAppeal(int $denialId, array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $denial = $this->getDenialDetail($denialId);
        if (!$denial) {
            throw new RuntimeException("Claim denial #{$denialId} not found.");
        }

        $appealLevel = !empty($data['appeal_level']) ? trim($data['appeal_level']) : 'level_1_reconsideration';
        $submissionDate = !empty($data['submission_date']) ? $data['submission_date'] : date('Y-m-d');
        $method = !empty($data['submission_method']) ? trim($data['submission_method']) : 'portal_upload';
        $trackingNo = !empty($data['tracking_confirmation_number']) ? trim($data['tracking_confirmation_number']) : null;
        $contactPerson = !empty($data['appellant_contact_person']) ? trim($data['appellant_contact_person']) : 'Revenue Cycle Appeals Officer';
        $contactPhone = !empty($data['appellant_phone']) ? trim($data['appellant_phone']) : '(555) 019-2834';
        $summary = !empty($data['appeal_reason_summary']) ? trim($data['appeal_reason_summary']) : 'Formal appeal disputing adverse claim denial.';
        $letterBody = !empty($data['appeal_letter_body']) ? trim($data['appeal_letter_body']) : '';
        $attachedDocs = !empty($data['attached_clinical_documents']) ? json_encode($data['attached_clinical_documents']) : json_encode([]);

        if (empty($letterBody)) {
            throw new RuntimeException("Appeal letter body cannot be empty.");
        }

        $pdo->beginTransaction();
        try {
            $appealNo = self::generateAppealNumber($pdo);

            $ins = $pdo->prepare("
                INSERT INTO billing_claim_appeals (
                    denial_id, appeal_number, appeal_level, submission_date, submission_method,
                    tracking_confirmation_number, appellant_contact_person, appellant_phone,
                    appeal_reason_summary, appeal_letter_body, attached_clinical_documents,
                    status, created_by, created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    'submitted', ?, NOW(), NOW()
                )
            ");
            $ins->execute([
                $denialId, $appealNo, $appealLevel, $submissionDate, $method,
                $trackingNo, $contactPerson, $contactPhone,
                $summary, $letterBody, $attachedDocs,
                $userId
            ]);

            // Update parent denial status
            $upd = $pdo->prepare("
                UPDATE billing_claim_denials
                SET status = 'appeal_submitted',
                    appeal_level = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");
            $upd->execute([$appealLevel, $denialId]);

            $pdo->commit();
            return $this->getDenialDetail($denialId);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Record Payer Adjudication Outcome for an Appeal (Overturned/Won vs. Upheld/Lost vs. Written Off)
     */
    public function recordAppealOutcome(int $appealId, array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $stmt = $pdo->prepare("SELECT * FROM billing_claim_appeals WHERE id = ?");
        $stmt->execute([$appealId]);
        $appeal = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$appeal) {
            throw new RuntimeException("Appeal #{$appealId} not found.");
        }

        $outcome = trim($data['outcome'] ?? 'overturned'); // 'overturned' | 'upheld' | 'written_off'
        $recoveredAmount = max(0.0, (float)($data['recovered_amount'] ?? 0.0));
        $writtenOffAmount = max(0.0, (float)($data['written_off_amount'] ?? 0.0));
        $respDate = !empty($data['payer_response_date']) ? $data['payer_response_date'] : date('Y-m-d');
        $notes = !empty($data['payer_response_notes']) ? trim($data['payer_response_notes']) : null;

        $pdo->beginTransaction();
        try {
            // Update appeal row
            $appealStatus = $outcome === 'overturned' ? 'overturned' : ($outcome === 'upheld' ? 'upheld' : 'withdrawn');
            $updApp = $pdo->prepare("
                UPDATE billing_claim_appeals
                SET status = ?,
                    payer_response_date = ?,
                    payer_response_notes = ?,
                    recovered_amount = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");
            $updApp->execute([$appealStatus, $respDate, $notes, $recoveredAmount, $appealId]);

            // Update parent denial row
            $parentStatus = $outcome === 'overturned' ? 'overturned_won' : ($outcome === 'written_off' ? 'written_off' : 'upheld_lost');
            $updDenial = $pdo->prepare("
                UPDATE billing_claim_denials
                SET status = ?,
                    recovered_amount = ?,
                    written_off_amount = ?,
                    resolution_notes = ?,
                    resolved_at = NOW(),
                    resolved_by = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");
            $updDenial->execute([$parentStatus, $recoveredAmount, $writtenOffAmount, $notes, $userId, (int)$appeal['denial_id']]);

            $pdo->commit();
            return $this->getDenialDetail((int)$appeal['denial_id']);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Get Denial Analytics & Executive Recovery Metrics
     */
    public function getDenialMetrics(): array
    {
        $pdo = Database::connection();

        $metricsStmt = $pdo->query("
            SELECT 
                COUNT(*) AS total_denials,
                COALESCE(SUM(denied_amount), 0) AS total_denied_amount,
                COALESCE(SUM(recovered_amount), 0) AS total_recovered_amount,
                COALESCE(SUM(written_off_amount), 0) AS total_written_off_amount,
                SUM(CASE WHEN status IN ('pending_review', 'appeal_in_progress') THEN 1 ELSE 0 END) AS active_denials_count,
                SUM(CASE WHEN status IN ('appeal_submitted', 'appeal_under_review') THEN 1 ELSE 0 END) AS appeals_in_progress_count,
                SUM(CASE WHEN status = 'overturned_won' THEN 1 ELSE 0 END) AS overturned_count,
                SUM(CASE WHEN status = 'upheld_lost' THEN 1 ELSE 0 END) AS upheld_count,
                SUM(CASE WHEN status = 'written_off' THEN 1 ELSE 0 END) AS written_off_count,
                SUM(CASE WHEN DATEDIFF(timely_filing_deadline, CURDATE()) <= 30 AND status IN ('pending_review', 'appeal_in_progress') THEN 1 ELSE 0 END) AS urgent_deadlines_count
            FROM billing_claim_denials
        ");
        $m = $metricsStmt->fetch(PDO::FETCH_ASSOC);

        $resolvedCount = (int)$m['overturned_count'] + (int)$m['upheld_count'] + (int)$m['written_off_count'];
        $overturnRate = $resolvedCount > 0 ? round(((int)$m['overturned_count'] / $resolvedCount) * 100, 1) : 0.0;

        // Breakdown by category
        $catStmt = $pdo->query("
            SELECT denial_category,
                   COUNT(*) AS count,
                   COALESCE(SUM(denied_amount), 0) AS total_denied,
                   COALESCE(SUM(recovered_amount), 0) AS total_recovered
            FROM billing_claim_denials
            GROUP BY denial_category
            ORDER BY total_denied DESC
        ");
        $byCategory = $catStmt->fetchAll(PDO::FETCH_ASSOC);

        // Breakdown by CARC code
        $carcStmt = $pdo->query("
            SELECT carc_code, carc_description,
                   COUNT(*) AS count,
                   COALESCE(SUM(denied_amount), 0) AS total_denied
            FROM billing_claim_denials
            GROUP BY carc_code, carc_description
            ORDER BY total_denied DESC
            LIMIT 6
        ");
        $byCarc = $carcStmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'total_denials' => (int)$m['total_denials'],
            'total_denied_amount' => (float)$m['total_denied_amount'],
            'total_recovered_amount' => (float)$m['total_recovered_amount'],
            'total_written_off_amount' => (float)$m['total_written_off_amount'],
            'active_denials_count' => (int)$m['active_denials_count'],
            'appeals_in_progress_count' => (int)$m['appeals_in_progress_count'],
            'overturned_count' => (int)$m['overturned_count'],
            'overturn_rate_pct' => $overturnRate,
            'urgent_deadlines_count' => (int)$m['urgent_deadlines_count'],
            'by_category' => $byCategory,
            'by_carc' => $byCarc
        ];
    }

    /**
     * Get CARC & RARC Standard Code Reference Dictionary
     */
    public function getCarcDictionary(): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->query("SELECT * FROM billing_carc_rarc_dictionary ORDER BY code ASC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Seeds realistic sample claim denials across Medical Necessity, Prior Auth, and Timely Filing
     */
    public function seedSampleDenials(?int $userId = null): array
    {
        $pdo = Database::connection();

        $check = $pdo->query("SELECT COUNT(*) FROM billing_claim_denials")->fetchColumn();
        if ((int)$check > 0) {
            return $this->listDenials();
        }

        // Fetch first 2 patients
        $patients = $pdo->query("SELECT id FROM patients LIMIT 3")->fetchAll(PDO::FETCH_COLUMN);
        $pat1 = (int)($patients[0] ?? 1);
        $pat2 = (int)($patients[1] ?? $pat1);

        $samples = [
            [
                'patient_id' => $pat1,
                'claim_number' => 'CLM-2026-99182',
                'payer_name' => 'Blue Cross Blue Shield of Texas',
                'payer_id' => 'BCBS-TX-001',
                'billed_amount' => 4850.00,
                'denied_amount' => 4850.00,
                'service_date' => date('Y-m-d', strtotime('-45 days')),
                'denial_date' => date('Y-m-d', strtotime('-15 days')),
                'remittance_eob_number' => 'EOB-8839120',
                'carc_code' => 'CO-197',
                'carc_description' => 'Precertification/authorization/notification/pre-treatment absent.',
                'rarc_code' => 'N257',
                'rarc_description' => 'Missing or incomplete/invalid pre-certification number.',
                'denial_category' => 'prior_auth_missing',
                'root_cause_analysis' => 'Emergency surgery proceeded after hours without verbal authorization confirmation code from payer on-call nurse.',
                'timely_filing_deadline' => date('Y-m-d', strtotime('+45 days'))
            ],
            [
                'patient_id' => $pat2,
                'claim_number' => 'CLM-2026-88421',
                'payer_name' => 'Aetna Healthcare Services',
                'payer_id' => 'AETNA-60054',
                'billed_amount' => 6200.00,
                'denied_amount' => 6200.00,
                'service_date' => date('Y-m-d', strtotime('-60 days')),
                'denial_date' => date('Y-m-d', strtotime('-20 days')),
                'remittance_eob_number' => 'EOB-7741299',
                'carc_code' => 'CO-50',
                'carc_description' => 'These are non-covered services because this is not deemed a medical necessity by the payer.',
                'rarc_code' => 'MA04',
                'rarc_description' => 'Secondary payment cannot be considered without primary payer adjudication.',
                'denial_category' => 'medical_necessity',
                'root_cause_analysis' => 'Payer claims conservative therapy for spinal decompression was not exhausted prior to laparoscopic surgical intervention.',
                'timely_filing_deadline' => date('Y-m-d', strtotime('+70 days'))
            ],
            [
                'patient_id' => $pat1,
                'claim_number' => 'CLM-2026-77319',
                'payer_name' => 'UnitedHealthcare Clinical Solutions',
                'payer_id' => 'UHC-87726',
                'billed_amount' => 1850.00,
                'denied_amount' => 1850.00,
                'service_date' => date('Y-m-d', strtotime('-110 days')),
                'denial_date' => date('Y-m-d', strtotime('-10 days')),
                'remittance_eob_number' => 'EOB-6629941',
                'carc_code' => 'CO-29',
                'carc_description' => 'The time limit for filing has expired.',
                'rarc_code' => 'M127',
                'rarc_description' => 'Missing patient signature on file.',
                'denial_category' => 'timely_filing',
                'root_cause_analysis' => 'Clearinghouse 999 rejected first attempt; biller resubmitted past 90-day window without attaching 277 EDI log.',
                'timely_filing_deadline' => date('Y-m-d', strtotime('+18 days')) // Urgent deadline
            ]
        ];

        foreach ($samples as $s) {
            $this->recordClaimDenial($s, $userId);
        }

        return $this->listDenials();
    }
}
