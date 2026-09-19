<?php

namespace App\Modules\NewDocuments\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Core\Request;
use App\Core\Session;
use PDO;

class NewDocumentsController extends Controller
{
    private PDO $db;

    private const ALLOWED_TYPES = [
        'application/pdf' => 'pdf',
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
        'application/msword' => 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
        'application/vnd.ms-excel' => 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
        'text/plain' => 'txt',
        'text/csv' => 'csv'
    ];

    private const MAX_SIZE_BYTES = 20971520; // 20 MB

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * GET /new-documents/documents
     * Retrieve document records filtered by patient, category, or search
     */
    public function documents(): void
    {
        $request = new Request();
        $patientParam = trim((string) $request->input('patient_id', ''));
        $category = trim((string) $request->input('category', ''));
        $search = trim((string) $request->input('search', ''));

        $sql = "
            SELECT 
                pd.id,
                pd.patient_id,
                pd.category,
                pd.portal_visible,
                pd.title,
                pd.original_filename,
                pd.stored_filename,
                pd.file_path,
                pd.mime_type,
                pd.file_size,
                pd.description,
                pd.created_at,
                pd.created_by,
                p.patient_no,
                CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name) AS patient_name,
                COALESCE(u.username, 'Staff') AS uploaded_by_name
            FROM patient_documents pd
            LEFT JOIN patients p ON p.id = pd.patient_id
            LEFT JOIN users u ON u.id = pd.created_by
            WHERE pd.deleted_at IS NULL
        ";
        $bindings = [];

        // Patient filter logic
        if ($patientParam === 'unassigned' || $patientParam === 'new') {
            $sql .= " AND pd.patient_id IS NULL";
        } elseif (is_numeric($patientParam) && (int)$patientParam > 0) {
            $sql .= " AND pd.patient_id = ?";
            $bindings[] = (int) $patientParam;
        } elseif ($patientParam === 'all') {
            // Include all
        }

        // Category filter
        if (!empty($category) && $category !== 'all' && $category !== 'Categories') {
            $sql .= " AND pd.category = ?";
            $bindings[] = $category;
        }

        // Text search
        if (!empty($search)) {
            $sql .= " AND (pd.title LIKE ? OR pd.original_filename LIKE ? OR pd.description LIKE ? OR p.patient_no LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ?)";
            $term = "%{$search}%";
            $bindings[] = $term;
            $bindings[] = $term;
            $bindings[] = $term;
            $bindings[] = $term;
            $bindings[] = $term;
            $bindings[] = $term;
        }

        $sql .= " ORDER BY pd.created_at DESC, pd.id DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($bindings);
        $docs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $this->success($docs, 'Documents retrieved successfully.');
    }

    /**
     * GET /new-documents/categories
     * Retrieve document categories with counts
     */
    public function categories(): void
    {
        $request = new Request();
        $patientParam = trim((string) $request->input('patient_id', ''));

        // 1. Fetch categories
        $catsStmt = $this->db->query("
            SELECT id, parent_id, name, sequence 
            FROM document_categories 
            WHERE deleted_at IS NULL 
            ORDER BY parent_id IS NULL DESC, sequence, name
        ");
        $categories = $catsStmt->fetchAll(PDO::FETCH_ASSOC);

        // 2. Fetch doc counts grouped by category
        $countSql = "
            SELECT category, COUNT(*) AS doc_count 
            FROM patient_documents 
            WHERE deleted_at IS NULL
        ";
        $countBindings = [];

        if ($patientParam === 'unassigned' || $patientParam === 'new') {
            $countSql .= " AND patient_id IS NULL";
        } elseif (is_numeric($patientParam) && (int)$patientParam > 0) {
            $countSql .= " AND patient_id = ?";
            $countBindings[] = (int) $patientParam;
        }

        $countSql .= " GROUP BY category";

        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute($countBindings);
        $counts = $countStmt->fetchAll(PDO::FETCH_KEY_PAIR);

        foreach ($categories as &$c) {
            $c['doc_count'] = (int) ($counts[$c['name']] ?? 0);
        }

        $this->success($categories, 'Categories retrieved successfully.');
    }

    /**
     * GET /new-documents/stats
     * Total and unassigned document counts
     */
    public function stats(): void
    {
        $unassigned = (int) $this->db->query("
            SELECT COUNT(*) FROM patient_documents WHERE patient_id IS NULL AND deleted_at IS NULL
        ")->fetchColumn();

        $total = (int) $this->db->query("
            SELECT COUNT(*) FROM patient_documents WHERE deleted_at IS NULL
        ")->fetchColumn();

        $this->success([
            'unassigned_count' => $unassigned,
            'total_count' => $total
        ], 'Stats retrieved.');
    }

    /**
     * GET /new-documents/templates
     * List available document templates
     */
    public function templates(): void
    {
        $sql = "
            SELECT 
                m.id,
                m.template_filename,
                m.category_id,
                c.name AS category_name,
                m.created_at,
                CONCAT('/uploads/document_templates/', m.template_filename) AS file_path
            FROM document_template_meta m
            LEFT JOIN template_categories c ON c.id = m.category_id
            ORDER BY c.name, m.template_filename
        ";
        $templates = $this->db->query($sql)->fetchAll(PDO::FETCH_ASSOC);
        $this->success($templates, 'Document templates retrieved.');
    }

    /**
     * POST /new-documents/upload
     * Save uploaded document file(s) with automatic duplicate renaming
     */
    public function upload(): void
    {
        // Collect files from either 'files' or 'file'
        $filesToProcess = [];
        if (!empty($_FILES['files']['name'])) {
            if (is_array($_FILES['files']['name'])) {
                $count = count($_FILES['files']['name']);
                for ($i = 0; $i < $count; $i++) {
                    if (($_FILES['files']['error'][$i] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
                        $filesToProcess[] = [
                            'name' => $_FILES['files']['name'][$i],
                            'type' => $_FILES['files']['type'][$i],
                            'tmp_name' => $_FILES['files']['tmp_name'][$i],
                            'error' => $_FILES['files']['error'][$i],
                            'size' => $_FILES['files']['size'][$i]
                        ];
                    }
                }
            } else if (($_FILES['files']['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
                $filesToProcess[] = $_FILES['files'];
            }
        } elseif (!empty($_FILES['file']) && ($_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
            $filesToProcess[] = $_FILES['file'];
        }

        if (empty($filesToProcess)) {
            $this->error('No files were selected or an upload error occurred.', 422);
            return;
        }

        $uploadDir = dirname(__DIR__, 4) . '/public/uploads/patient_documents';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $category = trim((string) ($_POST['category'] ?? 'Advance Directive'));
        $dicomStudy = trim((string) ($_POST['dicom_study_name'] ?? ''));
        $userNotes = trim((string) ($_POST['description'] ?? ''));
        $description = !empty($dicomStudy) ? "Study: {$dicomStudy}. " . $userNotes : $userNotes;

        $patientId = !empty($_POST['patient_id']) && is_numeric($_POST['patient_id']) && (int)$_POST['patient_id'] > 0 
            ? (int) $_POST['patient_id'] 
            : null;
        $portalVisible = isset($_POST['portal_visible']) ? (int) $_POST['portal_visible'] : 1;

        $user = Session::get('user');
        $userId = $user['id'] ?? 1;

        $uploadedRecords = [];

        foreach ($filesToProcess as $file) {
            $mimeType = mime_content_type($file['tmp_name']);
            if (!isset(self::ALLOWED_TYPES[$mimeType])) {
                continue; // Skip unsupported
            }

            if ($file['size'] > self::MAX_SIZE_BYTES) {
                continue; // Skip over-limit
            }

            $extension = self::ALLOWED_TYPES[$mimeType];
            $originalName = $file['name'];

            // Duplicate renaming: file.jpg -> file.1.jpg (OpenEMR standard)
            $finalOriginalName = $this->resolveUniqueFilename($patientId, $originalName);

            $prefix = $patientId ? "doc_{$patientId}_" : "unassigned_";
            $storedFilename = $prefix . time() . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
            $destination = $uploadDir . '/' . $storedFilename;

            if (move_uploaded_file($file['tmp_name'], $destination)) {
                $docTitle = trim((string) ($_POST['title'] ?? ''));
                if (empty($docTitle) || count($filesToProcess) > 1) {
                    $docTitle = pathinfo($finalOriginalName, PATHINFO_FILENAME);
                }

                $stmt = $this->db->prepare("
                    INSERT INTO patient_documents 
                        (patient_id, category, portal_visible, title, original_filename, stored_filename, file_path, mime_type, file_size, description, created_at, created_by)
                    VALUES 
                        (:patient_id, :category, :portal_visible, :title, :original_filename, :stored_filename, :file_path, :mime_type, :file_size, :description, NOW(), :created_by)
                ");

                $stmt->execute([
                    'patient_id' => $patientId,
                    'category' => $category,
                    'portal_visible' => $portalVisible,
                    'title' => $docTitle,
                    'original_filename' => $finalOriginalName,
                    'stored_filename' => $storedFilename,
                    'file_path' => '/uploads/patient_documents/' . $storedFilename,
                    'mime_type' => $mimeType,
                    'file_size' => (int) $file['size'],
                    'description' => !empty($description) ? $description : null,
                    'created_by' => $userId
                ]);

                $uploadedRecords[] = [
                    'id' => (int) $this->db->lastInsertId(),
                    'title' => $docTitle,
                    'original_filename' => $finalOriginalName,
                    'file_path' => '/uploads/patient_documents/' . $storedFilename
                ];
            }
        }

        if (empty($uploadedRecords)) {
            $this->error('Failed to upload file(s). Check file formats (PDF, images, office docs) and sizes.', 422);
            return;
        }

        $count = count($uploadedRecords);
        $this->success([
            'count' => $count,
            'records' => $uploadedRecords,
            'id' => $uploadedRecords[0]['id']
        ], "{$count} file(s) uploaded successfully to '{$category}'.", 201);
    }

    /**
     * Resolve duplicate filenames according to OpenEMR rule:
     * file.jpg -> file.1.jpg -> file.2.jpg
     */
    private function resolveUniqueFilename(?int $patientId, string $filename): string
    {
        $sql = "SELECT original_filename FROM patient_documents WHERE ";
        $params = [];
        if ($patientId) {
            $sql .= "patient_id = ?";
            $params[] = $patientId;
        } else {
            $sql .= "patient_id IS NULL";
        }
        $sql .= " AND original_filename LIKE ? AND deleted_at IS NULL";
        
        $baseName = pathinfo($filename, PATHINFO_FILENAME);
        $ext = pathinfo($filename, PATHINFO_EXTENSION);
        $params[] = "{$baseName}%";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $existing = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (!in_array($filename, $existing, true)) {
            return $filename;
        }

        $counter = 1;
        while (true) {
            $candidate = "{$baseName}.{$counter}.{$ext}";
            if (!in_array($candidate, $existing, true)) {
                return $candidate;
            }
            $counter++;
        }
    }

    /**
     * PUT /new-documents/update
     * Update document metadata or assign/reassign to patient
     */
    public function update(): void
    {
        $request = new Request();
        $id = (int) $request->input('id', 0);
        if ($id <= 0) {
            $this->error('Valid document ID is required.', 422);
            return;
        }

        $doc = $this->db->query("SELECT * FROM patient_documents WHERE id = {$id} AND deleted_at IS NULL")->fetch(PDO::FETCH_ASSOC);
        if (!$doc) {
            $this->error('Document not found.', 404);
            return;
        }

        $user = Session::get('user');
        $userId = $user['id'] ?? 1;

        $patientId = $request->input('patient_id');
        $patientIdVal = ($patientId !== '' && $patientId !== null && is_numeric($patientId) && (int)$patientId > 0) 
            ? (int) $patientId 
            : null;

        $category = trim((string) $request->input('category', $doc['category']));
        $title = trim((string) $request->input('title', $doc['title']));
        $description = trim((string) $request->input('description', $doc['description']));
        $portalVisible = $request->input('portal_visible') !== null ? (int) $request->input('portal_visible') : $doc['portal_visible'];

        $stmt = $this->db->prepare("
            UPDATE patient_documents 
            SET patient_id = :patient_id,
                category = :category,
                title = :title,
                description = :description,
                portal_visible = :portal_visible,
                updated_at = NOW(),
                updated_by = :updated_by
            WHERE id = :id
        ");

        $stmt->execute([
            'patient_id' => $patientIdVal,
            'category' => $category,
            'title' => $title,
            'description' => !empty($description) ? $description : null,
            'portal_visible' => $portalVisible,
            'updated_by' => $userId,
            'id' => $id
        ]);

        $this->success(null, 'Document details updated successfully.');
    }

    /**
     * DELETE /new-documents/delete
     * Soft delete document record
     */
    public function destroy(): void
    {
        $request = new Request();
        $id = (int) $request->input('id', 0);
        if ($id <= 0) {
            $this->error('Valid document ID is required.', 422);
            return;
        }

        $user = Session::get('user');
        $userId = $user['id'] ?? 1;

        $stmt = $this->db->prepare("
            UPDATE patient_documents 
            SET deleted_at = NOW(), deleted_by = ? 
            WHERE id = ? AND deleted_at IS NULL
        ");
        $stmt->execute([$userId, $id]);

        $this->success(null, 'Document deleted successfully.');
    }
}
