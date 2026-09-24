<?php

namespace App\Modules\BusinessAssociates\Services;

use App\Core\AuditLogger;
use App\Core\Database;
use App\Modules\BusinessAssociates\Models\BusinessAssociate;
use DateTime;
use Exception;
use PDO;

class BusinessAssociateService
{
    private BusinessAssociate $model;

    public function __construct()
    {
        $this->model = new BusinessAssociate();
    }

    /**
     * Compute statutory BAA compliance status based on execution state and expiration date.
     */
    public function computeStatus(array $row): string
    {
        $hasSigned = !empty($row['has_signed_baa']) && (int) $row['has_signed_baa'] === 1;
        if (!$hasSigned) {
            return 'missing_baa';
        }

        if (!empty($row['baa_expiration_date'])) {
            $today = new DateTime('today');
            $expDate = new DateTime($row['baa_expiration_date']);

            if ($expDate < $today) {
                return 'expired';
            }

            $diff = (int) $today->diff($expDate)->format('%r%a');
            if ($diff <= 60) {
                return 'expiring_soon';
            }
        }

        return 'active';
    }

    /**
     * List all Business Associate vendors with optional filters.
     */
    public function list(array $filters = []): array
    {
        $pdo = Database::getInstance()->getConnection();

        $sql = "SELECT * FROM hipaa_business_associates WHERE deleted_at IS NULL";
        $params = [];

        if (!empty($filters['search'])) {
            $sql .= " AND (vendor_name LIKE :search 
                      OR service_description LIKE :search 
                      OR phi_data_types_handled LIKE :search 
                      OR primary_contact_name LIKE :search 
                      OR primary_contact_email LIKE :search)";
            $params[':search'] = '%' . trim($filters['search']) . '%';
        }

        if (!empty($filters['category'])) {
            $sql .= " AND vendor_category = :category";
            $params[':category'] = $filters['category'];
        }

        if (!empty($filters['status'])) {
            $sql .= " AND baa_status = :status";
            $params[':status'] = $filters['status'];
        }

        if (isset($filters['has_signed_baa']) && $filters['has_signed_baa'] !== '') {
            $sql .= " AND has_signed_baa = :has_signed_baa";
            $params[':has_signed_baa'] = (int) $filters['has_signed_baa'];
        }

        if (isset($filters['subcontractor']) && $filters['subcontractor'] !== '') {
            $sql .= " AND subcontractor_handling_phi = :subcontractor";
            $params[':subcontractor'] = (int) $filters['subcontractor'];
        }

        // Order by risk severity: missing_baa -> expired -> expiring_soon -> active
        $sql .= " ORDER BY 
                    CASE baa_status 
                        WHEN 'missing_baa' THEN 1 
                        WHEN 'expired' THEN 2 
                        WHEN 'expiring_soon' THEN 3 
                        WHEN 'active' THEN 4 
                        ELSE 5 
                    END ASC, 
                    vendor_name ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $today = new DateTime('today');
        $updatedRows = [];

        foreach ($rows as $row) {
            $computedStatus = $this->computeStatus($row);

            // Sync status if needed
            if ($computedStatus !== $row['baa_status']) {
                $syncStmt = $pdo->prepare("UPDATE hipaa_business_associates SET baa_status = :status WHERE id = :id");
                $syncStmt->execute([':status' => $computedStatus, ':id' => $row['id']]);
                $row['baa_status'] = $computedStatus;
            }

            // Calculate days until expiration
            $daysRemaining = null;
            if (!empty($row['baa_expiration_date'])) {
                $expDate = new DateTime($row['baa_expiration_date']);
                $daysRemaining = (int) $today->diff($expDate)->format('%r%a');
            }
            $row['days_until_expiration'] = $daysRemaining;

            $updatedRows[] = $row;
        }

        return $updatedRows;
    }

    /**
     * Get aggregate statistics and critical audit alerts for BAA governance.
     */
    public function stats(): array
    {
        $pdo = Database::getInstance()->getConnection();

        // Run status sync first
        $stmtAll = $pdo->query("SELECT id, has_signed_baa, baa_expiration_date, baa_status FROM hipaa_business_associates WHERE deleted_at IS NULL");
        $all = $stmtAll->fetchAll(PDO::FETCH_ASSOC);
        foreach ($all as $item) {
            $cStatus = $this->computeStatus($item);
            if ($cStatus !== $item['baa_status']) {
                $syncStmt = $pdo->prepare("UPDATE hipaa_business_associates SET baa_status = :status WHERE id = :id");
                $syncStmt->execute([':status' => $cStatus, ':id' => $item['id']]);
            }
        }

        $stmt = $pdo->query("
            SELECT 
                COUNT(*) as total_vendors,
                SUM(CASE WHEN baa_status = 'active' THEN 1 ELSE 0 END) as active_baas,
                SUM(CASE WHEN baa_status = 'expiring_soon' THEN 1 ELSE 0 END) as expiring_soon,
                SUM(CASE WHEN baa_status = 'expired' THEN 1 ELSE 0 END) as expired_baas,
                SUM(CASE WHEN baa_status = 'missing_baa' THEN 1 ELSE 0 END) as missing_baas,
                SUM(CASE WHEN subcontractor_handling_phi = 1 THEN 1 ELSE 0 END) as subcontractors_count,
                SUM(CASE WHEN soc2_or_hitrust_certified = 1 THEN 1 ELSE 0 END) as soc2_certified_count
            FROM hipaa_business_associates
            WHERE deleted_at IS NULL AND is_active = 1
        ");

        $stats = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $missing = (int) ($stats['missing_baas'] ?? 0);
        $expired = (int) ($stats['expired_baas'] ?? 0);
        $expiring = (int) ($stats['expiring_soon'] ?? 0);

        return [
            'total_vendors'         => (int) ($stats['total_vendors'] ?? 0),
            'active_baas'           => (int) ($stats['active_baas'] ?? 0),
            'expiring_soon'         => $expiring,
            'expired_baas'          => $expired,
            'missing_baas'          => $missing,
            'subcontractors_count'  => (int) ($stats['subcontractors_count'] ?? 0),
            'soc2_certified_count'  => (int) ($stats['soc2_certified_count'] ?? 0),
            'critical_alert'        => ($missing > 0 || $expired > 0),
            'critical_alert_count'  => ($missing + $expired)
        ];
    }

    /**
     * Find single Business Associate by ID.
     */
    public function find(int $id): ?array
    {
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare("SELECT * FROM hipaa_business_associates WHERE id = :id AND deleted_at IS NULL LIMIT 1");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $row['baa_status'] = $this->computeStatus($row);

        $today = new DateTime('today');
        if (!empty($row['baa_expiration_date'])) {
            $expDate = new DateTime($row['baa_expiration_date']);
            $row['days_until_expiration'] = (int) $today->diff($expDate)->format('%r%a');
        } else {
            $row['days_until_expiration'] = null;
        }

        return $row;
    }

    /**
     * Create and record a new Business Associate vendor.
     */
    public function create(array $data, array $currentUser): array
    {
        $vendorName = trim($data['vendor_name'] ?? '');
        $serviceDesc = trim($data['service_description'] ?? '');
        $phiTypes = trim($data['phi_data_types_handled'] ?? '');

        if ($vendorName === '') {
            return ['success' => false, 'message' => 'Vendor legal name is required.'];
        }
        if ($serviceDesc === '') {
            return ['success' => false, 'message' => 'Service description is required.'];
        }
        if ($phiTypes === '') {
            return ['success' => false, 'message' => 'PHI data categories handled is required.'];
        }

        $hasSigned = !empty($data['has_signed_baa']) ? 1 : 0;
        $execDate = !empty($data['baa_execution_date']) ? $data['baa_execution_date'] : null;
        $expDate = !empty($data['baa_expiration_date']) ? $data['baa_expiration_date'] : null;

        $record = [
            'has_signed_baa'       => $hasSigned,
            'baa_expiration_date'  => $expDate
        ];
        $baaStatus = $this->computeStatus($record);

        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare("
            INSERT INTO hipaa_business_associates (
                vendor_name,
                vendor_category,
                service_description,
                phi_data_types_handled,
                primary_contact_name,
                primary_contact_email,
                primary_contact_phone,
                vendor_address,
                has_signed_baa,
                baa_execution_date,
                baa_expiration_date,
                last_compliance_audit_date,
                next_review_deadline,
                baa_document_filename,
                baa_document_path,
                baa_status,
                subcontractor_handling_phi,
                soc2_or_hitrust_certified,
                breach_notification_sla_hours,
                notes,
                is_active,
                created_by
            ) VALUES (
                :vendor_name,
                :vendor_category,
                :service_description,
                :phi_data_types_handled,
                :primary_contact_name,
                :primary_contact_email,
                :primary_contact_phone,
                :vendor_address,
                :has_signed_baa,
                :baa_execution_date,
                :baa_expiration_date,
                :last_compliance_audit_date,
                :next_review_deadline,
                :baa_document_filename,
                :baa_document_path,
                :baa_status,
                :subcontractor_handling_phi,
                :soc2_or_hitrust_certified,
                :breach_notification_sla_hours,
                :notes,
                1,
                :created_by
            )
        ");

        $stmt->execute([
            ':vendor_name'                    => $vendorName,
            ':vendor_category'                => $data['vendor_category'] ?? 'other',
            ':service_description'            => $serviceDesc,
            ':phi_data_types_handled'         => $phiTypes,
            ':primary_contact_name'           => trim($data['primary_contact_name'] ?? '') ?: null,
            ':primary_contact_email'          => trim($data['primary_contact_email'] ?? '') ?: null,
            ':primary_contact_phone'          => trim($data['primary_contact_phone'] ?? '') ?: null,
            ':vendor_address'                 => trim($data['vendor_address'] ?? '') ?: null,
            ':has_signed_baa'                 => $hasSigned,
            ':baa_execution_date'             => $execDate,
            ':baa_expiration_date'            => $expDate,
            ':last_compliance_audit_date'     => !empty($data['last_compliance_audit_date']) ? $data['last_compliance_audit_date'] : null,
            ':next_review_deadline'           => !empty($data['next_review_deadline']) ? $data['next_review_deadline'] : null,
            ':baa_document_filename'          => trim($data['baa_document_filename'] ?? '') ?: null,
            ':baa_document_path'              => trim($data['baa_document_path'] ?? '') ?: null,
            ':baa_status'                     => $baaStatus,
            ':subcontractor_handling_phi'     => !empty($data['subcontractor_handling_phi']) ? 1 : 0,
            ':soc2_or_hitrust_certified'      => !empty($data['soc2_or_hitrust_certified']) ? 1 : 0,
            ':breach_notification_sla_hours'  => (int) ($data['breach_notification_sla_hours'] ?? 72) ?: 72,
            ':notes'                          => trim($data['notes'] ?? '') ?: null,
            ':created_by'                     => (int) ($currentUser['id'] ?? 1)
        ]);

        $newId = (int) $pdo->lastInsertId();

        AuditLogger::log(
            AuditLogger::CATEGORY_BAA,
            AuditLogger::ACTION_BAA_RECORDED,
            "Registered Business Associate vendor '{$vendorName}' (ID #{$newId}) with BAA status '{$baaStatus}' under 45 CFR § 164.502(e).",
            null,
            (int) ($currentUser['id'] ?? 1),
            $currentUser['role'] ?? 'admin'
        );

        return [
            'success' => true,
            'message' => 'Business Associate registered successfully.',
            'data'    => $this->find($newId)
        ];
    }

    /**
     * Update an existing Business Associate vendor.
     */
    public function update(int $id, array $data, array $currentUser): array
    {
        $existing = $this->find($id);
        if (!$existing) {
            return ['success' => false, 'message' => 'Business Associate vendor not found.'];
        }

        $vendorName = trim($data['vendor_name'] ?? $existing['vendor_name']);
        $serviceDesc = trim($data['service_description'] ?? $existing['service_description']);
        $phiTypes = trim($data['phi_data_types_handled'] ?? $existing['phi_data_types_handled']);

        if ($vendorName === '') {
            return ['success' => false, 'message' => 'Vendor legal name is required.'];
        }
        if ($serviceDesc === '') {
            return ['success' => false, 'message' => 'Service description is required.'];
        }
        if ($phiTypes === '') {
            return ['success' => false, 'message' => 'PHI data categories handled is required.'];
        }

        $hasSigned = isset($data['has_signed_baa']) ? (!empty($data['has_signed_baa']) ? 1 : 0) : (int) $existing['has_signed_baa'];
        $execDate = array_key_exists('baa_execution_date', $data) ? ($data['baa_execution_date'] ?: null) : $existing['baa_execution_date'];
        $expDate = array_key_exists('baa_expiration_date', $data) ? ($data['baa_expiration_date'] ?: null) : $existing['baa_expiration_date'];

        $record = [
            'has_signed_baa'       => $hasSigned,
            'baa_expiration_date'  => $expDate
        ];
        $baaStatus = $this->computeStatus($record);

        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare("
            UPDATE hipaa_business_associates SET
                vendor_name = :vendor_name,
                vendor_category = :vendor_category,
                service_description = :service_description,
                phi_data_types_handled = :phi_data_types_handled,
                primary_contact_name = :primary_contact_name,
                primary_contact_email = :primary_contact_email,
                primary_contact_phone = :primary_contact_phone,
                vendor_address = :vendor_address,
                has_signed_baa = :has_signed_baa,
                baa_execution_date = :baa_execution_date,
                baa_expiration_date = :baa_expiration_date,
                last_compliance_audit_date = :last_compliance_audit_date,
                next_review_deadline = :next_review_deadline,
                baa_document_filename = :baa_document_filename,
                baa_status = :baa_status,
                subcontractor_handling_phi = :subcontractor_handling_phi,
                soc2_or_hitrust_certified = :soc2_or_hitrust_certified,
                breach_notification_sla_hours = :breach_notification_sla_hours,
                notes = :notes,
                updated_by = :updated_by
            WHERE id = :id
        ");

        $stmt->execute([
            ':id'                             => $id,
            ':vendor_name'                    => $vendorName,
            ':vendor_category'                => $data['vendor_category'] ?? $existing['vendor_category'],
            ':service_description'            => $serviceDesc,
            ':phi_data_types_handled'         => $phiTypes,
            ':primary_contact_name'           => array_key_exists('primary_contact_name', $data) ? (trim($data['primary_contact_name'] ?? '') ?: null) : $existing['primary_contact_name'],
            ':primary_contact_email'          => array_key_exists('primary_contact_email', $data) ? (trim($data['primary_contact_email'] ?? '') ?: null) : $existing['primary_contact_email'],
            ':primary_contact_phone'          => array_key_exists('primary_contact_phone', $data) ? (trim($data['primary_contact_phone'] ?? '') ?: null) : $existing['primary_contact_phone'],
            ':vendor_address'                 => array_key_exists('vendor_address', $data) ? (trim($data['vendor_address'] ?? '') ?: null) : $existing['vendor_address'],
            ':has_signed_baa'                 => $hasSigned,
            ':baa_execution_date'             => $execDate,
            ':baa_expiration_date'            => $expDate,
            ':last_compliance_audit_date'     => array_key_exists('last_compliance_audit_date', $data) ? ($data['last_compliance_audit_date'] ?: null) : $existing['last_compliance_audit_date'],
            ':next_review_deadline'           => array_key_exists('next_review_deadline', $data) ? ($data['next_review_deadline'] ?: null) : $existing['next_review_deadline'],
            ':baa_document_filename'          => array_key_exists('baa_document_filename', $data) ? (trim($data['baa_document_filename'] ?? '') ?: null) : $existing['baa_document_filename'],
            ':baa_status'                     => $baaStatus,
            ':subcontractor_handling_phi'     => isset($data['subcontractor_handling_phi']) ? (!empty($data['subcontractor_handling_phi']) ? 1 : 0) : (int) $existing['subcontractor_handling_phi'],
            ':soc2_or_hitrust_certified'      => isset($data['soc2_or_hitrust_certified']) ? (!empty($data['soc2_or_hitrust_certified']) ? 1 : 0) : (int) $existing['soc2_or_hitrust_certified'],
            ':breach_notification_sla_hours'  => isset($data['breach_notification_sla_hours']) ? (int) $data['breach_notification_sla_hours'] : (int) $existing['breach_notification_sla_hours'],
            ':notes'                          => array_key_exists('notes', $data) ? (trim($data['notes'] ?? '') ?: null) : $existing['notes'],
            ':updated_by'                     => (int) ($currentUser['id'] ?? 1)
        ]);

        AuditLogger::log(
            AuditLogger::CATEGORY_BAA,
            AuditLogger::ACTION_BAA_UPDATED,
            "Updated Business Associate vendor '{$vendorName}' (ID #{$id}) compliance profile. BAA status is '{$baaStatus}'.",
            null,
            (int) ($currentUser['id'] ?? 1),
            $currentUser['role'] ?? 'admin'
        );

        return [
            'success' => true,
            'message' => 'Business Associate profile updated successfully.',
            'data'    => $this->find($id)
        ];
    }

    /**
     * Soft-delete a Business Associate vendor.
     */
    public function delete(int $id, array $currentUser): array
    {
        $existing = $this->find($id);
        if (!$existing) {
            return ['success' => false, 'message' => 'Business Associate vendor not found.'];
        }

        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare("UPDATE hipaa_business_associates SET deleted_at = NOW(), updated_by = :user_id WHERE id = :id");
        $stmt->execute([':user_id' => (int) ($currentUser['id'] ?? 1), ':id' => $id]);

        AuditLogger::log(
            AuditLogger::CATEGORY_BAA,
            AuditLogger::ACTION_BAA_DELETED,
            "De-registered Business Associate vendor '{$existing['vendor_name']}' (ID #{$id}) from active compliance inventory.",
            null,
            (int) ($currentUser['id'] ?? 1),
            $currentUser['role'] ?? 'admin'
        );

        return ['success' => true, 'message' => "Business Associate vendor '{$existing['vendor_name']}' removed from inventory."];
    }

    /**
     * Generate formal Vendor Compliance Audit Dossier for OCR audits.
     */
    public function generateVendorInventoryReport(int $id, array $currentUser): array
    {
        $vendor = $this->find($id);
        if (!$vendor) {
            return ['success' => false, 'message' => 'Vendor not found.'];
        }

        $dossier = [
            'facility_name'                  => 'USIntellix Hospital & Health Systems',
            'facility_address'               => '1000 Healthcare Plaza, Suite 400, Medical City, USA',
            'report_date'                    => date('F j, Y'),
            'statutory_authority'            => 'Compliance dossier compiled pursuant to 45 CFR § 164.502(e), § 164.504(e), and § 164.308(b)(1)',
            'vendor'                         => $vendor,
            'compliance_certification'       => [
                'has_executed_baa'           => (bool) $vendor['has_signed_baa'],
                'baa_status'                 => $vendor['baa_status'],
                'contractual_safeguards'     => 'Vendor is contractually obligated under 45 CFR § 164.504(e)(2) to implement administrative, physical, and technical safeguards that reasonably protect confidentiality, integrity, and availability of ePHI.',
                'subcontractor_assurances'   => $vendor['subcontractor_handling_phi'] ? 'Vendor contractually warrants that all subcontractors agree to the identical statutory restrictions and safeguards.' : 'No downstream subcontractors authorized to access ePHI without prior written authorization.',
                'breach_reporting_mandate'   => "Vendor contractually warrants immediate written notification of any security incident or suspected breach within {$vendor['breach_notification_sla_hours']} hours.",
                'books_and_records_access'   => 'Agreement grants HHS Secretary full inspection rights to books, records, and practices relating to PHI uses and disclosures (§ 164.504(e)(2)(ii)(I)).',
                'termination_upon_breach'    => 'Agreement authorizes immediate unilateral termination by Covered Entity upon material breach of HIPAA covenants (§ 164.504(e)(2)(iii)).'
            ],
            'investigating_officer'          => 'HIPAA Privacy & Information Security Officer'
        ];

        AuditLogger::log(
            AuditLogger::CATEGORY_BAA,
            AuditLogger::ACTION_BAA_DOSSIER,
            "Generated formal HIPAA BAA Compliance Dossier for vendor '{$vendor['vendor_name']}' (#{$id}).",
            null,
            (int) ($currentUser['id'] ?? 1),
            $currentUser['role'] ?? 'admin'
        );

        return ['success' => true, 'data' => $dossier];
    }

    /**
     * Export complete Business Associate inventory to RFC 4180 CSV for OCR auditors.
     */
    public function exportCsv(array $filters, array $currentUser): string
    {
        $vendors = $this->list($filters);

        $output = fopen('php://temp', 'r+');

        // Compliance headers
        fputcsv($output, ['# USINTELLIX HOSPITAL MANAGEMENT SYSTEM - HIPAA BUSINESS ASSOCIATE AGREEMENT (BAA) INVENTORY']);
        fputcsv($output, ['# Statutory Authority: 45 CFR § 164.502(e), 45 CFR § 164.504(e), and 45 CFR § 164.308(b)(1)']);
        fputcsv($output, ['# Export Date: ' . date('Y-m-d H:i:s T')]);
        fputcsv($output, ['# Requested By: ' . ($currentUser['email'] ?? 'Compliance Officer')]);
        fputcsv($output, ['# Total Active Vendors: ' . count($vendors)]);
        fputcsv($output, []); // Blank separator

        // Column headers
        fputcsv($output, [
            'Vendor ID',
            'Vendor Legal Name',
            'Category',
            'Services Provided',
            'PHI Data Types Handled',
            'Primary Contact',
            'Contact Email',
            'Contact Phone',
            'Vendor Address',
            'Signed BAA on File',
            'BAA Execution Date',
            'BAA Expiration Date',
            'Days Remaining',
            'Compliance Status',
            'Subcontractor Handles PHI',
            'SOC2 / HITRUST Certified',
            'Breach Notice SLA (Hours)',
            'Last Compliance Audit',
            'Next Review Deadline',
            'Executed Document File',
            'Compliance Notes'
        ]);

        foreach ($vendors as $v) {
            fputcsv($output, [
                $v['id'],
                $v['vendor_name'],
                $v['vendor_category'],
                $v['service_description'],
                $v['phi_data_types_handled'],
                $v['primary_contact_name'] ?? 'N/A',
                $v['primary_contact_email'] ?? 'N/A',
                $v['primary_contact_phone'] ?? 'N/A',
                $v['vendor_address'] ?? 'N/A',
                $v['has_signed_baa'] ? 'YES' : 'NO (CRITICAL AUDIT GAP)',
                $v['baa_execution_date'] ?? 'N/A',
                $v['baa_expiration_date'] ?? 'Indefinite / Perpetual',
                $v['days_until_expiration'] !== null ? $v['days_until_expiration'] : 'N/A',
                strtoupper(str_replace('_', ' ', $v['baa_status'])),
                $v['subcontractor_handling_phi'] ? 'YES' : 'NO',
                $v['soc2_or_hitrust_certified'] ? 'YES' : 'NO',
                $v['breach_notification_sla_hours'] . ' hours',
                $v['last_compliance_audit_date'] ?? 'None on file',
                $v['next_review_deadline'] ?? 'Unscheduled',
                $v['baa_document_filename'] ?? 'None attached',
                $v['notes'] ?? ''
            ]);
        }

        rewind($output);
        $csvContent = stream_get_contents($output);
        fclose($output);

        AuditLogger::log(
            AuditLogger::CATEGORY_BAA,
            AuditLogger::ACTION_BAA_EXPORT_CSV,
            "Exported complete Business Associate inventory (" . count($vendors) . " vendors) to RFC 4180 CSV for regulatory audit.",
            null,
            (int) ($currentUser['id'] ?? 1),
            $currentUser['role'] ?? 'admin'
        );

        return $csvContent;
    }
}
