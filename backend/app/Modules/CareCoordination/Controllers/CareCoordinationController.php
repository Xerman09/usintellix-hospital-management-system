<?php

namespace App\Modules\CareCoordination\Controllers;

use App\Core\Controller;
use App\Core\Session;
use App\Core\Database;
use PDO;

class CareCoordinationController extends Controller
{
    public function index(): void
    {
        $pdo = Database::connection();

        // Fetch patients with their encounter count and latest encounter
        // For the nested encounters, we can fetch them separately or all together.
        // Let's just fetch all encounters for these patients and group them in PHP.
        // We'll limit to 500 encounters or 500 patients.
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 500;

        $stmt = $pdo->prepare("
            SELECT 
                p.id as pid,
                p.first_name,
                p.last_name,
                p.created_at,
                e.id as encounter_id,
                e.date_of_service as dos,
                e.created_at as encounter_transferred_date,
                'Completed' as status
            FROM patients p
            LEFT JOIN encounters e ON p.id = e.patient_id AND e.deleted_at IS NULL
            WHERE p.deleted_at IS NULL
            ORDER BY p.id DESC, e.id DESC
            LIMIT ?
        ");
        
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $patients = [];
        
        foreach ($rows as $row) {
            $pid = $row['pid'];
            
            if (!isset($patients[$pid])) {
                $patients[$pid] = [
                    'id' => count($patients) + 1,
                    'pid' => $pid,
                    'name' => trim($row['first_name'] . ' ' . $row['last_name']),
                    'encounterCount' => 0,
                    'totalTransfers' => 0,
                    'successfulTransfers' => 0,
                    'lastVisit' => '',
                    'creationDate' => $row['created_at'] ? date('Y-m-d', strtotime($row['created_at'])) : '',
                    'encounters' => []
                ];
            }

            if ($row['encounter_id']) {
                $patients[$pid]['encounterCount']++;
                $dos = $row['dos'] ? date('Y-m-d', strtotime($row['dos'])) : '';
                if ($patients[$pid]['lastVisit'] === '') {
                    $patients[$pid]['lastVisit'] = $dos;
                }

                $patients[$pid]['encounters'][] = [
                    'id' => $row['encounter_id'],
                    'dos' => $dos,
                    'transferredDate' => $row['encounter_transferred_date'] ? date('Y-m-d', strtotime($row['encounter_transferred_date'])) : '',
                    'transferredBy' => 'System', // mocked, since it's just created_by user ID normally
                    'status' => ucfirst($row['status'] ?: 'Completed')
                ];
            }
        }

        $this->json(array_values($patients));
    }
}
