<?php

namespace App\Modules\RoomManagement\Services;

use App\Core\Database;
use App\Modules\RoomManagement\Models\Building;
use App\Modules\RoomManagement\Models\Room;
use PDO;
use Exception;

class RoomManagementService
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    // =========================================================================
    // BUILDINGS
    // =========================================================================

    public function listBuildings(bool $activeOnly = false): array
    {
        $sql = "SELECT b.*, 
                       (SELECT COUNT(*) FROM hospital_rooms r WHERE r.building_id = b.id AND r.is_active = 1) AS total_rooms,
                       (SELECT COUNT(*) FROM hospital_beds bd JOIN hospital_rooms r ON bd.room_id = r.id WHERE r.building_id = b.id AND bd.is_active = 1) AS total_beds,
                       (SELECT COUNT(*) FROM hospital_beds bd JOIN hospital_rooms r ON bd.room_id = r.id WHERE r.building_id = b.id AND bd.is_active = 1 AND bd.status = 'Available') AS available_beds
                FROM hospital_buildings b";

        if ($activeOnly) {
            $sql .= " WHERE b.is_active = 1";
        }
        $sql .= " ORDER BY b.building_name ASC";

        return $this->db->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findBuilding(int $id): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM hospital_buildings WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $res = $stmt->fetch(PDO::FETCH_ASSOC);
        return $res ?: null;
    }

    public function saveBuilding(array $data, ?int $id = null, ?int $userId = null): array
    {
        $code = strtoupper(trim((string)($data['building_code'] ?? '')));
        $name = trim((string)($data['building_name'] ?? ''));
        $floors = max(1, (int)($data['total_floors'] ?? 1));
        $desc = trim((string)($data['location_description'] ?? ''));
        $isActive = isset($data['is_active']) ? (int)$data['is_active'] : 1;

        if (empty($code) || empty($name)) {
            return ['success' => false, 'message' => 'Building Code and Building Name are required.'];
        }

        // Check unique code
        $checkSql = "SELECT id FROM hospital_buildings WHERE building_code = :code" . ($id ? " AND id != :id" : "");
        $checkParams = [':code' => $code];
        if ($id) $checkParams[':id'] = $id;

        $checkStmt = $this->db->prepare($checkSql);
        $checkStmt->execute($checkParams);
        if ($checkStmt->fetch()) {
            return ['success' => false, 'message' => "Building code '{$code}' is already registered."];
        }

        if ($id) {
            $stmt = $this->db->prepare("
                UPDATE hospital_buildings
                SET building_code = :code, building_name = :name, total_floors = :floors,
                    location_description = :desc, is_active = :is_active
                WHERE id = :id
            ");
            $stmt->execute([
                ':code'      => $code,
                ':name'      => $name,
                ':floors'    => $floors,
                ':desc'      => $desc,
                ':is_active' => $isActive,
                ':id'        => $id
            ]);
            return ['success' => true, 'message' => 'Building updated successfully.', 'id' => $id];
        } else {
            $stmt = $this->db->prepare("
                INSERT INTO hospital_buildings (facility_id, building_code, building_name, total_floors, location_description, is_active, created_by)
                VALUES (:facility_id, :code, :name, :floors, :desc, :is_active, :created_by)
            ");
            $stmt->execute([
                ':facility_id' => $data['facility_id'] ?? null,
                ':code'        => $code,
                ':name'        => $name,
                ':floors'      => $floors,
                ':desc'        => $desc,
                ':is_active'   => $isActive,
                ':created_by'  => $userId
            ]);
            $newId = (int)$this->db->lastInsertId();
            return ['success' => true, 'message' => 'Building registered successfully.', 'id' => $newId];
        }
    }

    public function deleteBuilding(int $id): array
    {
        $hasRooms = (int)$this->db->query("SELECT COUNT(*) FROM hospital_rooms WHERE building_id = {$id}")->fetchColumn();
        if ($hasRooms > 0) {
            return ['success' => false, 'message' => "Cannot delete building because it contains {$hasRooms} registered rooms. Please reassign or delete the rooms first."];
        }

        $stmt = $this->db->prepare("DELETE FROM hospital_buildings WHERE id = :id");
        $stmt->execute([':id' => $id]);
        return ['success' => true, 'message' => 'Building removed successfully.'];
    }

    // =========================================================================
    // ROOMS
    // =========================================================================

    public function listRooms(array $filters = []): array
    {
        $sql = "SELECT r.*, 
                       b.building_name, b.building_code,
                       w.ward_name, w.ward_code,
                       (SELECT COUNT(*) FROM hospital_beds bd WHERE bd.room_id = r.id AND bd.is_active = 1) AS bed_count,
                       (SELECT COUNT(*) FROM hospital_beds bd WHERE bd.room_id = r.id AND bd.is_active = 1 AND bd.status = 'Available') AS available_bed_count,
                       (SELECT COUNT(*) FROM hospital_beds bd WHERE bd.room_id = r.id AND bd.is_active = 1 AND bd.status = 'Occupied') AS occupied_bed_count
                FROM hospital_rooms r
                JOIN hospital_buildings b ON r.building_id = b.id
                LEFT JOIN hospital_wards w ON r.ward_id = w.id
                WHERE 1=1";

        $params = [];

        if (!empty($filters['building_id'])) {
            $sql .= " AND r.building_id = :bldg_id";
            $params[':bldg_id'] = (int)$filters['building_id'];
        }

        if (!empty($filters['floor_number'])) {
            $sql .= " AND r.floor_number = :floor";
            $params[':floor'] = $filters['floor_number'];
        }

        if (!empty($filters['room_type'])) {
            $sql .= " AND r.room_type = :room_type";
            $params[':room_type'] = $filters['room_type'];
        }

        if (!empty($filters['status'])) {
            $sql .= " AND r.status = :status";
            $params[':status'] = $filters['status'];
        }

        if (isset($filters['is_active'])) {
            $sql .= " AND r.is_active = :active";
            $params[':active'] = (int)$filters['is_active'];
        }

        if (!empty($filters['search'])) {
            $term = '%' . trim($filters['search']) . '%';
            $sql .= " AND (r.room_number LIKE :s1 OR r.room_name LIKE :s2 OR b.building_name LIKE :s3)";
            $params[':s1'] = $term;
            $params[':s2'] = $term;
            $params[':s3'] = $term;
        }

        $sql .= " ORDER BY b.building_name ASC, r.floor_number ASC, r.room_number ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findRoom(int $id): ?array
    {
        $stmt = $this->db->prepare("
            SELECT r.*, b.building_name, b.building_code, w.ward_name, w.ward_code
            FROM hospital_rooms r
            JOIN hospital_buildings b ON r.building_id = b.id
            LEFT JOIN hospital_wards w ON r.ward_id = w.id
            WHERE r.id = :id
        ");
        $stmt->execute([':id' => $id]);
        $room = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$room) return null;

        // Fetch beds in this room
        $bedStmt = $this->db->prepare("
            SELECT b.*, a.admission_number, a.patient_name, a.patient_mrn, a.admission_date
            FROM hospital_beds b
            LEFT JOIN inpatient_admissions a ON b.current_admission_id = a.id
            WHERE b.room_id = :room_id AND b.is_active = 1
            ORDER BY b.bed_number ASC
        ");
        $bedStmt->execute([':room_id' => $id]);
        $room['beds'] = $bedStmt->fetchAll(PDO::FETCH_ASSOC);

        return $room;
    }

    public function saveRoom(array $data, ?int $id = null): array
    {
        $bldgId = (int)($data['building_id'] ?? 0);
        $roomNum = trim((string)($data['room_number'] ?? ''));
        $floor = trim((string)($data['floor_number'] ?? '1st Floor'));
        $roomName = trim((string)($data['room_name'] ?? ''));
        $roomType = trim((string)($data['room_type'] ?? 'General Ward'));
        $rate = (float)($data['daily_rate'] ?? 0.00);
        $maxBeds = max(1, (int)($data['max_beds'] ?? 1));
        $gender = trim((string)($data['gender_restriction'] ?? 'All'));
        $amenities = trim((string)($data['amenities'] ?? ''));
        $wardId = !empty($data['ward_id']) ? (int)$data['ward_id'] : null;
        $isActive = isset($data['is_active']) ? (int)$data['is_active'] : 1;

        if (!$bldgId || empty($roomNum)) {
            return ['success' => false, 'message' => 'Building and Room Number are required.'];
        }

        // Check duplicate room number in building
        $checkSql = "SELECT id FROM hospital_rooms WHERE building_id = :bldg_id AND room_number = :num" . ($id ? " AND id != :id" : "");
        $checkParams = [':bldg_id' => $bldgId, ':num' => $roomNum];
        if ($id) $checkParams[':id'] = $id;

        $checkStmt = $this->db->prepare($checkSql);
        $checkStmt->execute($checkParams);
        if ($checkStmt->fetch()) {
            return ['success' => false, 'message' => "Room '{$roomNum}' already exists in this building."];
        }

        if ($id) {
            $stmt = $this->db->prepare("
                UPDATE hospital_rooms
                SET building_id = :bldg, ward_id = :ward, floor_number = :floor,
                    room_number = :num, room_name = :name, room_type = :type,
                    daily_rate = :rate, max_beds = :max_beds, gender_restriction = :gender,
                    amenities = :amenities, is_active = :is_active
                WHERE id = :id
            ");
            $stmt->execute([
                ':bldg'      => $bldgId,
                ':ward'      => $wardId,
                ':floor'     => $floor,
                ':num'       => $roomNum,
                ':name'      => $roomName,
                ':type'      => $roomType,
                ':rate'      => $rate,
                ':max_beds'  => $maxBeds,
                ':gender'    => $gender,
                ':amenities' => $amenities,
                ':is_active' => $isActive,
                ':id'        => $id
            ]);

            // Update room_number on associated beds
            $this->db->prepare("UPDATE hospital_beds SET room_number = :num WHERE room_id = :id")
                     ->execute([':num' => $roomNum, ':id' => $id]);

            $this->syncRoomStatus($id);
            return ['success' => true, 'message' => 'Room updated successfully.', 'id' => $id];
        } else {
            $stmt = $this->db->prepare("
                INSERT INTO hospital_rooms (
                    building_id, ward_id, floor_number, room_number, room_name,
                    room_type, daily_rate, max_beds, gender_restriction, status, amenities, is_active
                ) VALUES (
                    :bldg, :ward, :floor, :num, :name,
                    :type, :rate, :max_beds, :gender, 'Available', :amenities, :is_active
                )
            ");
            $stmt->execute([
                ':bldg'      => $bldgId,
                ':ward'      => $wardId,
                ':floor'     => $floor,
                ':num'       => $roomNum,
                ':name'      => $roomName,
                ':type'      => $roomType,
                ':rate'      => $rate,
                ':max_beds'  => $maxBeds,
                ':gender'    => $gender,
                ':amenities' => $amenities,
                ':is_active' => $isActive
            ]);
            $newId = (int)$this->db->lastInsertId();

            // Auto-create initial bed(s) if requested
            if (!empty($data['auto_create_beds'])) {
                for ($i = 1; $i <= $maxBeds; $i++) {
                    $suffix = $maxBeds === 1 ? '' : '-' . chr(64 + $i);
                    $bedNumber = "{$roomNum}{$suffix}";
                    $this->saveBed([
                        'room_id'     => $newId,
                        'ward_id'     => $wardId,
                        'bed_number'  => $bedNumber,
                        'bed_type'    => $this->mapDefaultBedType($roomType),
                        'daily_rate'  => $rate,
                        'features'    => $amenities
                    ]);
                }
            }

            return ['success' => true, 'message' => 'Room registered successfully.', 'id' => $newId];
        }
    }

    public function deleteRoom(int $id): array
    {
        $hasOccupiedBeds = (int)$this->db->query("
            SELECT COUNT(*) FROM hospital_beds 
            WHERE room_id = {$id} AND status = 'Occupied'
        ")->fetchColumn();

        if ($hasOccupiedBeds > 0) {
            return ['success' => false, 'message' => 'Cannot delete room because it currently has occupied beds. Please discharge or transfer patients first.'];
        }

        // Delete or unlink beds
        $this->db->prepare("DELETE FROM hospital_beds WHERE room_id = :id AND current_admission_id IS NULL")->execute([':id' => $id]);
        $this->db->prepare("DELETE FROM hospital_rooms WHERE id = :id")->execute([':id' => $id]);

        return ['success' => true, 'message' => 'Room and associated vacant beds removed successfully.'];
    }

    // =========================================================================
    // BEDS
    // =========================================================================

    public function listBeds(array $filters = []): array
    {
        $sql = "SELECT b.*,
                       r.room_number, r.room_name, r.room_type, r.floor_number, r.daily_rate AS room_rate,
                       bldg.id AS building_id, bldg.building_name, bldg.building_code,
                       w.ward_name, w.ward_code,
                       a.admission_number, a.patient_name, a.patient_mrn, a.admission_date, a.expected_discharge_date
                FROM hospital_beds b
                LEFT JOIN hospital_rooms r ON b.room_id = r.id
                LEFT JOIN hospital_buildings bldg ON r.building_id = bldg.id
                LEFT JOIN hospital_wards w ON b.ward_id = w.id
                LEFT JOIN inpatient_admissions a ON b.current_admission_id = a.id
                WHERE b.is_active = 1";

        $params = [];

        if (!empty($filters['building_id'])) {
            $sql .= " AND r.building_id = :bldg_id";
            $params[':bldg_id'] = (int)$filters['building_id'];
        }

        if (!empty($filters['room_id'])) {
            $sql .= " AND b.room_id = :room_id";
            $params[':room_id'] = (int)$filters['room_id'];
        }

        if (!empty($filters['status'])) {
            $sql .= " AND b.status = :status";
            $params[':status'] = $filters['status'];
        }

        if (!empty($filters['bed_type'])) {
            $sql .= " AND b.bed_type = :type";
            $params[':type'] = $filters['bed_type'];
        }

        if (!empty($filters['room_type'])) {
            $sql .= " AND r.room_type = :room_type";
            $params[':room_type'] = $filters['room_type'];
        }

        if (!empty($filters['search'])) {
            $term = '%' . trim($filters['search']) . '%';
            $sql .= " AND (b.bed_number LIKE :s1 OR b.room_number LIKE :s2 OR a.patient_name LIKE :s3 OR a.patient_mrn LIKE :s4)";
            $params[':s1'] = $term;
            $params[':s2'] = $term;
            $params[':s3'] = $term;
            $params[':s4'] = $term;
        }

        $sql .= " ORDER BY bldg.building_name ASC, r.room_number ASC, b.bed_number ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findBed(int $id): ?array
    {
        $stmt = $this->db->prepare("
            SELECT b.*,
                   r.room_number, r.room_name, r.room_type, r.floor_number, r.daily_rate AS room_rate,
                   bldg.id AS building_id, bldg.building_name, bldg.building_code,
                   w.ward_name, w.ward_code,
                   a.admission_number, a.patient_name, a.patient_mrn, a.admission_date
            FROM hospital_beds b
            LEFT JOIN hospital_rooms r ON b.room_id = r.id
            LEFT JOIN hospital_buildings bldg ON r.building_id = bldg.id
            LEFT JOIN hospital_wards w ON b.ward_id = w.id
            LEFT JOIN inpatient_admissions a ON b.current_admission_id = a.id
            WHERE b.id = :id
        ");
        $stmt->execute([':id' => $id]);
        $bed = $stmt->fetch(PDO::FETCH_ASSOC);
        return $bed ?: null;
    }

    public function saveBed(array $data, ?int $id = null): array
    {
        $roomId = !empty($data['room_id']) ? (int)$data['room_id'] : null;
        $bedNumber = trim((string)($data['bed_number'] ?? ''));
        $bedType = trim((string)($data['bed_type'] ?? 'Standard Acute Bed'));
        $features = trim((string)($data['features'] ?? ''));
        $dailyRate = isset($data['daily_rate']) ? (float)$data['daily_rate'] : null;
        $status = trim((string)($data['status'] ?? 'Available'));
        $wardId = !empty($data['ward_id']) ? (int)$data['ward_id'] : null;

        if (empty($bedNumber)) {
            return ['success' => false, 'message' => 'Bed Number / Code is required.'];
        }

        $roomNumber = '';
        if ($roomId) {
            $room = $this->findRoom($roomId);
            if (!$room) {
                return ['success' => false, 'message' => 'Assigned Room not found.'];
            }
            $roomNumber = $room['room_number'];
            if (!$wardId && !empty($room['ward_id'])) {
                $wardId = (int)$room['ward_id'];
            }

            // Check max capacity on room
            if (!$id) {
                $currentBedsInRoom = (int)$this->db->query("SELECT COUNT(*) FROM hospital_beds WHERE room_id = {$roomId} AND is_active = 1")->fetchColumn();
                if ($currentBedsInRoom >= (int)$room['max_beds']) {
                    return ['success' => false, 'message' => "Room {$roomNumber} has reached its maximum bed capacity ({$room['max_beds']} beds)."];
                }
            }
        }

        // Check unique bed number
        $checkSql = "SELECT id FROM hospital_beds WHERE bed_number = :bnum" . ($id ? " AND id != :id" : "");
        $checkParams = [':bnum' => $bedNumber];
        if ($id) $checkParams[':id'] = $id;
        $checkStmt = $this->db->prepare($checkSql);
        $checkStmt->execute($checkParams);
        if ($checkStmt->fetch()) {
            return ['success' => false, 'message' => "Bed Number '{$bedNumber}' is already registered in the hospital."];
        }

        if ($id) {
            $stmt = $this->db->prepare("
                UPDATE hospital_beds
                SET room_id = :room_id, ward_id = :ward_id, bed_number = :bed_number,
                    room_number = :room_number, bed_type = :bed_type, features = :features,
                    daily_rate = :daily_rate, status = :status
                WHERE id = :id
            ");
            $stmt->execute([
                ':room_id'     => $roomId,
                ':ward_id'     => $wardId ?: 1,
                ':bed_number'  => $bedNumber,
                ':room_number' => $roomNumber ?: 'General',
                ':bed_type'    => $bedType,
                ':features'    => $features,
                ':daily_rate'  => $dailyRate,
                ':status'      => $status,
                ':id'          => $id
            ]);

            if ($roomId) $this->syncRoomStatus($roomId);
            return ['success' => true, 'message' => 'Bed updated successfully.', 'id' => $id];
        } else {
            $stmt = $this->db->prepare("
                INSERT INTO hospital_beds (
                    room_id, ward_id, bed_number, room_number, bed_type,
                    status, features, is_active, daily_rate
                ) VALUES (
                    :room_id, :ward_id, :bed_number, :room_number, :bed_type,
                    :status, :features, 1, :daily_rate
                )
            ");
            $stmt->execute([
                ':room_id'     => $roomId,
                ':ward_id'     => $wardId ?: 1,
                ':bed_number'  => $bedNumber,
                ':room_number' => $roomNumber ?: 'General',
                ':bed_type'    => $bedType,
                ':status'      => $status,
                ':features'    => $features,
                ':daily_rate'  => $dailyRate
            ]);
            $newId = (int)$this->db->lastInsertId();

            if ($roomId) $this->syncRoomStatus($roomId);
            return ['success' => true, 'message' => 'Bed registered successfully.', 'id' => $newId];
        }
    }

    public function updateBedStatus(int $id, string $status): array
    {
        $validStatuses = ['Available', 'Occupied', 'Reserved', 'Pending Discharge', 'Dirty / Turnover', 'Maintenance', 'Blocked'];
        if (!in_array($status, $validStatuses, true)) {
            return ['success' => false, 'message' => "Invalid status: {$status}."];
        }

        $bed = $this->findBed($id);
        if (!$bed) {
            return ['success' => false, 'message' => 'Bed not found.'];
        }

        if ($bed['status'] === 'Occupied' && $status === 'Available') {
            return ['success' => false, 'message' => 'Bed currently has an active patient admission. Please process discharge or transfer through Inpatient ADT.'];
        }

        $this->db->prepare("UPDATE hospital_beds SET status = :status WHERE id = :id")->execute([':status' => $status, ':id' => $id]);

        if (!empty($bed['room_id'])) {
            $this->syncRoomStatus((int)$bed['room_id']);
        }

        return ['success' => true, 'message' => "Bed status updated to {$status}."];
    }

    public function deleteBed(int $id): array
    {
        $bed = $this->findBed($id);
        if (!$bed) return ['success' => false, 'message' => 'Bed not found.'];

        if ($bed['status'] === 'Occupied') {
            return ['success' => false, 'message' => 'Cannot delete an occupied bed. Discharge or transfer the patient first.'];
        }

        $this->db->prepare("DELETE FROM hospital_beds WHERE id = :id")->execute([':id' => $id]);

        if (!empty($bed['room_id'])) {
            $this->syncRoomStatus((int)$bed['room_id']);
        }

        return ['success' => true, 'message' => 'Bed removed successfully.'];
    }

    // =========================================================================
    // HOSPITAL AVAILABILITY MONITOR & CENSUS
    // =========================================================================

    public function getHospitalAvailabilityMonitor(array $filters = []): array
    {
        // 1. Compute Top-Level KPIs
        $totalBeds = (int)$this->db->query("SELECT COUNT(*) FROM hospital_beds WHERE is_active = 1")->fetchColumn();
        $availableBeds = (int)$this->db->query("SELECT COUNT(*) FROM hospital_beds WHERE is_active = 1 AND status = 'Available'")->fetchColumn();
        $occupiedBeds = (int)$this->db->query("SELECT COUNT(*) FROM hospital_beds WHERE is_active = 1 AND status = 'Occupied'")->fetchColumn();
        $reservedBeds = (int)$this->db->query("SELECT COUNT(*) FROM hospital_beds WHERE is_active = 1 AND status = 'Reserved'")->fetchColumn();
        $dirtyBeds = (int)$this->db->query("SELECT COUNT(*) FROM hospital_beds WHERE is_active = 1 AND status = 'Dirty / Turnover'")->fetchColumn();
        $maintenanceBeds = (int)$this->db->query("SELECT COUNT(*) FROM hospital_beds WHERE is_active = 1 AND status IN ('Maintenance', 'Blocked')")->fetchColumn();

        $occupancyRate = $totalBeds > 0 ? round(($occupiedBeds / $totalBeds) * 100, 1) : 0;

        $totalRooms = (int)$this->db->query("SELECT COUNT(*) FROM hospital_rooms WHERE is_active = 1")->fetchColumn();
        $availableRooms = (int)$this->db->query("SELECT COUNT(*) FROM hospital_rooms WHERE is_active = 1 AND status = 'Available'")->fetchColumn();
        $occupiedRooms = (int)$this->db->query("SELECT COUNT(*) FROM hospital_rooms WHERE is_active = 1 AND status IN ('Occupied', 'Partially Occupied')")->fetchColumn();

        // 2. Fetch Buildings with Floors and Rooms
        $buildings = $this->listBuildings(true);

        // Fetch all rooms matching filters
        $rooms = $this->listRooms($filters);

        // Fetch beds for all rooms in one query
        $roomIds = array_column($rooms, 'id');
        $bedsByRoom = [];

        if (!empty($roomIds)) {
            $inClause = implode(',', array_map('intval', $roomIds));
            $bedsSql = "SELECT b.*, 
                               a.admission_number, a.patient_name, a.patient_mrn, a.patient_age, a.gender,
                               a.admitting_diagnosis, a.admission_date, a.attending_physician
                        FROM hospital_beds b
                        LEFT JOIN inpatient_admissions a ON b.current_admission_id = a.id
                        WHERE b.room_id IN ({$inClause}) AND b.is_active = 1
                        ORDER BY b.bed_number ASC";
            $bedsResult = $this->db->query($bedsSql)->fetchAll(PDO::FETCH_ASSOC);
            foreach ($bedsResult as $b) {
                $bedsByRoom[$b['room_id']][] = $b;
            }
        }

        // Attach beds to rooms and organize by building and floor
        $buildingsMap = [];
        foreach ($buildings as $b) {
            $buildingsMap[$b['id']] = $b;
            $buildingsMap[$b['id']]['floors'] = [];
        }

        foreach ($rooms as $r) {
            $r['beds'] = $bedsByRoom[$r['id']] ?? [];
            $bldgId = $r['building_id'];
            $floor = $r['floor_number'] ?: 'Floor 1';

            if (isset($buildingsMap[$bldgId])) {
                $buildingsMap[$bldgId]['floors'][$floor][] = $r;
            }
        }

        return [
            'kpis' => [
                'total_beds'        => $totalBeds,
                'available_beds'    => $availableBeds,
                'occupied_beds'     => $occupiedBeds,
                'reserved_beds'     => $reservedBeds,
                'dirty_beds'        => $dirtyBeds,
                'maintenance_beds'  => $maintenanceBeds,
                'occupancy_rate'    => $occupancyRate,
                'total_rooms'       => $totalRooms,
                'available_rooms'   => $availableRooms,
                'occupied_rooms'    => $occupiedRooms
            ],
            'buildings' => array_values($buildingsMap),
            'rooms_flat' => $rooms
        ];
    }

    // =========================================================================
    // INTERNAL HELPERS
    // =========================================================================

    public function syncRoomStatus(int $roomId): void
    {
        $stmt = $this->db->prepare("
            SELECT b.status, r.max_beds
            FROM hospital_beds b
            JOIN hospital_rooms r ON b.room_id = r.id
            WHERE b.room_id = :rid AND b.is_active = 1
        ");
        $stmt->execute([':rid' => $roomId]);
        $beds = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($beds)) {
            $this->db->prepare("UPDATE hospital_rooms SET status = 'Available' WHERE id = :id")->execute([':id' => $roomId]);
            return;
        }

        $maxBeds = (int)$beds[0]['max_beds'];
        $totalBeds = count($beds);
        $occupiedCount = 0;
        $reservedCount = 0;
        $dirtyCount = 0;
        $maintCount = 0;

        foreach ($beds as $b) {
            if ($b['status'] === 'Occupied') $occupiedCount++;
            else if ($b['status'] === 'Reserved') $reservedCount++;
            else if ($b['status'] === 'Dirty / Turnover') $dirtyCount++;
            else if (in_array($b['status'], ['Maintenance', 'Blocked'])) $maintCount++;
        }

        $newStatus = 'Available';
        if ($occupiedCount >= $maxBeds || $occupiedCount >= $totalBeds) {
            $newStatus = 'Occupied';
        } else if ($occupiedCount > 0) {
            $newStatus = 'Partially Occupied';
        } else if ($reservedCount > 0) {
            $newStatus = 'Partially Occupied';
        } else if ($dirtyCount > 0) {
            $newStatus = 'Dirty / Turnover';
        } else if ($maintCount === $totalBeds) {
            $newStatus = 'Maintenance';
        }

        $this->db->prepare("UPDATE hospital_rooms SET status = :status WHERE id = :id")
                 ->execute([':status' => $newStatus, ':id' => $roomId]);
    }

    private function mapDefaultBedType(string $roomType): string
    {
        switch ($roomType) {
            case 'ICU':
                return 'ICU Monitor Bed';
            case 'Isolation':
                return 'Negative Pressure Isolation';
            case 'Semi-Private':
                return 'Stepdown Bed';
            case 'Deluxe Suite':
            case 'Private':
                return 'Standard Acute Bed';
            case 'Emergency Bay':
                return 'Standard Acute Bed';
            default:
                return 'Standard Acute Bed';
        }
    }
}
