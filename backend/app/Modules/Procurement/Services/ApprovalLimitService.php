<?php

namespace App\Modules\Procurement\Services;

use App\Core\Database;
use PDO;

/**
 * Approval limits by amount (General Settings > Approval Limits).
 *
 * A purchase order, supplier invoice or supplier payment above its
 * document type's limit also needs an administrator:
 *   * purchase orders / invoices -- an accountant's approval is recorded
 *     as the first approval and the document stays pending until an
 *     administrator gives the final one. An administrator approving
 *     first covers both.
 *   * payments -- one an accountant records is held as pending until an
 *     administrator approves it (PayableService).
 * A disabled or missing limit means no extra approval.
 */
class ApprovalLimitService
{
    public const TYPES = [
        'purchase_order' => 'Purchase orders',
        'supplier_invoice' => 'Supplier invoices',
        'supplier_payment' => 'Supplier payments'
    ];

    /** The role that must approve anything above a limit. */
    public const FINAL_ROLE = 'admin';

    private static ?array $cache = null;

    public function all(): array
    {
        $rows = $this->load();

        return array_map(fn(string $type) => [
            'document_type' => $type,
            'label' => self::TYPES[$type],
            'is_enabled' => isset($rows[$type]) && (bool) $rows[$type]['is_enabled'],
            'limit_amount' => isset($rows[$type]) ? (float) $rows[$type]['limit_amount'] : null,
            'updated_at' => $rows[$type]['updated_at'] ?? null,
            'updated_by_name' => $rows[$type]['updated_by_name'] ?? null
        ], array_keys(self::TYPES));
    }

    /** The limit for a document type, or null when there is none. */
    public function limitFor(string $type): ?float
    {
        $row = $this->load()[$type] ?? null;

        return $row && (int) $row['is_enabled'] ? (float) $row['limit_amount'] : null;
    }

    public function needsAdmin(string $type, float $amount): bool
    {
        $limit = $this->limitFor($type);

        return $limit !== null && $amount > $limit + 0.005;
    }

    /** e.g. "above the ₱100,000.00 limit" */
    public function describe(string $type): string
    {
        $limit = $this->limitFor($type);

        return $limit === null ? '' : 'above the ₱' . number_format($limit, 2) . ' limit';
    }

    /** Body: limits: [{document_type, is_enabled, limit_amount}] */
    public function update(array $data, int $userId): array
    {
        $errors = [];
        $clean = [];

        foreach ((array) ($data['limits'] ?? []) as $i => $row) {
            $type = (string) ($row['document_type'] ?? '');

            if (!isset(self::TYPES[$type])) {
                continue;
            }

            $enabled = !empty($row['is_enabled']) && $row['is_enabled'] !== 'false';
            $raw = $row['limit_amount'] ?? '';

            if ($enabled && (!is_numeric($raw) || (float) $raw <= 0)) {
                $errors["limits.{$type}.limit_amount"] = 'Enter an amount greater than zero.';
                continue;
            }

            if (is_numeric($raw) && (float) $raw > 999999999999) {
                $errors["limits.{$type}.limit_amount"] = 'That amount is too large.';
                continue;
            }

            $clean[$type] = ['enabled' => $enabled ? 1 : 0, 'amount' => is_numeric($raw) && (float) $raw > 0 ? round((float) $raw, 2) : 0.0];
        }

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        if (!$clean) {
            return ['success' => false, 'message' => 'Nothing to save.'];
        }

        $now = date('Y-m-d H:i:s');
        $existing = $this->load();
        $stmt = Database::connection()->prepare(
            "INSERT INTO approval_limits (document_type, is_enabled, limit_amount, created_at, updated_at, updated_by)
             VALUES (:type, :enabled, :amount, :now, :now2, :user)
             ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled), limit_amount = VALUES(limit_amount),
                                     updated_at = VALUES(updated_at), updated_by = VALUES(updated_by)"
        );

        foreach ($clean as $type => $row) {
            // Keep the old amount when a limit is only switched off.
            $amount = $row['amount'] > 0 ? $row['amount'] : (float) ($existing[$type]['limit_amount'] ?? 0);
            $stmt->execute(['type' => $type, 'enabled' => $row['enabled'], 'amount' => $amount, 'now' => $now, 'now2' => $now, 'user' => $userId]);
        }

        self::$cache = null;

        return ['success' => true, 'message' => 'Approval limits saved.', 'data' => $this->all()];
    }

    private function load(): array
    {
        if (self::$cache === null) {
            $rows = Database::connection()->query(
                "SELECT a.*, (SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username)
                               FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
                               WHERE u.id = a.updated_by LIMIT 1) AS updated_by_name
                 FROM approval_limits a"
            )->fetchAll(PDO::FETCH_ASSOC);
            self::$cache = array_column($rows, null, 'document_type');
        }

        return self::$cache;
    }

    /** For tests that change limits inside one request. */
    public static function forget(): void
    {
        self::$cache = null;
    }
}
