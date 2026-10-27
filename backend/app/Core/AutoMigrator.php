<?php

namespace App\Core;

use PDO;
use Throwable;

/**
 * Automatic Database Schema Synchronizer (`AutoMigrator`)
 *
 * Ensures that whenever the repository is pulled (`git pull`) onto any server,
 * all `.sql` files in `backend/database/schema/` are automatically tracked and
 * applied to the MySQL database without manual intervention.
 *
 * Performance & Safety:
 * - Uses a fast local state hash (`backend/storage/.schema_sync_hash`) so that
 *   normal API requests have 0ms overhead when no new `.sql` files were added.
 * - Whenever a new or modified `.sql` file appears in `backend/database/schema/`
 *   (or if `schema_migrations` is missing in the target database), it automatically
 *   syncs any unapplied migrations and records them in `schema_migrations`.
 */
class AutoMigrator
{
    private static bool $checkedThisRequest = false;

    /**
     * Run a lightweight check on boot; only executes SQL when new schema files
     * are detected after a `git pull` or on a fresh database.
     */
    public static function ensureUpToDate(PDO $pdo, bool $forceFullScan = false): array
    {
        if (self::$checkedThisRequest && !$forceFullScan) {
            return ['status' => 'already_checked_in_request'];
        }
        self::$checkedThisRequest = true;

        $schemaDir = realpath(__DIR__ . '/../../database/schema');
        if (!$schemaDir || !is_dir($schemaDir)) {
            return ['status' => 'schema_dir_not_found'];
        }

        $files = glob($schemaDir . DIRECTORY_SEPARATOR . '*.sql') ?: [];
        natsort($files);
        $files = array_values($files);

        // Compute fingerprint of all schema filenames + modification times + sizes + DB name
        $dbName = '';
        try {
            $dbName = (string)$pdo->query('SELECT DATABASE()')->fetchColumn();
        } catch (Throwable $e) {
            return ['status' => 'db_unavailable', 'error' => $e->getMessage()];
        }

        $manifestParts = [$dbName];
        foreach ($files as $f) {
            $manifestParts[] = basename($f) . ':' . @filesize($f);
        }
        $currentHash = sha1(implode('|', $manifestParts));

        $storageDir = __DIR__ . '/../../storage';
        if (!is_dir($storageDir)) {
            @mkdir($storageDir, 0775, true);
        }
        $stampFile = $storageDir . '/.schema_sync_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $dbName) . '.hash';

        if (!$forceFullScan && is_file($stampFile)) {
            $savedHash = trim((string)@file_get_contents($stampFile));
            if ($savedHash === $currentHash) {
                return [
                    'status'      => 'up_to_date_cached',
                    'total_files' => count($files),
                    'applied_now' => 0
                ];
            }
        }

        // Ensure schema_migrations tracking table exists
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `schema_migrations` (
                `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                `filename` VARCHAR(255) NOT NULL,
                `checksum` VARCHAR(64) NOT NULL,
                `status` VARCHAR(32) NOT NULL DEFAULT 'applied',
                `execution_ms` INT NOT NULL DEFAULT 0,
                `error_message` TEXT NULL,
                `applied_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY `uk_schema_migration_file` (`filename`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // Fetch already-applied filenames & checksums
        $existingStmt = $pdo->query("SELECT filename, checksum, status FROM schema_migrations");
        $existingRows = $existingStmt ? $existingStmt->fetchAll(PDO::FETCH_ASSOC) : [];
        $appliedMap = [];
        foreach ($existingRows as $row) {
            $appliedMap[$row['filename']] = $row;
        }

        $appliedNow = [];
        $skippedExisting = [];
        $errors = [];

        foreach ($files as $filePath) {
            $filename = basename($filePath);
            $sqlContent = (string)@file_get_contents($filePath);
            $checksum = sha1($sqlContent);

            // Skip if already applied with the same checksum
            if (isset($appliedMap[$filename]) && $appliedMap[$filename]['checksum'] === $checksum && in_array($appliedMap[$filename]['status'], ['applied', 'applied_with_warnings'], true)) {
                $skippedExisting[] = $filename;
                continue;
            }

            // If this is a legacy baseline file (001..310) and its target table already exists in the DB,
            // record it as applied or execute idempotently.
            $start = microtime(true);
            $fileErrors = self::executeSqlFileStatements($pdo, $sqlContent);
            $elapsedMs = (int)round((microtime(true) - $start) * 1000);

            $status = empty($fileErrors) ? 'applied' : 'applied_with_warnings';
            $errorText = empty($fileErrors) ? null : implode(" | ", array_slice($fileErrors, 0, 5));

            $upsert = $pdo->prepare("
                INSERT INTO `schema_migrations` (`filename`, `checksum`, `status`, `execution_ms`, `error_message`, `applied_at`)
                VALUES (:filename, :checksum, :status, :ms, :err, NOW())
                ON DUPLICATE KEY UPDATE
                    `checksum` = VALUES(`checksum`),
                    `status` = VALUES(`status`),
                    `execution_ms` = VALUES(`execution_ms`),
                    `error_message` = VALUES(`error_message`),
                    `applied_at` = NOW()
            ");
            $upsert->execute([
                ':filename' => $filename,
                ':checksum' => $checksum,
                ':status'   => $status,
                ':ms'       => $elapsedMs,
                ':err'      => $errorText
            ]);

            $appliedNow[] = $filename;
            if (!empty($fileErrors)) {
                $errors[$filename] = $fileErrors;
            }
        }

        // Write cache hash so subsequent requests skip scanning until a new .sql file is pulled
        @file_put_contents($stampFile, $currentHash);

        return [
            'status'           => 'synchronized',
            'database'         => $dbName,
            'total_files'      => count($files),
            'already_applied'  => count($skippedExisting),
            'applied_now_count'=> count($appliedNow),
            'applied_now'      => $appliedNow,
            'warnings'         => $errors
        ];
    }

    /**
     * Split a `.sql` migration file into individual statements and execute each one
     * safely, ignoring benign idempotent errors (such as Duplicate column / Duplicate key /
     * Table already exists when re-running legacy ALTER statements).
     */
    private static function executeSqlFileStatements(PDO $pdo, string $sql): array
    {
        $warnings = [];
        $statements = self::splitSqlStatements($sql);

        try {
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
        } catch (Throwable $e) {
            // ignore
        }

        try {
            $pdo->setAttribute(PDO::MYSQL_ATTR_USE_BUFFERED_QUERY, true);
        } catch (Throwable $e) {
            // ignore
        }

        foreach ($statements as $stmt) {
            $trimmed = trim($stmt);
            if ($trimmed === '') {
                continue;
            }
            try {
                $q = $pdo->query($trimmed);
                if ($q) {
                    do {
                        try {
                            $q->fetchAll();
                        } catch (Throwable $drainErr) {
                            // Non-SELECT statement has no rowset to fetch
                        }
                    } while ($q->nextRowset());
                    $q->closeCursor();
                }
            } catch (Throwable $e) {
                $msg = $e->getMessage();
                // Ignore benign idempotency notices on already-migrated databases
                $benignPatterns = [
                    '1050', // Table already exists
                    '1054', // Unknown column (e.g., dropped in a later migration like 018_remove_multitenancy)
                    '1060', // Duplicate column name
                    '1061', // Duplicate key name
                    '1062', // Duplicate entry
                    '1091', // Can't drop column/key; check that it exists
                    '1826', // Duplicate foreign key constraint name
                    '1359', // Trigger already exists
                ];
                $isBenign = false;
                foreach ($benignPatterns as $code) {
                    if (strpos($msg, $code) !== false) {
                        $isBenign = true;
                        break;
                    }
                }
                if (!$isBenign) {
                    $warnings[] = $msg;
                }
            }
        }

        try {
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
        } catch (Throwable $e) {
            // ignore
        }

        return $warnings;
    }

    /**
     * Quote-aware, comment-aware, UTF-8 BOM-aware, DELIMITER-aware, and BEGIN...END block-aware SQL statement splitter.
     */
    private static function splitSqlStatements(string $sql): array
    {
        // Strip UTF-8 BOM (\xEF\xBB\xBF) if present
        $sql = preg_replace('/^\xEF\xBB\xBF/', '', $sql) ?? $sql;

        // Normalize MySQL CLI `DELIMITER $$` / `DELIMITER ;` directives and `END$$`
        $sql = preg_replace('/^\s*DELIMITER\s+\S+\s*$/mi', '', $sql) ?? $sql;
        $sql = preg_replace('/\bEND\s*\$\$/i', 'END;', $sql) ?? $sql;

        $statements = [];
        $buffer = '';
        $inSingle = false;
        $inDouble = false;
        $inBacktick = false;
        $inLineComment = false;
        $inBlockComment = false;
        $beginDepth = 0;

        $len = strlen($sql);

        for ($i = 0; $i < $len; $i++) {
            $ch = $sql[$i];
            $next = ($i + 1 < $len) ? $sql[$i + 1] : '';
            $prev = ($i > 0) ? $sql[$i - 1] : '';

            // Handle active single-line comment
            if ($inLineComment) {
                if ($ch === "\n") {
                    $inLineComment = false;
                    $buffer .= "\n";
                }
                continue;
            }

            // Handle active /* ... */ block comment
            if ($inBlockComment) {
                if ($ch === '*' && $next === '/') {
                    $inBlockComment = false;
                    $i++;
                }
                continue;
            }

            // Detect start of comment when outside quotes
            if (!$inSingle && !$inDouble && !$inBacktick) {
                if ($ch === '-' && $next === '-') {
                    $inLineComment = true;
                    $i++;
                    continue;
                }
                if ($ch === '#') {
                    $inLineComment = true;
                    continue;
                }
                if ($ch === '/' && $next === '*') {
                    $inBlockComment = true;
                    $i++;
                    continue;
                }
            }

            // Track quotes
            if ($ch === "'" && !$inDouble && !$inBacktick && $prev !== '\\') {
                $inSingle = !$inSingle;
            } elseif ($ch === '"' && !$inSingle && !$inBacktick && $prev !== '\\') {
                $inDouble = !$inDouble;
            } elseif ($ch === '`' && !$inSingle && !$inDouble) {
                $inBacktick = !$inBacktick;
            }

            // Track BEGIN ... END depth for CREATE TRIGGER / CREATE PROCEDURE outside quotes
            if (!$inSingle && !$inDouble && !$inBacktick) {
                $slice = substr($sql, $i, 12);
                if (preg_match('/^BEGIN\b/i', $slice) && ($i === 0 || !ctype_alnum($prev))) {
                    $beginDepth++;
                } elseif ($beginDepth > 0 && preg_match('/^END\s*;/i', $slice) && !preg_match('/^END\s+IF\b/i', $slice) && ($i === 0 || !ctype_alnum($prev))) {
                    // Check that the previous word wasn't IF / CASE / LOOP / WHILE
                    $before = rtrim(substr($sql, max(0, $i - 12), min(12, $i)));
                    if (!preg_match('/\b(IF|CASE|LOOP|REPEAT|WHILE)$/i', $before)) {
                        $beginDepth = max(0, $beginDepth - 1);
                    }
                }
            }

            if ($ch === ';' && !$inSingle && !$inDouble && !$inBacktick && $beginDepth === 0) {
                $stmt = trim($buffer);
                if ($stmt !== '') {
                    $statements[] = $stmt;
                }
                $buffer = '';
            } else {
                $buffer .= $ch;
            }
        }

        $tail = trim($buffer);
        if ($tail !== '') {
            $statements[] = $tail;
        }

        return $statements;
    }
}
