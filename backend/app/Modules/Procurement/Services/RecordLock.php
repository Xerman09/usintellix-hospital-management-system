<?php

namespace App\Modules\Procurement\Services;

use App\Core\Database;
use PDO;

/**
 * Guards a workflow step against a record that changed after it was
 * read -- a double-clicked Approve, or two people acting on the same
 * document at once. Call inside the step's transaction: the row stays
 * locked until it commits, so the second request waits, then sees the
 * change and is refused instead of applying the step twice.
 */
class RecordLock
{
    public const STALE_MESSAGE = 'was just changed by someone else. Reload it and try again.';

    /**
     * Locks the row and reports whether any of $fields differs from what
     * the caller read ($seen). A missing row counts as changed.
     */
    public static function changed(string $table, int $id, array $seen, array $fields = ['status', 'updated_at']): bool
    {
        $columns = implode(', ', $fields);
        $stmt = Database::connection()->prepare("SELECT {$columns} FROM {$table} WHERE id = :id FOR UPDATE");
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return true;
        }

        foreach ($fields as $field) {
            if (array_key_exists($field, $seen) && (string) ($row[$field] ?? '') !== (string) ($seen[$field] ?? '')) {
                return true;
            }
        }

        return false;
    }
}
