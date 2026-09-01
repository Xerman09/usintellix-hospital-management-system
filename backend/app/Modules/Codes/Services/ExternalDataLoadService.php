<?php

namespace App\Modules\Codes\Services;

use App\Core\Database;
use PDO;
use Throwable;

/**
 * "External Data Loads" (External Database Import Utility): tracks the
 * installed release of each externally-sourced code set, scans a
 * per-section staging directory on disk for files ready to install,
 * and runs the upgrade (install + release tracking) when requested.
 *
 * A section's files are staged into backend/storage/external-data-staging/<SECTION>
 * either by an admin uploading them through this feature's "Stage a file"
 * action, or by copying them there directly on the server.
 */
class ExternalDataLoadService
{
    public const SECTIONS = [
        'ICD10' => ['code_type' => 'ICD10', 'label' => 'ICD10'],
        'RXNORM' => ['code_type' => 'RXCUI', 'label' => 'RXNORM'],
        'SNOMED' => ['code_type' => 'SNOMED', 'label' => 'SNOMED'],
        'CQM_VALUESET' => ['code_type' => 'CQM_VALUESET', 'label' => 'CQM_VALUESET']
    ];

    private CodeService $codeService;

    public function __construct()
    {
        $this->codeService = new CodeService();
    }

    /**
     * Installed-release + staged-files status for every section, for
     * the External Data Loads overview screen.
     */
    public function overview(): array
    {
        $sections = [];

        foreach (self::SECTIONS as $key => $meta) {
            $sections[] = [
                'section_key' => $key,
                'label' => $meta['label'],
                'code_type' => $meta['code_type'],
                'installed' => $this->currentInstallation($meta['code_type']),
                'staged' => $this->listStagedFiles($key)
            ];
        }

        return $sections;
    }

    /**
     * Save an uploaded file into a section's staging directory so it
     * shows up as a Staged Release ready to install.
     */
    public function stage(string $sectionKey, array $file): array
    {
        if (!isset(self::SECTIONS[$sectionKey])) {
            return ['success' => false, 'message' => 'Invalid section.'];
        }

        if (empty($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            return ['success' => false, 'message' => 'A file is required.'];
        }

        $originalName = basename((string) ($file['name'] ?? ''));
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

        if (!in_array($ext, ['zip', 'rrf', 'csv', 'txt'], true)) {
            return ['success' => false, 'message' => 'Only .zip, .rrf, .csv, or .txt files can be staged.'];
        }

        $dir = $this->stagingDir($sectionKey);

        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            return ['success' => false, 'message' => 'Unable to create the staging directory.'];
        }

        $destination = $dir . '/' . $this->safeFilename($originalName);

        if (!@move_uploaded_file($file['tmp_name'], $destination)) {
            // Fall back to copy for files placed outside a real HTTP upload (e.g. CLI verification).
            if (!@copy($file['tmp_name'], $destination)) {
                return ['success' => false, 'message' => 'Failed to save the staged file.'];
            }
        }

        return [
            'success' => true,
            'message' => "{$originalName} has been staged for {$sectionKey}.",
            'data' => ['filename' => basename($destination)]
        ];
    }

    /**
     * Install the given staged file for a section, replacing the
     * section's entire existing code set, and record the new release.
     */
    public function upgrade(string $sectionKey, string $filename, int $userId): array
    {
        if (!isset(self::SECTIONS[$sectionKey])) {
            return ['success' => false, 'message' => 'Invalid section.'];
        }

        $meta = self::SECTIONS[$sectionKey];
        $filename = basename($filename);
        $path = $this->stagingDir($sectionKey) . '/' . $filename;

        if (!is_file($path)) {
            return ['success' => false, 'message' => 'Staged file not found. It may have already been installed or removed.'];
        }

        $result = $this->codeService->installFromPath($meta['code_type'], $path, $filename, true, $userId);

        if (!$result['success']) {
            return $result;
        }

        $releaseDate = $this->guessReleaseDateFromFilename($filename) ?? date('Y-m-d');
        $revision = pathinfo($filename, PATHINFO_FILENAME);

        try {
            $stmt = Database::connection()->prepare(
                "INSERT INTO code_set_installations
                    (code_type, release_label, revision, release_date, installed_at, installed_by, inserted_count, replaced_count)
                 VALUES (:code_type, :release_label, :revision, :release_date, :installed_at, :installed_by, :inserted_count, :replaced_count)"
            );

            $stmt->execute([
                'code_type' => $meta['code_type'],
                'release_label' => $meta['label'],
                'revision' => $revision,
                'release_date' => $releaseDate,
                'installed_at' => date('Y-m-d H:i:s'),
                'installed_by' => $userId,
                'inserted_count' => $result['data']['inserted'] ?? 0,
                'replaced_count' => $result['data']['replaced_count'] ?? 0
            ]);
        } catch (Throwable $e) {
            // The code set itself installed fine; failing to log the release
            // record shouldn't be reported as an install failure.
        }

        // Move the file out of the pending queue so it isn't reprocessed.
        $installedDir = $this->stagingDir($sectionKey) . '/installed';

        if (!is_dir($installedDir)) {
            @mkdir($installedDir, 0775, true);
        }

        @rename($path, $installedDir . '/' . date('YmdHis') . '_' . $filename);

        $result['data']['release'] = [
            'release_label' => $meta['label'],
            'revision' => $revision,
            'release_date' => $releaseDate
        ];

        return $result;
    }

    private function currentInstallation(string $codeType): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT release_label, revision, release_date, installed_at, inserted_count, replaced_count
             FROM code_set_installations
             WHERE code_type = :code_type
             ORDER BY installed_at DESC
             LIMIT 1"
        );

        $stmt->execute(['code_type' => $codeType]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    private function listStagedFiles(string $sectionKey): array
    {
        $dir = $this->stagingDir($sectionKey);

        if (!is_dir($dir)) {
            return [];
        }

        $files = [];

        foreach (glob($dir . '/*.{zip,rrf,csv,txt,ZIP,RRF,CSV,TXT}', GLOB_BRACE) ?: [] as $path) {
            if (!is_file($path)) {
                continue;
            }

            $filename = basename($path);

            $files[] = [
                'filename' => $filename,
                'size' => filesize($path),
                'detected_release_date' => $this->guessReleaseDateFromFilename($filename) ?? date('Y-m-d', filemtime($path))
            ];
        }

        return $files;
    }

    /**
     * Try to pull a release date out of a staged filename
     * (e.g. "RxNorm_full_09012026.zip" or "icd10-2026-10-01.zip").
     */
    private function guessReleaseDateFromFilename(string $filename): ?string
    {
        if (preg_match('/(\d{4})[-_](\d{2})[-_](\d{2})/', $filename, $m)) {
            $year = (int) $m[1];
            $month = (int) $m[2];
            $day = (int) $m[3];

            if (checkdate($month, $day, $year)) {
                return sprintf('%04d-%02d-%02d', $year, $month, $day);
            }
        }

        if (preg_match('/(\d{2})(\d{2})(\d{4})/', $filename, $m)) {
            $month = (int) $m[1];
            $day = (int) $m[2];
            $year = (int) $m[3];

            if (checkdate($month, $day, $year)) {
                return sprintf('%04d-%02d-%02d', $year, $month, $day);
            }
        }

        return null;
    }

    private function stagingDir(string $sectionKey): string
    {
        return dirname(__DIR__, 4) . '/storage/external-data-staging/' . $sectionKey;
    }

    private function safeFilename(string $filename): string
    {
        $filename = preg_replace('/[^A-Za-z0-9._-]/', '_', $filename) ?? 'file';

        return $filename !== '' ? $filename : 'file';
    }
}
