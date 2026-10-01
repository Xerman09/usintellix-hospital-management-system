<?php

namespace App\Modules\Departments\Services;

use App\Core\Database;
use App\Modules\Departments\Models\Department;
use PDO;
use PDOException;
use Throwable;

class DepartmentService
{
    public const VALID_TYPES = [
        'Clinical',
        'Inpatient',
        'Outpatient',
        'Emergency',
        'Surgical',
        'Diagnostic',
        'Laboratory',
        'Administrative',
        'Support Services'
    ];

    public const VALID_STATUSES = [
        'active',
        'inactive',
        'maintenance'
    ];

    /**
     * List all departments with staff count, facility, and head of department.
     */
    public function list(array $filters = []): array
    {
        $db = Database::connection();
        $conditions = ["d.deleted_at IS NULL"];
        $params = [];

        if (!empty($filters['keyword'])) {
            $kw = '%' . trim($filters['keyword']) . '%';
            $conditions[] = "(d.name LIKE ? OR d.code LIKE ? OR d.location LIKE ? OR d.description LIKE ?)";
            $params[] = $kw;
            $params[] = $kw;
            $params[] = $kw;
            $params[] = $kw;
        }

        if (!empty($filters['type']) && $filters['type'] !== 'all') {
            $conditions[] = "d.type = ?";
            $params[] = trim($filters['type']);
        }

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $conditions[] = "d.status = ?";
            $params[] = trim($filters['status']);
        }

        if (!empty($filters['facility_id']) && (int) $filters['facility_id'] > 0) {
            $conditions[] = "d.facility_id = ?";
            $params[] = (int) $filters['facility_id'];
        }

        if (isset($filters['med_inventory']) && $filters['med_inventory'] !== 'all' && $filters['med_inventory'] !== '') {
            $conditions[] = "d.has_medication_inventory = ?";
            $params[] = (int) $filters['med_inventory'];
        }

        $whereClause = implode(" AND ", $conditions);

        $sql = "
            SELECT d.id, d.code, d.name, d.type, d.head_of_department_id, d.phone, d.email,
                   d.location, d.facility_id, d.operating_hours, d.status, d.description,
                   d.has_medication_inventory,
                   d.created_at, d.updated_at,
                   f.name AS facility_name,
                   NULLIF(TRIM(CONCAT(e.first_name, ' ', e.last_name)), '') AS head_name,
                   e.email AS head_email,
                   e.phone AS head_phone,
                   (SELECT COUNT(*) FROM employees emp WHERE emp.department_id = d.id AND emp.deleted_at IS NULL) AS staff_count
            FROM departments d
            LEFT JOIN facilities f ON f.id = d.facility_id AND f.deleted_at IS NULL
            LEFT JOIN employees e ON e.id = d.head_of_department_id AND e.deleted_at IS NULL
            WHERE {$whereClause}
            ORDER BY d.name ASC
        ";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get a single department by ID.
     */
    public function getById(int $id): ?array
    {
        $db = Database::connection();
        $sql = "
            SELECT d.id, d.code, d.name, d.type, d.head_of_department_id, d.phone, d.email,
                   d.location, d.facility_id, d.operating_hours, d.status, d.description,
                   d.has_medication_inventory,
                   d.created_at, d.updated_at,
                   f.name AS facility_name,
                   NULLIF(TRIM(CONCAT(e.first_name, ' ', e.last_name)), '') AS head_name,
                   e.email AS head_email,
                   e.phone AS head_phone,
                   (SELECT COUNT(*) FROM employees emp WHERE emp.department_id = d.id AND emp.deleted_at IS NULL) AS staff_count
            FROM departments d
            LEFT JOIN facilities f ON f.id = d.facility_id AND f.deleted_at IS NULL
            LEFT JOIN employees e ON e.id = d.head_of_department_id AND e.deleted_at IS NULL
            WHERE d.id = ? AND d.deleted_at IS NULL
            LIMIT 1
        ";

        $stmt = $db->prepare($sql);
        $stmt->execute([$id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return $result ?: null;
    }

    /**
     * Register a new department.
     */
    public function register(array $data, int $userId): array
    {
        $errors = $this->validate($data);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        $code = !empty($data['code']) ? strtoupper(trim($data['code'])) : $this->generateCode(trim($data['name']));

        try {
            $db = Database::connection();

            // Verify unique name
            $chkName = $db->prepare("SELECT id FROM departments WHERE name = ? AND deleted_at IS NULL LIMIT 1");
            $chkName->execute([trim($data['name'])]);
            if ($chkName->fetch()) {
                return [
                    'success' => false,
                    'message' => 'A department with this name already exists.',
                    'errors' => ['name' => 'Department name must be unique.']
                ];
            }

            // Verify unique code if set
            if (!empty($code)) {
                $chkCode = $db->prepare("SELECT id FROM departments WHERE code = ? AND deleted_at IS NULL LIMIT 1");
                $chkCode->execute([$code]);
                if ($chkCode->fetch()) {
                    return [
                        'success' => false,
                        'message' => 'Department code already in use.',
                        'errors' => ['code' => 'Department code must be unique.']
                    ];
                }
            }

            $stmt = $db->prepare("
                INSERT INTO departments (
                    name, code, type, head_of_department_id, phone, email,
                    location, facility_id, operating_hours, status, description,
                    has_medication_inventory,
                    created_at, created_by
                ) VALUES (
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?,
                    NOW(), ?
                )
            ");

            $type = in_array($data['type'] ?? '', self::VALID_TYPES) ? $data['type'] : 'Clinical';
            $status = in_array($data['status'] ?? '', self::VALID_STATUSES) ? $data['status'] : 'active';
            $headId = !empty($data['head_of_department_id']) ? (int) $data['head_of_department_id'] : null;
            $facilityId = !empty($data['facility_id']) ? (int) $data['facility_id'] : null;
            $operatingHours = !empty($data['operating_hours']) ? trim($data['operating_hours']) : '24/7';
            $hasMedInv = !empty($data['has_medication_inventory']) ? 1 : 0;

            $stmt->execute([
                trim($data['name']),
                $code,
                $type,
                $headId,
                !empty($data['phone']) ? trim($data['phone']) : null,
                !empty($data['email']) ? trim($data['email']) : null,
                !empty($data['location']) ? trim($data['location']) : null,
                $facilityId,
                $operatingHours,
                $status,
                !empty($data['description']) ? trim($data['description']) : null,
                $hasMedInv,
                $userId
            ]);

            $id = (int) $db->lastInsertId();

            return [
                'success' => true,
                'message' => 'Department registered successfully.',
                'data' => $this->getById($id)
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to register department: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Update an existing department.
     */
    public function update(int $id, array $data, int $userId): array
    {
        $existing = $this->getById($id);

        if (!$existing) {
            return [
                'success' => false,
                'message' => 'Department not found.'
            ];
        }

        $errors = $this->validate($data, $id);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        $code = !empty($data['code']) ? strtoupper(trim($data['code'])) : $existing['code'];

        try {
            $db = Database::connection();

            // Check name uniqueness
            $chkName = $db->prepare("SELECT id FROM departments WHERE name = ? AND id != ? AND deleted_at IS NULL LIMIT 1");
            $chkName->execute([trim($data['name']), $id]);
            if ($chkName->fetch()) {
                return [
                    'success' => false,
                    'message' => 'Another department with this name already exists.',
                    'errors' => ['name' => 'Department name must be unique.']
                ];
            }

            // Check code uniqueness
            if (!empty($code)) {
                $chkCode = $db->prepare("SELECT id FROM departments WHERE code = ? AND id != ? AND deleted_at IS NULL LIMIT 1");
                $chkCode->execute([$code, $id]);
                if ($chkCode->fetch()) {
                    return [
                        'success' => false,
                        'message' => 'Department code already in use by another department.',
                        'errors' => ['code' => 'Department code must be unique.']
                    ];
                }
            }

            $type = in_array($data['type'] ?? '', self::VALID_TYPES) ? $data['type'] : $existing['type'];
            $status = in_array($data['status'] ?? '', self::VALID_STATUSES) ? $data['status'] : $existing['status'];
            $headId = isset($data['head_of_department_id']) && $data['head_of_department_id'] !== ''
                ? (int) $data['head_of_department_id']
                : null;
            $facilityId = isset($data['facility_id']) && $data['facility_id'] !== ''
                ? (int) $data['facility_id']
                : null;
            $operatingHours = !empty($data['operating_hours']) ? trim($data['operating_hours']) : $existing['operating_hours'];
            $hasMedInv = isset($data['has_medication_inventory'])
                ? (!empty($data['has_medication_inventory']) ? 1 : 0)
                : (int) ($existing['has_medication_inventory'] ?? 0);

            $stmt = $db->prepare("
                UPDATE departments SET
                    name = ?,
                    code = ?,
                    type = ?,
                    head_of_department_id = ?,
                    phone = ?,
                    email = ?,
                    location = ?,
                    facility_id = ?,
                    operating_hours = ?,
                    status = ?,
                    description = ?,
                    has_medication_inventory = ?,
                    updated_at = NOW(),
                    updated_by = ?
                WHERE id = ? AND deleted_at IS NULL
            ");

            $stmt->execute([
                trim($data['name']),
                $code,
                $type,
                $headId,
                !empty($data['phone']) ? trim($data['phone']) : null,
                !empty($data['email']) ? trim($data['email']) : null,
                !empty($data['location']) ? trim($data['location']) : null,
                $facilityId,
                $operatingHours,
                $status,
                !empty($data['description']) ? trim($data['description']) : null,
                $hasMedInv,
                $userId,
                $id
            ]);

            return [
                'success' => true,
                'message' => 'Department updated successfully.',
                'data' => $this->getById($id)
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to update department: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Soft delete a department.
     */
    public function delete(int $id, int $userId): array
    {
        $existing = $this->getById($id);

        if (!$existing) {
            return [
                'success' => false,
                'message' => 'Department not found.'
            ];
        }

        $db = Database::connection();

        // Check if employees are assigned
        $stmt = $db->prepare("SELECT COUNT(*) FROM employees WHERE department_id = ? AND deleted_at IS NULL");
        $stmt->execute([$id]);
        $assignedCount = (int) $stmt->fetchColumn();

        if ($assignedCount > 0) {
            return [
                'success' => false,
                'message' => "Cannot delete department: {$assignedCount} active employee(s) are currently assigned to this department. Please reassign them before deleting."
            ];
        }

        try {
            $del = $db->prepare("
                UPDATE departments 
                SET deleted_at = NOW(), deleted_by = ? 
                WHERE id = ? AND deleted_at IS NULL
            ");
            $del->execute([$userId, $id]);

            return [
                'success' => true,
                'message' => "Department '{$existing['name']}' has been removed successfully."
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to delete department: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Retrieve staff members assigned to a department.
     */
    public function getStaff(int $departmentId): array
    {
        $db = Database::connection();
        $stmt = $db->prepare("
            SELECT e.id, e.employee_no, e.first_name, e.middle_name, e.last_name, e.suffix,
                   e.sex, e.email, e.phone, e.hipaa_training_status, e.created_at,
                   u.role AS user_role, u.username
            FROM employees e
            LEFT JOIN users u ON u.id = e.user_id AND u.deleted_at IS NULL
            WHERE e.department_id = ? AND e.deleted_at IS NULL
            ORDER BY e.last_name ASC, e.first_name ASC
        ");
        $stmt->execute([$departmentId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Retrieve statistical summary for departments dashboard.
     */
    public function getStats(): array
    {
        $db = Database::connection();

        $summaryStmt = $db->query("
            SELECT 
                COUNT(*) AS total_departments,
                COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_departments,
                COUNT(CASE WHEN status = 'inactive' THEN 1 END) AS inactive_departments,
                COUNT(CASE WHEN status = 'maintenance' THEN 1 END) AS maintenance_departments,
                COUNT(CASE WHEN type IN ('Clinical', 'Inpatient', 'Outpatient', 'Emergency', 'Surgical') THEN 1 END) AS clinical_departments,
                COUNT(CASE WHEN type IN ('Diagnostic', 'Laboratory') THEN 1 END) AS diagnostic_departments,
                COUNT(CASE WHEN type IN ('Administrative', 'Support Services') THEN 1 END) AS support_departments,
                COUNT(CASE WHEN has_medication_inventory = 1 THEN 1 END) AS med_inventory_departments
            FROM departments
            WHERE deleted_at IS NULL
        ");
        $summary = $summaryStmt->fetch(PDO::FETCH_ASSOC);

        $staffStmt = $db->query("
            SELECT COUNT(*) AS total_assigned_staff
            FROM employees
            WHERE department_id IS NOT NULL AND deleted_at IS NULL
        ");
        $staffCount = (int) ($staffStmt->fetchColumn() ?: 0);

        $typeStmt = $db->query("
            SELECT type, COUNT(*) AS count
            FROM departments
            WHERE deleted_at IS NULL
            GROUP BY type
            ORDER BY count DESC
        ");
        $byType = $typeStmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'total_departments' => (int) ($summary['total_departments'] ?? 0),
            'active_departments' => (int) ($summary['active_departments'] ?? 0),
            'inactive_departments' => (int) ($summary['inactive_departments'] ?? 0),
            'maintenance_departments' => (int) ($summary['maintenance_departments'] ?? 0),
            'clinical_departments' => (int) ($summary['clinical_departments'] ?? 0),
            'diagnostic_departments' => (int) ($summary['diagnostic_departments'] ?? 0),
            'support_departments' => (int) ($summary['support_departments'] ?? 0),
            'med_inventory_departments' => (int) ($summary['med_inventory_departments'] ?? 0),
            'total_assigned_staff' => $staffCount,
            'by_type' => $byType
        ];
    }

    /**
     * Retrieve form options: facilities, potential heads, types, statuses.
     */
    public function getOptions(): array
    {
        $db = Database::connection();

        $facilitiesStmt = $db->query("
            SELECT id, name, physical_city, physical_state 
            FROM facilities 
            WHERE deleted_at IS NULL 
            ORDER BY name ASC
        ");
        $facilities = $facilitiesStmt->fetchAll(PDO::FETCH_ASSOC);

        $employeesStmt = $db->query("
            SELECT e.id, e.employee_no, 
                   TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))) AS full_name,
                   TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))) AS name,
                   e.email,
                   u.username,
                   r.name AS user_role,
                   d.name AS current_department
            FROM employees e
            LEFT JOIN users u ON u.id = e.user_id AND u.deleted_at IS NULL
            LEFT JOIN roles r ON r.id = u.role_id AND r.deleted_at IS NULL
            LEFT JOIN departments d ON d.id = e.department_id AND d.deleted_at IS NULL
            WHERE e.deleted_at IS NULL
            ORDER BY e.last_name ASC, e.first_name ASC
        ");
        $employees = $employeesStmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'types' => self::VALID_TYPES,
            'statuses' => self::VALID_STATUSES,
            'facilities' => $facilities,
            'employees' => $employees
        ];
    }

    /**
     * Validates input data.
     */
    private function validate(array $data, ?int $id = null): array
    {
        $errors = [];

        if (empty(trim($data['name'] ?? ''))) {
            $errors['name'] = 'Department name is required.';
        } elseif (strlen(trim($data['name'])) < 2) {
            $errors['name'] = 'Department name must be at least 2 characters.';
        }

        if (!empty($data['email']) && !filter_var(trim($data['email']), FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'A valid email address is required.';
        }

        if (!empty($data['type']) && !in_array($data['type'], self::VALID_TYPES)) {
            $errors['type'] = 'Invalid department classification type.';
        }

        if (!empty($data['status']) && !in_array($data['status'], self::VALID_STATUSES)) {
            $errors['status'] = 'Invalid department status.';
        }

        return $errors;
    }

    /**
     * Auto-generate code from department name if not supplied.
     */
    private function generateCode(string $name): string
    {
        $clean = preg_replace('/[^A-Za-z0-9 ]/', '', $name);
        $words = explode(' ', trim($clean));

        if (count($words) === 1) {
            return strtoupper(substr($words[0], 0, 5));
        }

        $code = '';
        foreach ($words as $w) {
            if (!empty($w)) {
                $code .= strtoupper($w[0]);
            }
        }

        if (strlen($code) < 3) {
            $code = strtoupper(substr(str_replace(' ', '', $name), 0, 4));
        }

        return substr($code, 0, 8);
    }
}
