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
        'OID_VALUESET',
        'RXCUI'
    ];

    // Code types with a genuine native-format parser (as opposed to
    // this app's own generic CSV import format). Anything not listed
    // here falls back to the generic CSV format on Install Code Set.
    public const NATIVE_FORMAT_TYPES = ['RXCUI'];

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
     * "Install Code Set" / Native Data Loads: accept an uploaded source
     * file for a given code type, transparently unzip it if needed,
     * parse it using the type's native format (falling back to this
     * app's generic CSV format for types without one), optionally
     * soft-delete the entire existing set first, then delegate actual
     * row insertion to import().
     *
     * $file is a single $_FILES-style entry: ['name'=>..,'tmp_name'=>..,'error'=>..].
     */
    public function installCodeSet(string $codeType, array $file, bool $replaceEntireSet, int $createdBy): array
    {
        if (!in_array($codeType, self::CODE_TYPES, true)) {
            return [
                'success' => false,
                'message' => 'Invalid code type.'
            ];
        }

        if (empty($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            return [
                'success' => false,
                'message' => 'No source file was uploaded.'
            ];
        }

        $sourcePath = $file['tmp_name'];
        $originalName = (string) ($file['name'] ?? '');
        $extractedTemp = null;

        if ($this->looksLikeZip($sourcePath, $originalName)) {
            $extractedTemp = $this->extractFromZip($sourcePath, $codeType);

            if ($extractedTemp === null) {
                return [
                    'success' => false,
                    'message' => 'Could not find a usable data file for ' . $codeType . ' inside the uploaded ZIP archive.'
                ];
            }

            $sourcePath = $extractedTemp;
        }

        $rows = in_array($codeType, self::NATIVE_FORMAT_TYPES, true)
            ? $this->parseRxNormRrf($sourcePath)
            : $this->parseGenericCsv($sourcePath);

        if ($extractedTemp !== null) {
            @unlink($extractedTemp);
        }

        if ($rows === null) {
            return [
                'success' => false,
                'message' => 'Unable to parse the uploaded source file.'
            ];
        }

        if (empty($rows)) {
            return [
                'success' => false,
                'message' => 'No usable rows were found in the uploaded source file.'
            ];
        }

        $replacedCount = 0;

        if ($replaceEntireSet) {
            $replacedCount = $this->softDeleteAllOfType($codeType, $createdBy);
        }

        $result = $this->import($codeType, $rows, $createdBy);

        if (!$result['success']) {
            return $result;
        }

        $result['data']['replaced_count'] = $replacedCount;
        $prefix = $replaceEntireSet ? "Replaced {$replacedCount} existing {$codeType} code(s). " : '';
        $result['message'] = $prefix . $result['message'];

        return $result;
    }

    /**
     * Parse a RxNorm RXNCONSO.RRF file: pipe-delimited, no header, 18
     * columns. Keeps only English RxNorm-source, non-suppressed rows,
     * deduped by RXCUI (first STR encountered wins), and shapes them
     * into the associative row format import() expects.
     */
    private function parseRxNormRrf(string $path): ?array
    {
        $handle = @fopen($path, 'r');

        if (!$handle) {
            return null;
        }

        $rows = [];
        $seen = [];

        while (($line = fgets($handle)) !== false) {
            $line = rtrim($line, "\r\n");

            if ($line === '') {
                continue;
            }

            $fields = explode('|', $line);

            if (count($fields) < 17) {
                continue;
            }

            $rxcui = trim($fields[0]);
            $lat = trim($fields[1]);
            $sab = trim($fields[11]);
            $str = trim($fields[14]);
            $suppress = trim($fields[16]);

            if ($rxcui === '' || $str === '' || $lat !== 'ENG' || $sab !== 'RXNORM') {
                continue;
            }

            if (in_array($suppress, ['Y', 'O'], true)) {
                continue;
            }

            if (isset($seen[$rxcui])) {
                continue;
            }

            $seen[$rxcui] = true;

            $rows[] = [
                'code' => $rxcui,
                'description' => $str,
                'short_description' => mb_strimwidth($str, 0, 100, ''),
                'category' => 'RxNorm'
            ];
        }

        fclose($handle);

        return $rows;
    }

    /**
     * Parse this app's generic CSV import format: header row of
     * IMPORT_COLUMNS names (any subset/order), then one row per line.
     */
    private function parseGenericCsv(string $path): ?array
    {
        $handle = @fopen($path, 'r');

        if (!$handle) {
            return null;
        }

        $header = fgetcsv($handle);

        if (!$header) {
            fclose($handle);
            return null;
        }

        $header = array_map(fn($col) => strtolower(trim((string) $col)), $header);
        $rows = [];

        while (($line = fgetcsv($handle)) !== false) {
            $padded = array_pad(array_slice($line, 0, count($header)), count($header), null);
            $rows[] = array_combine($header, $padded);
        }

        fclose($handle);

        return $rows;
    }

    /**
     * Detect whether the uploaded file is a ZIP archive, by extension
     * or by its magic bytes (in case the browser mislabels it).
     */
    private function looksLikeZip(string $path, string $originalName): bool
    {
        if (str_ends_with(strtolower($originalName), '.zip')) {
            return true;
        }

        $handle = @fopen($path, 'rb');

        if (!$handle) {
            return false;
        }

        $magic = fread($handle, 4);
        fclose($handle);

        return $magic === "PK\x03\x04";
    }

    /**
     * Extract the relevant native data file from a ZIP archive into a
     * temp file and return its path, or null if nothing usable was found.
     * Caller is responsible for deleting the returned temp file.
     */
    private function extractFromZip(string $zipPath, string $codeType): ?string
    {
        if (!class_exists(\ZipArchive::class)) {
            return null;
        }

        $zip = new \ZipArchive();

        if ($zip->open($zipPath) !== true) {
            return null;
        }

        $targetName = null;

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            $base = basename((string) $name);

            if ($codeType === 'RXCUI' && strcasecmp($base, 'RXNCONSO.RRF') === 0) {
                $targetName = $name;
                break;
            }
        }

        if ($targetName === null) {
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = $zip->getNameIndex($i);
                $ext = strtolower(pathinfo((string) $name, PATHINFO_EXTENSION));

                if (in_array($codeType, self::NATIVE_FORMAT_TYPES, true) && $ext === 'rrf') {
                    $targetName = $name;
                    break;
                }

                if (!in_array($codeType, self::NATIVE_FORMAT_TYPES, true) && in_array($ext, ['csv', 'txt'], true)) {
                    $targetName = $name;
                    break;
                }
            }
        }

        if ($targetName === null) {
            $zip->close();
            return null;
        }

        $stream = $zip->getStream($targetName);

        if (!$stream) {
            $zip->close();
            return null;
        }

        $tempPath = tempnam(sys_get_temp_dir(), 'codeset_');
        $out = fopen($tempPath, 'w');

        while (!feof($stream)) {
            fwrite($out, fread($stream, 8192));
        }

        fclose($stream);
        fclose($out);
        $zip->close();

        return $tempPath;
    }

    /**
     * Soft-delete every existing (non-deleted) code of the given type.
     * Used by "Replace entire code set" before installing fresh rows.
     */
    private function softDeleteAllOfType(string $codeType, int $deletedBy): int
    {
        $stmt = Database::connection()->prepare(
            "UPDATE codes
             SET deleted_at = :deleted_at, deleted_by = :deleted_by
             WHERE code_type = :code_type AND deleted_at IS NULL"
        );

        $stmt->execute([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy,
            'code_type'  => $codeType
        ]);

        return $stmt->rowCount();
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
