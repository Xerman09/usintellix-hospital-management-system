<?php

namespace App\Modules\Reports\Services;

use App\Core\Database;
use PDO;

class ReportService
{
    /**
     * Get a list of patients who had visits matching the filter criteria.
     */
    public function getPatientList(array $filters): array
    {
        $providerId = $filters['provider_id'] ?? null;
        $dateFrom = $filters['date_from'] ?? null;
        $dateTo = $filters['date_to'] ?? null;

        $sql = "
            SELECT 
                p.id, 
                p.patient_no, 
                p.first_name, 
                p.last_name, 
                pc.address_line, 
                pc.city, 
                pc.province AS state, 
                pc.zip_code, 
                pc.home_phone, 
                pc.work_phone, 
                MAX(e.date_of_service) AS last_visit
            FROM patients p
            LEFT JOIN encounters e ON e.patient_id = p.id AND e.deleted_at IS NULL
            LEFT JOIN patient_contacts pc ON pc.patient_id = p.id
            WHERE p.deleted_at IS NULL
        ";

        $params = [];

        if (!empty($providerId) && $providerId !== 'all') {
            $sql .= " AND e.encounter_provider_id = :provider_id";
            $params['provider_id'] = (int) $providerId;
        }

        if (!empty($dateFrom)) {
            $sql .= " AND DATE(e.date_of_service) >= :date_from";
            $params['date_from'] = $dateFrom;
        }

        if (!empty($dateTo)) {
            $sql .= " AND DATE(e.date_of_service) <= :date_to";
            $params['date_to'] = $dateTo;
        }

        $sql .= " GROUP BY p.id ORDER BY last_visit DESC, p.last_name, p.first_name";

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get a list of prescriptions matching the filter criteria.
     */
    public function getRxReport(array $filters): array
    {
        $facilityId = $filters['facility_id'] ?? null;
        $dateFrom = $filters['date_from'] ?? null;
        $dateTo = $filters['date_to'] ?? null;
        $patientId = $filters['patient_id'] ?? null;
        $drug = $filters['drug'] ?? null;
        $lot = $filters['lot'] ?? null;

        $sql = "
            SELECT 
                CONCAT(p.last_name, ', ', p.first_name) AS patient_name,
                p.patient_no AS patient_id,
                rx.id AS rx_id,
                rx.title AS drug_name,
                rx.coding AS ndc,
                rx.quantity AS units,
                rx.refills,
                rx.directions AS instructed,
                '' AS reactions,
                COALESCE(rx.begin_date, rx.created_at) AS dispensed,
                rx.quantity AS qty,
                '' AS manufacturer,
                '' AS lot
            FROM patient_prescriptions rx
            JOIN patients p ON p.id = rx.patient_id
            WHERE rx.deleted_at IS NULL AND p.deleted_at IS NULL
        ";

        $params = [];

        if (!empty($facilityId) && $facilityId !== 'all') {
            // Note: For full implementation, join with encounters or patient_facilities
            // Currently ignored if not explicitly mapped.
        }

        if (!empty($dateFrom)) {
            $sql .= " AND COALESCE(DATE(rx.begin_date), DATE(rx.created_at)) >= :date_from";
            $params['date_from'] = $dateFrom;
        }

        if (!empty($dateTo)) {
            $sql .= " AND COALESCE(DATE(rx.begin_date), DATE(rx.created_at)) <= :date_to";
            $params['date_to'] = $dateTo;
        }

        if (!empty($patientId)) {
            $sql .= " AND p.patient_no LIKE :patient_id";
            $params['patient_id'] = "%{$patientId}%";
        }

        if (!empty($drug)) {
            $sql .= " AND rx.title LIKE :drug";
            $params['drug'] = "%{$drug}%";
        }

        // Lot search ignored in SQL as there's no DB column yet, or could be mapped later.

        $sql .= " ORDER BY rx.begin_date DESC, p.last_name, p.first_name";

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getPatientListCreationReport(array $filters = []): array
    {
        $dateFrom = $filters['date_from'] ?? null;
        $dateTo = $filters['date_to'] ?? null;
        $patientId = $filters['patient_id'] ?? null;
        $ageMin = $filters['age_min'] ?? null;
        $ageMax = $filters['age_max'] ?? null;
        $gender = $filters['gender'] ?? null;
        $ethnicity = $filters['ethnicity'] ?? null;
        $providerId = $filters['provider_id'] ?? null;
        $option = $filters['option'] ?? 'Demographics';
        
        $sql = "
            SELECT 
                p.id,
                p.patient_no,
                p.first_name,
                p.last_name,
                p.sex,
                p.birthdate,
                p.ethnicity,
                p.created_at,
                TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) as age,
                CONCAT(emp.first_name, ' ', emp.last_name) as provider_name
            FROM patients p
            LEFT JOIN providers prov ON p.provider_id = prov.id
            LEFT JOIN employees emp ON prov.employee_id = emp.id
            WHERE p.deleted_at IS NULL
        ";
        $params = [];

        if (!empty($dateFrom)) {
            $sql .= " AND p.created_at >= :date_from";
            $params['date_from'] = $dateFrom;
        }

        if (!empty($dateTo)) {
            $sql .= " AND p.created_at <= :date_to";
            $params['date_to'] = $dateTo;
        }

        if (!empty($patientId)) {
            $sql .= " AND p.patient_no LIKE :patient_id";
            $params['patient_id'] = "%{$patientId}%";
        }

        if (!empty($ageMin) && is_numeric($ageMin)) {
            $sql .= " AND TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) >= :age_min";
            $params['age_min'] = $ageMin;
        }

        if (!empty($ageMax) && is_numeric($ageMax)) {
            $sql .= " AND TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) <= :age_max";
            $params['age_max'] = $ageMax;
        }

        if (!empty($gender) && $gender !== 'Unassigned') {
            $sql .= " AND p.sex = :gender";
            $params['gender'] = $gender;
        }

        if (!empty($ethnicity) && $ethnicity !== 'Unassigned') {
            $sql .= " AND p.ethnicity = :ethnicity";
            $params['ethnicity'] = $ethnicity;
        }

        if (!empty($providerId) && $providerId !== 'All') {
            $sql .= " AND p.provider_id = :provider_id";
            $params['provider_id'] = $providerId;
        }

        $sql .= " ORDER BY p.created_at DESC";

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getMessageListReport(array $filters = []): array
    {
        $dateFrom = $filters['date_from'] ?? null;
        $dateTo = $filters['date_to'] ?? null;
        
        $sql = "
            SELECT 
                DATE(m.created_at) as date,
                u.username as user,
                CONCAT(p.first_name, ' ', p.last_name) as patient,
                p.patient_no as pid,
                p.birthdate as dob,
                mt.name as type,
                ms.name as status,
                ub.username as updated_by,
                m.updated_at as last_update
            FROM messages m
            LEFT JOIN users u ON m.sender_id = u.id
            LEFT JOIN patients p ON m.patient_id = p.id
            LEFT JOIN message_types mt ON m.type_id = mt.id
            LEFT JOIN message_statuses ms ON m.status_id = ms.id
            LEFT JOIN users ub ON m.updated_by = ub.id
            WHERE m.deleted_at IS NULL
        ";
        $params = [];

        if (!empty($dateFrom)) {
            $sql .= " AND DATE(m.created_at) >= :date_from";
            $params['date_from'] = $dateFrom;
        }

        if (!empty($dateTo)) {
            $sql .= " AND DATE(m.created_at) <= :date_to";
            $params['date_to'] = $dateTo;
        }

        $sql .= " ORDER BY m.created_at DESC";

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
