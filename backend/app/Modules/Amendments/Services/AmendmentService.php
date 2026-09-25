<?php

namespace App\Modules\Amendments\Services;

use App\Core\AuditLogger;
use App\Core\Database;
use App\Modules\Amendments\Models\Amendment;
use App\Modules\Patients\Models\Patient;
use PDO;

class AmendmentService
{
    /**
     * Detail fields that can be set on an amendment record, beyond the
     * patient link itself.
     */
    private const DETAIL_FIELDS = [
        'amendment_number', 'request_date', 'requester_type', 'requested_by',
        'requester_contact', 'target_record_type', 'target_record_id',
        'target_record_label', 'disputed_text', 'requested_amendment',
        'initial_deadline', 'is_extended', 'extended_deadline', 'extension_reason',
        'extension_rationale', 'extension_notice_date', 'requested_date',
        'description', 'status', 'review_decision_date', 'reviewed_by',
        'denial_statutory_ground', 'denial_rationale', 'denial_notice_date',
        'acceptance_notes', 'accepted_linked_at', 'statement_of_disagreement',
        'disagreement_received_at', 'statement_of_rebuttal', 'rebuttal_provided_at',
        'future_disclosure_dissemination_requested', 'comments'
    ];

    /**
     * The 4 permissible statutory grounds for denial under 45 CFR § 164.526(a)(2).
     */
    public const DENIAL_GROUNDS = [
        'not_created_by_entity' => [
            'citation' => '45 CFR § 164.526(a)(2)(i)',
            'title' => 'PHI Not Created by Covered Entity',
            'description' => 'The protected health information was not created by this covered entity, and the originator remains available to review the amendment request.'
        ],
        'not_part_of_drs' => [
            'citation' => '45 CFR § 164.526(a)(2)(ii)',
            'title' => 'PHI Not Part of Designated Record Set',
            'description' => 'The protected health information is not part of the patient\'s Designated Record Set (§ 164.501).'
        ],
        'exempt_from_access' => [
            'citation' => '45 CFR § 164.526(a)(2)(iii)',
            'title' => 'PHI Exempt from Inspection Under § 164.524',
            'description' => 'The record would not be available for patient inspection under 45 CFR § 164.524 (e.g. psychotherapy notes or information compiled in reasonable anticipation of legal action).'
        ],
        'accurate_and_complete' => [
            'citation' => '45 CFR § 164.526(a)(2)(iv)',
            'title' => 'PHI is Accurate and Complete',
            'description' => 'The covered entity has determined that the protected health information is accurate and complete as currently documented in the medical record.'
        ]
    ];

    /**
     * List a patient's recorded amendment requests with statutory fields and countdown.
     */
    public function list(int $patientId): array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT a.*,
                    CONCAT(e.first_name, ' ', e.last_name) AS provider_name,
                    p.patient_no, p.first_name, p.middle_name, p.last_name, p.birthdate, p.sex
             FROM amendments a
             JOIN patients p ON p.id = a.patient_id
             LEFT JOIN employees e ON e.user_id = a.created_by
             WHERE a.patient_id = :patient_id AND a.deleted_at IS NULL
             ORDER BY a.request_date DESC, a.id DESC"
        );

        $stmt->execute(['patient_id' => $patientId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $now = time();
        $processed = [];

        foreach ($rows as $row) {
            $processed[] = $this->enrichAmendmentRow($row, $now);
        }

        return $processed;
    }

    /**
     * Master administrative pipeline list with filtering and SLA countdown.
     */
    public function pipelineList(array $filters = []): array
    {
        $db = Database::connection();
        $sql = "
            SELECT a.*,
                   p.patient_no, p.first_name, p.middle_name, p.last_name, p.birthdate, p.sex,
                   u.username as reviewer_username,
                   CONCAT(e.first_name, ' ', e.last_name) AS creator_name
            FROM amendments a
            JOIN patients p ON p.id = a.patient_id
            LEFT JOIN users u ON u.id = a.reviewed_by
            LEFT JOIN employees e ON e.user_id = a.created_by
            WHERE a.deleted_at IS NULL
        ";
        $params = [];

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $sql .= " AND a.status = :status";
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['target_record_type'])) {
            $sql .= " AND a.target_record_type = :target_record_type";
            $params['target_record_type'] = $filters['target_record_type'];
        }

        if (!empty($filters['search'])) {
            $sql .= " AND (
                a.amendment_number LIKE :search 
                OR a.requested_by LIKE :search 
                OR a.disputed_text LIKE :search
                OR a.requested_amendment LIKE :search
                OR p.first_name LIKE :search 
                OR p.last_name LIKE :search 
                OR p.patient_no LIKE :search
            )";
            $params['search'] = '%' . trim($filters['search']) . '%';
        }

        if (!empty($filters['date_from'])) {
            $sql .= " AND a.request_date >= :date_from";
            $params['date_from'] = $filters['date_from'];
        }

        if (!empty($filters['date_to'])) {
            $sql .= " AND a.request_date <= :date_to";
            $params['date_to'] = $filters['date_to'];
        }

        $sql .= " ORDER BY a.id DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $now = time();
        $processed = [];

        foreach ($rows as $row) {
            $enriched = $this->enrichAmendmentRow($row, $now);

            // Optional urgency filter
            if (!empty($filters['urgency'])) {
                if ($filters['urgency'] === 'overdue' && !$enriched['is_overdue']) continue;
                if ($filters['urgency'] === 'impending' && !$enriched['is_impending']) continue;
                if ($filters['urgency'] === 'extended' && !$enriched['is_extended']) continue;
                if ($filters['urgency'] === 'disagreements' && empty($enriched['statement_of_disagreement'])) continue;
            }

            $processed[] = $enriched;
        }

        return $processed;
    }

    /**
     * Compute summary metrics for administrative dashboard.
     */
    public function stats(): array
    {
        $db = Database::connection();
        $stmt = $db->query("
            SELECT a.*
            FROM amendments a
            WHERE a.deleted_at IS NULL
        ");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $now = time();
        $total = count($rows);
        $activePipeline = 0;
        $impending = 0;
        $overdue = 0;
        $disagreements = 0;
        $accepted = 0;
        $denied = 0;
        $extended = 0;

        foreach ($rows as $r) {
            $isClosed = in_array($r['status'], ['accepted', 'denied', 'disagreement_filed', 'rebuttal_filed', 'cancelled'], true);
            $effectiveDeadline = $r['is_extended'] && !empty($r['extended_deadline']) ? $r['extended_deadline'] : $r['initial_deadline'];

            if (!empty($effectiveDeadline)) {
                $deadlineTime = strtotime($effectiveDeadline . ' 23:59:59');
                $daysRemaining = (int) ceil(($deadlineTime - $now) / 86400);

                if (!$isClosed && $daysRemaining < 0) {
                    $overdue++;
                } elseif (!$isClosed && $daysRemaining >= 0 && $daysRemaining <= 10) {
                    $impending++;
                }
            }

            if (!$isClosed) {
                $activePipeline++;
            }

            if (!empty($r['statement_of_disagreement'])) {
                $disagreements++;
            }

            if ($r['status'] === 'accepted') {
                $accepted++;
            } elseif ($r['status'] === 'denied' || $r['status'] === 'disagreement_filed' || $r['status'] === 'rebuttal_filed') {
                $denied++;
            }

            if ((int) $r['is_extended'] === 1) {
                $extended++;
            }
        }

        return [
            'total_requests' => $total,
            'active_pipeline' => $activePipeline,
            'impending_count' => $impending,
            'overdue_count' => $overdue,
            'disagreements_count' => $disagreements,
            'accepted_count' => $accepted,
            'denied_count' => $denied,
            'extended_count' => $extended
        ];
    }

    /**
     * Fetch a single amendment record with full details and countdown calculations.
     */
    public function get(int $id): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare("
            SELECT a.*,
                   p.patient_no, p.first_name, p.middle_name, p.last_name, p.birthdate, p.sex,
                   u.username as reviewer_username,
                   CONCAT(e.first_name, ' ', e.last_name) AS creator_name
            FROM amendments a
            JOIN patients p ON p.id = a.patient_id
            LEFT JOIN users u ON u.id = a.reviewed_by
            LEFT JOIN employees e ON e.user_id = a.created_by
            WHERE a.id = ? AND a.deleted_at IS NULL
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        return $this->enrichAmendmentRow($row, time());
    }

    /**
     * Helper to compute countdown and enrich amendment row.
     */
    private function enrichAmendmentRow(array $row, int $now): array
    {
        $effectiveDeadline = $row['is_extended'] && !empty($row['extended_deadline']) ? $row['extended_deadline'] : $row['initial_deadline'];
        
        $daysRemaining = 0;
        if (!empty($effectiveDeadline)) {
            $deadlineTime = strtotime($effectiveDeadline . ' 23:59:59');
            $daysRemaining = (int) ceil(($deadlineTime - $now) / 86400);
        }

        $isClosed = in_array($row['status'], ['accepted', 'denied', 'disagreement_filed', 'rebuttal_filed', 'cancelled'], true);
        $isOverdue = !$isClosed && $daysRemaining < 0;
        $isImpending = !$isClosed && $daysRemaining >= 0 && $daysRemaining <= 10;

        $urgency = 'normal';
        if ($isClosed) {
            $urgency = 'closed';
        } elseif ($isOverdue) {
            $urgency = 'overdue';
        } elseif ($isImpending) {
            $urgency = 'impending';
        }

        $middle = !empty($row['middle_name']) ? " {$row['middle_name']} " : ' ';
        $row['patient_name'] = trim(preg_replace('/\s+/', ' ', "{$row['first_name']}{$middle}{$row['last_name']}"));
        $row['effective_deadline'] = $effectiveDeadline;
        $row['days_remaining'] = $daysRemaining;
        $row['is_overdue'] = $isOverdue;
        $row['is_impending'] = $isImpending;
        $row['urgency'] = $urgency;

        // Ground metadata
        if (!empty($row['denial_statutory_ground']) && isset(self::DENIAL_GROUNDS[$row['denial_statutory_ground']])) {
            $row['ground_meta'] = self::DENIAL_GROUNDS[$row['denial_statutory_ground']];
        } else {
            $row['ground_meta'] = null;
        }

        return $row;
    }

    /**
     * Intake a formal Statutory PHI Amendment Request (§ 164.526).
     */
    public function storeStatutory(array $data, int $userId): array
    {
        $patientId = (int) ($data['patient_id'] ?? 0);
        $patient = (new Patient())->where('id', $patientId)->first();
        if (!$patient || $patient['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Valid patient is required.'];
        }

        $requesterName = trim((string) ($data['requester_name'] ?? ''));
        if ($requesterName === '') {
            $requesterName = trim("{$patient['first_name']} {$patient['last_name']}");
        }

        $disputedText = trim((string) ($data['disputed_text'] ?? ''));
        if ($disputedText === '') {
            return ['success' => false, 'message' => 'Disputed text or notation is required.'];
        }

        $requestedAmendment = trim((string) ($data['requested_amendment'] ?? ''));
        if ($requestedAmendment === '') {
            return ['success' => false, 'message' => 'Requested amendment or correction is required.'];
        }

        $requestDate = !empty($data['request_date']) ? $data['request_date'] : date('Y-m-d');
        // Initial 60-day statutory countdown per 45 CFR § 164.526(b)(2)(i)
        $initialDeadline = date('Y-m-d', strtotime($requestDate . ' + 60 days'));
        $amendmentNumber = $this->generateAmendmentNumber();

        $insertData = [
            'amendment_number' => $amendmentNumber,
            'patient_id' => $patientId,
            'request_date' => $requestDate,
            'requester_type' => $data['requester_type'] ?? 'patient',
            'requested_by' => $requesterName,
            'requester_contact' => trim((string) ($data['requester_contact'] ?? '')),
            'target_record_type' => $data['target_record_type'] ?? 'encounter_soap_note',
            'target_record_id' => !empty($data['target_record_id']) ? (int) $data['target_record_id'] : null,
            'target_record_label' => trim((string) ($data['target_record_label'] ?? '')),
            'disputed_text' => $disputedText,
            'requested_amendment' => $requestedAmendment,
            'description' => "Request to amend: " . substr($disputedText, 0, 100) . "...",
            'initial_deadline' => $initialDeadline,
            'is_extended' => 0,
            'status' => 'pending_review',
            'comments' => trim((string) ($data['comments'] ?? '')),
            'future_disclosure_dissemination_requested' => 1,
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $userId
        ];

        $db = Database::connection();
        $fields = array_keys($insertData);
        $placeholders = ':' . implode(', :', $fields);
        $sql = "INSERT INTO amendments (" . implode(', ', $fields) . ") VALUES ({$placeholders})";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($insertData);
        $id = (int) $db->lastInsertId();

        AuditLogger::log(
            AuditLogger::CATEGORY_AMENDMENTS,
            AuditLogger::ACTION_AMENDMENT_REQUESTED,
            "Recorded PHI Amendment Request {$amendmentNumber} for patient ID {$patientId} under 45 CFR § 164.526",
            $patientId,
            $userId
        );

        return [
            'success' => true,
            'message' => "PHI Amendment request {$amendmentNumber} recorded successfully. Statutory 60-day deadline: {$initialDeadline}.",
            'data' => $this->get($id)
        ];
    }

    /**
     * Grant a single 30-day statutory extension (§ 164.526(b)(2)(ii)).
     */
    public function grantExtension(int $id, array $data, int $userId): array
    {
        $record = $this->get($id);
        if (!$record) {
            throw new \InvalidArgumentException('Amendment record not found.');
        }

        if ((int) $record['is_extended'] === 1) {
            throw new \InvalidArgumentException('Under 45 CFR § 164.526(b)(2)(ii), only ONE 30-day extension is permitted per PHI amendment request.');
        }

        if (in_array($record['status'], ['accepted', 'denied', 'cancelled'], true)) {
            throw new \InvalidArgumentException("Cannot extend request with status '{$record['status']}'.");
        }

        if (empty($data['extension_reason'])) {
            throw new \InvalidArgumentException('A valid statutory extension reason is required.');
        }

        if (empty(trim((string) ($data['extension_rationale'] ?? '')))) {
            throw new \InvalidArgumentException('Detailed extension rationale narrative is required for statutory documentation.');
        }

        $baseDeadline = !empty($record['initial_deadline']) ? $record['initial_deadline'] : date('Y-m-d', strtotime('+60 days'));
        $extendedDeadline = date('Y-m-d', strtotime($baseDeadline . ' + 30 days'));
        $noticeDate = date('Y-m-d');

        $db = Database::connection();
        $stmt = $db->prepare("
            UPDATE amendments
            SET is_extended = 1,
                extended_deadline = :extended_deadline,
                extension_reason = :extension_reason,
                extension_rationale = :extension_rationale,
                extension_notice_date = :notice_date,
                status = 'extension_granted',
                updated_at = NOW(),
                updated_by = :user_id
            WHERE id = :id
        ");

        $stmt->execute([
            'extended_deadline' => $extendedDeadline,
            'extension_reason' => trim($data['extension_reason']),
            'extension_rationale' => trim($data['extension_rationale']),
            'notice_date' => $noticeDate,
            'user_id' => $userId,
            'id' => $id
        ]);

        AuditLogger::log(
            AuditLogger::CATEGORY_AMENDMENTS,
            AuditLogger::ACTION_AMENDMENT_EXTENSION_GRANTED,
            "Granted 30-day statutory extension for amendment {$record['amendment_number']}. New deadline: {$extendedDeadline}.",
            $record['patient_id'],
            $userId
        );

        return [
            'success' => true,
            'message' => "30-day extension granted under § 164.526(b)(2)(ii). New statutory deadline is {$extendedDeadline}.",
            'data' => $this->get($id)
        ];
    }

    /**
     * Compile statutory 30-day extension notice data (§ 164.526(b)(2)(ii)).
     */
    public function getExtensionNoticeData(int $id): array
    {
        $record = $this->get($id);
        if (!$record) {
            return ['success' => false, 'message' => 'Amendment record not found.'];
        }

        $reasonLabels = [
            'physician_consultation_unavailable' => 'Treating clinician/originating physician is temporarily unavailable for consultation',
            'offsite_records_retrieval' => 'Retrieval of historical documentation stored in off-site archival repository',
            'extensive_clinical_review' => 'Extensive clinical review required across multiple specialties or departmental records',
            'complex_legal_review' => 'Complex legal or personal representative documentation review'
        ];

        $reasonText = $reasonLabels[$record['extension_reason']] ?? $record['extension_reason'];

        $notice = [
            'facility_name' => 'USIntellix Healthcare System',
            'facility_address' => '100 Medical Center Parkway, Suite 500, Healthcare City, NY 10001',
            'privacy_office_phone' => '1-800-555-PRIVACY (Toll-Free)',
            'privacy_office_email' => 'compliance@usintellix-health.org',
            'privacy_officer_contact' => 'Chief Privacy Officer, 1-800-555-PRIVACY / compliance@usintellix-health.org',
            'notice_date' => $record['extension_notice_date'] ?: date('Y-m-d'),
            'patient_name' => $record['patient_name'],
            'patient_no' => $record['patient_no'],
            'amendment_number' => $record['amendment_number'],
            'request_date' => $record['request_date'],
            'initial_deadline' => $record['initial_deadline'],
            'extended_deadline' => $record['extended_deadline'] ?: date('Y-m-d', strtotime($record['initial_deadline'] . ' + 30 days')),
            'statutory_citation' => 'HIPAA Privacy Rule 45 CFR § 164.526(b)(2)(ii)',
            'extension_reason' => $reasonText,
            'extension_rationale' => $record['extension_rationale'],
            'rights_notice' => 'Under 45 CFR § 164.526(b)(2)(ii), a covered entity may extend the initial 60-day action deadline once for an additional 30 calendar days by providing written notice of the reasons for delay and the definitive completion date.'
        ];

        AuditLogger::log(
            AuditLogger::CATEGORY_AMENDMENTS,
            AuditLogger::ACTION_AMENDMENT_EXTENSION_NOTICE,
            "Generated formal § 164.526(b)(2)(ii) 30-day extension notice letter for amendment {$record['amendment_number']}",
            $record['patient_id']
        );

        return ['success' => true, 'data' => $notice];
    }

    /**
     * Accept an amendment request in whole or in part (§ 164.526(c)).
     */
    public function acceptAmendment(int $id, array $data, int $userId): array
    {
        $record = $this->get($id);
        if (!$record) {
            return ['success' => false, 'message' => 'Amendment record not found.'];
        }

        $acceptanceNotes = trim((string) ($data['acceptance_notes'] ?? ''));
        if ($acceptanceNotes === '') {
            return ['success' => false, 'message' => 'Acceptance documentation and third-party notification plan required (§ 164.526(c)).'];
        }

        $now = date('Y-m-d H:i:s');
        $today = date('Y-m-d');

        $db = Database::connection();
        $stmt = $db->prepare("
            UPDATE amendments
            SET status = 'accepted',
                review_decision_date = :decision_date,
                reviewed_by = :reviewed_by,
                acceptance_notes = :acceptance_notes,
                accepted_linked_at = :linked_at,
                updated_at = NOW(),
                updated_by = :user_id
            WHERE id = :id
        ");

        $stmt->execute([
            'decision_date' => $today,
            'reviewed_by' => $userId,
            'acceptance_notes' => $acceptanceNotes,
            'linked_at' => $now,
            'user_id' => $userId,
            'id' => $id
        ]);

        AuditLogger::log(
            AuditLogger::CATEGORY_AMENDMENTS,
            AuditLogger::ACTION_AMENDMENT_ACCEPTED,
            "Accepted PHI amendment {$record['amendment_number']} for patient ID {$record['patient_id']} under § 164.526(c)",
            $record['patient_id'],
            $userId
        );

        return [
            'success' => true,
            'message' => "Amendment {$record['amendment_number']} successfully accepted and linked to medical record.",
            'data' => $this->get($id)
        ];
    }

    /**
     * Deny an amendment request citing one of the 4 statutory grounds (§ 164.526(a)(2)).
     */
    public function denyAmendment(int $id, array $data, int $userId): array
    {
        $record = $this->get($id);
        if (!$record) {
            throw new \InvalidArgumentException('Amendment record not found.');
        }

        $ground = trim((string) ($data['denial_statutory_ground'] ?? ''));
        if (!isset(self::DENIAL_GROUNDS[$ground])) {
            throw new \InvalidArgumentException("Invalid statutory ground under 45 CFR § 164.526(a)(2): '{$ground}'. Permissible grounds are: not_created_by_entity, not_part_of_drs, exempt_from_access, or accurate_and_complete.");
        }

        $rationale = trim((string) ($data['denial_rationale'] ?? ''));
        if ($rationale === '') {
            throw new \InvalidArgumentException('Detailed statutory denial rationale narrative is required (§ 164.526(d)(1)).');
        }

        $today = date('Y-m-d');

        $db = Database::connection();
        $stmt = $db->prepare("
            UPDATE amendments
            SET status = 'denied',
                review_decision_date = :decision_date,
                reviewed_by = :reviewed_by,
                denial_statutory_ground = :ground,
                denial_rationale = :rationale,
                denial_notice_date = :notice_date,
                updated_at = NOW(),
                updated_by = :user_id
            WHERE id = :id
        ");

        $stmt->execute([
            'decision_date' => $today,
            'reviewed_by' => $userId,
            'ground' => $ground,
            'rationale' => $rationale,
            'notice_date' => $today,
            'user_id' => $userId,
            'id' => $id
        ]);

        AuditLogger::log(
            AuditLogger::CATEGORY_AMENDMENTS,
            AuditLogger::ACTION_AMENDMENT_DENIED,
            "Denied PHI amendment {$record['amendment_number']}. Ground: {$ground} ({$this->getGroundCitation($ground)}).",
            $record['patient_id'],
            $userId
        );

        return [
            'success' => true,
            'message' => "Amendment {$record['amendment_number']} recorded as denied under {$this->getGroundCitation($ground)}.",
            'data' => $this->get($id)
        ];
    }

    /**
     * Compile standardized formal written denial notice letter data (§ 164.526(d)(1)).
     */
    public function getDenialNoticeData(int $id): array
    {
        $record = $this->get($id);
        if (!$record) {
            return ['success' => false, 'message' => 'Amendment record not found.'];
        }

        if (empty($record['denial_statutory_ground'])) {
            return ['success' => false, 'message' => 'Amendment has not been denied with a statutory ground.'];
        }

        $groundMeta = self::DENIAL_GROUNDS[$record['denial_statutory_ground']] ?? [
            'citation' => '45 CFR § 164.526(a)(2)',
            'title' => 'Statutory Ground',
            'description' => 'Denial under HIPAA Privacy Rule'
        ];

        $notice = [
            'facility_name' => 'USIntellix Healthcare System',
            'facility_address' => '100 Medical Center Parkway, Suite 500, Healthcare City, NY 10001',
            'privacy_office_phone' => '1-800-555-PRIVACY (Toll-Free: 1-800-555-7748)',
            'privacy_office_email' => 'hipaa-privacy@usintellix-health.org',
            'privacy_officer_name' => 'Chief Privacy Officer / Compliance Director',
            'hhs_ocr_portal_url' => 'https://www.hhs.gov/hipaa/filing-a-complaint/index.html',
            'hhs_ocr_address' => 'U.S. Department of Health and Human Services, 200 Independence Avenue, S.W., Washington, D.C. 20201',
            'notice_date' => $record['denial_notice_date'] ?: date('Y-m-d'),
            'patient_name' => $record['patient_name'],
            'patient_no' => $record['patient_no'],
            'patient_birthdate' => $record['birthdate'],
            'amendment_number' => $record['amendment_number'],
            'request_date' => $record['request_date'],
            'target_record_label' => $record['target_record_label'] ?: $record['target_record_type'],
            'disputed_text' => $record['disputed_text'],
            'requested_amendment' => $record['requested_amendment'],
            'statutory_ground_key' => $record['denial_statutory_ground'],
            'statutory_ground_title' => $groundMeta['title'],
            'statutory_ground_citation' => $groundMeta['citation'],
            'statutory_ground_description' => $groundMeta['description'],
            'denial_rationale' => $record['denial_rationale'],
            'reviewer_username' => $record['reviewer_username'] ?? 'Clinical Compliance Team',
            'rights_section' => [
                'disagreement_right' => 'Under 45 CFR § 164.526(d)(2), you have the right to submit a written Statement of Disagreement stating the basis of your disagreement with this denial. If submitted, your Statement of Disagreement will be permanently linked to your record and included with any future disclosure of the disputed protected health information.',
                'dissemination_right' => 'Under 45 CFR § 164.526(d)(4), if you choose not to submit a Statement of Disagreement, you may request in writing that your original request for amendment and this denial notice be bundled with any subsequent disclosure of the disputed record.',
                'complaint_right' => 'Under 45 CFR § 164.526(d)(1)(iv) and 45 CFR § 164.530(d), you have the right to file a formal complaint with our HIPAA Privacy Office or directly with the Secretary of the U.S. Department of Health and Human Services (HHS Office for Civil Rights). USIntellix maintains a strict non-retaliation policy (§ 164.530(g)).'
            ]
        ];

        AuditLogger::log(
            AuditLogger::CATEGORY_AMENDMENTS,
            AuditLogger::ACTION_AMENDMENT_DENIAL_NOTICE,
            "Generated formal § 164.526(d)(1) written denial notice letter for amendment {$record['amendment_number']}",
            $record['patient_id']
        );

        return ['success' => true, 'data' => $notice];
    }

    /**
     * Record a patient's written Statement of Disagreement (§ 164.526(d)(2)).
     */
    public function fileStatementOfDisagreement(int $id, array $data, int $userId): array
    {
        $record = $this->get($id);
        if (!$record) {
            return ['success' => false, 'message' => 'Amendment record not found.'];
        }

        $statement = trim((string) ($data['statement_of_disagreement'] ?? ''));
        if ($statement === '') {
            return ['success' => false, 'message' => 'Statement of Disagreement text is required (§ 164.526(d)(2)).'];
        }

        $now = date('Y-m-d H:i:s');

        $db = Database::connection();
        $stmt = $db->prepare("
            UPDATE amendments
            SET statement_of_disagreement = :statement,
                disagreement_received_at = :received_at,
                status = 'disagreement_filed',
                future_disclosure_dissemination_requested = 1,
                updated_at = NOW(),
                updated_by = :user_id
            WHERE id = :id
        ");

        $stmt->execute([
            'statement' => $statement,
            'received_at' => $now,
            'user_id' => $userId,
            'id' => $id
        ]);

        AuditLogger::log(
            AuditLogger::CATEGORY_AMENDMENTS,
            AuditLogger::ACTION_AMENDMENT_DISAGREEMENT_FILED,
            "Filed patient Statement of Disagreement for amendment {$record['amendment_number']} (§ 164.526(d)(2)). Permanently linked to record.",
            $record['patient_id'],
            $userId
        );

        return [
            'success' => true,
            'message' => "Patient Statement of Disagreement recorded and permanently linked to disputed record per 45 CFR § 164.526(d).",
            'data' => $this->get($id)
        ];
    }

    /**
     * Record covered entity's written Statement of Rebuttal (§ 164.526(d)(3)).
     */
    public function fileStatementOfRebuttal(int $id, array $data, int $userId): array
    {
        $record = $this->get($id);
        if (!$record) {
            return ['success' => false, 'message' => 'Amendment record not found.'];
        }

        if (empty($record['statement_of_disagreement'])) {
            return ['success' => false, 'message' => 'A Statement of Disagreement must be on file before preparing a rebuttal (§ 164.526(d)(3)).'];
        }

        $rebuttal = trim((string) ($data['statement_of_rebuttal'] ?? ''));
        if ($rebuttal === '') {
            return ['success' => false, 'message' => 'Statement of Rebuttal text is required.'];
        }

        $now = date('Y-m-d H:i:s');

        $db = Database::connection();
        $stmt = $db->prepare("
            UPDATE amendments
            SET statement_of_rebuttal = :rebuttal,
                rebuttal_provided_at = :provided_at,
                status = 'rebuttal_filed',
                updated_at = NOW(),
                updated_by = :user_id
            WHERE id = :id
        ");

        $stmt->execute([
            'rebuttal' => $rebuttal,
            'provided_at' => $now,
            'user_id' => $userId,
            'id' => $id
        ]);

        AuditLogger::log(
            AuditLogger::CATEGORY_AMENDMENTS,
            AuditLogger::ACTION_AMENDMENT_REBUTTAL_FILED,
            "Prepared covered entity Statement of Rebuttal for amendment {$record['amendment_number']} (§ 164.526(d)(3)).",
            $record['patient_id'],
            $userId
        );

        return [
            'success' => true,
            'message' => "Covered entity Statement of Rebuttal recorded and linked per 45 CFR § 164.526(d)(3).",
            'data' => $this->get($id)
        ];
    }

    /**
     * Get all active linked statements of disagreement for a patient (used by DRS bundle and clinical printing).
     */
    public function getLinkedDisagreementsForPatient(int $patientId): array
    {
        $db = Database::connection();
        $stmt = $db->prepare("
            SELECT a.id, a.amendment_number, a.request_date, a.target_record_type,
                   a.target_record_id, a.target_record_label, a.disputed_text,
                   a.requested_amendment, a.status, a.denial_statutory_ground,
                   a.denial_rationale, a.statement_of_disagreement,
                   a.disagreement_received_at, a.statement_of_rebuttal,
                   a.rebuttal_provided_at, a.acceptance_notes
            FROM amendments a
            WHERE a.patient_id = ?
              AND a.deleted_at IS NULL
              AND (
                  a.statement_of_disagreement IS NOT NULL 
                  OR a.status = 'accepted'
              )
            ORDER BY a.request_date DESC
        ");
        $stmt->execute([$patientId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Export active PHI Amendments Pipeline Registry to RFC 4180 CSV for OCR audit review.
     */
    public function exportRegistryCsv(): string
    {
        $records = $this->pipelineList();

        $output = fopen('php://temp', 'r+');
        fputcsv($output, ['# USIntellix Healthcare System - HIPAA PHI Amendment Request Pipeline']);
        fputcsv($output, ['# Statutory Citation: HIPAA 45 CFR § 164.526 (Individual Right to Amend Protected Health Information)']);
        fputcsv($output, ['# Generated: ' . date('Y-m-d H:i:s') . ' UTC']);
        fputcsv($output, ['# Total Logged Requests: ' . count($records)]);
        fputcsv($output, []);
        fputcsv($output, [
            'Amendment Number', 'Patient No', 'Patient Name', 'Request Date', 'Requester Type',
            'Target Record Type', 'Target Record Label', 'Disputed Text', 'Requested Amendment',
            'Initial 60-Day Deadline', 'Extension Applied', 'Extended Deadline', 'Days Remaining',
            'Status', 'Denial Ground', 'Denial Notice Date', 'Statement of Disagreement Filed',
            'Rebuttal Filed', 'Dissemination Mandatory'
        ]);

        foreach ($records as $r) {
            fputcsv($output, [
                $r['amendment_number'] ?? 'N/A',
                $r['patient_no'],
                $r['patient_name'],
                $r['request_date'] ?? $r['requested_date'] ?? 'N/A',
                $r['requester_type'] ?? 'patient',
                $r['target_record_type'] ?? 'N/A',
                $r['target_record_label'] ?? 'N/A',
                $r['disputed_text'] ?? $r['description'] ?? '',
                $r['requested_amendment'] ?? '',
                $r['initial_deadline'] ?? 'N/A',
                $r['is_extended'] ? 'YES (+30 Days)' : 'NO',
                $r['extended_deadline'] ?? 'N/A',
                $r['days_remaining'],
                strtoupper($r['status']),
                $r['denial_statutory_ground'] ? ($r['denial_statutory_ground'] . ' (' . $this->getGroundCitation($r['denial_statutory_ground']) . ')') : 'None',
                $r['denial_notice_date'] ?? 'N/A',
                !empty($r['statement_of_disagreement']) ? 'YES' : 'NO',
                !empty($r['statement_of_rebuttal']) ? 'YES' : 'NO',
                $r['future_disclosure_dissemination_requested'] ? 'YES (§ 164.526(d)(4))' : 'NO'
            ]);
        }

        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);

        AuditLogger::log(
            AuditLogger::CATEGORY_AMENDMENTS,
            AuditLogger::ACTION_AMENDMENT_REGISTRY_EXPORT,
            "Exported PHI Amendment (45 CFR § 164.526) pipeline registry to CSV (" . count($records) . " records)"
        );

        return $csv;
    }

    /**
     * Backwards-compatible store method for legacy patient chart widget.
     */
    public function store(int $patientId, int $createdBy, array $details = []): array
    {
        $description = trim((string) ($details['description'] ?? $details['disputed_text'] ?? ''));

        if ($description === '') {
            return [
                'success' => false,
                'message' => 'Request description is required.'
            ];
        }

        $data = $this->filterDetails($details);
        $data['description'] = $description;
        $data['patient_id'] = $patientId;
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['created_by'] = $createdBy;

        // Auto-assign statutory fields if missing
        if (empty($data['amendment_number'])) {
            $data['amendment_number'] = $this->generateAmendmentNumber();
        }
        if (empty($data['request_date'])) {
            $data['request_date'] = !empty($data['requested_date']) ? substr($data['requested_date'], 0, 10) : date('Y-m-d');
        }
        if (empty($data['initial_deadline'])) {
            $data['initial_deadline'] = date('Y-m-d', strtotime($data['request_date'] . ' + 60 days'));
        }
        if (empty($data['disputed_text'])) {
            $data['disputed_text'] = $description;
        }
        if (empty($data['requested_amendment'])) {
            $data['requested_amendment'] = $data['comments'] ?? $description;
        }
        if (empty($data['status'])) {
            $data['status'] = 'pending_review';
        }

        $id = (new Amendment())->create($data);

        if (!$id) {
            return [
                'success' => false,
                'message' => 'Failed to record amendment request.'
            ];
        }

        AuditLogger::log(
            AuditLogger::CATEGORY_AMENDMENTS,
            AuditLogger::ACTION_AMENDMENT_REQUESTED,
            "Recorded amendment request {$data['amendment_number']} for patient ID {$patientId}",
            $patientId,
            $createdBy
        );

        return [
            'success' => true,
            'message' => 'Amendment request added successfully.',
            'data' => ['id' => $id, 'amendment_number' => $data['amendment_number']]
        ];
    }

    /**
     * Backwards-compatible update method.
     */
    public function update(int $id, array $details, int $updatedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Amendment record not found.'
            ];
        }

        $description = trim((string) ($details['description'] ?? $details['disputed_text'] ?? $record['description']));

        $data = $this->filterDetails($details);
        if ($description !== '') {
            $data['description'] = $description;
        }
        $data['updated_at'] = date('Y-m-d H:i:s');
        $data['updated_by'] = $updatedBy;

        (new Amendment())->update($data, $id);

        AuditLogger::log(
            AuditLogger::CATEGORY_AMENDMENTS,
            AuditLogger::ACTION_AMENDMENT_UPDATED,
            "Updated amendment request ID {$id}",
            $record['patient_id'],
            $updatedBy
        );

        return [
            'success' => true,
            'message' => 'Amendment request updated successfully.'
        ];
    }

    /**
     * Keep only recognized detail fields, converting empty strings to NULL.
     */
    private function filterDetails(array $details): array
    {
        $result = [];

        foreach (self::DETAIL_FIELDS as $field) {
            if ($field === 'description' || !array_key_exists($field, $details)) {
                continue;
            }

            $result[$field] = $details[$field] === '' ? null : $details[$field];
        }

        return $result;
    }

    public function find(int $id): ?array
    {
        return $this->get($id);
    }

    /**
     * Soft-delete a recorded amendment request.
     */
    public function remove(int $id, int $deletedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Amendment record not found.'
            ];
        }

        (new Amendment())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return [
            'success' => true,
            'message' => 'Amendment request removed successfully.'
        ];
    }

    /**
     * Generate sequential tracking number: AMD-YYYY-XXXX.
     */
    private function generateAmendmentNumber(): string
    {
        $year = date('Y');
        $db = Database::connection();
        $stmt = $db->query("SELECT MAX(id) as max_id FROM amendments");
        $maxId = (int) ($stmt->fetch(PDO::FETCH_ASSOC)['max_id'] ?? 0);

        return sprintf('AMD-%s-%04d', $year, $maxId + 1);
    }

    private function getGroundCitation(string $ground): string
    {
        return self::DENIAL_GROUNDS[$ground]['citation'] ?? '45 CFR § 164.526(a)(2)';
    }
}
