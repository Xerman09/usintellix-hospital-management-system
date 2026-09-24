<?php

namespace App\Modules\SecurityIncidents\Services;

use App\Core\AuditLogger;
use App\Core\Database;
use App\Modules\SecurityIncidents\Models\SecurityIncident;
use App\Modules\SecurityIncidents\Models\IncidentPatient;
use App\Modules\Patients\Models\Patient;
use PDO;

class SecurityIncidentService
{
    /**
     * List recorded security incidents with filtering and statutory metrics.
     */
    public function list(array $filters = []): array
    {
        $db = Database::connection();
        $where = ["i.deleted_at IS NULL"];
        $params = [];

        if (!empty($filters['status'])) {
            $where[] = "i.incident_status = :status";
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['breach_determination'])) {
            $where[] = "i.breach_determination = :breach_determination";
            $params['breach_determination'] = $filters['breach_determination'];
        }

        if (!empty($filters['incident_type'])) {
            $where[] = "i.incident_type = :incident_type";
            $params['incident_type'] = $filters['incident_type'];
        }

        if (!empty($filters['search'])) {
            $where[] = "(i.incident_number LIKE :search OR i.incident_title LIKE :search OR i.incident_description LIKE :search)";
            $params['search'] = '%' . $filters['search'] . '%';
        }

        if (!empty($filters['from'])) {
            $where[] = "i.discovery_date >= :from";
            $params['from'] = $filters['from'] . ' 00:00:00';
        }

        if (!empty($filters['to'])) {
            $where[] = "i.discovery_date <= :to";
            $params['to'] = $filters['to'] . ' 23:59:59';
        }

        $whereSql = implode(' AND ', $where);

        $sql = "SELECT i.*,
                       COUNT(ip.id) AS linked_patients_count,
                       DATEDIFF(CURRENT_DATE, DATE(i.discovery_date)) AS days_since_discovery,
                       DATEDIFF(i.individual_notification_deadline, CURRENT_DATE) AS days_until_individual_deadline,
                       u.username AS creator_name
                FROM hipaa_security_incidents i
                LEFT JOIN hipaa_incident_patients ip ON ip.incident_id = i.id
                LEFT JOIN users u ON u.id = i.created_by
                WHERE {$whereSql}
                GROUP BY i.id
                ORDER BY i.discovery_date DESC, i.id DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Decorate with countdown status indicators
        foreach ($records as &$r) {
            $r['days_until_individual_deadline'] = (int) ($r['days_until_individual_deadline'] ?? 0);
            $r['days_since_discovery'] = (int) ($r['days_since_discovery'] ?? 0);
            $r['affected_individuals_count'] = (int) ($r['affected_individuals_count'] ?? 1);
            $r['linked_patients_count'] = (int) ($r['linked_patients_count'] ?? 0);

            if ($r['individual_notification_status'] === 'completed' || $r['individual_notification_status'] === 'not_required') {
                $r['countdown_status'] = 'settled';
            } elseif ($r['days_until_individual_deadline'] < 0) {
                $r['countdown_status'] = 'overdue';
            } elseif ($r['days_until_individual_deadline'] <= 15) {
                $r['countdown_status'] = 'warning';
            } else {
                $r['countdown_status'] = 'normal';
            }
        }

        return $records;
    }

    /**
     * Compute executive statistics for the Security Incident & Breach console.
     */
    public function stats(): array
    {
        $db = Database::connection();

        $totalSql = "SELECT COUNT(*) FROM hipaa_security_incidents WHERE deleted_at IS NULL";
        $total = (int) $db->query($totalSql)->fetchColumn();

        $activeSql = "SELECT COUNT(*) FROM hipaa_security_incidents 
                      WHERE deleted_at IS NULL AND incident_status IN ('reported', 'under_assessment', 'remediation_in_progress')";
        $active = (int) $db->query($activeSql)->fetchColumn();

        $breachSql = "SELECT COUNT(*) FROM hipaa_security_incidents 
                      WHERE deleted_at IS NULL AND breach_determination IN ('reportable_breach_patient_only', 'reportable_breach_ocr_annual', 'reportable_breach_ocr_immediate')";
        $reportableBreaches = (int) $db->query($breachSql)->fetchColumn();

        $majorBreachesSql = "SELECT COUNT(*) FROM hipaa_security_incidents 
                             WHERE deleted_at IS NULL AND affected_individuals_count >= 500";
        $majorBreaches = (int) $db->query($majorBreachesSql)->fetchColumn();

        $overdueSql = "SELECT COUNT(*) FROM hipaa_security_incidents 
                       WHERE deleted_at IS NULL 
                         AND individual_notification_status NOT IN ('completed', 'not_required')
                         AND individual_notification_deadline < CURRENT_DATE";
        $overdueCount = (int) $db->query($overdueSql)->fetchColumn();

        $impendingSql = "SELECT COUNT(*) FROM hipaa_security_incidents 
                         WHERE deleted_at IS NULL 
                           AND individual_notification_status NOT IN ('completed', 'not_required')
                           AND individual_notification_deadline >= CURRENT_DATE 
                           AND individual_notification_deadline <= DATE_ADD(CURRENT_DATE, INTERVAL 15 DAY)";
        $impendingCount = (int) $db->query($impendingSql)->fetchColumn();

        $totalIndividualsSql = "SELECT COALESCE(SUM(affected_individuals_count), 0) FROM hipaa_security_incidents WHERE deleted_at IS NULL";
        $totalIndividuals = (int) $db->query($totalIndividualsSql)->fetchColumn();

        return [
            'total_incidents'              => $total,
            'active_investigations'        => $active,
            'reportable_breaches'          => $reportableBreaches,
            'major_breaches_500_plus'      => $majorBreaches,
            'overdue_notifications'        => $overdueCount,
            'impending_notifications_15d'  => $impendingCount,
            'total_affected_individuals'   => $totalIndividuals
        ];
    }

    /**
     * Find single incident with 4-factor risk assessment and linked patients.
     */
    public function find(int $id): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT i.*,
                    DATEDIFF(CURRENT_DATE, DATE(i.discovery_date)) AS days_since_discovery,
                    DATEDIFF(i.individual_notification_deadline, CURRENT_DATE) AS days_until_individual_deadline,
                    u.username AS creator_name
             FROM hipaa_security_incidents i
             LEFT JOIN users u ON u.id = i.created_by
             WHERE i.id = :id AND i.deleted_at IS NULL"
        );
        $stmt->execute(['id' => $id]);
        $incident = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$incident) {
            return null;
        }

        // Fetch linked patients
        $patStmt = $db->prepare(
            "SELECT ip.*,
                    p.patient_no, p.first_name, p.last_name, p.birthdate, p.sex
             FROM hipaa_incident_patients ip
             JOIN patients p ON p.id = ip.patient_id
             WHERE ip.incident_id = :incident_id
             ORDER BY p.last_name ASC, p.first_name ASC"
        );
        $patStmt->execute(['incident_id' => $id]);
        $incident['linked_patients'] = $patStmt->fetchAll(PDO::FETCH_ASSOC);

        return $incident;
    }

    /**
     * Create a new security incident report.
     */
    public function create(array $data, array $currentUser): array
    {
        $title = trim((string) ($data['incident_title'] ?? ''));
        $discoveryDate = trim((string) ($data['discovery_date'] ?? ''));
        $incidentDate = trim((string) ($data['incident_date'] ?? ''));
        $description = trim((string) ($data['incident_description'] ?? ''));

        if ($title === '') {
            return ['success' => false, 'message' => 'Incident title is required.'];
        }

        if ($discoveryDate === '') {
            return ['success' => false, 'message' => 'Discovery date is required (starts the statutory 60-day notification clock under § 164.404).'];
        }

        if ($incidentDate === '') {
            $incidentDate = $discoveryDate;
        }

        if ($description === '') {
            return ['success' => false, 'message' => 'Incident description narrative is required.'];
        }

        $affectedCount = max(1, (int) ($data['affected_individuals_count'] ?? 1));
        $incidentType = $data['incident_type'] ?? 'unauthorized_access_snooping';
        $location = $data['location_of_breach'] ?? 'EHR Application';
        $phiTypes = is_array($data['phi_types_involved'] ?? null)
            ? implode(', ', $data['phi_types_involved'])
            : trim((string) ($data['phi_types_involved'] ?? ''));

        // Generate sequential incident number: INC-YYYY-XXXX
        $incidentNumber = $this->generateIncidentNumber($discoveryDate);

        // Statutory Deadlines:
        // Individual Notification: Discovery date + 60 calendar days (45 CFR § 164.404(b))
        $individualDeadline = date('Y-m-d', strtotime($discoveryDate . ' +60 days'));

        // HHS OCR Notification (45 CFR § 164.408):
        // If >= 500 individuals: Discovery date + 60 days
        // If < 500 individuals: Last day of February of following calendar year
        if ($affectedCount >= 500) {
            $ocrDeadline = $individualDeadline;
            $mediaRequired = 1;
        } else {
            $discoveryYear = (int) date('Y', strtotime($discoveryDate));
            $ocrDeadline = date('Y-m-d', strtotime(($discoveryYear + 1) . '-02-28'));
            $mediaRequired = 0;
        }

        $recordData = [
            'incident_number'                  => $incidentNumber,
            'incident_title'                   => $title,
            'incident_date'                    => $incidentDate,
            'discovery_date'                   => $discoveryDate,
            'incident_type'                    => $incidentType,
            'location_of_breach'               => $location,
            'affected_individuals_count'       => $affectedCount,
            'phi_types_involved'               => $phiTypes ?: 'Demographics, Clinical Records',
            'incident_description'             => $description,
            'individual_notification_deadline' => $individualDeadline,
            'individual_notification_status'   => 'pending',
            'ocr_notification_deadline'        => $ocrDeadline,
            'ocr_notification_status'          => 'pending',
            'media_notification_required'      => $mediaRequired,
            'incident_status'                  => 'reported',
            'created_by'                       => $currentUser['id'] ?? null,
            'created_at'                       => date('Y-m-d H:i:s')
        ];

        $id = (new SecurityIncident())->create($recordData);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to record security incident.'];
        }

        // Link patients if provided
        if (!empty($data['patient_ids']) && is_array($data['patient_ids'])) {
            foreach ($data['patient_ids'] as $pid) {
                $this->linkPatient((int) $id, (int) $pid);
            }
        }

        // Chained HMAC Audit Logging
        AuditLogger::log(
            AuditLogger::CATEGORY_INCIDENT,
            AuditLogger::ACTION_INCIDENT_RECORDED,
            "Recorded HIPAA security incident #{$incidentNumber} ('{$title}'). Affected count: {$affectedCount}. Statutory 60-day notification deadline: {$individualDeadline}.",
            null,
            (int) ($currentUser['id'] ?? 1),
            $currentUser['role'] ?? 'admin'
        );

        return [
            'success' => true,
            'message' => "Security Incident #{$incidentNumber} recorded successfully. Statutory 60-day notification deadline set to {$individualDeadline}.",
            'data'    => ['id' => $id, 'incident_number' => $incidentNumber]
        ];
    }

    /**
     * Update security incident details.
     */
    public function update(int $id, array $data, array $currentUser): array
    {
        $incident = $this->find($id);
        if (!$incident) {
            return ['success' => false, 'message' => 'Incident record not found.'];
        }

        $fields = [
            'incident_title', 'incident_type', 'location_of_breach',
            'affected_individuals_count', 'phi_types_involved', 'incident_description',
            'incident_status', 'corrective_actions', 'resolution_notes',
            'individual_notification_status', 'individual_notified_date', 'individual_notification_method',
            'ocr_notification_status', 'ocr_submitted_date', 'ocr_confirmation_number',
            'media_notification_required', 'media_notification_status', 'media_notified_date', 'media_outlet_name'
        ];

        $updateData = [];
        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                $updateData[$field] = $data[$field];
            }
        }

        // Check if discovery date changed
        if (!empty($data['discovery_date']) && $data['discovery_date'] !== $incident['discovery_date']) {
            $discoveryDate = $data['discovery_date'];
            $updateData['discovery_date'] = $discoveryDate;
            $updateData['individual_notification_deadline'] = date('Y-m-d', strtotime($discoveryDate . ' +60 days'));
        }

        // Check affected count change for OCR deadline
        if (isset($updateData['affected_individuals_count'])) {
            $count = (int) $updateData['affected_individuals_count'];
            $discovery = $updateData['discovery_date'] ?? $incident['discovery_date'];
            if ($count >= 500) {
                $updateData['ocr_notification_deadline'] = date('Y-m-d', strtotime($discovery . ' +60 days'));
                $updateData['media_notification_required'] = 1;
            } else {
                $discoveryYear = (int) date('Y', strtotime($discovery));
                $updateData['ocr_notification_deadline'] = date('Y-m-d', strtotime(($discoveryYear + 1) . '-02-28'));
            }
        }

        if (isset($updateData['incident_status']) && $updateData['incident_status'] === 'closed') {
            $updateData['closed_at'] = date('Y-m-d H:i:s');
        }

        $updateData['updated_by'] = $currentUser['id'] ?? null;
        $updateData['updated_at'] = date('Y-m-d H:i:s');

        (new SecurityIncident())->update($updateData, $id);

        AuditLogger::log(
            AuditLogger::CATEGORY_INCIDENT,
            AuditLogger::ACTION_INCIDENT_UPDATED,
            "Updated HIPAA security incident #{$incident['incident_number']}.",
            null,
            (int) ($currentUser['id'] ?? 1),
            $currentUser['role'] ?? 'admin'
        );

        return [
            'success' => true,
            'message' => "Security Incident #{$incident['incident_number']} updated successfully."
        ];
    }

    /**
     * Submit formal 4-Factor Risk Assessment (45 CFR § 164.402).
     */
    public function submitRiskAssessment(int $id, array $data, array $currentUser): array
    {
        $incident = $this->find($id);
        if (!$incident) {
            return ['success' => false, 'message' => 'Incident record not found.'];
        }

        $f1 = max(1, min(5, (int) ($data['factor1_phi_nature_score'] ?? 3)));
        $f2 = max(1, min(5, (int) ($data['factor2_recipient_score'] ?? 3)));
        $f3 = max(1, min(5, (int) ($data['factor3_viewed_acquired_score'] ?? 3)));
        $f4 = max(1, min(5, (int) ($data['factor4_mitigation_score'] ?? 3)));

        // Composite risk score: simple average on 1.0 - 5.0 scale
        $compositeScore = round(($f1 + $f2 + $f3 + $f4) / 4.0, 1);

        // Determine recommended breach finding
        $determination = $data['breach_determination'] ?? null;
        if (!$determination || $determination === 'under_investigation') {
            if ($compositeScore <= 2.0) {
                $determination = 'not_a_breach_low_risk';
            } elseif ((int) $incident['affected_individuals_count'] >= 500) {
                $determination = 'reportable_breach_ocr_immediate';
            } else {
                $determination = 'reportable_breach_ocr_annual';
            }
        }

        $assessmentUpdate = [
            'assessment_conducted'          => 1,
            'assessment_date'               => date('Y-m-d H:i:s'),
            'factor1_phi_nature_score'      => $f1,
            'factor1_rationale'             => trim((string) ($data['factor1_rationale'] ?? '')),
            'factor2_recipient_score'       => $f2,
            'factor2_rationale'             => trim((string) ($data['factor2_recipient_score'] ?? '')),
            'factor3_viewed_acquired_score' => $f3,
            'factor3_rationale'             => trim((string) ($data['factor3_rationale'] ?? '')),
            'factor4_mitigation_score'      => $f4,
            'factor4_rationale'             => trim((string) ($data['factor4_rationale'] ?? '')),
            'composite_risk_score'          => $compositeScore,
            'breach_determination'          => $determination,
            'determination_rationale'       => trim((string) ($data['determination_rationale'] ?? '')),
            'determination_date'            => date('Y-m-d'),
            'investigating_officer_id'      => $currentUser['id'] ?? null,
            'investigating_officer_name'    => trim((string) ($data['investigating_officer_name'] ?? ($currentUser['name'] ?? 'HIPAA Privacy/Security Officer'))),
            'incident_status'               => ($determination === 'not_a_breach_low_risk') ? 'remediation_in_progress' : 'under_assessment',
            'updated_by'                    => $currentUser['id'] ?? null,
            'updated_at'                    => date('Y-m-d H:i:s')
        ];

        // If determination is not a breach, individual notification not required
        if ($determination === 'not_a_breach_low_risk') {
            $assessmentUpdate['individual_notification_status'] = 'not_required';
            $assessmentUpdate['ocr_notification_status'] = 'not_required';
        }

        (new SecurityIncident())->update($assessmentUpdate, $id);

        AuditLogger::log(
            AuditLogger::CATEGORY_INCIDENT,
            AuditLogger::ACTION_BREACH_ASSESSED,
            "Completed statutory 4-Factor Risk Assessment for incident #{$incident['incident_number']}. Composite score: {$compositeScore}/5.0. Determination: {$determination}.",
            null,
            (int) ($currentUser['id'] ?? 1),
            $currentUser['role'] ?? 'admin'
        );

        return [
            'success' => true,
            'message' => "4-Factor Risk Assessment recorded. Composite risk score: {$compositeScore}/5.0 ({$determination}).",
            'data'    => [
                'composite_risk_score' => $compositeScore,
                'breach_determination' => $determination
            ]
        ];
    }

    /**
     * Link an affected patient to the security incident.
     */
    public function linkPatient(int $incidentId, int $patientId, array $details = []): array
    {
        $db = Database::connection();

        // Check if already linked
        $checkStmt = $db->prepare("SELECT id FROM hipaa_incident_patients WHERE incident_id = :inc_id AND patient_id = :pat_id");
        $checkStmt->execute(['inc_id' => $incidentId, 'pat_id' => $patientId]);
        if ($checkStmt->fetch()) {
            return ['success' => true, 'message' => 'Patient already linked to incident.'];
        }

        $linkId = (new IncidentPatient())->create([
            'incident_id'         => $incidentId,
            'patient_id'          => $patientId,
            'notification_status' => $details['notification_status'] ?? 'pending',
            'notification_method' => $details['notification_method'] ?? 'first_class_mail',
            'notes'               => $details['notes'] ?? null,
            'created_at'          => date('Y-m-d H:i:s')
        ]);

        // Synchronize count on incident
        $cntStmt = $db->prepare("SELECT COUNT(*) FROM hipaa_incident_patients WHERE incident_id = :inc_id");
        $cntStmt->execute(['inc_id' => $incidentId]);
        $count = (int) $cntStmt->fetchColumn();

        $db->prepare("UPDATE hipaa_security_incidents SET affected_individuals_count = GREATEST(affected_individuals_count, :cnt) WHERE id = :inc_id")
           ->execute(['cnt' => $count, 'inc_id' => $incidentId]);

        return ['success' => true, 'message' => 'Patient linked successfully.', 'data' => ['id' => $linkId]];
    }

    /**
     * Remove a linked patient from the incident.
     */
    public function removePatient(int $incidentId, int $patientId): array
    {
        $db = Database::connection();
        $stmt = $db->prepare("DELETE FROM hipaa_incident_patients WHERE incident_id = :inc_id AND patient_id = :pat_id");
        $stmt->execute(['inc_id' => $incidentId, 'pat_id' => $patientId]);

        return ['success' => true, 'message' => 'Patient unlinked from incident.'];
    }

    /**
     * Update an individual patient's notification status.
     */
    public function updatePatientNotification(int $incidentId, int $patientId, array $data, array $currentUser): array
    {
        $db = Database::connection();
        $status = $data['notification_status'] ?? 'sent';
        $method = $data['notification_method'] ?? 'first_class_mail';
        $tracking = $data['tracking_number'] ?? null;
        $notes = $data['notes'] ?? null;
        $notifiedAt = $data['notified_at'] ?? date('Y-m-d H:i:s');

        $stmt = $db->prepare(
            "UPDATE hipaa_incident_patients 
             SET notification_status = :status,
                 notification_method = :method,
                 tracking_number = :tracking,
                 notes = :notes,
                 notified_at = :notified_at,
                 updated_at = NOW()
             WHERE incident_id = :inc_id AND patient_id = :pat_id"
        );
        $stmt->execute([
            'status'      => $status,
            'method'      => $method,
            'tracking'    => $tracking,
            'notes'       => $notes,
            'notified_at' => $notifiedAt,
            'inc_id'      => $incidentId,
            'pat_id'      => $patientId
        ]);

        // Check if all patients have now been notified
        $pendingStmt = $db->prepare("SELECT COUNT(*) FROM hipaa_incident_patients WHERE incident_id = :inc_id AND notification_status = 'pending'");
        $pendingStmt->execute(['inc_id' => $incidentId]);
        $pendingCount = (int) $pendingStmt->fetchColumn();

        if ($pendingCount === 0) {
            $db->prepare("UPDATE hipaa_security_incidents SET individual_notification_status = 'completed', individual_notified_date = CURRENT_DATE WHERE id = :id")
               ->execute(['id' => $incidentId]);
        }

        AuditLogger::log(
            AuditLogger::CATEGORY_INCIDENT,
            AuditLogger::ACTION_INDIVIDUAL_NOTIFIED,
            "Recorded breach notification dispatch for patient #{$patientId} on incident #{$incidentId} ({$status} via {$method}).",
            $patientId,
            (int) ($currentUser['id'] ?? 1),
            $currentUser['role'] ?? 'admin'
        );

        return ['success' => true, 'message' => 'Patient notification status updated.'];
    }

    /**
     * Generate formal Patient Breach Notification Letter (45 CFR § 164.404(c)).
     */
    public function getBreachLetterData(int $incidentId, int $patientId, array $currentUser): array
    {
        $incident = $this->find($incidentId);
        if (!$incident) {
            return ['success' => false, 'message' => 'Incident not found.'];
        }

        $patient = (new Patient())->where('id', $patientId)->first();
        if (!$patient) {
            return ['success' => false, 'message' => 'Patient not found.'];
        }

        // Fulfills mandatory statutory contents under 45 CFR § 164.404(c):
        $letterData = [
            'facility_name'         => 'USIntellix Hospital & Health Systems',
            'facility_address'      => '1000 Healthcare Plaza, Suite 400, Medical City, USA',
            'notice_date'           => date('F j, Y'),
            'patient_name'          => $patient['first_name'] . ' ' . $patient['last_name'],
            'patient_no'            => $patient['patient_no'],
            'incident_number'       => $incident['incident_number'],
            'incident_title'        => $incident['incident_title'],
            'incident_date'         => date('F j, Y', strtotime($incident['incident_date'])),
            'discovery_date'        => date('F j, Y', strtotime($incident['discovery_date'])),
            'phi_types_involved'    => $incident['phi_types_involved'],
            'what_happened'         => $incident['incident_description'],
            'what_we_are_doing'     => $incident['corrective_actions'] ?: 'Our information security and compliance team immediately contained the incident, isolated affected credentials, applied technical safeguards, and engaged external forensics to verify data integrity.',
            'what_you_can_do'       => 'We recommend monitoring your credit reports, reviewing your health insurance explanation of benefits (EOB) statements for suspicious billing, and placing a fraud alert on credit files if financial information was involved.',
            'contact_phone'         => '1-800-555-HIPAA (1-800-555-4472)',
            'contact_email'         => 'privacy-officer@usintellix-health.org',
            'contact_officer'       => $incident['investigating_officer_name'] ?: 'HIPAA Privacy & Security Officer',
            'statutory_citation'    => 'Notice required pursuant to Section 13402 of the HITECH Act and 45 CFR § 164.404'
        ];

        AuditLogger::log(
            AuditLogger::CATEGORY_INCIDENT,
            AuditLogger::ACTION_BREACH_LETTER,
            "Generated formal HIPAA § 164.404 Breach Notification Letter for patient #{$patientId} ({$patient['first_name']} {$patient['last_name']}) on incident #{$incident['incident_number']}.",
            $patientId,
            (int) ($currentUser['id'] ?? 1),
            $currentUser['role'] ?? 'admin'
        );

        return [
            'success' => true,
            'data'    => $letterData
        ];
    }

    /**
     * Generate complete HHS OCR Breach Portal filing data package (45 CFR § 164.408).
     */
    public function getOcrExportData(int $incidentId, array $currentUser): array
    {
        $incident = $this->find($incidentId);
        if (!$incident) {
            return ['success' => false, 'message' => 'Incident not found.'];
        }

        $ocrPackage = [
            'covered_entity_name'       => 'USIntellix Hospital Management System',
            'covered_entity_type'       => 'Healthcare Provider (Hospital / Clinic)',
            'incident_number'           => $incident['incident_number'],
            'incident_title'            => $incident['incident_title'],
            'incident_start_date'       => $incident['incident_date'],
            'date_discovered'           => $incident['discovery_date'],
            'type_of_breach'            => $this->mapIncidentTypeToOcrCategory($incident['incident_type']),
            'location_of_breached_info' => $incident['location_of_breach'],
            'approximate_individuals'   => (int) $incident['affected_individuals_count'],
            'type_of_phi_involved'      => $incident['phi_types_involved'],
            'brief_description'         => $incident['incident_description'],
            'statutory_4_factor_eval'   => [
                'factor1_score'         => $incident['factor1_phi_nature_score'],
                'factor1_rationale'     => $incident['factor1_rationale'],
                'factor2_score'         => $incident['factor2_recipient_score'],
                'factor2_rationale'     => $incident['factor2_rationale'],
                'factor3_score'         => $incident['factor3_viewed_acquired_score'],
                'factor3_rationale'     => $incident['factor3_rationale'],
                'factor4_score'         => $incident['factor4_mitigation_score'],
                'factor4_rationale'     => $incident['factor4_rationale'],
                'composite_risk_score'  => $incident['composite_risk_score'],
                'breach_determination'  => $incident['breach_determination'],
                'determination_notes'   => $incident['determination_rationale']
            ],
            'safeguards_in_place_prior' => 'Role-Based Access Control, NIST SP 800-38D AES-256-GCM Field-Level Encryption, Sequential SHA-256 HMAC Audit Logging, 15-Minute Automatic Logoff, 2FA OTP Authentication',
            'actions_taken'             => $incident['corrective_actions'] ?: 'Immediate credential revocation, password rotation, audit log forensic examination, patient notification pursuant to 45 CFR § 164.404.',
            'individual_notice_status'  => $incident['individual_notification_status'],
            'individual_notice_date'    => $incident['individual_notified_date'],
            'media_notice_required'     => (bool) $incident['media_notification_required'],
            'investigating_officer'     => $incident['investigating_officer_name'],
            'generation_timestamp'      => date('Y-m-d H:i:s')
        ];

        AuditLogger::log(
            AuditLogger::CATEGORY_INCIDENT,
            AuditLogger::ACTION_OCR_EXPORT,
            "Generated HHS OCR Breach Portal Export package for incident #{$incident['incident_number']}.",
            null,
            (int) ($currentUser['id'] ?? 1),
            $currentUser['role'] ?? 'admin'
        );

        return [
            'success' => true,
            'data'    => $ocrPackage
        ];
    }

    /**
     * Export all security incidents as an RFC 4180 CSV for compliance auditors.
     */
    public function exportCsv(array $filters, array $currentUser): void
    {
        $incidents = $this->list($filters);
        $now = date('Ymd_His');
        $filename = "hipaa_security_incidents_breach_log_{$now}.csv";

        header('Content-Type: text/csv; charset=utf-8');
        header("Content-Disposition: attachment; filename=\"{$filename}\"");
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');

        $output = fopen('php://output', 'w');

        fputcsv($output, ['# USIntellix Hospital Management System - HIPAA Security Incidents & Breach Assessment Log']);
        fputcsv($output, ['# Regulatory Framework: 45 CFR §§ 164.400 - 164.414 & 45 CFR § 164.308(a)(6)']);
        fputcsv($output, ['# Generated: ' . date('Y-m-d H:i:s') . ' by ' . ($currentUser['email'] ?? 'Administrator')]);
        fputcsv($output, ['# Total Records: ' . count($incidents)]);
        fputcsv($output, []);

        fputcsv($output, [
            'Incident Number',
            'Incident Title',
            'Incident Date',
            'Discovery Date',
            'Incident Type',
            'Location of Breach',
            'Individuals Affected',
            'PHI Types Involved',
            'Composite Risk Score (1-5)',
            'Breach Determination',
            'Individual Notice Deadline',
            'Individual Notice Status',
            'OCR Notice Deadline',
            'OCR Notice Status',
            'Incident Status',
            'Investigating Officer',
            'Created At'
        ]);

        foreach ($incidents as $inc) {
            fputcsv($output, [
                $inc['incident_number'],
                $inc['incident_title'],
                $inc['incident_date'],
                $inc['discovery_date'],
                $inc['incident_type'],
                $inc['location_of_breach'],
                $inc['affected_individuals_count'],
                $inc['phi_types_involved'],
                $inc['composite_risk_score'] ?? 'Not Assessed',
                $inc['breach_determination'],
                $inc['individual_notification_deadline'],
                $inc['individual_notification_status'],
                $inc['ocr_notification_deadline'],
                $inc['ocr_notification_status'],
                $inc['incident_status'],
                $inc['investigating_officer_name'],
                $inc['created_at']
            ]);
        }

        fclose($output);

        AuditLogger::log(
            AuditLogger::CATEGORY_INCIDENT,
            AuditLogger::ACTION_INCIDENT_CSV,
            "Exported HIPAA Security Incidents CSV (" . count($incidents) . " records).",
            null,
            (int) ($currentUser['id'] ?? 1),
            $currentUser['role'] ?? 'admin'
        );
    }

    /**
     * Soft delete an incident record.
     */
    public function delete(int $id, array $currentUser): array
    {
        $incident = $this->find($id);
        if (!$incident) {
            return ['success' => false, 'message' => 'Incident record not found.'];
        }

        (new SecurityIncident())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $currentUser['id'] ?? null
        ], $id);

        AuditLogger::log(
            AuditLogger::CATEGORY_INCIDENT,
            AuditLogger::ACTION_INCIDENT_DELETED,
            "Soft-deleted HIPAA security incident #{$incident['incident_number']}.",
            null,
            (int) ($currentUser['id'] ?? 1),
            $currentUser['role'] ?? 'admin'
        );

        return ['success' => true, 'message' => "Incident #{$incident['incident_number']} removed."];
    }

    /**
     * Generate sequential incident number: INC-YYYY-XXXX
     */
    private function generateIncidentNumber(string $discoveryDate): string
    {
        $year = date('Y', strtotime($discoveryDate));
        $db = Database::connection();
        $stmt = $db->prepare("SELECT COUNT(*) FROM hipaa_security_incidents WHERE YEAR(discovery_date) = :yr");
        $stmt->execute(['yr' => $year]);
        $count = ((int) $stmt->fetchColumn()) + 1;

        return sprintf("INC-%s-%04d", $year, $count);
    }

    /**
     * Helper to map internal incident types to HHS OCR categories.
     */
    private function mapIncidentTypeToOcrCategory(string $type): string
    {
        return match ($type) {
            'unauthorized_access_snooping'        => 'Unauthorized Access/Disclosure',
            'lost_stolen_device_media'            => 'Theft / Loss of Device or Media',
            'misdirected_communication_fax_email' => 'Misdirected Communication (Email/Fax/Mail)',
            'hacking_it_incident_ransomware'      => 'Hacking / IT Incident / Ransomware',
            'improper_disposal'                   => 'Improper Disposal of Physical/Electronic Media',
            'credential_compromise'               => 'Account Compromise / Credential Leakage',
            default                               => 'Other Security Incident'
        };
    }
}
