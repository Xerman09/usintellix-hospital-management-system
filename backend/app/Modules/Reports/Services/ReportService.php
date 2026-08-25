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
}
