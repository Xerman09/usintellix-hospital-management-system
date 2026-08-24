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
            JOIN encounters e ON e.patient_id = p.id
            LEFT JOIN patient_contacts pc ON pc.patient_id = p.id
            WHERE e.deleted_at IS NULL AND p.deleted_at IS NULL
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
}
