<?php

namespace App\Modules\Employees\Services;

use App\Core\Database;
use App\Modules\Departments\Models\Department;
use App\Modules\Employees\Models\Employee;
use App\Modules\Roles\Models\Role;
use App\Modules\Users\Models\User;
use App\Core\AuditLogger;
use PDO;
use Throwable;

class EmployeeService
{
    /**
     * List active (non-deleted) employees, optionally filtered by role name.
     */
    public function list(?string $role = null): array
    {
        $sql = "SELECT e.*, 
                       u.username, u.role_id, u.failed_login_attempts, u.locked_until, u.is_locked,
                       u.status AS user_status, u.status_reason, u.status_updated_at,
                       r.name AS role_name, 
                       d.name AS department_name,
                       d2.name AS secondary_department_name,
                       (SELECT COUNT(*) FROM user_session_histories s WHERE s.user_id = u.id AND s.is_active = 1) AS active_session_count
                FROM employees e
                JOIN users u ON u.id = e.user_id
                JOIN roles r ON r.id = u.role_id
                LEFT JOIN departments d ON d.id = e.department_id
                LEFT JOIN departments d2 ON d2.id = e.secondary_department_id
                WHERE e.deleted_at IS NULL";

        $params = [];

        if ($role !== null) {
            $sql .= " AND r.name = :role";
            $params['role'] = $role;
        }

        $sql .= " ORDER BY e.last_name, e.first_name";

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new employee account (admin-only).
     */
    public function register(array $data, int $createdBy): array
    {
        $errors = $this->validate($data);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        $db = Database::connection();
        $db->beginTransaction();

        try {
            $userStatus = in_array($data['status'] ?? 'active', ['active', 'suspended', 'locked', 'decommissioned'], true) ? $data['status'] : 'active';
            $userPayload = [
                'username'          => $data['username'],
                'password'          => User::hashPassword($data['password']),
                'role_id'           => $data['role_id'],
                'status'            => $userStatus,
                'status_reason'     => !empty($data['status_reason']) ? $data['status_reason'] : null,
                'status_updated_at' => date('Y-m-d H:i:s'),
                'status_updated_by' => $createdBy,
                'created_at'        => date('Y-m-d H:i:s'),
                'created_by'        => $createdBy
            ];

            if ($userStatus === 'locked') {
                $userPayload['is_locked'] = 1;
            }

            $userId = (new User())->create($userPayload);

            if (!$userId) {
                throw new \RuntimeException('Failed to create user account.');
            }

            $employeeNo = $this->generateEmployeeNo();
            $dutyTag = in_array($data['duty_tag'] ?? 'primary', ['primary', 'on_call', 'floater', 'consultant', 'attending', 'resident'], true) ? $data['duty_tag'] : 'primary';
            $secDeptId = !empty($data['secondary_department_id']) ? (int) $data['secondary_department_id'] : null;

            $employeeId = (new Employee())->create([
                'user_id'                 => $userId,
                'employee_no'             => $employeeNo,
                'first_name'              => $data['first_name'],
                'middle_name'             => $data['middle_name'] ?? null,
                'last_name'               => $data['last_name'],
                'suffix'                  => $data['suffix'] ?? null,
                'sex'                     => $data['sex'],
                'birthdate'               => $data['birthdate'],
                'email'                   => $data['email'],
                'phone'                   => $data['phone'],
                'department_id'           => $data['department_id'],
                'secondary_department_id' => $secDeptId,
                'duty_tag'                => $dutyTag,
                'assignment_notes'        => $data['assignment_notes'] ?? null,
                'created_at'              => date('Y-m-d H:i:s'),
                'created_by'              => $createdBy
            ]);

            if (!$employeeId) {
                throw new \RuntimeException('Failed to create employee record.');
            }

            // Sync department assignments
            $assignStmt = $db->prepare("
                INSERT INTO employee_department_assignments (employee_id, department_id, assignment_type, is_primary, assigned_at, assigned_by)
                VALUES (:emp_id, :dept_id, :type, :is_primary, NOW(), :admin_id)
                ON DUPLICATE KEY UPDATE is_primary = VALUES(is_primary)
            ");

            // Primary unit
            $assignStmt->execute([
                'emp_id'     => $employeeId,
                'dept_id'    => (int) $data['department_id'],
                'type'       => 'primary',
                'is_primary' => 1,
                'admin_id'   => $createdBy
            ]);

            // Secondary clinical unit (if assigned)
            if ($secDeptId && $secDeptId !== (int) $data['department_id']) {
                $assignStmt->execute([
                    'emp_id'     => $employeeId,
                    'dept_id'    => $secDeptId,
                    'type'       => $dutyTag === 'primary' ? 'secondary' : $dutyTag,
                    'is_primary' => 0,
                    'admin_id'   => $createdBy
                ]);
            }

            $db->commit();

            return [
                'success' => true,
                'message' => 'Employee account created successfully.',
                'data' => [
                    'user_id'     => $userId,
                    'employee_id' => $employeeId,
                    'employee_no' => $employeeNo
                ]
            ];
        } catch (Throwable $e) {
            $db->rollBack();

            return [
                'success' => false,
                'message' => 'Failed to register employee: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Update an existing employee account and record (admin-only).
     *
     * Password is optional here -- an empty value leaves the current
     * password untouched, since re-entering it on every edit would be
     * an unreasonable ask.
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $employee = (new Employee())->where('id', $id)->first();

        if (!$employee || $employee['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Employee not found.'
            ];
        }

        $errors = $this->validate($data, $id, (int) $employee['user_id']);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        $db = Database::connection();
        $db->beginTransaction();

        try {
            $userUpdate = [
                'username'   => $data['username'],
                'role_id'    => $data['role_id'],
                'updated_at' => date('Y-m-d H:i:s'),
                'updated_by' => $updatedBy
            ];

            if (!empty($data['password'])) {
                $userUpdate['password'] = User::hashPassword($data['password']);
            }

            if (isset($data['status']) && in_array($data['status'], ['active', 'suspended', 'locked', 'decommissioned'], true)) {
                $userUpdate['status'] = $data['status'];
                $userUpdate['status_reason'] = !empty($data['status_reason']) ? $data['status_reason'] : null;
                $userUpdate['status_updated_at'] = date('Y-m-d H:i:s');
                $userUpdate['status_updated_by'] = $updatedBy;

                if ($data['status'] === 'locked') {
                    $userUpdate['is_locked'] = 1;
                } elseif ($data['status'] === 'active') {
                    $userUpdate['is_locked'] = 0;
                    $userUpdate['locked_until'] = null;
                    $userUpdate['failed_login_attempts'] = 0;
                }

                // If account is suspended or decommissioned or locked, revoke all active sessions immediately
                if (in_array($data['status'], ['suspended', 'locked', 'decommissioned'], true)) {
                    $revStmt = $db->prepare("
                        UPDATE user_session_histories 
                        SET is_active = 0, logout_at = NOW(), revoked_by = :admin_id, 
                            revocation_reason = :reason 
                        WHERE user_id = :user_id AND is_active = 1
                    ");
                    $revStmt->execute([
                        'admin_id' => $updatedBy,
                        'reason'   => 'Account status transitioned to ' . $data['status'] . (!empty($data['status_reason']) ? (': ' . $data['status_reason']) : ''),
                        'user_id'  => (int) $employee['user_id']
                    ]);
                }
            }

            (new User())->update($userUpdate, (int) $employee['user_id']);

            $dutyTag = in_array($data['duty_tag'] ?? 'primary', ['primary', 'on_call', 'floater', 'consultant', 'attending', 'resident'], true) ? $data['duty_tag'] : 'primary';
            $secDeptId = !empty($data['secondary_department_id']) ? (int) $data['secondary_department_id'] : null;

            $empUpdate = [
                'first_name'              => $data['first_name'],
                'middle_name'             => $data['middle_name'] ?? null,
                'last_name'               => $data['last_name'],
                'suffix'                  => $data['suffix'] ?? null,
                'sex'                     => $data['sex'],
                'birthdate'               => $data['birthdate'],
                'email'                   => $data['email'],
                'phone'                   => $data['phone'],
                'department_id'           => $data['department_id'],
                'secondary_department_id' => $secDeptId,
                'duty_tag'                => $dutyTag,
                'assignment_notes'        => $data['assignment_notes'] ?? null,
                'updated_at'              => date('Y-m-d H:i:s'),
                'updated_by'              => $updatedBy
            ];

            if (array_key_exists('hipaa_training_status', $data)) {
                $empUpdate['hipaa_training_status'] = $data['hipaa_training_status'];
            }
            if (array_key_exists('hipaa_initial_training_date', $data)) {
                $empUpdate['hipaa_initial_training_date'] = !empty($data['hipaa_initial_training_date']) ? $data['hipaa_initial_training_date'] : null;
            }
            if (array_key_exists('hipaa_last_refresher_date', $data)) {
                $empUpdate['hipaa_last_refresher_date'] = !empty($data['hipaa_last_refresher_date']) ? $data['hipaa_last_refresher_date'] : null;
            }
            if (array_key_exists('hipaa_next_refresher_due', $data)) {
                $empUpdate['hipaa_next_refresher_due'] = !empty($data['hipaa_next_refresher_due']) ? $data['hipaa_next_refresher_due'] : null;
            }
            if (array_key_exists('hipaa_training_score', $data)) {
                $empUpdate['hipaa_training_score'] = $data['hipaa_training_score'] !== '' && $data['hipaa_training_score'] !== null ? (float)$data['hipaa_training_score'] : null;
            }
            if (array_key_exists('hipaa_cert_ref', $data)) {
                $empUpdate['hipaa_cert_ref'] = !empty($data['hipaa_cert_ref']) ? $data['hipaa_cert_ref'] : null;
            }
            if (array_key_exists('hipaa_curriculum_name', $data)) {
                $empUpdate['hipaa_curriculum_name'] = !empty($data['hipaa_curriculum_name']) ? $data['hipaa_curriculum_name'] : null;
            }

            (new Employee())->update($empUpdate, $id);

            // Sync employee_department_assignments
            $db->prepare("DELETE FROM employee_department_assignments WHERE employee_id = :emp_id")->execute(['emp_id' => $id]);

            $assignStmt = $db->prepare("
                INSERT INTO employee_department_assignments (employee_id, department_id, assignment_type, is_primary, assigned_at, assigned_by)
                VALUES (:emp_id, :dept_id, :type, :is_primary, NOW(), :admin_id)
            ");

            // Primary
            $assignStmt->execute([
                'emp_id'     => $id,
                'dept_id'    => (int) $data['department_id'],
                'type'       => 'primary',
                'is_primary' => 1,
                'admin_id'   => $updatedBy
            ]);

            // Secondary (if specified and different)
            if ($secDeptId && $secDeptId !== (int) $data['department_id']) {
                $assignStmt->execute([
                    'emp_id'     => $id,
                    'dept_id'    => $secDeptId,
                    'type'       => $dutyTag === 'primary' ? 'secondary' : $dutyTag,
                    'is_primary' => 0,
                    'admin_id'   => $updatedBy
                ]);
            }

            $db->commit();

            return [
                'success' => true,
                'message' => 'Employee updated successfully.'
            ];
        } catch (Throwable $e) {
            $db->rollBack();

            return [
                'success' => false,
                'message' => 'Failed to update employee: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Validate registration/update input. When $ignoreEmployeeId is set
     * (an update) the password is optional and uniqueness checks skip
     * the record's own user/employee row.
     */
    private function validate(array $data, ?int $ignoreEmployeeId = null, ?int $ignoreUserId = null): array
    {
        $errors = [];

        $required = [
            'username', 'role_id', 'first_name', 'last_name',
            'sex', 'birthdate', 'email', 'phone', 'department_id'
        ];

        if ($ignoreEmployeeId === null) {
            $required[] = 'password';
        }

        foreach ($required as $field) {
            if (empty($data[$field])) {
                $errors[$field] = ucfirst(str_replace('_', ' ', $field)) . ' is required.';
            }
        }

        if (!empty($errors)) {
            return $errors;
        }

        if (!in_array($data['sex'], ['male', 'female'], true)) {
            $errors['sex'] = 'Sex must be male or female.';
        }

        if (strtotime($data['birthdate']) === false) {
            $errors['birthdate'] = 'Birthdate is not a valid date.';
        } elseif ($data['birthdate'] > date('Y-m-d')) {
            $errors['birthdate'] = 'Birthdate cannot be in the future.';
        }

        $existingUser = (new User())->where('username', $data['username'])->first();

        if ($existingUser && (int) $existingUser['id'] !== (int) $ignoreUserId) {
            $errors['username'] = 'Username is already taken.';
        }

        $existingEmail = (new Employee())->where('email', $data['email'])->first();

        if ($existingEmail && (int) $existingEmail['id'] !== (int) $ignoreEmployeeId) {
            $errors['email'] = 'Email is already registered.';
        }

        $existingPhone = (new Employee())->where('phone', $data['phone'])->first();

        if ($existingPhone && (int) $existingPhone['id'] !== (int) $ignoreEmployeeId) {
            $errors['phone'] = 'Phone number is already registered.';
        }

        if (!(new Role())->find((int) $data['role_id'])) {
            $errors['role_id'] = 'Selected role does not exist.';
        }

        if (!(new Department())->find((int) $data['department_id'])) {
            $errors['department_id'] = 'Selected department does not exist.';
        }

        if (!empty($data['secondary_department_id'])) {
            if (!(new Department())->find((int) $data['secondary_department_id'])) {
                $errors['secondary_department_id'] = 'Selected secondary department does not exist.';
            }
        }

        if (isset($data['duty_tag']) && !in_array($data['duty_tag'], ['primary', 'on_call', 'floater', 'consultant', 'attending', 'resident'], true)) {
            $errors['duty_tag'] = 'Invalid duty tag selected.';
        }

        if (isset($data['status']) && !in_array($data['status'], ['active', 'suspended', 'locked', 'decommissioned'], true)) {
            $errors['status'] = 'Invalid account status.';
        }

        return $errors;
    }

    /**
     * Generate a sequential employee number.
     */
    private function generateEmployeeNo(): string
    {
        $count = count((new Employee())->get());

        return 'EMP-' . str_pad((string) ($count + 1), 6, '0', STR_PAD_LEFT);
    }

    /**
     * Administratively unlock a locked user account (HIPAA § 164.312(a)(2)(i)).
     */
    public function unlockUser(int $userId, int $adminId): array
    {
        return $this->updateStatus($userId, 'active', 'Administrator manual account unlock', $adminId);
    }

    /**
     * Transition a user account status (active, suspended, locked, decommissioned).
     */
    public function updateStatus(int $userId, string $status, ?string $reason, int $adminId): array
    {
        $validStatuses = ['active', 'suspended', 'locked', 'decommissioned'];
        if (!in_array($status, $validStatuses, true)) {
            return [
                'success' => false,
                'message' => 'Invalid account status specified.'
            ];
        }

        $user = (new User())->where('id', $userId)->first();
        if (!$user) {
            return [
                'success' => false,
                'message' => 'User account not found.'
            ];
        }

        $userUpdate = [
            'status'            => $status,
            'status_reason'     => $reason ?: null,
            'status_updated_at' => date('Y-m-d H:i:s'),
            'status_updated_by' => $adminId,
            'updated_at'        => date('Y-m-d H:i:s'),
            'updated_by'        => $adminId
        ];

        if ($status === 'locked') {
            $userUpdate['is_locked'] = 1;
        } elseif ($status === 'active') {
            $userUpdate['is_locked'] = 0;
            $userUpdate['locked_until'] = null;
            $userUpdate['failed_login_attempts'] = 0;
            $userUpdate['last_failed_login_at'] = null;
        }

        (new User())->update($userUpdate, $userId);

        $db = Database::connection();

        // If status is not active, terminate all active sessions immediately
        if (in_array($status, ['suspended', 'locked', 'decommissioned'], true)) {
            $revStmt = $db->prepare("
                UPDATE user_session_histories 
                SET is_active = 0, logout_at = NOW(), revoked_by = :admin_id, 
                    revocation_reason = :reason 
                WHERE user_id = :user_id AND is_active = 1
            ");
            $revStmt->execute([
                'admin_id' => $adminId,
                'reason'   => "Account transitioned to {$status}" . ($reason ? (": {$reason}") : ''),
                'user_id'  => $userId
            ]);
        }

        $admin = (new User())->where('id', $adminId)->first();
        $adminUsername = $admin['username'] ?? 'Administrator';

        AuditLogger::log(
            AuditLogger::CATEGORY_SECURITY,
            'ACCOUNT_STATUS_CHANGE',
            "Administrator '{$adminUsername}' changed status of account '{$user['username']}' (ID: {$userId}) to '{$status}'." . ($reason ? " Reason: {$reason}" : ""),
            null,
            $userId
        );

        return [
            'success' => true,
            'message' => "Account status for '{$user['username']}' updated to " . ucfirst($status) . "."
        ];
    }

    /**
     * Get active and recent sessions for an employee's user account.
     */
    public function getUserSessions(int $userId): array
    {
        $stmt = Database::connection()->prepare("
            SELECT s.*, u.username as revoked_by_username
            FROM user_session_histories s
            LEFT JOIN users u ON u.id = s.revoked_by
            WHERE s.user_id = :user_id
            ORDER BY s.is_active DESC, s.login_at DESC
            LIMIT 30
        ");
        $stmt->execute(['user_id' => $userId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Revoke a specific active session.
     */
    public function revokeSession(int $sessionId, int $adminId, ?string $reason): array
    {
        $db = Database::connection();
        $stmt = $db->prepare("SELECT * FROM user_session_histories WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $sessionId]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$session) {
            return [
                'success' => false,
                'message' => 'Session record not found.'
            ];
        }

        $db->prepare("
            UPDATE user_session_histories 
            SET is_active = 0, logout_at = NOW(), revoked_by = :admin_id, 
                revocation_reason = :reason 
            WHERE id = :id
        ")->execute([
            'admin_id' => $adminId,
            'reason'   => $reason ?: 'Manually revoked by administrator',
            'id'       => $sessionId
        ]);

        AuditLogger::log(
            AuditLogger::CATEGORY_SECURITY,
            'SESSION_REVOKED',
            "Administrator (ID: {$adminId}) manually terminated active session ID #{$sessionId} for user ID #{$session['user_id']}.",
            null,
            (int) $session['user_id']
        );

        return [
            'success' => true,
            'message' => 'Session terminated successfully.'
        ];
    }

    /**
     * Revoke all active sessions for a user account.
     */
    public function revokeAllUserSessions(int $userId, int $adminId, ?string $reason): array
    {
        $db = Database::connection();
        $stmt = $db->prepare("
            UPDATE user_session_histories 
            SET is_active = 0, logout_at = NOW(), revoked_by = :admin_id, 
                revocation_reason = :reason 
            WHERE user_id = :user_id AND is_active = 1
        ");
        $stmt->execute([
            'admin_id' => $adminId,
            'reason'   => $reason ?: 'All active sessions revoked by administrator',
            'user_id'  => $userId
        ]);

        $affected = $stmt->rowCount();

        AuditLogger::log(
            AuditLogger::CATEGORY_SECURITY,
            'ALL_SESSIONS_REVOKED',
            "Administrator (ID: {$adminId}) terminated all ({$affected}) active sessions for user ID #{$userId}.",
            null,
            $userId
        );

        return [
            'success' => true,
            'message' => "Terminated {$affected} active session(s)."
        ];
    }
}

