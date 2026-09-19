<?php

namespace App\Modules\Announcements\Services;

use App\Core\Database;
use App\Modules\Announcements\Models\Announcement;
use App\Modules\Announcements\Models\AnnouncementRole;
use App\Modules\Roles\Models\Role;
use PDO;
use Throwable;

class AnnouncementService
{
    private const ALLOWED_MIME_TYPES = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
        'image/gif'  => 'gif',
    ];

    private const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    /**
     * List selectable roles for the audience target dropdown/checkboxes.
     */
    public function getSelectableRoles(): array
    {
        $db = Database::connection();

        // 1. Roles table
        $stmt = $db->prepare(
            "SELECT id, name, description FROM roles WHERE deleted_at IS NULL ORDER BY id ASC"
        );
        $stmt->execute();
        $dbRoles = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 2. ACL Groups table
        $aclGroups = [];
        try {
            $stmtAcl = $db->prepare(
                "SELECT id, name, description FROM acl_groups WHERE deleted_at IS NULL ORDER BY id ASC"
            );
            $stmtAcl->execute();
            $aclGroups = $stmtAcl->fetchAll(PDO::FETCH_ASSOC);
        } catch (Throwable $e) {}

        // Canonical hospital roles
        $canonicalRoles = [
            'admin' => [
                'role' => 'admin',
                'label' => 'Administrators / Admin',
                'aliases' => ['admin', 'administrator', 'administrators'],
                'description' => 'System and clinic administrators'
            ],
            'doctor' => [
                'role' => 'doctor',
                'label' => 'Doctors / Physicians',
                'aliases' => ['doctor', 'doctors', 'physician', 'physicians'],
                'description' => 'Medical doctors and attending physicians'
            ],
            'clinician' => [
                'role' => 'clinician',
                'label' => 'Clinicians',
                'aliases' => ['clinician', 'clinicians'],
                'description' => 'Clinical documentation and care staff'
            ],
            'nurse' => [
                'role' => 'nurse',
                'label' => 'Nurses',
                'aliases' => ['nurse', 'nurses'],
                'description' => 'Registered nurses and clinical support'
            ],
            'receptionist' => [
                'role' => 'receptionist',
                'label' => 'Front Desk / Receptionists',
                'aliases' => ['receptionist', 'receptionists', 'front_office', 'front office'],
                'description' => 'Front desk and scheduling staff'
            ],
            'accountant' => [
                'role' => 'accountant',
                'label' => 'Accounting & Billing',
                'aliases' => ['accountant', 'accountants', 'accounting', 'billing'],
                'description' => 'Billing managers and accounting specialists'
            ],
            'pharmacist' => [
                'role' => 'pharmacist',
                'label' => 'Pharmacists',
                'aliases' => ['pharmacist', 'pharmacists'],
                'description' => 'Pharmacy specialists'
            ],
            'lab_technician' => [
                'role' => 'lab_technician',
                'label' => 'Laboratory Technicians',
                'aliases' => ['lab_technician', 'lab technicians', 'laboratory'],
                'description' => 'Diagnostic and lab technicians'
            ],
            'emergency_login' => [
                'role' => 'emergency_login',
                'label' => 'Emergency Staff',
                'aliases' => ['emergency_login', 'emergency'],
                'description' => 'Break-glass and emergency personnel'
            ],
            'staff' => [
                'role' => 'staff',
                'label' => 'General Hospital Staff',
                'aliases' => ['staff'],
                'description' => 'All hospital employee accounts'
            ],
            'patient' => [
                'role' => 'patient',
                'label' => 'Patients (Portal Users)',
                'aliases' => ['patient', 'patients'],
                'description' => 'Patient portal user accounts'
            ]
        ];

        // Include any custom roles from database that are not covered above
        foreach ($dbRoles as $r) {
            $k = strtolower(trim($r['name']));
            $found = false;
            foreach ($canonicalRoles as $c) {
                if (in_array($k, $c['aliases'], true)) {
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                $label = ucwords(str_replace('_', ' ', $k));
                $canonicalRoles[$k] = [
                    'role' => $k,
                    'label' => $label,
                    'aliases' => [$k],
                    'description' => $r['description'] ?: "{$label} role"
                ];
            }
        }

        // Include custom ACL groups if any
        foreach ($aclGroups as $g) {
            $raw = trim($g['name']);
            $k = strtolower(str_replace(' ', '_', $raw));
            $found = false;
            foreach ($canonicalRoles as $c) {
                if (in_array($k, $c['aliases'], true) || in_array(strtolower($raw), $c['aliases'], true)) {
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                $canonicalRoles[$k] = [
                    'role' => $k,
                    'label' => $raw,
                    'aliases' => [$k, strtolower($raw)],
                    'description' => $g['description'] ?: "{$raw} group"
                ];
            }
        }

        return array_values($canonicalRoles);
    }

    /**
     * Get active announcements for a given user role.
     */
    public function getActiveForUser(string $userRole): array
    {
        return $this->list([], $userRole, false);
    }

    /**
     * List announcements.
     * In management mode: returns all announcements with pagination/filter info.
     * In normal/active mode: returns only active announcements for the given role.
     */
    public function list(array $filters = [], ?string $userRole = null, bool $managementMode = false): array
    {
        $db = Database::connection();
        $now = date('Y-m-d H:i:s');

        if (!$managementMode) {
            // End-user / Dashboard active feed
            $roleLower = strtolower(trim($userRole ?: 'patient'));

            // Build matching aliases for the user's role
            $aliases = [$roleLower, 'all'];
            if (in_array($roleLower, ['admin', 'administrator', 'administrators'], true)) {
                $aliases = array_merge($aliases, ['admin', 'administrator', 'administrators', 'staff']);
            }
            if (in_array($roleLower, ['doctor', 'physician', 'physicians', 'clinician', 'clinicians'], true)) {
                $aliases = array_merge($aliases, ['doctor', 'doctors', 'physician', 'physicians', 'clinician', 'clinicians', 'staff']);
            }
            if (in_array($roleLower, ['receptionist', 'front_office', 'front office'], true)) {
                $aliases = array_merge($aliases, ['receptionist', 'receptionists', 'front_office', 'front office', 'staff']);
            }
            if (in_array($roleLower, ['accountant', 'accounting', 'billing'], true)) {
                $aliases = array_merge($aliases, ['accountant', 'accountants', 'accounting', 'billing', 'staff']);
            }
            if (in_array($roleLower, ['nurse', 'nurses', 'pharmacist', 'pharmacists', 'lab_technician', 'emergency_login'], true)) {
                $aliases = array_merge($aliases, ['staff']);
            }

            $uniqueAliases = array_values(array_unique(array_map('strtolower', $aliases)));
            $inPlaceholders = implode(',', array_fill(0, count($uniqueAliases), '?'));

            $sql = "
                SELECT DISTINCT a.*, 
                       DATE_FORMAT(a.start_date, '%Y-%m-%d %H:%i') AS formatted_start,
                       DATE_FORMAT(a.end_date, '%Y-%m-%d %H:%i') AS formatted_end
                FROM announcements a
                INNER JOIN announcement_roles ar ON ar.announcement_id = a.id
                WHERE a.deleted_at IS NULL
                  AND a.status = 'active'
                  AND a.start_date <= ?
                  AND (a.end_date IS NULL OR a.end_date >= ?)
                  AND LOWER(ar.role_name) IN ({$inPlaceholders})
                ORDER BY 
                  CASE a.priority
                    WHEN 'urgent' THEN 1
                    WHEN 'important' THEN 2
                    ELSE 3
                  END ASC,
                  a.start_date DESC
            ";

            $stmt = $db->prepare($sql);
            $execParams = array_merge([$now, $now], $uniqueAliases);
            $stmt->execute($execParams);

            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Attach roles to each row
            return array_map(function ($row) {
                $row['computed_status'] = 'active';
                $row['target_roles'] = $this->getRolesForAnnouncement((int) $row['id']);
                return $row;
            }, $rows);
        }

        // Management mode (Admin / Staff view under Miscellaneous)
        $where = ["a.deleted_at IS NULL"];
        $params = [];

        if (!empty($filters['search'])) {
            $where[] = "(a.title LIKE :search OR a.content LIKE :search)";
            $params['search'] = '%' . trim($filters['search']) . '%';
        }

        if (!empty($filters['priority']) && $filters['priority'] !== 'all') {
            $where[] = "a.priority = :priority";
            $params['priority'] = $filters['priority'];
        }

        $statusFilter = $filters['status'] ?? 'all';
        if ($statusFilter === 'active') {
            $where[] = "a.status = 'active' AND a.start_date <= :now_active AND (a.end_date IS NULL OR a.end_date >= :now_active_end)";
            $params['now_active'] = $now;
            $params['now_active_end'] = $now;
        } elseif ($statusFilter === 'scheduled') {
            $where[] = "a.status = 'active' AND a.start_date > :now_scheduled";
            $params['now_scheduled'] = $now;
        } elseif ($statusFilter === 'expired') {
            $where[] = "a.status = 'active' AND a.end_date IS NOT NULL AND a.end_date < :now_expired";
            $params['now_expired'] = $now;
        } elseif ($statusFilter === 'inactive') {
            $where[] = "a.status = 'inactive'";
        }

        $roleFilter = !empty($filters['role']) ? strtolower(trim($filters['role'])) : null;
        if ($roleFilter && $roleFilter !== 'all') {
            $where[] = "EXISTS (
                SELECT 1 FROM announcement_roles ar2 
                WHERE ar2.announcement_id = a.id 
                  AND (LOWER(ar2.role_name) = :role_filter OR LOWER(ar2.role_name) = 'all')
            )";
            $params['role_filter'] = $roleFilter;
        }

        $whereClause = implode(' AND ', $where);

        $sql = "
            SELECT a.*,
                   DATE_FORMAT(a.start_date, '%Y-%m-%d %H:%i') AS formatted_start,
                   DATE_FORMAT(a.end_date, '%Y-%m-%d %H:%i') AS formatted_end,
                   COALESCE(
                       CONCAT(e.first_name, ' ', e.last_name),
                       u.username,
                       'System'
                   ) AS author_name
            FROM announcements a
            LEFT JOIN users u ON u.id = a.created_by
            LEFT JOIN employees e ON e.user_id = u.id
            WHERE {$whereClause}
            ORDER BY a.start_date DESC, a.id DESC
        ";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $totalCount = count($rows);
        $activeCount = 0;
        $scheduledCount = 0;
        $expiredCount = 0;
        $inactiveCount = 0;

        $computedRows = [];
        foreach ($rows as $row) {
            $startDate = $row['start_date'];
            $endDate = $row['end_date'];
            $status = $row['status'];

            if ($status === 'inactive') {
                $computedStatus = 'inactive';
                $inactiveCount++;
            } elseif ($startDate > $now) {
                $computedStatus = 'scheduled';
                $scheduledCount++;
            } elseif (!empty($endDate) && $endDate < $now) {
                $computedStatus = 'expired';
                $expiredCount++;
            } else {
                $computedStatus = 'active';
                $activeCount++;
            }

            $row['computed_status'] = $computedStatus;
            $row['target_roles'] = $this->getRolesForAnnouncement((int) $row['id']);
            $computedRows[] = $row;
        }

        return [
            'announcements' => $computedRows,
            'counts' => [
                'total' => $totalCount,
                'active' => $activeCount,
                'scheduled' => $scheduledCount,
                'expired' => $expiredCount,
                'inactive' => $inactiveCount
            ]
        ];
    }

    /**
     * Get target roles for a specific announcement.
     */
    public function getRolesForAnnouncement(int $announcementId): array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT role_name FROM announcement_roles WHERE announcement_id = :id ORDER BY role_name ASC"
        );
        $stmt->execute(['id' => $announcementId]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
    }

    /**
     * Find single announcement by ID.
     */
    public function find(int $id): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare("
            SELECT a.*,
                   DATE_FORMAT(a.start_date, '%Y-%m-%d %H:%i') AS formatted_start,
                   DATE_FORMAT(a.end_date, '%Y-%m-%d %H:%i') AS formatted_end,
                   COALESCE(
                       CONCAT(e.first_name, ' ', e.last_name),
                       u.username,
                       'System'
                   ) AS author_name
            FROM announcements a
            LEFT JOIN users u ON u.id = a.created_by
            LEFT JOIN employees e ON e.user_id = u.id
            WHERE a.id = :id AND a.deleted_at IS NULL
            LIMIT 1
        ");
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $now = date('Y-m-d H:i:s');
        if ($row['status'] === 'inactive') {
            $row['computed_status'] = 'inactive';
        } elseif ($row['start_date'] > $now) {
            $row['computed_status'] = 'scheduled';
        } elseif (!empty($row['end_date']) && $row['end_date'] < $now) {
            $row['computed_status'] = 'expired';
        } else {
            $row['computed_status'] = 'active';
        }

        $row['target_roles'] = $this->getRolesForAnnouncement($id);
        return $row;
    }

    /**
     * Create a new announcement.
     */
    public function create(array $data, ?array $file, int $userId): array
    {
        $errors = $this->validate($data);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Please correct the validation errors.',
                'errors' => $errors
            ];
        }

        $imagePath = null;
        if (!empty($file) && ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
            $uploadResult = $this->handleImageUpload($file);
            if (!$uploadResult['success']) {
                return $uploadResult;
            }
            $imagePath = $uploadResult['path'];
        }

        $db = Database::connection();
        try {
            $db->beginTransaction();

            $announcementModel = new Announcement();
            $id = $announcementModel->create([
                'title'      => trim($data['title']),
                'content'    => trim($data['content']),
                'image_url'  => $imagePath,
                'start_date' => $this->normalizeDateTime($data['start_date']),
                'end_date'   => !empty($data['end_date']) ? $this->normalizeDateTime($data['end_date']) : null,
                'status'     => in_array($data['status'] ?? '', ['active', 'inactive'], true) ? $data['status'] : 'active',
                'priority'   => in_array($data['priority'] ?? '', ['normal', 'important', 'urgent'], true) ? $data['priority'] : 'normal',
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => $userId,
                'updated_at' => date('Y-m-d H:i:s'),
                'updated_by' => $userId
            ]);

            if (!$id) {
                throw new \RuntimeException('Failed to create announcement record.');
            }

            // Target roles
            $roles = $this->normalizeRoles($data['roles'] ?? ['all']);
            $roleStmt = $db->prepare(
                "INSERT INTO announcement_roles (announcement_id, role_name, created_at) VALUES (:announcement_id, :role_name, NOW())"
            );
            foreach ($roles as $role) {
                $roleStmt->execute([
                    'announcement_id' => $id,
                    'role_name' => strtolower($role)
                ]);
            }

            $db->commit();

            return [
                'success' => true,
                'message' => 'Announcement created successfully.',
                'data' => $this->find($id)
            ];
        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }

            if ($imagePath) {
                $this->removePhysicalFile($imagePath);
            }

            return [
                'success' => false,
                'message' => 'Failed to create announcement: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Update an announcement.
     */
    public function update(int $id, array $data, ?array $file, int $userId): array
    {
        $existing = $this->find($id);
        if (!$existing) {
            return [
                'success' => false,
                'message' => 'Announcement not found.'
            ];
        }

        $errors = $this->validate($data, true);
        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Please correct the validation errors.',
                'errors' => $errors
            ];
        }

        $imagePath = $existing['image_url'];
        $removeOldImage = false;

        if (!empty($data['remove_image']) && filter_var($data['remove_image'], FILTER_VALIDATE_BOOLEAN)) {
            $removeOldImage = true;
            $imagePath = null;
        }

        if (!empty($file) && ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
            $uploadResult = $this->handleImageUpload($file);
            if (!$uploadResult['success']) {
                return $uploadResult;
            }
            $removeOldImage = true;
            $imagePath = $uploadResult['path'];
        }

        $db = Database::connection();
        try {
            $db->beginTransaction();

            $updateData = [
                'title'      => trim($data['title']),
                'content'    => trim($data['content']),
                'image_url'  => $imagePath,
                'start_date' => $this->normalizeDateTime($data['start_date']),
                'end_date'   => !empty($data['end_date']) ? $this->normalizeDateTime($data['end_date']) : null,
                'status'     => in_array($data['status'] ?? '', ['active', 'inactive'], true) ? $data['status'] : 'active',
                'priority'   => in_array($data['priority'] ?? '', ['normal', 'important', 'urgent'], true) ? $data['priority'] : 'normal',
                'updated_at' => date('Y-m-d H:i:s'),
                'updated_by' => $userId
            ];

            (new Announcement())->update($updateData, $id);

            // Sync roles if provided
            if (isset($data['roles'])) {
                $roles = $this->normalizeRoles($data['roles']);
                $deleteStmt = $db->prepare("DELETE FROM announcement_roles WHERE announcement_id = :id");
                $deleteStmt->execute(['id' => $id]);

                $roleStmt = $db->prepare(
                    "INSERT INTO announcement_roles (announcement_id, role_name, created_at) VALUES (:announcement_id, :role_name, NOW())"
                );
                foreach ($roles as $role) {
                    $roleStmt->execute([
                        'announcement_id' => $id,
                        'role_name' => strtolower($role)
                    ]);
                }
            }

            $db->commit();

            if ($removeOldImage && !empty($existing['image_url']) && $existing['image_url'] !== $imagePath) {
                $this->removePhysicalFile($existing['image_url']);
            }

            return [
                'success' => true,
                'message' => 'Announcement updated successfully.',
                'data' => $this->find($id)
            ];
        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }

            if ($imagePath && $imagePath !== $existing['image_url']) {
                $this->removePhysicalFile($imagePath);
            }

            return [
                'success' => false,
                'message' => 'Failed to update announcement: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Soft-delete an announcement.
     */
    public function delete(int $id, int $userId): array
    {
        $existing = $this->find($id);
        if (!$existing) {
            return [
                'success' => false,
                'message' => 'Announcement not found.'
            ];
        }

        (new Announcement())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $userId
        ], $id);

        return [
            'success' => true,
            'message' => 'Announcement deleted successfully.'
        ];
    }

    /**
     * Validate announcement input.
     */
    private function validate(array $data, bool $isUpdate = false): array
    {
        $errors = [];

        if (empty($data['title']) || trim($data['title']) === '') {
            $errors['title'] = 'Title is required.';
        } elseif (mb_strlen($data['title']) > 255) {
            $errors['title'] = 'Title must not exceed 255 characters.';
        }

        if (empty($data['content']) || trim($data['content']) === '') {
            $errors['content'] = 'Announcement message content is required.';
        }

        if (empty($data['start_date'])) {
            $errors['start_date'] = 'Start date and time is required.';
        } elseif (!$this->isValidDateTime($data['start_date'])) {
            $errors['start_date'] = 'Start date is not a valid date/time format.';
        }

        if (!empty($data['end_date'])) {
            if (!$this->isValidDateTime($data['end_date'])) {
                $errors['end_date'] = 'End date is not a valid date/time format.';
            } else {
                $startTs = strtotime($data['start_date']);
                $endTs = strtotime($data['end_date']);
                if ($endTs < $startTs) {
                    $errors['end_date'] = 'End date must be greater than or equal to start date.';
                }
            }
        }

        return $errors;
    }

    /**
     * Process and store uploaded image.
     */
    private function handleImageUpload(array $file): array
    {
        if ($file['size'] > self::MAX_FILE_SIZE) {
            return [
                'success' => false,
                'message' => 'Image file is too large. Maximum size allowed is 10MB.'
            ];
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!isset(self::ALLOWED_MIME_TYPES[$mimeType])) {
            return [
                'success' => false,
                'message' => 'Invalid image format. Allowed formats: JPG, PNG, WEBP, GIF.'
            ];
        }

        $ext = self::ALLOWED_MIME_TYPES[$mimeType];
        $uploadDir = dirname(__DIR__, 4) . '/public/uploads/announcements';

        if (!is_dir($uploadDir)) {
            @mkdir($uploadDir, 0777, true);
        }

        $filename = 'announcement_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        $destination = $uploadDir . '/' . $filename;

        if (!@move_uploaded_file($file['tmp_name'], $destination) && !@copy($file['tmp_name'], $destination)) {
            return [
                'success' => false,
                'message' => 'Failed to save the uploaded image file.'
            ];
        }

        return [
            'success' => true,
            'path' => '/uploads/announcements/' . $filename
        ];
    }

    private function removePhysicalFile(?string $relativePath): void
    {
        if (!$relativePath) {
            return;
        }

        $fullPath = dirname(__DIR__, 4) . '/public' . $relativePath;
        if (is_file($fullPath)) {
            @unlink($fullPath);
        }
    }

    private function isValidDateTime(string $val): bool
    {
        return (bool) strtotime($val);
    }

    private function normalizeDateTime(string $val): string
    {
        return date('Y-m-d H:i:s', strtotime($val));
    }

    private function normalizeRoles($roles): array
    {
        if (is_string($roles)) {
            $roles = json_decode($roles, true) ?? explode(',', $roles);
        }

        if (!is_array($roles) || empty($roles)) {
            return ['all'];
        }

        $clean = [];
        foreach ($roles as $r) {
            $str = strtolower(trim((string) $r));
            if ($str !== '') {
                $clean[] = $str;
            }
        }

        return empty($clean) ? ['all'] : array_unique($clean);
    }
}