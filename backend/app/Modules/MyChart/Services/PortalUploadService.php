<?php

namespace App\Modules\MyChart\Services;

use App\Core\Database;
use PDO;

/**
 * Files a patient sends in (Phase M11): insurance cards, IDs, outside results,
 * photographs.
 *
 * The rule the whole service is built around: nothing a patient sends becomes
 * part of the record by itself. Every upload lands 'pending' and a staff member
 * accepts or rejects it; only on accept is a patient_documents row created. A
 * patient-supplied file is a claim, not a clinical document -- it may be the
 * wrong person's card, an unreadable photograph, or not what they believe it is.
 *
 * Files are written to backend/storage/patient-uploads and served only through an
 * endpoint that re-checks ownership. The staff uploader writes to
 * public/uploads/patient_documents, which anyone with the path can fetch with no
 * session at all; that is the wrong place for somebody's identification card.
 *
 * That directory is not safe by virtue of its location -- the deployed tree sits
 * under the Apache DocumentRoot, and it served a plain GET with HTTP 200 until
 * storage/patient-uploads/.htaccess was added to deny it. On any server where
 * .htaccess is not honoured, the location has to be denied in server config, or
 * these files are public again.
 *
 * Validation is deliberately narrower than the staff uploader's: images and PDF
 * only, no Office formats. A patient has no reason to send a spreadsheet, and
 * every accepted format is attack surface. The type is taken from the file's own
 * bytes, never from the name or the browser-supplied type.
 */
class PortalUploadService
{
    /** Who may work the review queue, and who may decide. */
    public const REVIEW_ROLES = ['admin', 'receptionist', 'doctor', 'clinician', 'nurse'];
    public const DECIDE_ROLES = ['admin', 'receptionist', 'doctor', 'clinician', 'nurse'];

    /** Extension per accepted mime type. The key set is the allow-list. */
    private const ALLOWED_TYPES = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/heic' => 'heic',
        'application/pdf' => 'pdf',
    ];

    private const KINDS = ['insurance_card', 'identification', 'outside_result', 'photo', 'other'];

    private const DEFAULT_MAX_MB = 8;
    private const DEFAULT_MAX_PER_DAY = 10;

    // ------------------------------------------------------------------
    // The patient's side
    // ------------------------------------------------------------------

    /** What this patient has sent in, newest first, with where each one stands. */
    public static function mine(int $patientId): array
    {
        $settings = self::settings();

        $stmt = Database::connection()->prepare(
            "SELECT u.id, u.kind, u.caption, u.original_filename, u.mime_type, u.size_bytes,
                    u.status, u.review_note, u.reviewed_at, u.created_at
             FROM patient_uploads u
             WHERE u.patient_id = :p AND u.deleted_at IS NULL
             ORDER BY u.created_at DESC, u.id DESC
             LIMIT 100"
        );
        $stmt->execute(['p' => $patientId]);

        $items = array_map(static fn(array $r) => [
            'id' => (int) $r['id'],
            'kind' => $r['kind'],
            'caption' => $r['caption'],
            'filename' => $r['original_filename'],
            'mime_type' => $r['mime_type'],
            'size_bytes' => (int) $r['size_bytes'],
            'status' => $r['status'],
            // The patient reads this, so a rejection has to say something useful.
            'review_note' => $r['review_note'],
            'reviewed_at' => $r['reviewed_at'],
            'created_at' => $r['created_at'],
            'is_image' => str_starts_with((string) $r['mime_type'], 'image/'),
            // Only an upload nobody has looked at yet can be taken back.
            'can_withdraw' => $r['status'] === 'pending',
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        return [
            'items' => $items,
            'allowed' => $settings['allow_uploads'],
            'max_mb' => $settings['max_mb'],
            'remaining_today' => max(0, $settings['max_per_day'] - self::countToday($patientId)),
            'accepted_types' => array_keys(self::ALLOWED_TYPES),
            'kinds' => self::KINDS,
        ];
    }

    /**
     * Take one file from a patient.
     *
     * @param array $file one entry of $_FILES
     */
    public static function store(int $patientId, array $file, array $data, ?array $user): array
    {
        $settings = self::settings();

        if (!$settings['allow_uploads']) {
            return self::fail('This clinic is not accepting files through the app at the moment.');
        }

        $error = $file['error'] ?? UPLOAD_ERR_NO_FILE;

        if ($error !== UPLOAD_ERR_OK) {
            return self::fail(self::uploadErrorMessage((int) $error, $settings['max_mb']));
        }

        $tmp = (string) ($file['tmp_name'] ?? '');

        // is_uploaded_file is what stops a crafted request naming a path on the
        // server (/etc/passwd, another patient's file) and having it copied in.
        if ($tmp === '' || !is_uploaded_file($tmp)) {
            return self::fail('That file could not be read. Please try again.');
        }

        if (self::countToday($patientId) >= $settings['max_per_day']) {
            return self::fail(sprintf(
                'You have sent the most files we can accept in one day (%d). Please try again tomorrow.',
                $settings['max_per_day']
            ));
        }

        $size = (int) ($file['size'] ?? 0);
        $maxBytes = $settings['max_mb'] * 1024 * 1024;

        if ($size <= 0) {
            return self::fail('That file is empty.');
        }

        if ($size > $maxBytes) {
            return self::fail(sprintf('Files must be %d MB or smaller. Try taking the photo again at a lower size.', $settings['max_mb']));
        }

        // From the bytes, not from $file['type'], which the client sets and can lie
        // about, nor from the extension.
        $mime = self::sniff($tmp);

        if ($mime === null || !isset(self::ALLOWED_TYPES[$mime])) {
            return self::fail('Please send a photo (JPG, PNG, WEBP or HEIC) or a PDF.');
        }

        $kind = in_array($data['kind'] ?? '', self::KINDS, true) ? $data['kind'] : 'other';
        $caption = trim((string) ($data['caption'] ?? ''));

        $dir = self::storageDir();

        if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
            return self::fail('The file could not be saved. Please tell the clinic.');
        }

        $stored = sprintf(
            'pu_%d_%s_%s.%s',
            $patientId,
            date('Ymd_His'),
            bin2hex(random_bytes(5)),
            self::ALLOWED_TYPES[$mime]
        );

        if (!move_uploaded_file($tmp, $dir . DIRECTORY_SEPARATOR . $stored)) {
            return self::fail('The file could not be saved. Please try again.');
        }

        $path = $dir . DIRECTORY_SEPARATOR . $stored;
        @chmod($path, 0600);

        $stmt = Database::connection()->prepare(
            "INSERT INTO patient_uploads
                (patient_id, uploaded_by, kind, caption, original_filename, stored_filename,
                 mime_type, size_bytes, sha256, status, created_at)
             VALUES (:p, :by, :kind, :caption, :orig, :stored, :mime, :size, :sha, 'pending', NOW())"
        );
        $stmt->execute([
            'p' => $patientId,
            'by' => isset($user['id']) ? (int) $user['id'] : null,
            'kind' => $kind,
            'caption' => $caption === '' ? null : mb_substr($caption, 0, 255),
            'orig' => mb_substr(self::safeName((string) ($file['name'] ?? 'upload')), 0, 255),
            'stored' => $stored,
            'mime' => $mime,
            'size' => $size,
            'sha' => hash_file('sha256', $path) ?: null,
        ]);

        PortalAudit::action(
            $user,
            $patientId,
            'File Sent In',
            sprintf('Patient sent a %s (%s, %d bytes) for review.', $kind, $mime, $size)
        );

        return [
            'success' => true,
            'message' => 'Thank you. The clinic will check it and it will show here once accepted.',
            'data' => ['id' => (int) Database::connection()->lastInsertId()],
        ];
    }

    /**
     * Take back an upload nobody has reviewed yet.
     *
     * Soft-deletes the row and removes the file, because the patient is saying
     * they did not mean to send it -- keeping the bytes would defeat the point.
     * An accepted upload cannot be withdrawn: it is part of the record by then,
     * and removing it is an amendment, which has its own process.
     */
    public static function withdraw(int $patientId, int $uploadId, ?array $user): array
    {
        $row = self::ownRow($patientId, $uploadId);

        if (!$row) {
            return self::fail('That file is not available for this account.', true);
        }

        if ($row['status'] !== 'pending') {
            return self::fail(
                $row['status'] === 'accepted'
                    ? 'The clinic has already accepted this file, so it is part of your record now. Ask the clinic if you need it changed.'
                    : 'The clinic has already reviewed this file.'
            );
        }

        $stmt = Database::connection()->prepare(
            "UPDATE patient_uploads
                SET deleted_at = NOW(), deleted_by = :by
              WHERE id = :id AND patient_id = :p AND status = 'pending' AND deleted_at IS NULL"
        );
        $stmt->execute(['by' => isset($user['id']) ? (int) $user['id'] : null, 'id' => $uploadId, 'p' => $patientId]);

        if ($stmt->rowCount() === 0) {
            return self::fail('That file has already been reviewed.');
        }

        self::deleteFile((string) $row['stored_filename']);

        PortalAudit::action($user, $patientId, 'File Withdrawn', sprintf('Patient withdrew upload #%d before review.', $uploadId));

        return ['success' => true, 'message' => 'That file has been removed.'];
    }

    /**
     * The absolute path of a file, for streaming, after proving it belongs to this
     * patient. Returns null rather than a path when it does not.
     */
    public static function pathFor(int $patientId, int $uploadId): ?array
    {
        $row = self::ownRow($patientId, $uploadId);

        if (!$row) {
            return null;
        }

        return self::resolve($row);
    }

    // ------------------------------------------------------------------
    // The staff review queue
    // ------------------------------------------------------------------

    /** Files waiting to be looked at, oldest first -- a queue, not a feed. */
    public static function queue(string $status = 'pending', string $q = ''): array
    {
        $status = in_array($status, ['pending', 'accepted', 'rejected', 'all'], true) ? $status : 'pending';

        $where = ['u.deleted_at IS NULL'];
        $params = [];

        if ($status !== 'all') {
            $where[] = 'u.status = :status';
            $params['status'] = $status;
        }

        if ($q !== '') {
            $where[] = '(p.first_name LIKE :q OR p.last_name LIKE :q2 OR p.patient_no LIKE :q3 OR u.caption LIKE :q4)';
            $params += ['q' => "%{$q}%", 'q2' => "%{$q}%", 'q3' => "%{$q}%", 'q4' => "%{$q}%"];
        }

        $stmt = Database::connection()->prepare(
            "SELECT u.id, u.patient_id, u.kind, u.caption, u.original_filename, u.mime_type,
                    u.size_bytes, u.status, u.review_note, u.reviewed_at, u.created_at, u.document_id,
                    p.patient_no,
                    NULLIF(TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))), '') AS patient_name
             FROM patient_uploads u
             LEFT JOIN patients p ON p.id = u.patient_id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY (u.status = 'pending') DESC, u.created_at ASC
             LIMIT 200"
        );
        $stmt->execute($params);

        $items = array_map(static fn(array $r) => $r + [
            'is_image' => str_starts_with((string) $r['mime_type'], 'image/'),
            'size_kb' => (int) round(((int) $r['size_bytes']) / 1024),
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        $counts = Database::connection()->query(
            "SELECT status, COUNT(*) AS n FROM patient_uploads WHERE deleted_at IS NULL GROUP BY status"
        )->fetchAll(PDO::FETCH_KEY_PAIR);

        return [
            'items' => $items,
            'counts' => [
                'pending' => (int) ($counts['pending'] ?? 0),
                'accepted' => (int) ($counts['accepted'] ?? 0),
                'rejected' => (int) ($counts['rejected'] ?? 0),
            ],
        ];
    }

    /** A staff member's view of one file, by id, with no patient scoping. */
    public static function staffPath(int $uploadId): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT * FROM patient_uploads WHERE id = :id AND deleted_at IS NULL LIMIT 1"
        );
        $stmt->execute(['id' => $uploadId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? self::resolve($row) : null;
    }

    /**
     * Accept or reject one upload.
     *
     * Accepting copies it into patient_documents, which is what makes it part of
     * the record. It is created with portal_visible = 1, because the patient sent
     * it and already knows what it is -- hiding their own file back from them
     * would be strange.
     */
    public static function review(int $uploadId, array $input, int $actorId): array
    {
        $decision = (string) ($input['decision'] ?? '');
        $note = trim((string) ($input['note'] ?? ''));

        if (!in_array($decision, ['accept', 'reject'], true)) {
            return self::fail('Accept it or reject it.');
        }

        $db = Database::connection();
        $stmt = $db->prepare("SELECT * FROM patient_uploads WHERE id = :id AND deleted_at IS NULL LIMIT 1");
        $stmt->execute(['id' => $uploadId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return self::fail('That file no longer exists.', true);
        }

        if ($row['status'] !== 'pending') {
            return self::fail('Somebody has already reviewed this one.');
        }

        // A rejection the patient cannot act on is worse than none: they resend the
        // same unreadable photograph.
        if ($decision === 'reject' && $note === '') {
            return self::fail('Say why, so the patient knows what to send instead.', false, ['note' => 'A reason is required when rejecting.']);
        }

        $documentId = null;

        if ($decision === 'accept') {
            $documentId = self::promote($row, $actorId);

            if ($documentId === null) {
                return self::fail('The file could not be filed into the record. Please tell IT.');
            }
        }

        $update = $db->prepare(
            "UPDATE patient_uploads
                SET status = :status, reviewed_by = :by, reviewed_at = NOW(),
                    review_note = :note, document_id = :doc
              WHERE id = :id AND status = 'pending'"
        );
        $update->execute([
            'status' => $decision === 'accept' ? 'accepted' : 'rejected',
            'by' => $actorId,
            'note' => $note === '' ? null : mb_substr($note, 0, 255),
            'doc' => $documentId,
            'id' => $uploadId,
        ]);

        if ($update->rowCount() === 0) {
            return self::fail('Somebody has already reviewed this one.');
        }

        return [
            'success' => true,
            'message' => $decision === 'accept'
                ? 'Accepted and filed into the patient\'s documents.'
                : 'Rejected. The patient will see your reason.',
        ];
    }

    /**
     * Copy an accepted upload into patient_documents, where the rest of the
     * record lives.
     *
     * The file is COPIED into the documents directory rather than moved, so the
     * upload row keeps its own evidence of what was received -- the sha256 stays
     * meaningful and a later dispute can be settled.
     */
    private static function promote(array $row, int $actorId): ?int
    {
        $source = self::resolve($row);

        if ($source === null) {
            return null;
        }

        $publicDir = dirname(__DIR__, 4) . '/public/uploads/patient_documents';

        if (!is_dir($publicDir) && !mkdir($publicDir, 0755, true) && !is_dir($publicDir)) {
            return null;
        }

        $name = 'doc_from_portal_' . $row['id'] . '_' . bin2hex(random_bytes(4)) . '.' . pathinfo($row['stored_filename'], PATHINFO_EXTENSION);

        if (!@copy($source['path'], $publicDir . '/' . $name)) {
            return null;
        }

        $label = [
            'insurance_card' => 'Insurance card',
            'identification' => 'Identification',
            'outside_result' => 'Outside result',
            'photo' => 'Photograph',
            'other' => 'Document',
        ][$row['kind']] ?? 'Document';

        $title = $row['caption'] !== null && $row['caption'] !== ''
            ? mb_substr((string) $row['caption'], 0, 180)
            : $label . ' sent by patient';

        $stmt = Database::connection()->prepare(
            "INSERT INTO patient_documents
                (patient_id, category, portal_visible, title, original_filename, stored_filename,
                 file_path, mime_type, file_size, description, created_at, created_by)
             VALUES (:p, :cat, 1, :title, :orig, :stored, :path, :mime, :size, :desc, NOW(), :by)"
        );
        $stmt->execute([
            'p' => (int) $row['patient_id'],
            'cat' => $label,
            'title' => $title,
            'orig' => $row['original_filename'],
            'stored' => $name,
            'path' => '/uploads/patient_documents/' . $name,
            'mime' => $row['mime_type'],
            'size' => (int) $row['size_bytes'],
            'desc' => 'Sent by the patient through My Chart on ' . $row['created_at'] . ' and accepted at the desk.',
            'by' => $actorId,
        ]);

        $id = (int) Database::connection()->lastInsertId();

        return $id > 0 ? $id : null;
    }

    // ------------------------------------------------------------------
    // Plumbing
    // ------------------------------------------------------------------

    private static function ownRow(int $patientId, int $uploadId): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT * FROM patient_uploads
              WHERE id = :id AND patient_id = :p AND deleted_at IS NULL LIMIT 1"
        );
        $stmt->execute(['id' => $uploadId, 'p' => $patientId]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private static function storageDir(): string
    {
        return dirname(__DIR__, 4) . '/storage/patient-uploads';
    }

    /**
     * The on-disk path of a stored upload, or null if it is missing.
     *
     * basename() is applied even though stored_filename is generated by this
     * service: if a row is ever edited by hand, a '..' in that column must not
     * become a path outside the directory.
     */
    private static function resolve(array $row): ?array
    {
        $name = basename((string) $row['stored_filename']);
        $path = self::storageDir() . DIRECTORY_SEPARATOR . $name;

        if ($name === '' || !is_file($path)) {
            return null;
        }

        return [
            'path' => $path,
            'mime_type' => (string) $row['mime_type'],
            'filename' => (string) $row['original_filename'],
            'size_bytes' => (int) $row['size_bytes'],
        ];
    }

    private static function deleteFile(string $storedFilename): void
    {
        $name = basename($storedFilename);

        if ($name !== '') {
            @unlink(self::storageDir() . DIRECTORY_SEPARATOR . $name);
        }
    }

    /** How many files this patient has sent today, against the daily cap. */
    private static function countToday(int $patientId): int
    {
        $stmt = Database::connection()->prepare(
            "SELECT COUNT(*) FROM patient_uploads
              WHERE patient_id = :p AND deleted_at IS NULL AND DATE(created_at) = CURDATE()"
        );
        $stmt->execute(['p' => $patientId]);

        return (int) $stmt->fetchColumn();
    }

    /** The real type, from the file's own bytes. */
    private static function sniff(string $tmpPath): ?string
    {
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);

            if ($finfo !== false) {
                $mime = finfo_file($finfo, $tmpPath);
                finfo_close($finfo);

                if (is_string($mime) && $mime !== '') {
                    return $mime;
                }
            }
        }

        $mime = function_exists('mime_content_type') ? @mime_content_type($tmpPath) : false;

        return is_string($mime) && $mime !== '' ? $mime : null;
    }

    /** A filename safe to store and show back, keeping it recognisable to the patient. */
    private static function safeName(string $name): string
    {
        $name = basename($name);
        $name = preg_replace('/[^A-Za-z0-9._ -]+/', '_', $name) ?? 'upload';

        return trim($name) === '' ? 'upload' : $name;
    }

    /** PHP's upload error codes, in words a patient can act on. */
    private static function uploadErrorMessage(int $code, int $maxMb): string
    {
        return match ($code) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE =>
                sprintf('That file is too large. Please send one of %d MB or less.', $maxMb),
            UPLOAD_ERR_PARTIAL => 'The file only partly arrived. Please try again.',
            UPLOAD_ERR_NO_FILE => 'Please choose a file first.',
            UPLOAD_ERR_NO_TMP_DIR, UPLOAD_ERR_CANT_WRITE => 'The file could not be saved. Please tell the clinic.',
            UPLOAD_ERR_EXTENSION => 'That file was blocked by the server.',
            default => 'That file could not be uploaded. Please try again.',
        };
    }

    /** The hospital's upload policy, with defaults if the columns are missing. */
    private static function settings(): array
    {
        try {
            $row = Database::connection()->query(
                "SELECT portal_allow_uploads, portal_upload_max_mb, portal_upload_max_per_day
                 FROM general_settings ORDER BY id LIMIT 1"
            )->fetch(PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            $row = null;
        }

        $maxMb = (int) ($row['portal_upload_max_mb'] ?? self::DEFAULT_MAX_MB);
        $perDay = (int) ($row['portal_upload_max_per_day'] ?? self::DEFAULT_MAX_PER_DAY);

        return [
            'allow_uploads' => (int) ($row['portal_allow_uploads'] ?? 1) === 1,
            // A nonsense limit would either block every upload or accept a
            // disk-filling one, so neither is trusted straight from the column.
            'max_mb' => ($maxMb >= 1 && $maxMb <= 64) ? $maxMb : self::DEFAULT_MAX_MB,
            'max_per_day' => ($perDay >= 1 && $perDay <= 200) ? $perDay : self::DEFAULT_MAX_PER_DAY,
        ];
    }

    private static function fail(string $message, bool $notFound = false, ?array $errors = null): array
    {
        return array_filter([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
            'not_found' => $notFound ?: null,
        ], static fn($v) => $v !== null);
    }
}
