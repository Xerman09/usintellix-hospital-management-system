<?php

namespace App\Modules\DocumentTemplates\Services;

use App\Core\Database;
use PDO;

/**
 * "Document Template Management": upload/list/download/delete document
 * template files (letter templates, form templates, etc.), stored as
 * real files under public/uploads/document_templates and served
 * statically -- same convention as PatientDocuments' file_path/${API_URL}
 * pattern already used across the app.
 */
class DocumentTemplateService
{
    // Deliberately an allowlist, not a blocklist: these files are saved
    // under public/uploads, which the web server serves directly, so a
    // server-executable extension (.php etc.) here would be a real RCE.
    private const ALLOWED_EXTENSIONS = ['html', 'htm', 'rtf', 'doc', 'docx', 'odt', 'txt', 'pdf', 'csv'];

    private const MAX_SIZE_BYTES = 10 * 1024 * 1024;

    /**
     * The repository listing, each file's category (if any) joined in
     * from document_template_meta -- the Template Maintenance screen's
     * "Repository" scope browses this same list.
     */
    public function list(): array
    {
        $dir = $this->storageDir();

        if (!is_dir($dir)) {
            return [];
        }

        $categoriesByFilename = $this->categoriesByFilename();

        $templates = [];

        foreach (scandir($dir) ?: [] as $filename) {
            if ($filename === '.' || $filename === '..' || $filename === '.gitkeep') {
                continue;
            }

            $path = $dir . '/' . $filename;

            if (!is_file($path)) {
                continue;
            }

            $category = $categoriesByFilename[$filename] ?? null;

            $templates[] = [
                'filename' => $filename,
                'size' => filesize($path),
                'modified_at' => date('Y-m-d H:i:s', filemtime($path)),
                'file_path' => '/uploads/document_templates/' . rawurlencode($filename),
                'category_id' => $category['category_id'] ?? null,
                'category_name' => $category['category_name'] ?? null
            ];
        }

        usort($templates, fn($a, $b) => strcasecmp($a['filename'], $b['filename']));

        return $templates;
    }

    /**
     * Tags (or clears, with $categoryId = null) a repository file's
     * category -- one row per filename in document_template_meta,
     * created on first tag and updated after that.
     */
    public function setCategory(string $filename, ?int $categoryId, int $userId): array
    {
        $safeFilename = $this->safeFilename($filename);

        if ($safeFilename === null || !is_file($this->storageDir() . '/' . $safeFilename)) {
            return ['success' => false, 'message' => 'Template not found.'];
        }

        $existing = Database::connection()->prepare(
            "SELECT id FROM document_template_meta WHERE template_filename = ?"
        );
        $existing->execute([$safeFilename]);
        $row = $existing->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $stmt = Database::connection()->prepare(
                "UPDATE document_template_meta SET category_id = ?, updated_at = ?, updated_by = ? WHERE id = ?"
            );
            $stmt->execute([$categoryId, date('Y-m-d H:i:s'), $userId, $row['id']]);
        } else {
            $stmt = Database::connection()->prepare(
                "INSERT INTO document_template_meta (template_filename, category_id, created_at, created_by)
                 VALUES (?, ?, ?, ?)"
            );
            $stmt->execute([$safeFilename, $categoryId, date('Y-m-d H:i:s'), $userId]);
        }

        return ['success' => true, 'message' => 'Category updated.'];
    }

    private function categoriesByFilename(): array
    {
        $stmt = Database::connection()->query(
            "SELECT m.template_filename, m.category_id, c.name AS category_name
             FROM document_template_meta m
             LEFT JOIN template_categories c ON c.id = m.category_id AND c.deleted_at IS NULL"
        );

        $result = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $result[$row['template_filename']] = $row;
        }

        return $result;
    }

    /**
     * Save an uploaded file under the given destination filename,
     * overwriting an existing template of the same name (that's the
     * point of letting the admin choose the destination filename).
     */
    public function upload(array $file, string $destinationFilename): array
    {
        if (empty($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            return ['success' => false, 'message' => 'No file was uploaded.'];
        }

        if ($file['size'] > self::MAX_SIZE_BYTES) {
            return ['success' => false, 'message' => 'File must be 10MB or smaller.'];
        }

        $destinationFilename = trim($destinationFilename);

        if ($destinationFilename === '') {
            $destinationFilename = (string) ($file['name'] ?? '');
        }

        $safeFilename = $this->safeFilename($destinationFilename);

        if ($safeFilename === null) {
            return ['success' => false, 'message' => 'Please provide a valid destination filename.'];
        }

        $extension = strtolower((string) pathinfo($safeFilename, PATHINFO_EXTENSION));

        if (!in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            return [
                'success' => false,
                'message' => 'Unsupported file type. Allowed: ' . strtoupper(implode(', ', self::ALLOWED_EXTENSIONS)) . '.'
            ];
        }

        $dir = $this->storageDir();

        if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
            return ['success' => false, 'message' => 'Unable to create the templates directory.'];
        }

        $destination = $dir . '/' . $safeFilename;

        if (!@move_uploaded_file($file['tmp_name'], $destination) && !@copy($file['tmp_name'], $destination)) {
            return ['success' => false, 'message' => 'Failed to save the uploaded file.'];
        }

        return [
            'success' => true,
            'message' => "{$safeFilename} uploaded successfully.",
            'data' => [
                'filename' => $safeFilename,
                'file_path' => '/uploads/document_templates/' . rawurlencode($safeFilename)
            ]
        ];
    }

    public function delete(string $filename): array
    {
        $safeFilename = $this->safeFilename($filename);

        if ($safeFilename === null) {
            return ['success' => false, 'message' => 'Invalid filename.'];
        }

        $path = $this->storageDir() . '/' . $safeFilename;

        if (!is_file($path)) {
            return ['success' => false, 'message' => 'Template not found.'];
        }

        if (!@unlink($path)) {
            return ['success' => false, 'message' => 'Failed to delete the template.'];
        }

        return ['success' => true, 'message' => "{$safeFilename} deleted successfully."];
    }

    private function storageDir(): string
    {
        return dirname(__DIR__, 4) . '/public/uploads/document_templates';
    }

    /**
     * basename() strips any directory traversal, then anything outside
     * a safe charset is stripped so the result can't escape the
     * storage directory, hide as a dotfile, or smuggle a second
     * extension past the allowlist check.
     */
    private function safeFilename(string $filename): ?string
    {
        $filename = basename(trim($filename));
        $filename = preg_replace('/[^A-Za-z0-9._-]/', '_', $filename) ?? '';
        $filename = ltrim($filename, '.');

        return $filename !== '' ? $filename : null;
    }
}
