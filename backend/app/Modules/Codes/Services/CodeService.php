<?php

namespace App\Modules\Codes\Services;

use App\Core\Database;
use App\Modules\Codes\Models\Code;
use PDO;
use PDOException;
use Throwable;

class CodeService
{
    public const CODE_TYPES = [
        'CPT4',
        'HCPCS',
        'CVX',
        'ICD10',
        'LOINC',
        'PHIN_QUESTIONS',
        'NCI_CONCEPT_ID',
        'CQM_VALUESET',
        'OID_VALUESET'
    ];

    private const IMPORT_COLUMNS = [
        'code',
        'modifier',
        'description',
        'short_description',
        'category',
        'diagnosis_reporting',
        'service_reporting',
        'related_code',
        'fee_standard',
        'active'
    ];

    /**
     * List active (non-deleted) codes, paginated, optionally filtered
     * by code type and a search term against code/description fields.
     */
    public function list(string $type = '', string $search = '', int $page = 1, int $perPage = 50): array
    {
        $page = max(1, $page);
        $perPage = max(1, min(200, $perPage));
        $offset = ($page - 1) * $perPage;

        $where = 'WHERE deleted_at IS NULL';
        $params = [];

        if ($type !== '') {
            $where .= ' AND code_type = :type';
            $params['type'] = $type;
        }

        if ($search !== '') {
            $where .= ' AND (code LIKE :search1 OR description LIKE :search2 OR short_description LIKE :search3)';
            $params['search1'] = '%' . $search . '%';
            $params['search2'] = '%' . $search . '%';
            $params['search3'] = '%' . $search . '%';
        }

        $countStmt = Database::connection()->prepare(
            "SELECT COUNT(*) AS total FROM codes {$where}"
        );
        $countStmt->execute($params);
        $total = (int) $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        $stmt = Database::connection()->prepare(
            "SELECT id, code_type, code, modifier, description, short_description, category,
                    diagnosis_reporting, service_reporting, related_code, fee_standard, active,
                    created_at, updated_at
             FROM codes
             {$where}
             ORDER BY code_type, code
             LIMIT :limit OFFSET :offset"
        );

        foreach ($params as $key => $value) {
            $stmt->bindValue(":{$key}", $value);
        }

        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'items' => $stmt->fetchAll(PDO::FETCH_ASSOC),
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => $perPage > 0 ? (int) ceil($total / $perPage) : 0
        ];
    }

    /**
     * Register a new code (admin-only).
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

        $modifier = trim((string) ($data['modifier'] ?? ''));

        try {
            $id = (new Code())->create([
                'code_type'           => $data['code_type'],
                'code'                => $data['code'],
                'modifier'            => $modifier !== '' ? $modifier : null,
                'description'         => $data['description'],
                'short_description'   => $data['short_description'] ?? null,
                'category'            => $data['category'] ?? 'Unassigned',
                'diagnosis_reporting' => $this->toBool($data['diagnosis_reporting'] ?? false) ? 1 : 0,
                'service_reporting'   => $this->toBool($data['service_reporting'] ?? false) ? 1 : 0,
                'related_code'        => $data['related_code'] ?? null,
                'fee_standard'        => $this->toFee($data['fee_standard'] ?? null),
                'active'              => $this->toBool($data['active'] ?? true) ? 1 : 0,
                'created_at'          => date('Y-m-d H:i:s'),
                'created_by'          => $createdBy
            ]);

            if (!$id) {
                throw new \RuntimeException('Failed to create code record.');
            }

            return [
                'success' => true,
                'message' => 'Code created successfully.',
                'data' => [
                    'code_id' => $id
                ]
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['code' => 'A code with this type/code/modifier combination already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to create code.'
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create code.'
            ];
        }
    }

    /**
     * Update an existing code (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $record = (new Code())->where('id', $id)->first();

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Code not found.'
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

        $modifier = trim((string) ($data['modifier'] ?? ''));

        try {
            $updated = (new Code())->update([
                'code_type'           => $data['code_type'],
                'code'                => $data['code'],
                'modifier'            => $modifier !== '' ? $modifier : null,
                'description'         => $data['description'],
                'short_description'   => $data['short_description'] ?? null,
                'category'            => $data['category'] ?? 'Unassigned',
                'diagnosis_reporting' => $this->toBool($data['diagnosis_reporting'] ?? false) ? 1 : 0,
                'service_reporting'   => $this->toBool($data['service_reporting'] ?? false) ? 1 : 0,
                'related_code'        => $data['related_code'] ?? null,
                'fee_standard'        => $this->toFee($data['fee_standard'] ?? null),
                'active'              => $this->toBool($data['active'] ?? true) ? 1 : 0,
                'updated_at'          => date('Y-m-d H:i:s'),
                'updated_by'          => $updatedBy
            ], $id);

            if (!$updated) {
                return [
                    'success' => false,
                    'message' => 'Failed to update code.'
                ];
            }

            return [
                'success' => true,
                'message' => 'Code updated successfully.'
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['code' => 'A code with this type/code/modifier combination already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to update code.'
            ];
        }
    }

    /**
     * Soft-delete a code (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $record = (new Code())->where('id', $id)->first();

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Code not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE codes
             SET deleted_at = :deleted_at, deleted_by = :deleted_by
             WHERE id = :id"
        );

        $stmt->execute([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy,
            'id'         => $id
        ]);

        return [
            'success' => true,
            'message' => 'Code deleted successfully.'
        ];
    }

    /**
     * Bulk-import codes of a single type from parsed CSV rows.
     * Each row is an associative array keyed by the IMPORT_COLUMNS header.
     * Rows missing a code, or that duplicate an existing/in-batch
     * code+modifier, are skipped and reported rather than aborting the
     * whole import.
     */
    public function import(string $codeType, array $rows, int $createdBy): array
    {
        if (!in_array($codeType, self::CODE_TYPES, true)) {
            return [
                'success' => false,
                'message' => 'Invalid code type.'
            ];
        }

        $inserted = 0;
        $skipped = [];
        $seen = [];

        $model = new Code();

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2; // header is row 1

            $code = trim((string) ($row['code'] ?? ''));
            $description = trim((string) ($row['description'] ?? ''));
            $modifier = trim((string) ($row['modifier'] ?? ''));
            $modifier = $modifier !== '' ? $modifier : null;

            if ($code === '' || $description === '') {
                $skipped[] = "Row {$rowNumber}: code and description are required.";
                continue;
            }

            $dedupeKey = $codeType . '|' . $code . '|' . ($modifier ?? '');

            if (isset($seen[$dedupeKey])) {
                $skipped[] = "Row {$rowNumber}: duplicate of an earlier row in this file ({$code}).";
                continue;
            }

            $existing = (new Code())
                ->where('code_type', $codeType)
                ->where('code', $code)
                ->first();

            if ($existing && $existing['deleted_at'] === null &&
                (string) ($existing['modifier'] ?? '') === (string) ($modifier ?? '')) {
                $skipped[] = "Row {$rowNumber}: code {$code} already exists.";
                continue;
            }

            try {
                $id = (new Code())->create([
                    'code_type'           => $codeType,
                    'code'                => $code,
                    'modifier'            => $modifier,
                    'description'         => $description,
                    'short_description'   => trim((string) ($row['short_description'] ?? '')) ?: null,
                    'category'            => trim((string) ($row['category'] ?? '')) ?: 'Unassigned',
                    'diagnosis_reporting' => $this->toBool($row['diagnosis_reporting'] ?? false) ? 1 : 0,
                    'service_reporting'   => $this->toBool($row['service_reporting'] ?? false) ? 1 : 0,
                    'related_code'        => trim((string) ($row['related_code'] ?? '')) ?: null,
                    'fee_standard'        => $this->toFee($row['fee_standard'] ?? null),
                    'active'              => $this->toBool($row['active'] ?? true) ? 1 : 0,
                    'created_at'          => date('Y-m-d H:i:s'),
                    'created_by'          => $createdBy
                ]);

                if ($id) {
                    $inserted++;
                    $seen[$dedupeKey] = true;
                } else {
                    $skipped[] = "Row {$rowNumber}: failed to insert.";
                }
            } catch (Throwable $e) {
                $skipped[] = "Row {$rowNumber}: failed to insert ({$code}).";
            }
        }

        return [
            'success' => true,
            'message' => "Import complete: {$inserted} inserted, " . count($skipped) . ' skipped.',
            'data' => [
                'inserted' => $inserted,
                'skipped_count' => count($skipped),
                'skipped' => $skipped
            ]
        ];
    }

    /**
     * The CSV header/column order expected for import files.
     */
    public function importColumns(): array
    {
        return self::IMPORT_COLUMNS;
    }

    /**
     * Validate code input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['code_type']) || !in_array($data['code_type'], self::CODE_TYPES, true)) {
            $errors['code_type'] = 'A valid code type is required.';
        }

        if (empty($data['code'])) {
            $errors['code'] = 'Code is required.';
        }

        if (empty($data['description'])) {
            $errors['description'] = 'Description is required.';
        }

        if (!empty($errors)) {
            return $errors;
        }

        $modifier = trim((string) ($data['modifier'] ?? ''));
        $modifier = $modifier !== '' ? $modifier : null;

        $existing = (new Code())
            ->where('code_type', $data['code_type'])
            ->where('code', $data['code'])
            ->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId &&
            (string) ($existing['modifier'] ?? '') === (string) ($modifier ?? '')) {
            $errors['code'] = 'A code with this type/code/modifier combination already exists.';
        }

        return $errors;
    }

    private function toBool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    private function toFee(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (!is_numeric($value)) {
            return null;
        }

        return number_format((float) $value, 2, '.', '');
    }
}
