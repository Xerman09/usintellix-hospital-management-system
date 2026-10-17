<?php

namespace App\Modules\DepartmentOrg\Services;

use App\Core\AuditLogger;
use App\Core\Database;
use PDO;
use Throwable;

class DepartmentOrgService
{
    /**
     * Get complete visual organizational hierarchy tree for a facility.
     */
    public function getFacilityOrgTree(?int $facilityId = null): array
    {
        $db = Database::connection();

        // 1. Fetch all facilities for selector
        $facilities = $db->query("SELECT id, name, physical_city, phone, email, is_inactive FROM facilities WHERE deleted_at IS NULL ORDER BY name")->fetchAll(PDO::FETCH_ASSOC);

        if (empty($facilities)) {
            return [
                'success' => false,
                'message' => 'No active hospital facilities found.'
            ];
        }

        // Determine target facility
        if ($facilityId === null) {
            $found = false;
            foreach ($facilities as $f) {
                if ((int) $f['id'] === 2) {
                    $facilityId = 2;
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                $facilityId = (int) $facilities[0]['id'];
            }
        }

        // Fetch selected facility details
        $fStmt = $db->prepare("SELECT * FROM facilities WHERE id = :id LIMIT 1");
        $fStmt->execute(['id' => $facilityId]);
        $currentFacility = $fStmt->fetch(PDO::FETCH_ASSOC);

        // 2. Fetch all departments in this facility
        $dSql = "SELECT d.*, 
                        e.id AS head_employee_id,
                        e.first_name AS head_first_name,
                        e.last_name AS head_last_name,
                        e.suffix AS head_suffix,
                        e.email AS head_email,
                        e.phone AS head_phone,
                        e.assignment_notes AS head_notes,
                        u.avatar AS head_avatar,
                        r.name AS head_role_name
                 FROM departments d
                 LEFT JOIN employees e ON e.id = d.head_of_department_id AND e.deleted_at IS NULL
                 LEFT JOIN users u ON u.id = e.user_id
                 LEFT JOIN roles r ON r.id = u.role_id
                 WHERE (d.facility_id = :facility_id OR d.facility_id IS NULL)
                   AND d.deleted_at IS NULL
                 ORDER BY 
                    CASE WHEN d.type = 'Clinical' THEN 1 
                         WHEN d.type = 'Emergency' THEN 2 
                         WHEN d.type = 'Inpatient' THEN 3 
                         WHEN d.type = 'Surgical' THEN 4 
                         WHEN d.type = 'Diagnostic' THEN 5 
                         ELSE 6 
                    END,
                    d.name ASC";

        $dStmt = $db->prepare($dSql);
        $dStmt->execute(['facility_id' => $facilityId]);
        $departments = $dStmt->fetchAll(PDO::FETCH_ASSOC);

        // 3. Fetch all wards and rooms mapped to departments
        $wSql = "SELECT w.*, 
                        (SELECT COUNT(*) FROM hospital_rooms r WHERE r.ward_id = w.id AND r.is_active = 1) AS rooms_count,
                        (SELECT COUNT(*) FROM hospital_beds b JOIN hospital_rooms hr ON hr.id = b.room_id WHERE hr.ward_id = w.id) AS actual_beds_count
                 FROM hospital_wards w
                 WHERE w.is_active = 1
                 ORDER BY w.ward_name ASC";
        $wards = $db->query($wSql)->fetchAll(PDO::FETCH_ASSOC);

        // Fetch rooms for each ward
        $rSql = "SELECT r.id, r.ward_id, r.building_id, r.room_number, r.room_name, r.room_type, r.status, r.daily_rate, r.max_beds
                 FROM hospital_rooms r
                 WHERE r.is_active = 1
                 ORDER BY r.room_number ASC";
        $rooms = $db->query($rSql)->fetchAll(PDO::FETCH_ASSOC);

        $wardRoomsMap = [];
        foreach ($rooms as $room) {
            $wId = $room['ward_id'];
            if ($wId) {
                $wardRoomsMap[$wId][] = $room;
            }
        }

        $deptWardsMap = [];
        foreach ($wards as $ward) {
            $wId = $ward['id'];
            $ward['rooms'] = $wardRoomsMap[$wId] ?? [];
            $dId = $ward['department_id'];
            if ($dId) {
                $deptWardsMap[$dId][] = $ward;
            }
        }

        // 4. Fetch all medical staff assigned to departments
        $staffSql = "SELECT e.id AS employee_id,
                            e.user_id,
                            e.employee_no,
                            e.first_name,
                            e.last_name,
                            e.suffix,
                            e.email,
                            e.phone,
                            e.department_id,
                            e.secondary_department_id,
                            e.duty_tag,
                            e.assignment_notes,
                            u.status AS account_status,
                            u.avatar,
                            r.name AS role_name,
                            eda.assignment_type
                     FROM employees e
                     JOIN users u ON u.id = e.user_id AND u.deleted_at IS NULL
                     LEFT JOIN roles r ON r.id = u.role_id
                     LEFT JOIN employee_department_assignments eda ON eda.employee_id = e.id
                     WHERE e.deleted_at IS NULL
                     ORDER BY 
                        CASE WHEN r.name = 'doctor' THEN 1
                             WHEN r.name = 'charge_nurse' THEN 2
                             WHEN r.name = 'nurse' THEN 3
                             ELSE 4
                        END,
                        e.last_name ASC";

        $allStaff = $db->query($staffSql)->fetchAll(PDO::FETCH_ASSOC);

        $deptStaffMap = [];
        $uniqueStaffPerDept = [];

        foreach ($allStaff as $st) {
            $eId = $st['employee_id'];
            $pDept = $st['department_id'];
            $sDept = $st['secondary_department_id'];

            if ($pDept) {
                if (!isset($uniqueStaffPerDept[$pDept][$eId])) {
                    $uniqueStaffPerDept[$pDept][$eId] = true;
                    $stCopy = $st;
                    $stCopy['is_primary_dept'] = true;
                    $deptStaffMap[$pDept][] = $stCopy;
                }
            }

            if ($sDept && $sDept !== $pDept) {
                if (!isset($uniqueStaffPerDept[$sDept][$eId])) {
                    $uniqueStaffPerDept[$sDept][$eId] = true;
                    $stCopy = $st;
                    $stCopy['is_primary_dept'] = false;
                    $stCopy['duty_tag'] = 'secondary';
                    $deptStaffMap[$sDept][] = $stCopy;
                }
            }
        }

        // 5. Fetch equipment counts per department
        $eqSql = "SELECT department_id, COUNT(*) AS equipment_count,
                         COUNT(CASE WHEN criticality_level = 'Life Critical' THEN 1 END) AS life_critical_count
                  FROM hospital_equipment_assets
                  WHERE deleted_at IS NULL
                  GROUP BY department_id";
        $eqResults = $db->query($eqSql)->fetchAll(PDO::FETCH_ASSOC);
        $eqMap = [];
        foreach ($eqResults as $eq) {
            $eqMap[$eq['department_id']] = $eq;
        }

        // 6. Assemble complete tree with stats
        $totalHospitalStaff = 0;
        $totalHospitalDoctors = 0;
        $totalHospitalNurses = 0;
        $totalHospitalWards = 0;
        $totalHospitalBeds = 0;
        $totalHeadsAppointed = 0;

        $treeDepartments = [];
        foreach ($departments as $dept) {
            $dId = $dept['id'];
            $deptWards = $deptWardsMap[$dId] ?? [];
            $deptStaff = $deptStaffMap[$dId] ?? [];
            $deptEq = $eqMap[$dId] ?? ['equipment_count' => 0, 'life_critical_count' => 0];

            $docCount = 0;
            $nurseCount = 0;
            foreach ($deptStaff as $s) {
                if ($s['role_name'] === 'doctor') $docCount++;
                elseif (in_array($s['role_name'], ['nurse', 'charge_nurse', 'cna'], true)) $nurseCount++;
            }

            $wardBedsSum = 0;
            foreach ($deptWards as $w) {
                $wardBedsSum += (int) $w['total_beds_count'];
            }

            if (!empty($dept['head_employee_id'])) {
                $totalHeadsAppointed++;
            }

            $totalHospitalStaff += count($deptStaff);
            $totalHospitalDoctors += $docCount;
            $totalHospitalNurses += $nurseCount;
            $totalHospitalWards += count($deptWards);
            $totalHospitalBeds += $wardBedsSum;

            $dept['wards'] = $deptWards;
            $dept['staff'] = $deptStaff;
            $dept['equipment'] = $deptEq;
            $dept['counts'] = [
                'total_staff'   => count($deptStaff),
                'doctors_count' => $docCount,
                'nurses_count'  => $nurseCount,
                'wards_count'   => count($deptWards),
                'beds_count'    => $wardBedsSum,
                'equipment_count' => (int) $deptEq['equipment_count']
            ];

            $treeDepartments[] = $dept;
        }

        return [
            'success'  => true,
            'facility' => $currentFacility,
            'facilities' => $facilities,
            'tree'     => $treeDepartments,
            'kpis'     => [
                'total_departments' => count($departments),
                'heads_appointed'   => $totalHeadsAppointed,
                'total_staff'       => $totalHospitalStaff,
                'total_doctors'     => $totalHospitalDoctors,
                'total_nurses'      => $totalHospitalNurses,
                'total_wards'       => $totalHospitalWards,
                'total_beds'        => $totalHospitalBeds
            ]
        ];
    }

    /**
     * Appoint / change Head of Department (Doctor/Chair).
     */
    public function assignHeadOfDepartment(int $departmentId, int $employeeId, int $userId): array
    {
        $db = Database::connection();

        $dStmt = $db->prepare("SELECT id, name FROM departments WHERE id = :id AND deleted_at IS NULL");
        $dStmt->execute(['id' => $departmentId]);
        $dept = $dStmt->fetch(PDO::FETCH_ASSOC);

        if (!$dept) {
            return ['success' => false, 'message' => 'Department not found.'];
        }

        $eStmt = $db->prepare("SELECT e.id, e.first_name, e.last_name, e.suffix, r.name AS role_name 
                               FROM employees e 
                               JOIN users u ON u.id = e.user_id 
                               LEFT JOIN roles r ON r.id = u.role_id 
                               WHERE e.id = :id AND e.deleted_at IS NULL");
        $eStmt->execute(['id' => $employeeId]);
        $emp = $eStmt->fetch(PDO::FETCH_ASSOC);

        if (!$emp) {
            return ['success' => false, 'message' => 'Doctor / Employee not found.'];
        }

        $uStmt = $db->prepare("UPDATE departments SET head_of_department_id = :emp_id, updated_at = NOW(), updated_by = :user_id WHERE id = :dept_id");
        $uStmt->execute([
            'emp_id'  => $employeeId,
            'user_id' => $userId,
            'dept_id' => $departmentId
        ]);

        $doctorFullName = "Dr. {$emp['first_name']} {$emp['last_name']}" . ($emp['suffix'] ? ", {$emp['suffix']}" : '');

        AuditLogger::log(
            AuditLogger::CATEGORY_SECURITY,
            'DEPARTMENT_HEAD_APPOINTED',
            "Appointed {$doctorFullName} as Head of Department for '{$dept['name']}' (Dept ID: {$departmentId}).",
            null,
            $userId
        );

        return [
            'success' => true,
            'message' => "Successfully appointed {$doctorFullName} as Head of Department for {$dept['name']}."
        ];
    }

    /**
     * Assign or move an inpatient ward to a department.
     */
    public function assignWardToDepartment(int $wardId, int $departmentId, int $userId): array
    {
        $db = Database::connection();

        $wStmt = $db->prepare("SELECT id, ward_name, ward_code FROM hospital_wards WHERE id = :id");
        $wStmt->execute(['id' => $wardId]);
        $ward = $wStmt->fetch(PDO::FETCH_ASSOC);

        if (!$ward) {
            return ['success' => false, 'message' => 'Ward not found.'];
        }

        $dStmt = $db->prepare("SELECT id, name FROM departments WHERE id = :id AND deleted_at IS NULL");
        $dStmt->execute(['id' => $departmentId]);
        $dept = $dStmt->fetch(PDO::FETCH_ASSOC);

        if (!$dept) {
            return ['success' => false, 'message' => 'Department not found.'];
        }

        $stmt = $db->prepare("UPDATE hospital_wards SET department_id = :dept_id, updated_at = NOW() WHERE id = :ward_id");
        $stmt->execute([
            'dept_id' => $departmentId,
            'ward_id' => $wardId
        ]);

        AuditLogger::log(
            AuditLogger::CATEGORY_SECURITY,
            'WARD_DEPARTMENT_ASSIGNED',
            "Assigned Ward '{$ward['ward_name']}' ({$ward['ward_code']}) to Department '{$dept['name']}'.",
            null,
            $userId
        );

        return [
            'success' => true,
            'message' => "Ward {$ward['ward_name']} assigned to {$dept['name']} successfully."
        ];
    }
}
