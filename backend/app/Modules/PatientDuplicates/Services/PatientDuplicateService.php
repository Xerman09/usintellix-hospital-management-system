<?php

namespace App\Modules\PatientDuplicates\Services;

use App\Core\Database;
use PDO;

class PatientDuplicateService
{
    /**
     * Group active patients by normalized (first name, last name, DOB)
     * and return every group with 2+ members, scored by how much of
     * their contact info also agrees -- the same shape a "Duplicate
     * Patient Management" screen shows: candidate clusters an admin
     * reviews and merges or dismisses.
     */
    public function list(): array
    {
        $dismissed = $this->fetchDismissedGroupKeys();

        $rows = Database::connection()->query(
            "SELECT p.id, p.patient_no, p.first_name, p.last_name, p.sex, p.birthdate, p.created_at,
                    c.email, COALESCE(c.mobile_phone, c.home_phone, c.work_phone) AS phone,
                    c.address_line, c.city, c.province
             FROM patients p
             LEFT JOIN patient_contacts c ON c.patient_id = p.id AND c.deleted_at IS NULL
             WHERE p.deleted_at IS NULL
             ORDER BY p.id"
        )->fetchAll(PDO::FETCH_ASSOC);

        $groups = [];

        foreach ($rows as $row) {
            $key = $this->groupKey($row['first_name'], $row['last_name'], $row['birthdate']);
            $groups[$key][] = $row;
        }

        $result = [];

        foreach ($groups as $key => $members) {
            if (count($members) < 2 || in_array($key, $dismissed, true)) {
                continue;
            }

            $result[] = [
                'group_key' => $key,
                'score' => $this->computeScore($members),
                'patients' => array_map([$this, 'formatMember'], $members, array_keys($members))
            ];
        }

        usort($result, fn($a, $b) => $b['score'] <=> $a['score']);

        return $result;
    }

    public function dismissGroup(string $groupKey, int $userId): array
    {
        if ($groupKey === '') {
            return ['success' => false, 'message' => 'group_key is required.'];
        }

        $stmt = Database::connection()->prepare(
            "INSERT INTO patient_duplicate_dismissals (group_key, dismissed_at, dismissed_by)
             VALUES (?, NOW(), ?)
             ON DUPLICATE KEY UPDATE dismissed_at = NOW(), dismissed_by = VALUES(dismissed_by)"
        );
        $stmt->execute([$groupKey, $userId]);

        return ['success' => true, 'message' => 'Marked as not a duplicate.'];
    }

    private function fetchDismissedGroupKeys(): array
    {
        return Database::connection()
            ->query("SELECT group_key FROM patient_duplicate_dismissals")
            ->fetchAll(PDO::FETCH_COLUMN);
    }

    private function groupKey(string $firstName, string $lastName, string $birthdate): string
    {
        return strtolower(trim($firstName)) . '|' . strtolower(trim($lastName)) . '|' . $birthdate;
    }

    /**
     * 20 base points for the name+DOB match that defines the group,
     * plus 6 more if every member also shares the same non-empty email.
     * Phone is displayed but intentionally not scored -- formatting
     * varies too much between records to be a reliable identity signal.
     */
    private function computeScore(array $members): int
    {
        $score = 20;

        $emails = array_filter(array_map(fn($m) => strtolower(trim((string) $m['email'])), $members));

        if (count($emails) === count($members) && count(array_unique($emails)) === 1) {
            $score += 6;
        }

        return $score;
    }

    /**
     * The lowest-id (earliest-registered) member of a group is
     * suggested as the "Merge To" target and every other member as
     * "Merge From" -- just a starting default the admin can override
     * per row before running the merge.
     */
    private function formatMember(array $member, int $indexInGroup): array
    {
        $addressParts = array_filter([$member['address_line'], $member['city'], $member['province']], fn($v) => $v !== null && $v !== '');

        return [
            'id' => (int) $member['id'],
            'patient_no' => $member['patient_no'],
            'name' => trim("{$member['last_name']}, {$member['first_name']}"),
            'birthdate' => $member['birthdate'],
            'sex' => $member['sex'],
            'email' => $member['email'],
            'phone' => $member['phone'],
            'registered' => $member['created_at'] ? substr((string) $member['created_at'], 0, 10) : null,
            'address' => implode(', ', $addressParts),
            'suggested_scope' => $indexInGroup === 0 ? 'merge_to' : 'merge_from'
        ];
    }
}
