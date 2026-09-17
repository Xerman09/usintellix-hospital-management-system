<?php

namespace App\Modules\OfficeNotes\Services;

use App\Core\Database;
use App\Modules\OfficeNotes\Models\OfficeNote;
use PDO;

class OfficeNoteService
{
    private const LIST_SQL =
        "SELECT o.id, o.patient_id, o.note, o.active, o.created_at, o.created_by, u.username AS author
         FROM office_notes o
         LEFT JOIN users u ON u.id = o.created_by";

    /**
     * The dashboard widget's compact preview -- most recent active notes
     * only, capped, newest first.
     */
    public function listForPatient(int $patientId, int $limit = 5): array
    {
        $stmt = Database::connection()->prepare(
            self::LIST_SQL .
            " WHERE o.patient_id = ? AND o.active = 1 AND o.deleted_at IS NULL
              ORDER BY o.created_at DESC, o.id DESC
              LIMIT " . max(1, $limit)
        );
        $stmt->execute([$patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * The "(More)" management screen's paginated, filterable list.
     */
    public function list(int $patientId, string $filter, int $page, int $perPage): array
    {
        $where = ['o.patient_id = ?', 'o.deleted_at IS NULL'];
        $params = [$patientId];

        if ($filter === 'active') {
            $where[] = 'o.active = 1';
        } elseif ($filter === 'inactive') {
            $where[] = 'o.active = 0';
        }

        $page = max(1, $page);
        $perPage = max(1, min(200, $perPage));
        $offset = ($page - 1) * $perPage;

        $whereSql = implode(' AND ', $where);

        $countStmt = Database::connection()->prepare("SELECT COUNT(*) c FROM office_notes o WHERE {$whereSql}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetch(PDO::FETCH_ASSOC)['c'];

        $stmt = Database::connection()->prepare(
            self::LIST_SQL . " WHERE {$whereSql} ORDER BY o.created_at DESC, o.id DESC LIMIT {$perPage} OFFSET {$offset}"
        );
        $stmt->execute($params);

        return [
            'rows' => $stmt->fetchAll(PDO::FETCH_ASSOC),
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage
        ];
    }

    public function create(int $patientId, array $data, int $userId): array
    {
        $note = trim((string) ($data['note'] ?? ''));

        if ($note === '') {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['note' => 'Note text is required.']];
        }

        $id = (new OfficeNote())->create([
            'patient_id' => $patientId,
            'note' => $note,
            'active' => 1,
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $userId
        ]);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to add note.'];
        }

        return ['success' => true, 'message' => 'Note added.', 'data' => ['id' => $id]];
    }

    public function update(int $id, array $data, int $userId): array
    {
        $values = ['updated_at' => date('Y-m-d H:i:s'), 'updated_by' => $userId];

        if (array_key_exists('note', $data)) {
            $note = trim((string) $data['note']);

            if ($note === '') {
                return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['note' => 'Note text is required.']];
            }

            $values['note'] = $note;
        }

        if (array_key_exists('active', $data)) {
            $values['active'] = $data['active'] ? 1 : 0;
        }

        (new OfficeNote())->update($values, $id);

        return ['success' => true, 'message' => 'Note updated.'];
    }

    public function remove(int $id, int $userId): array
    {
        (new OfficeNote())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $userId
        ], $id);

        return ['success' => true, 'message' => 'Note deleted.'];
    }

    public function find(int $id): ?array
    {
        return (new OfficeNote())->where('id', $id)->first();
    }
}
