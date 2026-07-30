<?php

namespace App\Modules\CareTeams\Services;

use App\Core\Database;
use App\Modules\CareTeams\Models\CareTeam;
use App\Modules\CareTeams\Models\CareTeamMember;
use App\Modules\Employees\Services\EmployeeService;
use App\Modules\Facilities\Services\FacilityService;
use App\Modules\RelatedPersons\Services\RelatedPersonService;
use App\Modules\Roles\Services\RoleService;
use PDO;

class CareTeamService
{
    private const MEMBER_TYPES = ['provider', 'related_person'];
    private const STATUSES = ['active', 'inactive'];

    private const MEMBER_LIST_SQL =
        "SELECT ctm.id, ctm.care_team_id, ctm.member_type,
                ctm.user_id, NULLIF(TRIM(CONCAT(ue.first_name, ' ', ue.last_name)), '') AS user_name,
                ctm.related_person_id, NULLIF(TRIM(CONCAT(rp.first_name, ' ', rp.last_name)), '') AS related_person_name,
                ctm.role_id, r.name AS role_name,
                ctm.facility_id, f.name AS facility_name,
                ctm.member_since, ctm.status, ctm.note
         FROM care_team_members ctm
         LEFT JOIN employees ue ON ue.user_id = ctm.user_id
         LEFT JOIN related_persons rp ON rp.id = ctm.related_person_id
         LEFT JOIN roles r ON r.id = ctm.role_id
         LEFT JOIN facilities f ON f.id = ctm.facility_id
         WHERE ctm.care_team_id = :care_team_id
         ORDER BY ctm.id";

    /**
     * The patient's care team (name/status) and its members. Returns an
     * empty shell (no id) if the patient doesn't have one recorded yet.
     */
    public function show(int $patientId): array
    {
        $team = (new CareTeam())->where('patient_id', $patientId)->first();

        if (!$team) {
            return [
                'id' => null,
                'patient_id' => $patientId,
                'name' => null,
                'status' => 'active',
                'members' => []
            ];
        }

        $stmt = Database::connection()->prepare(self::MEMBER_LIST_SQL);
        $stmt->execute(['care_team_id' => $team['id']]);

        $team['members'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $team;
    }

    /**
     * Reference data for the care team editor's dropdowns: the system's
     * user list (as "Member" options for a Provider row), roles, facilities,
     * and this patient's related persons (as "Member" options for a
     * Related Person row).
     */
    public function options(int $patientId): array
    {
        $employees = (new EmployeeService())->list();

        return [
            'members' => array_map(static fn($e) => [
                'user_id' => (int) $e['user_id'],
                'name' => trim($e['first_name'] . ' ' . $e['last_name']),
                'role_name' => $e['role_name'] ?? null
            ], $employees),
            'roles' => (new RoleService())->list(),
            'facilities' => (new FacilityService())->list(),
            'related_persons' => array_map(static fn($p) => [
                'id' => (int) $p['id'],
                'name' => trim($p['first_name'] . ' ' . $p['last_name'])
            ], (new RelatedPersonService())->list($patientId))
        ];
    }

    /**
     * Create or update the patient's care team header and replace its
     * member list wholesale (the editor always submits the full set).
     */
    public function save(int $patientId, int $userId, array $details, array $members): array
    {
        $name = trim((string) ($details['name'] ?? ''));
        $status = in_array($details['status'] ?? '', self::STATUSES, true) ? $details['status'] : 'active';

        $team = (new CareTeam())->where('patient_id', $patientId)->first();
        $now = date('Y-m-d H:i:s');

        if ($team) {
            (new CareTeam())->update([
                'name' => $name !== '' ? $name : null,
                'status' => $status,
                'updated_at' => $now,
                'updated_by' => $userId
            ], (int) $team['id']);

            $careTeamId = (int) $team['id'];
        } else {
            $careTeamId = (new CareTeam())->create([
                'patient_id' => $patientId,
                'name' => $name !== '' ? $name : null,
                'status' => $status,
                'created_at' => $now,
                'created_by' => $userId
            ]);

            if (!$careTeamId) {
                return [
                    'success' => false,
                    'message' => 'Failed to save care team.'
                ];
            }
        }

        $this->syncMembers($careTeamId, $members, $userId);

        return [
            'success' => true,
            'message' => 'Care team saved successfully.',
            'data' => ['id' => $careTeamId]
        ];
    }

    public function find(int $id): ?array
    {
        return (new CareTeam())->where('id', $id)->first();
    }

    /**
     * Replace a care team's members with the given set, dropping any row
     * that doesn't identify a valid member.
     */
    private function syncMembers(int $careTeamId, array $members, int $userId): void
    {
        (new CareTeamMember())->where('care_team_id', $careTeamId)->delete();

        $now = date('Y-m-d H:i:s');

        foreach ($members as $member) {
            $memberType = $member['member_type'] ?? null;

            if (!in_array($memberType, self::MEMBER_TYPES, true)) {
                continue;
            }

            $userIdValue = $memberType === 'provider' ? (int) ($member['user_id'] ?? 0) : 0;
            $relatedPersonId = $memberType === 'related_person' ? (int) ($member['related_person_id'] ?? 0) : 0;

            if ($memberType === 'provider' && !$userIdValue) {
                continue;
            }

            if ($memberType === 'related_person' && !$relatedPersonId) {
                continue;
            }

            $status = in_array($member['status'] ?? '', self::STATUSES, true) ? $member['status'] : 'active';
            $memberSince = !empty($member['member_since']) ? $member['member_since'] : null;
            $roleId = !empty($member['role_id']) ? (int) $member['role_id'] : null;
            $facilityId = !empty($member['facility_id']) ? (int) $member['facility_id'] : null;
            $note = trim((string) ($member['note'] ?? ''));

            (new CareTeamMember())->create([
                'care_team_id' => $careTeamId,
                'member_type' => $memberType,
                'user_id' => $userIdValue ?: null,
                'related_person_id' => $relatedPersonId ?: null,
                'role_id' => $roleId,
                'facility_id' => $facilityId,
                'member_since' => $memberSince,
                'status' => $status,
                'note' => $note !== '' ? $note : null,
                'created_at' => $now,
                'created_by' => $userId
            ]);
        }
    }
}
