<?php

namespace App\Modules\MyChart\Services;

use App\Core\Database;
use App\Modules\PatientDocuments\Services\PatientDocumentService;
use App\Modules\RelatedPersons\Services\RelatedPersonService;
use PDO;

/**
 * Proxy access (Phase 8): a portal user asking to see another patient's record --
 * a parent for a child, an adult child for a parent.
 *
 * The grant itself is not reinvented here. Approving writes the existing
 * related_persons.proxy_user_id / proxy_status, which PatientAccessService already
 * re-checks on every single request, so a grant made here behaves exactly like one
 * a clerk made by hand, and revoking it stops the access on the next request.
 *
 * Two things this service is careful about:
 *
 *   1. Asking must not become a way to find out whether someone is a patient here.
 *      The requester has to produce the hospital number, the surname and the date of
 *      birth together, and a mismatch on any of them gives one unhelpful answer.
 *   2. Nobody gets access because they said they are a parent. A request is a
 *      request: staff decide, with the supporting document in front of them.
 */
class PortalProxyService
{
    /** Who reviews requests. Deliberately narrow -- this is a release of a whole record. */
    public const REVIEW_ROLES = ['admin', 'receptionist'];

    /** What a requester may say they are. */
    public const RELATIONSHIPS = ['Parent', 'Child', 'Spouse', 'Legal guardian', 'Carer', 'Other'];

    /** Where an uploaded proof lands on the requester's own chart. */
    public const EVIDENCE_CATEGORY = 'Proxy access evidence';

    // ------------------------------------------------------------------
    // The patient's side: asking, and seeing who has access
    // ------------------------------------------------------------------

    /**
     * Ask for access to someone else's record.
     *
     * @param array $file the uploaded proof, in $_FILES shape; optional
     */
    public static function request(array $user, array $in, array $file = []): array
    {
        $userId = (int) ($user['id'] ?? 0);
        $errors = [];

        $patientNo = trim((string) ($in['patient_no'] ?? ''));
        $lastName = trim((string) ($in['last_name'] ?? ''));
        $birthdate = trim((string) ($in['birthdate'] ?? ''));
        $relationship = trim((string) ($in['relationship'] ?? ''));
        $note = trim((string) ($in['note'] ?? ''));

        if ($patientNo === '') {
            $errors['patient_no'] = 'Enter their hospital number.';
        }

        if ($lastName === '') {
            $errors['last_name'] = 'Enter their family name.';
        }

        if ($birthdate === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $birthdate)) {
            $errors['birthdate'] = 'Enter their date of birth.';
        }

        if (!in_array($relationship, self::RELATIONSHIPS, true)) {
            $errors['relationship'] = 'Choose how you are related to them.';
        }

        if (mb_strlen($note) > 500) {
            $errors['note'] = 'Keep that under 500 characters.';
        }

        if ($errors) {
            return ['success' => false, 'message' => 'That request could not be sent.', 'errors' => $errors];
        }

        $db = Database::connection();

        // All three have to match. One answer covers "no such patient" and "those
        // details do not go together", so this cannot be used to probe the register.
        $stmt = $db->prepare(
            "SELECT id, user_id, first_name, last_name FROM patients
             WHERE patient_no = :no AND last_name = :ln AND birthdate = :dob AND deleted_at IS NULL
             LIMIT 1"
        );
        $stmt->execute(['no' => $patientNo, 'ln' => $lastName, 'dob' => $birthdate]);
        $patient = $stmt->fetch(PDO::FETCH_ASSOC);

        $vague = 'We could not match those details. Check the hospital number, family name and date of birth, '
            . 'or ask at the reception desk.';

        if (!$patient) {
            return ['success' => false, 'message' => $vague, 'errors' => ['patient_no' => $vague]];
        }

        $patientId = (int) $patient['id'];

        if ((int) $patient['user_id'] === $userId) {
            return ['success' => false, 'message' => 'That is your own record. You already have it.'];
        }

        if (self::hasActiveGrant($db, $userId, $patientId)) {
            return ['success' => false, 'message' => 'You already have access to that record. Switch to it from the menu.'];
        }

        $stmt = $db->prepare(
            "SELECT id FROM proxy_access_requests
             WHERE requester_user_id = :u AND patient_id = :p AND status = 'pending' LIMIT 1"
        );
        $stmt->execute(['u' => $userId, 'p' => $patientId]);

        if ($stmt->fetchColumn()) {
            return ['success' => false, 'message' => 'You have already asked for this. The hospital is looking at it.'];
        }

        $documentId = null;

        if (!empty($file['name'])) {
            $own = self::ownPatientId($db, $userId);

            if ($own === null) {
                return ['success' => false, 'message' => 'A document cannot be attached to this account. Send the request without one, '
                    . 'and bring the proof with you.'];
            }

            $upload = (new PatientDocumentService())->upload($own, $file, [
                'category' => self::EVIDENCE_CATEGORY,
                'title' => 'Proof for access to ' . $patient['first_name'] . ' ' . $patient['last_name'],
                'description' => 'Uploaded with a request for access to another patient\'s record.',
            ], $userId);

            if (empty($upload['success'])) {
                return ['success' => false, 'message' => $upload['message'] ?? 'That document could not be uploaded.',
                    'errors' => ['evidence' => $upload['message'] ?? 'That document could not be uploaded.']];
            }

            $documentId = (int) ($upload['data']['id'] ?? 0) ?: null;
        }

        $stmt = $db->prepare(
            "INSERT INTO proxy_access_requests
                (requester_user_id, patient_id, relationship, requester_note, evidence_document_id, status, created_at, created_by)
             VALUES (:u, :p, :r, :n, :d, 'pending', NOW(), :u2)"
        );
        $stmt->execute([
            'u' => $userId, 'p' => $patientId, 'r' => $relationship,
            'n' => $note !== '' ? $note : null, 'd' => $documentId, 'u2' => $userId,
        ]);

        return [
            'success' => true,
            'message' => 'Your request has been sent. The hospital will check it and you will see the answer here. '
                . 'Bring identification with you if you are asked to.',
            'data' => ['id' => (int) $db->lastInsertId()],
        ];
    }

    /** The requests this user has made, and where each one stands. */
    public static function myRequests(int $userId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT r.id, r.relationship, r.status, r.reason, r.created_at, r.decided_at,
                    p.first_name, p.last_name, p.patient_no
             FROM proxy_access_requests r
             JOIN patients p ON p.id = r.patient_id
             WHERE r.requester_user_id = :u
             ORDER BY r.id DESC LIMIT 50"
        );
        $stmt->execute(['u' => $userId]);

        return array_map(static fn(array $r) => [
            'id' => (int) $r['id'],
            'about' => trim($r['first_name'] . ' ' . $r['last_name']),
            'patient_no' => $r['patient_no'],
            'relationship' => $r['relationship'],
            'status' => $r['status'],
            'reason' => $r['reason'],
            'created_at' => $r['created_at'],
            'decided_at' => $r['decided_at'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /** Who can see this patient's record, and who has asked to. */
    public static function whoHasAccess(int $patientId): array
    {
        $db = Database::connection();

        $stmt = $db->prepare(
            "SELECT rp.id, rp.first_name, rp.last_name, rp.relationship, rp.proxy_linked_at, u.username
             FROM related_persons rp
             JOIN users u ON u.id = rp.proxy_user_id
             WHERE rp.patient_id = :p AND rp.proxy_status = 'active' AND rp.deleted_at IS NULL
             ORDER BY rp.id"
        );
        $stmt->execute(['p' => $patientId]);

        $granted = array_map(static fn(array $r) => [
            'related_person_id' => (int) $r['id'],
            'name' => trim($r['first_name'] . ' ' . $r['last_name']),
            'relationship' => $r['relationship'] ?: 'Authorised representative',
            'since' => $r['proxy_linked_at'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        $stmt = $db->prepare(
            "SELECT r.id, r.relationship, r.created_at,
                    COALESCE(NULLIF(TRIM(CONCAT(COALESCE(rp.first_name, ''), ' ', COALESCE(rp.last_name, ''))), ''), u.username) AS name
             FROM proxy_access_requests r
             JOIN users u ON u.id = r.requester_user_id
             LEFT JOIN patients rp ON rp.user_id = u.id AND rp.deleted_at IS NULL
             WHERE r.patient_id = :p AND r.status = 'pending'
             ORDER BY r.id"
        );
        $stmt->execute(['p' => $patientId]);

        return [
            'granted' => $granted,
            'pending' => array_map(static fn(array $r) => [
                'id' => (int) $r['id'],
                'name' => $r['name'],
                'relationship' => $r['relationship'],
                'asked_at' => $r['created_at'],
            ], $stmt->fetchAll(PDO::FETCH_ASSOC)),
        ];
    }

    /**
     * The patient takes someone's access away. It is their record, so this needs no
     * staff step -- and it goes through the same revoke the staff screen uses, so the
     * grant is off everywhere on the next request.
     */
    public static function revokeAccess(int $patientId, int $relatedPersonId, int $actorUserId): array
    {
        $db = Database::connection();

        $stmt = $db->prepare(
            "SELECT id, proxy_user_id FROM related_persons
             WHERE id = :i AND patient_id = :p AND proxy_status = 'active' AND deleted_at IS NULL"
        );
        $stmt->execute(['i' => $relatedPersonId, 'p' => $patientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return ['success' => false, 'message' => 'That person does not have access to your record.', 'not_found' => true];
        }

        $result = (new RelatedPersonService())->revokeProxy($relatedPersonId, $actorUserId);

        if (empty($result['success'])) {
            return $result;
        }

        $db->prepare(
            "UPDATE proxy_access_requests SET status = 'revoked', updated_at = NOW(), updated_by = :u
             WHERE patient_id = :p AND requester_user_id = :ru AND status = 'approved'"
        )->execute(['p' => $patientId, 'ru' => (int) $row['proxy_user_id'], 'u' => $actorUserId]);

        return ['success' => true, 'message' => 'Their access has been taken away. They can no longer open your record.',
            'data' => ['related_person_id' => $relatedPersonId]];
    }

    // ------------------------------------------------------------------
    // The staff side: the queue and the decision
    // ------------------------------------------------------------------

    public static function queue(string $status = 'pending'): array
    {
        $status = in_array($status, ['pending', 'approved', 'denied', 'revoked', 'all'], true) ? $status : 'pending';

        $sql =
            "SELECT r.id, r.relationship, r.requester_note, r.status, r.reason, r.created_at, r.decided_at,
                    r.evidence_document_id, d.original_filename, d.mime_type, d.file_path,
                    u.username AS requester_username,
                    COALESCE(NULLIF(TRIM(CONCAT(COALESCE(rq.first_name, ''), ' ', COALESCE(rq.last_name, ''))), ''), u.username) AS requester_name,
                    rq.patient_no AS requester_patient_no, rq.birthdate AS requester_birthdate,
                    p.id AS patient_id, p.patient_no, p.first_name, p.last_name, p.birthdate,
                    NULLIF(TRIM(CONCAT(COALESCE(de.first_name, ''), ' ', COALESCE(de.last_name, ''))), '') AS decided_by_name
             FROM proxy_access_requests r
             JOIN users u ON u.id = r.requester_user_id
             LEFT JOIN patients rq ON rq.user_id = u.id AND rq.deleted_at IS NULL
             JOIN patients p ON p.id = r.patient_id
             LEFT JOIN patient_documents d ON d.id = r.evidence_document_id AND d.deleted_at IS NULL
             LEFT JOIN users du ON du.id = r.decided_by
             LEFT JOIN employees de ON de.user_id = du.id AND de.deleted_at IS NULL"
            . ($status === 'all' ? '' : " WHERE r.status = :s")
            . " ORDER BY r.status = 'pending' DESC, r.id DESC LIMIT 200";

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($status === 'all' ? [] : ['s' => $status]);

        return array_map(static fn(array $r) => [
            'id' => (int) $r['id'],
            'status' => $r['status'],
            'relationship' => $r['relationship'],
            'note' => $r['requester_note'],
            'reason' => $r['reason'],
            'asked_at' => $r['created_at'],
            'decided_at' => $r['decided_at'],
            'decided_by' => $r['decided_by_name'],
            'requester' => [
                'name' => $r['requester_name'],
                'username' => $r['requester_username'],
                'patient_no' => $r['requester_patient_no'],
                'birthdate' => $r['requester_birthdate'],
            ],
            'patient' => [
                'id' => (int) $r['patient_id'],
                'name' => trim($r['first_name'] . ' ' . $r['last_name']),
                'patient_no' => $r['patient_no'],
                'birthdate' => $r['birthdate'],
            ],
            'evidence' => $r['evidence_document_id'] ? [
                'document_id' => (int) $r['evidence_document_id'],
                'filename' => $r['original_filename'],
                'mime_type' => $r['mime_type'],
                'file_path' => $r['file_path'],
            ] : null,
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Approve or deny. Approving creates the contact row on the patient's chart if the
     * requester is not on it already, then links the grant through the existing
     * RelatedPersonService, so there is one mechanism and one audit trail.
     */
    public static function decide(int $requestId, string $decision, string $reason, int $deciderUserId): array
    {
        if (!in_array($decision, ['approve', 'deny'], true)) {
            return ['success' => false, 'message' => 'Choose approve or deny.'];
        }

        $reason = trim($reason);

        if ($decision === 'deny' && $reason === '') {
            return ['success' => false, 'message' => 'Say why it is being refused -- the person is told this.',
                'errors' => ['reason' => 'A reason is required when refusing.']];
        }

        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT r.*, p.first_name AS p_first, p.last_name AS p_last
             FROM proxy_access_requests r JOIN patients p ON p.id = r.patient_id
             WHERE r.id = :i"
        );
        $stmt->execute(['i' => $requestId]);
        $req = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$req) {
            return ['success' => false, 'message' => 'That request could not be found.', 'not_found' => true];
        }

        if ($req['status'] !== 'pending') {
            return ['success' => false, 'message' => 'That request has already been dealt with.'];
        }

        $patientId = (int) $req['patient_id'];
        $requesterUserId = (int) $req['requester_user_id'];

        if ($decision === 'deny') {
            $db->prepare(
                "UPDATE proxy_access_requests SET status = 'denied', reason = :r, decided_by = :u, decided_at = NOW(),
                        updated_at = NOW(), updated_by = :u2 WHERE id = :i"
            )->execute(['r' => $reason, 'u' => $deciderUserId, 'u2' => $deciderUserId, 'i' => $requestId]);

            return ['success' => true, 'message' => 'The request has been refused and the reason recorded.',
                'data' => ['id' => $requestId, 'status' => 'denied']];
        }

        $relatedPersonId = self::relatedPersonFor($db, $patientId, $requesterUserId, (string) $req['relationship'], $deciderUserId);

        $link = (new RelatedPersonService())->linkProxy($relatedPersonId, $requesterUserId, $deciderUserId);

        if (empty($link['success'])) {
            return $link;
        }

        $db->prepare(
            "UPDATE proxy_access_requests SET status = 'approved', reason = :r, related_person_id = :rp,
                    decided_by = :u, decided_at = NOW(), updated_at = NOW(), updated_by = :u2 WHERE id = :i"
        )->execute([
            'r' => $reason !== '' ? $reason : null, 'rp' => $relatedPersonId,
            'u' => $deciderUserId, 'u2' => $deciderUserId, 'i' => $requestId,
        ]);

        return [
            'success' => true,
            'message' => 'Access granted. They can switch to ' . $req['p_first'] . ' ' . $req['p_last']
                . "'s record from their own menu, and the patient can take it away at any time.",
            'data' => ['id' => $requestId, 'status' => 'approved', 'related_person_id' => $relatedPersonId],
        ];
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    /** The contact row the grant hangs on: the existing one for this user, or a new one. */
    private static function relatedPersonFor(PDO $db, int $patientId, int $requesterUserId, string $relationship, int $actorId): int
    {
        $stmt = $db->prepare(
            "SELECT id FROM related_persons
             WHERE patient_id = :p AND proxy_user_id = :u AND deleted_at IS NULL ORDER BY id DESC LIMIT 1"
        );
        $stmt->execute(['p' => $patientId, 'u' => $requesterUserId]);
        $existing = (int) $stmt->fetchColumn();

        if ($existing) {
            return $existing;
        }

        $stmt = $db->prepare(
            "SELECT p.first_name, p.middle_name, p.last_name, p.birthdate, p.sex, pc.mobile_phone
             FROM patients p
             LEFT JOIN patient_contacts pc ON pc.patient_id = p.id
             WHERE p.user_id = :u AND p.deleted_at IS NULL LIMIT 1"
        );
        $stmt->execute(['u' => $requesterUserId]);
        $me = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $stmt = $db->prepare("SELECT username FROM users WHERE id = :u");
        $stmt->execute(['u' => $requesterUserId]);
        $username = (string) $stmt->fetchColumn();

        $gender = strtolower((string) ($me['sex'] ?? ''));
        $gender = in_array($gender, ['male', 'female', 'other'], true) ? $gender : 'unknown';

        $ins = $db->prepare(
            "INSERT INTO related_persons
                (patient_id, first_name, middle_name, last_name, phone, date_of_birth, gender, relationship, role,
                 can_receive_medical_info, created_at, created_by)
             VALUES (:p, :fn, :mn, :ln, :ph, :dob, :g, :rel, 'Portal proxy', 1, NOW(), :u)"
        );
        $ins->execute([
            'p' => $patientId,
            'fn' => $me['first_name'] ?? $username,
            'mn' => $me['middle_name'] ?? null,
            'ln' => $me['last_name'] ?? 'Portal user',
            'ph' => $me['mobile_phone'] ?? null,
            'dob' => $me['birthdate'] ?? null,
            'g' => $gender,
            'rel' => $relationship,
            'u' => $actorId,
        ]);

        return (int) $db->lastInsertId();
    }

    private static function hasActiveGrant(PDO $db, int $userId, int $patientId): bool
    {
        $stmt = $db->prepare(
            "SELECT id FROM related_persons
             WHERE proxy_user_id = :u AND patient_id = :p AND proxy_status = 'active' AND deleted_at IS NULL LIMIT 1"
        );
        $stmt->execute(['u' => $userId, 'p' => $patientId]);

        return (bool) $stmt->fetchColumn();
    }

    private static function ownPatientId(PDO $db, int $userId): ?int
    {
        $stmt = $db->prepare("SELECT id FROM patients WHERE user_id = :u AND deleted_at IS NULL LIMIT 1");
        $stmt->execute(['u' => $userId]);
        $id = (int) $stmt->fetchColumn();

        return $id ?: null;
    }
}
