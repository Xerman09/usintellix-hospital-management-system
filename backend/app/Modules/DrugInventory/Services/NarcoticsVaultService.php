<?php

namespace App\Modules\DrugInventory\Services;

use App\Core\Database;
use PDO;

class NarcoticsVaultService
{
    private static function userNameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username)
                 FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
                 WHERE u.id = {$column} LIMIT 1)";
    }

    private static function userRoleSql(string $column): string
    {
        return "(SELECT COALESCE(r.name, 'Staff')
                 FROM users u LEFT JOIN roles r ON r.id = u.role_id
                 WHERE u.id = {$column} LIMIT 1)";
    }

    /**
     * Retrieve all controlled substance items in the Central Narcotics Safe.
     */
    public function getItems(array $filters = []): array
    {
        $db = Database::connection();
        $where = ['v.is_active = 1'];
        $params = [];

        if (!empty($filters['schedule'])) {
            $where[] = 'v.dea_schedule = :schedule';
            $params['schedule'] = $filters['schedule'];
        }

        if (!empty($filters['search'])) {
            $where[] = '(v.item_code LIKE :search OR v.brand_and_strength LIKE :search OR d.name LIKE :search OR d.generic_name LIKE :search)';
            $params['search'] = '%' . $filters['search'] . '%';
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $db->prepare("
            SELECT v.*,
                   d.name AS catalog_drug_name,
                   d.generic_name,
                   d.controlled_class,
                   d.is_high_alert,
                   (CASE WHEN v.current_balance <= v.minimum_safe_par THEN 1 ELSE 0 END) AS is_low_stock,
                   (SELECT MAX(created_at) FROM narcotics_vault_movements WHERE vault_item_id = v.id) AS last_movement_at
            FROM narcotics_vault_items v
            JOIN drugs d ON d.id = v.drug_id
            WHERE {$whereClause}
            ORDER BY v.dea_schedule ASC, v.item_code ASC
        ");
        $stmt->execute($params);

        return array_map(function ($row) {
            $row['id'] = (int) $row['id'];
            $row['drug_id'] = (int) $row['drug_id'];
            $row['current_balance'] = (float) $row['current_balance'];
            $row['minimum_safe_par'] = (float) $row['minimum_safe_par'];
            $row['maximum_safe_capacity'] = (float) $row['maximum_safe_capacity'];
            $row['is_low_stock'] = (bool) $row['is_low_stock'];
            return $row;
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Retrieve perpetual ledger movement logs with dual witness signatures.
     */
    public function getMovements(array $filters = []): array
    {
        $db = Database::connection();
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['vault_item_id'])) {
            $where[] = 'm.vault_item_id = :item_id';
            $params['item_id'] = (int) $filters['vault_item_id'];
        }

        if (!empty($filters['movement_type'])) {
            $where[] = 'm.movement_type = :movement_type';
            $params['movement_type'] = $filters['movement_type'];
        }

        if (!empty($filters['date_from'])) {
            $where[] = 'DATE(m.created_at) >= :date_from';
            $params['date_from'] = $filters['date_from'];
        }

        if (!empty($filters['date_to'])) {
            $where[] = 'DATE(m.created_at) <= :date_to';
            $params['date_to'] = $filters['date_to'];
        }

        if (!empty($filters['search'])) {
            $where[] = '(m.transaction_number LIKE :search OR m.lot_number LIKE :search OR m.reference_number LIKE :search OR v.brand_and_strength LIKE :search)';
            $params['search'] = '%' . $filters['search'] . '%';
        }

        $w1Name = self::userNameSql('m.witness_1_user_id');
        $w1Role = self::userRoleSql('m.witness_1_user_id');
        $w2Name = self::userNameSql('m.witness_2_user_id');
        $w2Role = self::userRoleSql('m.witness_2_user_id');

        $whereClause = implode(' AND ', $where);

        $limit = isset($filters['limit']) ? min(500, max(1, (int) $filters['limit'])) : 100;

        $stmt = $db->prepare("
            SELECT m.*,
                   v.item_code,
                   v.brand_and_strength,
                   v.dea_schedule,
                   v.package_form,
                   v.safe_location,
                   d.name AS drug_name,
                   {$w1Name} AS witness_1_name,
                   {$w1Role} AS witness_1_role,
                   {$w2Name} AS witness_2_name,
                   {$w2Role} AS witness_2_role
            FROM narcotics_vault_movements m
            JOIN narcotics_vault_items v ON v.id = m.vault_item_id
            JOIN drugs d ON d.id = v.drug_id
            WHERE {$whereClause}
            ORDER BY m.id DESC
            LIMIT {$limit}
        ");
        $stmt->execute($params);

        return array_map(function ($row) {
            $row['id'] = (int) $row['id'];
            $row['vault_item_id'] = (int) $row['vault_item_id'];
            $row['quantity_in'] = (float) $row['quantity_in'];
            $row['quantity_out'] = (float) $row['quantity_out'];
            $row['balance_before'] = (float) $row['balance_before'];
            $row['balance_after'] = (float) $row['balance_after'];
            return $row;
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Authenticate a dual-custody witness via either 4-6 digit numeric PIN or system password.
     */
    public function verifyWitnessCredentials($usernameOrId, string $pinOrPassword): array
    {
        $db = Database::connection();
        $input = trim((string) $usernameOrId);
        $secret = trim($pinOrPassword);

        if ($input === '' || $secret === '') {
            return ['success' => false, 'message' => 'Username/User ID and PIN/Password are required.'];
        }

        $stmt = $db->prepare("
            SELECT u.id, u.username, u.password, u.security_pin, u.is_locked, u.status,
                   r.name AS role_name,
                   CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) AS employee_name
            FROM users u
            LEFT JOIN roles r ON r.id = u.role_id
            LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
            WHERE (u.username = :uname OR u.id = :uid) AND u.deleted_at IS NULL
            LIMIT 1
        ");
        $stmt->execute([
            'uname' => $input,
            'uid' => is_numeric($input) ? (int) $input : 0
        ]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            return ['success' => false, 'message' => 'Witness user account not found.'];
        }

        if (!empty($user['is_locked']) || ($user['status'] ?? 'active') !== 'active') {
            return ['success' => false, 'message' => 'Witness account is locked or inactive.'];
        }

        $authMatched = false;
        $method = 'password';

        // 1. Check quick security PIN if configured
        if (!empty($user['security_pin'])) {
            if (password_verify($secret, $user['security_pin']) || $secret === $user['security_pin']) {
                $authMatched = true;
                $method = 'security_pin';
            }
        }

        // 2. Fall back to system login password check
        if (!$authMatched && !empty($user['password'])) {
            if (password_verify($secret, $user['password'])) {
                $authMatched = true;
                $method = 'account_password';
            }
        }

        if (!$authMatched) {
            return ['success' => false, 'message' => 'Invalid Security PIN or Password for witness ' . htmlspecialchars($user['username']) . '.'];
        }

        $displayName = trim((string) ($user['employee_name'] ?? '')) ?: $user['username'];

        return [
            'success' => true,
            'user_id' => (int) $user['id'],
            'username' => $user['username'],
            'display_name' => $displayName,
            'role' => $user['role_name'] ?? 'Staff',
            'auth_method' => $method
        ];
    }

    /**
     * Set or update a 4-6 digit numeric Security PIN for quick safe witnessing.
     */
    public function setSecurityPin(int $userId, string $pin, string $currentPassword): array
    {
        $db = Database::connection();
        $pin = trim($pin);

        if (!preg_match('/^\d{4,8}$/', $pin)) {
            return ['success' => false, 'message' => 'Security PIN must be 4 to 8 numeric digits.'];
        }

        // Verify current account password first
        $stmt = $db->prepare("SELECT password FROM users WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row || !password_verify($currentPassword, $row['password'])) {
            return ['success' => false, 'message' => 'Current password verification failed.'];
        }

        $pinHash = password_hash($pin, PASSWORD_DEFAULT);
        $up = $db->prepare("UPDATE users SET security_pin = :pin WHERE id = :id");
        $up->execute(['pin' => $pinHash, 'id' => $userId]);

        return ['success' => true, 'message' => 'Security PIN updated successfully.'];
    }

    /**
     * Record a Central Safe Narcotics Vault Movement with Strict Dual Witness Signatures.
     */
    public function recordMovement(array $data, int $actingUserId): array
    {
        $db = Database::connection();

        $vaultItemId = (int) ($data['vault_item_id'] ?? 0);
        $movementType = trim((string) ($data['movement_type'] ?? ''));
        $lotNumber = trim((string) ($data['lot_number'] ?? ''));
        $lotExpiry = !empty($data['lot_expiry']) ? $data['lot_expiry'] : null;
        $qty = (float) ($data['quantity'] ?? 0);
        $refNumber = trim((string) ($data['reference_number'] ?? ''));
        $wardDestination = trim((string) ($data['ward_destination'] ?? ''));
        $patientId = !empty($data['patient_id']) ? (int) $data['patient_id'] : null;
        $dualNotes = trim((string) ($data['dual_custody_notes'] ?? ''));

        // Dual Witness Inputs
        $witness1User = $data['witness_1_username'] ?? ($data['witness_1_user_id'] ?? $actingUserId);
        $witness1Secret = $data['witness_1_secret'] ?? ($data['witness_1_pin'] ?? '');

        $witness2User = $data['witness_2_username'] ?? ($data['witness_2_user_id'] ?? '');
        $witness2Secret = $data['witness_2_secret'] ?? ($data['witness_2_pin'] ?? '');

        // Validation
        $allowedTypes = [
            'receipt_po',
            'transfer_to_ward',
            'ward_return',
            'destruction_waste',
            'audit_adjustment',
            'rx_direct_dispense'
        ];
        if (!in_array($movementType, $allowedTypes, true)) {
            return ['success' => false, 'message' => 'Invalid movement type selected.'];
        }

        if ($qty <= 0) {
            return ['success' => false, 'message' => 'Quantity must be greater than zero.'];
        }

        if ($lotNumber === '') {
            return ['success' => false, 'message' => 'Manufacturer lot number is mandatory for controlled substances.'];
        }

        if (empty($witness1Secret) || empty($witness2Secret)) {
            return ['success' => false, 'message' => 'Both Witness 1 and Witness 2 must provide their Security PIN or Password.'];
        }

        // Dual witness authentication
        $w1Auth = $this->verifyWitnessCredentials($witness1User, (string) $witness1Secret);
        if (!$w1Auth['success']) {
            return ['success' => false, 'message' => 'Witness 1 Authentication Failed: ' . $w1Auth['message']];
        }

        $w2Auth = $this->verifyWitnessCredentials($witness2User, (string) $witness2Secret);
        if (!$w2Auth['success']) {
            return ['success' => false, 'message' => 'Witness 2 Authentication Failed: ' . $w2Auth['message']];
        }

        // Dual custody rule: Witness 1 and Witness 2 MUST be distinct persons
        if ($w1Auth['user_id'] === $w2Auth['user_id']) {
            return [
                'success' => false,
                'message' => 'Dual Custody Mandate: Witness 1 and Witness 2 must be two distinct individuals. Self-witnessing is strictly prohibited by narcotics regulations.'
            ];
        }

        $isInbound = in_array($movementType, ['receipt_po', 'ward_return'], true);
        $qtyIn = $isInbound ? $qty : 0.0;
        $qtyOut = !$isInbound ? $qty : 0.0;

        $ownsTx = !$db->inTransaction();
        if ($ownsTx) {
            $db->beginTransaction();
        }

        try {
            // Lock and inspect current safe vault item
            $stmt = $db->prepare("SELECT * FROM narcotics_vault_items WHERE id = :id FOR UPDATE");
            $stmt->execute(['id' => $vaultItemId]);
            $item = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$item) {
                if ($ownsTx) $db->rollBack();
                return ['success' => false, 'message' => 'Narcotics vault item not found.'];
            }

            $currentBal = (float) $item['current_balance'];
            if (!$isInbound && $qtyOut > $currentBal) {
                if ($ownsTx) $db->rollBack();
                return [
                    'success' => false,
                    'message' => "Insufficient Safe Stock: Requested {$qtyOut} {$item['package_form']}(s), but current safe balance is only {$currentBal}."
                ];
            }

            $balanceBefore = $currentBal;
            $balanceAfter = $currentBal + $qtyIn - $qtyOut;

            // Generate sequential transaction number
            $txNumber = 'NVM-' . date('Y') . '-' . str_pad((string) mt_rand(1, 99999), 5, '0', STR_PAD_LEFT);

            // Update item balance
            $upStmt = $db->prepare("UPDATE narcotics_vault_items SET current_balance = :bal, updated_at = NOW() WHERE id = :id");
            $upStmt->execute(['bal' => $balanceAfter, 'id' => $vaultItemId]);

            // Insert movement record
            $ins = $db->prepare("
                INSERT INTO narcotics_vault_movements (
                    transaction_number, vault_item_id, movement_type, lot_number, lot_expiry,
                    quantity_in, quantity_out, balance_before, balance_after,
                    reference_number, ward_destination, patient_id,
                    witness_1_user_id, witness_1_signed_at, witness_1_auth_method,
                    witness_2_user_id, witness_2_signed_at, witness_2_auth_method,
                    dual_custody_notes, status, created_at
                ) VALUES (
                    :tx, :vid, :mtype, :lot, :exp,
                    :qin, :qout, :bbef, :baft,
                    :ref, :ward, :pid,
                    :w1, NOW(), :w1m,
                    :w2, NOW(), :w2m,
                    :notes, 'verified_completed', NOW()
                )
            ");
            $ins->execute([
                'tx' => $txNumber,
                'vid' => $vaultItemId,
                'mtype' => $movementType,
                'lot' => $lotNumber,
                'exp' => $lotExpiry,
                'qin' => $qtyIn,
                'qout' => $qtyOut,
                'bbef' => $balanceBefore,
                'baft' => $balanceAfter,
                'ref' => $refNumber ?: null,
                'ward' => $wardDestination ?: null,
                'pid' => $patientId,
                'w1' => $w1Auth['user_id'],
                'w1m' => $w1Auth['auth_method'],
                'w2' => $w2Auth['user_id'],
                'w2m' => $w2Auth['auth_method'],
                'notes' => $dualNotes ?: null
            ]);

            if ($ownsTx) {
                $db->commit();
            }

            return [
                'success' => true,
                'message' => "Dual-custody transaction {$txNumber} logged successfully. Safe balance updated from {$balanceBefore} to {$balanceAfter}.",
                'transaction_number' => $txNumber,
                'item_code' => $item['item_code'],
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'witness_1' => $w1Auth['display_name'],
                'witness_2' => $w2Auth['display_name']
            ];
        } catch (\Throwable $e) {
            if ($ownsTx && $db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Retrieve recent Shift Safe Count Audits.
     */
    public function getShiftAudits(array $filters = []): array
    {
        $db = Database::connection();
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['date'])) {
            $where[] = 'a.audit_date = :date';
            $params['date'] = $filters['date'];
        }

        if (!empty($filters['status'])) {
            $where[] = 'a.status = :status';
            $params['status'] = $filters['status'];
        }

        $a1Name = self::userNameSql('a.auditor_1_user_id');
        $a1Role = self::userRoleSql('a.auditor_1_user_id');
        $a2Name = self::userNameSql('a.auditor_2_user_id');
        $a2Role = self::userRoleSql('a.auditor_2_user_id');

        $whereClause = implode(' AND ', $where);

        $stmt = $db->prepare("
            SELECT a.*,
                   {$a1Name} AS auditor_1_name,
                   {$a1Role} AS auditor_1_role,
                   {$a2Name} AS auditor_2_name,
                   {$a2Role} AS auditor_2_role
            FROM narcotics_vault_shift_audits a
            WHERE {$whereClause}
            ORDER BY a.audit_date DESC, a.id DESC
            LIMIT 50
        ");
        $stmt->execute($params);

        $audits = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch detail count lines for each audit
        foreach ($audits as &$audit) {
            $audit['id'] = (int) $audit['id'];
            $audit['total_items_counted'] = (int) $audit['total_items_counted'];
            $audit['discrepancies_detected'] = (int) $audit['discrepancies_detected'];
            $audit['safe_seal_intact'] = (bool) $audit['safe_seal_intact'];

            $itemStmt = $db->prepare("
                SELECT i.*, v.item_code, v.brand_and_strength, v.dea_schedule, v.package_form, v.safe_location
                FROM narcotics_vault_shift_audit_items i
                JOIN narcotics_vault_items v ON v.id = i.vault_item_id
                WHERE i.shift_audit_id = :aid
                ORDER BY v.dea_schedule ASC, v.item_code ASC
            ");
            $itemStmt->execute(['aid' => $audit['id']]);
            $audit['items'] = array_map(function ($it) {
                $it['book_balance'] = (float) $it['book_balance'];
                $it['physical_count'] = (float) $it['physical_count'];
                $it['variance'] = (float) $it['variance'];
                return $it;
            }, $itemStmt->fetchAll(PDO::FETCH_ASSOC));
        }

        return $audits;
    }

    /**
     * Conduct and submit an End-of-Shift Safe Count Verification Audit.
     * Enforces dual custody: Two distinct licensed pharmacists/nurses must count and authenticate.
     */
    public function recordShiftAudit(array $data, int $actingUserId): array
    {
        $db = Database::connection();

        $shiftName = trim((string) ($data['shift_name'] ?? 'Morning Shift (06:00 - 14:00)'));
        $auditDate = !empty($data['audit_date']) ? $data['audit_date'] : date('Y-m-d');
        $sealIntact = !empty($data['safe_seal_intact']) ? 1 : 0;
        $sealNumber = trim((string) ($data['safe_seal_number'] ?? ''));
        $auditNotes = trim((string) ($data['audit_notes'] ?? ''));
        $itemsCounted = is_array($data['items'] ?? null) ? $data['items'] : [];

        // Dual Auditor Authentication
        $auditor1User = $data['auditor_1_username'] ?? ($data['auditor_1_user_id'] ?? $actingUserId);
        $auditor1Secret = $data['auditor_1_secret'] ?? ($data['auditor_1_pin'] ?? '');

        $auditor2User = $data['auditor_2_username'] ?? ($data['auditor_2_user_id'] ?? '');
        $auditor2Secret = $data['auditor_2_secret'] ?? ($data['auditor_2_pin'] ?? '');

        if (empty($auditor1Secret) || empty($auditor2Secret)) {
            return ['success' => false, 'message' => 'Both Auditor 1 and Auditor 2 must enter their Security PIN or Password.'];
        }

        $a1Auth = $this->verifyWitnessCredentials($auditor1User, (string) $auditor1Secret);
        if (!$a1Auth['success']) {
            return ['success' => false, 'message' => 'Auditor 1 Authentication Failed: ' . $a1Auth['message']];
        }

        $a2Auth = $this->verifyWitnessCredentials($auditor2User, (string) $auditor2Secret);
        if (!$a2Auth['success']) {
            return ['success' => false, 'message' => 'Auditor 2 Authentication Failed: ' . $a2Auth['message']];
        }

        if ($a1Auth['user_id'] === $a2Auth['user_id']) {
            return [
                'success' => false,
                'message' => 'Dual Auditor Mandate: End-of-shift safe counts must be co-verified by two separate staff members.'
            ];
        }

        if (empty($itemsCounted)) {
            return ['success' => false, 'message' => 'Please provide physical counts for the safe inventory items.'];
        }

        $ownsTx = !$db->inTransaction();
        if ($ownsTx) {
            $db->beginTransaction();
        }

        try {
            $auditNumber = 'NSA-' . date('Y') . '-' . str_pad((string) mt_rand(1, 99999), 5, '0', STR_PAD_LEFT);

            $discrepancyCount = 0;
            $auditItemRows = [];

            foreach ($itemsCounted as $ic) {
                $vItemId = (int) ($ic['vault_item_id'] ?? 0);
                $physCount = (float) ($ic['physical_count'] ?? 0);
                $reason = trim((string) ($ic['variance_reason'] ?? ''));

                // Look up live book balance
                $st = $db->prepare("SELECT current_balance, item_code FROM narcotics_vault_items WHERE id = :id");
                $st->execute(['id' => $vItemId]);
                $vRow = $st->fetch(PDO::FETCH_ASSOC);

                if (!$vRow) {
                    continue;
                }

                $bookBal = (float) $vRow['current_balance'];
                $variance = round($physCount - $bookBal, 2);

                if (abs($variance) > 0.001) {
                    $discrepancyCount++;
                }

                $auditItemRows[] = [
                    'vault_item_id' => $vItemId,
                    'book_balance' => $bookBal,
                    'physical_count' => $physCount,
                    'variance' => $variance,
                    'variance_reason' => $reason ?: null
                ];
            }

            $auditStatus = ($discrepancyCount > 0) ? 'variance_unresolved' : 'balanced_verified';

            $insAudit = $db->prepare("
                INSERT INTO narcotics_vault_shift_audits (
                    audit_number, shift_name, audit_date, safe_seal_intact, safe_seal_number,
                    auditor_1_user_id, auditor_1_signed_at, auditor_2_user_id, auditor_2_signed_at,
                    total_items_counted, discrepancies_detected, status, audit_notes, created_at
                ) VALUES (
                    :num, :shift, :adate, :seal_intact, :seal_num,
                    :a1, NOW(), :a2, NOW(),
                    :tot, :disc, :status, :notes, NOW()
                )
            ");
            $insAudit->execute([
                'num' => $auditNumber,
                'shift' => $shiftName,
                'adate' => $auditDate,
                'seal_intact' => $sealIntact,
                'seal_num' => $sealNumber ?: null,
                'a1' => $a1Auth['user_id'],
                'a2' => $a2Auth['user_id'],
                'tot' => count($auditItemRows),
                'disc' => $discrepancyCount,
                'status' => $auditStatus,
                'notes' => $auditNotes ?: null
            ]);

            $auditId = (int) $db->lastInsertId();

            $insLine = $db->prepare("
                INSERT INTO narcotics_vault_shift_audit_items (
                    shift_audit_id, vault_item_id, book_balance, physical_count, variance, variance_reason
                ) VALUES (
                    :aid, :vid, :bbal, :pcount, :var, :vreason
                )
            ");

            foreach ($auditItemRows as $row) {
                $insLine->execute([
                    'aid' => $auditId,
                    'vid' => $row['vault_item_id'],
                    'bbal' => $row['book_balance'],
                    'pcount' => $row['physical_count'],
                    'var' => $row['variance'],
                    'vreason' => $row['variance_reason']
                ]);
            }

            if ($ownsTx) {
                $db->commit();
            }

            $msg = ($discrepancyCount === 0)
                ? "Shift Audit {$auditNumber} completed. Safe count is 100% balanced across all items."
                : "Shift Audit {$auditNumber} completed with {$discrepancyCount} discrepancy(ies) detected! Escalated for supervisor investigation.";

            return [
                'success' => true,
                'message' => $msg,
                'audit_id' => $auditId,
                'audit_number' => $auditNumber,
                'status' => $auditStatus,
                'total_items_counted' => count($auditItemRows),
                'discrepancies_detected' => $discrepancyCount
            ];
        } catch (\Throwable $e) {
            if ($ownsTx && $db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Dashboard KPI metrics for Central Pharmacy Narcotics Vault.
     */
    public function getVaultStats(): array
    {
        $db = Database::connection();

        $stmt = $db->query("
            SELECT
                COUNT(*) AS total_items,
                SUM(CASE WHEN dea_schedule = 'Schedule II' THEN 1 ELSE 0 END) AS schedule_ii_items,
                SUM(CASE WHEN current_balance <= minimum_safe_par THEN 1 ELSE 0 END) AS low_stock_items,
                SUM(current_balance) AS total_units_in_safe
            FROM narcotics_vault_items
            WHERE is_active = 1
        ");
        $itemStats = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $mStmt = $db->query("
            SELECT
                COUNT(*) AS today_movements,
                SUM(CASE WHEN movement_type = 'transfer_to_ward' THEN 1 ELSE 0 END) AS today_ward_transfers,
                SUM(CASE WHEN movement_type = 'destruction_waste' THEN 1 ELSE 0 END) AS today_waste_events
            FROM narcotics_vault_movements
            WHERE DATE(created_at) = CURDATE()
        ");
        $movementStats = $mStmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $aStmt = $db->query("
            SELECT
                COUNT(*) AS today_audits,
                SUM(CASE WHEN status = 'variance_unresolved' THEN 1 ELSE 0 END) AS unresolved_discrepancies
            FROM narcotics_vault_shift_audits
            WHERE DATE(audit_date) = CURDATE()
        ");
        $auditStats = $aStmt->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'total_items' => (int) ($itemStats['total_items'] ?? 0),
            'schedule_ii_items' => (int) ($itemStats['schedule_ii_items'] ?? 0),
            'low_stock_items' => (int) ($itemStats['low_stock_items'] ?? 0),
            'total_units_in_safe' => (float) ($itemStats['total_units_in_safe'] ?? 0),
            'today_movements' => (int) ($movementStats['today_movements'] ?? 0),
            'today_ward_transfers' => (int) ($movementStats['today_ward_transfers'] ?? 0),
            'today_waste_events' => (int) ($movementStats['today_waste_events'] ?? 0),
            'today_audits' => (int) ($auditStats['today_audits'] ?? 0),
            'unresolved_discrepancies' => (int) ($auditStats['unresolved_discrepancies'] ?? 0)
        ];
    }
}
