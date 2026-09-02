<?php

namespace App\Modules\DocumentTemplates\Services;

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

    public function list(): array
    {
        $dir = $this->storageDir();

        if (!is_dir($dir)) {
            return [];
        }

        $templates = [];

        foreach (scandir($dir) ?: [] as $filename) {
            if ($filename === '.' || $filename === '..' || $filename === '.gitkeep') {
                continue;
            }

            $path = $dir . '/' . $filename;

            if (!is_file($path)) {
                continue;
            }

            $templates[] = [
                'filename' => $filename,
                'size' => filesize($path),
                'modified_at' => date('Y-m-d H:i:s', filemtime($path)),
                'file_path' => '/uploads/document_templates/' . rawurlencode($filename)
            ];
        }

        usort($templates, fn($a, $b) => strcasecmp($a['filename'], $b['filename']));

        return $templates;
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
