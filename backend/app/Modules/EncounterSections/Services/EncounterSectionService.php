<?php

namespace App\Modules\EncounterSections\Services;

use App\Core\Database;
use App\Modules\EncounterSections\Models\EncounterSection;
use App\Modules\EncounterSections\Models\EncounterSectionSignature;
use App\Modules\Employees\Models\Employee;
use App\Modules\Roles\Models\Role;
use App\Modules\Users\Models\User;
use PDO;

class EncounterSectionService
{
    public const SECTION_TYPES = [
        'visit_summary', 'care_plan', 'clinical_instructions', 'clinical_notes',
        'vitals', 'misc_billing_options', 'functional_cognitive_status', 'observation', 'review_of_systems',
        'review_of_systems_checks', 'speech_dictation'
    ];

    /**
     * All 4 Encounter Summary sections for an encounter, creating any
     * missing ones as unlocked/empty on the fly so the frontend always
     * gets a consistent 4-row shape, each with its signature log.
     */
    public function listForEncounter(int $encounterId): array
    {
        $sections = [];

        foreach (self::SECTION_TYPES as $type) {
            $section = $this->getOrCreate($encounterId, $type);
            $section['signatures'] = $this->signatures((int) $section['id']);
            $sections[] = $section;
        }

        return $sections;
    }

    /**
     * Find a single section row (used by sibling modules -- Vitals,
     * Care Plan Items -- to check lock state before writing).
     */
    public function find(int $encounterId, string $sectionType): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT * FROM encounter_sections WHERE encounter_id = :encounter_id AND section_type = :section_type LIMIT 1"
        );
        $stmt->execute(['encounter_id' => $encounterId, 'section_type' => $sectionType]);

        $record = $stmt->fetch(PDO::FETCH_ASSOC);

        return $record ?: null;
    }

    public function isLocked(int $encounterId, string $sectionType): bool
    {
        $section = $this->find($encounterId, $sectionType);

        return $section !== null && $section['locked_at'] !== null;
    }

    /**
     * Update a section's free-text content (only meaningful for
     * 'clinical_instructions'). Rejected once the section is locked --
     * a locked section can only move forward by being signed again.
     */
    public function updateContent(int $encounterId, string $sectionType, ?string $content, int $updatedBy): array
    {
        if (!in_array($sectionType, self::SECTION_TYPES, true)) {
            return ['success' => false, 'message' => 'Unknown section type.'];
        }

        $section = $this->getOrCreate($encounterId, $sectionType);

        if ($section['locked_at'] !== null) {
            return ['success' => false, 'message' => 'This section is locked. Sign it again to record further changes.'];
        }

        (new EncounterSection())->update([
            'content' => $content,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $updatedBy
        ], (int) $section['id']);

        return ['success' => true, 'message' => 'Saved successfully.'];
    }

    /**
     * Electronically sign a section: verify the signer's password, log
     * the signature (with an optional amendment note), and lock the
     * section if this is its first signature.
     */
    public function sign(int $encounterId, string $sectionType, string $password, ?string $amendment, array $currentUser): array
    {
        if (!in_array($sectionType, self::SECTION_TYPES, true)) {
            return ['success' => false, 'message' => 'Unknown section type.'];
        }

        $user = (new User())->where('id', $currentUser['id'])->first();

        if (!$user || !User::verifyPassword($password, $user['password'])) {
            return ['success' => false, 'message' => 'Incorrect password.'];
        }

        $section = $this->getOrCreate($encounterId, $sectionType);
        $now = date('Y-m-d H:i:s');

        if ($section['locked_at'] === null) {
            (new EncounterSection())->update([
                'locked_at' => $now,
                'updated_at' => $now,
                'updated_by' => $currentUser['id']
            ], (int) $section['id']);
        }

        $employee = (new Employee())->where('user_id', $user['id'])->first();
        $signerName = $employee
            ? trim($employee['first_name'] . ' ' . $employee['last_name'])
            : ($currentUser['username'] ?? 'Unknown');

        (new EncounterSectionSignature())->create([
            'encounter_section_id' => (int) $section['id'],
            'signer_user_id' => $user['id'],
            'signer_name' => $signerName,
            'signer_role' => $this->resolveRoleName((int) ($user['role_id'] ?? 0)),
            'amendment' => ($amendment === null || trim($amendment) === '') ? null : $amendment,
            'signed_at' => $now
        ]);

        $section = $this->find($encounterId, $sectionType);
        $section['signatures'] = $this->signatures((int) $section['id']);

        return [
            'success' => true,
            'message' => 'Signed successfully.',
            'data' => $section
        ];
    }

    /**
     * Remove a section entirely -- only permitted before it's ever been
     * signed, to avoid silently erasing a signed, logged record.
     */
    public function remove(int $encounterId, string $sectionType): array
    {
        $section = $this->find($encounterId, $sectionType);

        if (!$section) {
            return ['success' => true, 'message' => 'Nothing to remove.'];
        }

        if ($section['locked_at'] !== null) {
            return ['success' => false, 'message' => 'A signed section cannot be deleted.'];
        }

        (new EncounterSectionSignature())->where('encounter_section_id', (int) $section['id'])->delete();
        (new EncounterSection())->delete((int) $section['id']);

        return ['success' => true, 'message' => 'Section removed successfully.'];
    }

    /**
     * Fetch or lazily create the row for a given encounter/section type.
     */
    private function getOrCreate(int $encounterId, string $sectionType): array
    {
        $existing = $this->find($encounterId, $sectionType);

        if ($existing) {
            return $existing;
        }

        $id = (new EncounterSection())->create([
            'encounter_id' => $encounterId,
            'section_type' => $sectionType,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return $this->find($encounterId, $sectionType) ?? [
            'id' => $id,
            'encounter_id' => $encounterId,
            'section_type' => $sectionType,
            'content' => null,
            'locked_at' => null
        ];
    }

    private function signatures(int $encounterSectionId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, signer_name, signer_role, amendment, signed_at
             FROM encounter_section_signatures
             WHERE encounter_section_id = :encounter_section_id
             ORDER BY signed_at ASC, id ASC"
        );
        $stmt->execute(['encounter_section_id' => $encounterSectionId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function resolveRoleName(int $roleId): ?string
    {
        if (!$roleId) {
            return null;
        }

        $role = (new Role())->where('id', $roleId)->first();

        return $role ? ucfirst(strtolower((string) $role['name'])) : null;
    }
}
