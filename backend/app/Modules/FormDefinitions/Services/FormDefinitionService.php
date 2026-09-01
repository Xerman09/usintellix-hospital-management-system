<?php

namespace App\Modules\FormDefinitions\Services;

use App\Core\Database;
use App\Modules\FormDefinitions\Models\FormDefinition;
use PDO;
use Throwable;

class FormDefinitionService
{
    /**
     * Access control (ACL) values for the Forms Administration "Access
     * Control" dropdown, transcribed verbatim from the real reference
     * markup (pipe-separated aco_spec values, e.g. "encounters|notes").
     */
    public const ACCESS_CONTROL_OPTIONS = [
        'acct|bill', 'acct|disc', 'acct|eob', 'acct|rep', 'acct|rep_a',
        'admin|acl', 'admin|batchcom', 'admin|calendar', 'admin|database', 'admin|drugs',
        'admin|forms', 'admin|language', 'admin|manage_modules', 'admin|menu', 'admin|practice',
        'admin|super', 'admin|superbill', 'admin|users',
        'encounters|auth', 'encounters|auth_a', 'encounters|coding', 'encounters|coding_a',
        'encounters|date_a', 'encounters|notes', 'encounters|notes_a', 'encounters|relaxed',
        'groups|gadd', 'groups|gcalendar', 'groups|gdlog', 'groups|glog', 'groups|gm',
        'inventory|adjustments', 'inventory|consumption', 'inventory|destruction', 'inventory|lots',
        'inventory|purchases', 'inventory|reporting', 'inventory|sales', 'inventory|transfers',
        'lists|country', 'lists|default', 'lists|ethrace', 'lists|language', 'lists|state',
        'menus|modle',
        'nationnotes|nn_configure',
        'patientportal|portal',
        'patients|alert', 'patients|amendment', 'patients|appt', 'patients|demo', 'patients|disclosure',
        'patients|docs', 'patients|docs_rm', 'patients|lab', 'patients|med', 'patients|notes',
        'patients|pat_rep', 'patients|reminder', 'patients|rx', 'patients|sign', 'patients|trans',
        'placeholder|filler',
        'sensitivities|high', 'sensitivities|normal'
    ];

    /**
     * Form types this app's reference catalog knows about (matching real
     * OpenEMR's built-in forms directory) but that have no corresponding
     * backend module in this codebase yet -- shown as "Unregistered" for
     * informational purposes only. "marketplace" mirrors the cloud-icon
     * ("available via marketplace, not yet extracted") forms.
     */
    private const UNREGISTERED_CATALOG = [
        ['name' => 'Social Screening Tool', 'marketplace' => true],
        ['name' => 'Bronchitis Form'],
        ['name' => 'Aftercare Plan'],
        ['name' => 'Prior Authorization'],
        ['name' => 'CAMOS'],
        ['name' => 'PHQ-9'],
        ['name' => 'GAD-7'],
        ['name' => 'Track anything'],
        ['name' => 'Transfer Summary'],
        ['name' => 'Lab Requisition'],
        ['name' => 'Graphic Pain Map'],
        ['name' => 'Clinic Note'],
        ['name' => 'Physical Exam'],
        ['name' => 'Treatment Plan'],
        ['name' => 'Ankle Evaluation Form'],
        ['name' => 'Eye Exam'],
        ['name' => 'Fee Sheet'],
        ['name' => 'Group Attendance Form'],
        ['name' => 'New Group Encounter Form'],
        ['name' => 'New Questionnaire', 'marketplace' => true],
        ['name' => 'Work/School Note']
    ];

    /**
     * Registered form modules and the informational Unregistered
     * catalog, for the Forms Administration overview screen.
     */
    public function overview(): array
    {
        return [
            'registered' => $this->orderedRegistered(),
            'unregistered' => self::UNREGISTERED_CATALOG
        ];
    }

    /**
     * Bulk-update priority/category/nickname/access_control for the
     * registered forms grid (single Save action for the whole table).
     * Each row: { id, priority, category, nickname, access_control }.
     */
    public function bulkUpdate(array $rows, int $userId): array
    {
        $db = Database::connection();

        try {
            $db->beginTransaction();

            foreach ($rows as $row) {
                $id = (int) ($row['id'] ?? 0);

                if ($id <= 0) {
                    continue;
                }

                $priority = (int) ($row['priority'] ?? 0);
                $category = trim((string) ($row['category'] ?? '')) ?: 'Clinical';
                $nickname = trim((string) ($row['nickname'] ?? ''));
                $nickname = $nickname !== '' ? $nickname : null;

                $accessControl = $row['access_control'] ?? null;
                $accessControl = ($accessControl !== null && $accessControl !== '')
                    ? (string) $accessControl
                    : null;

                if ($accessControl !== null && !in_array($accessControl, self::ACCESS_CONTROL_OPTIONS, true)) {
                    $accessControl = null;
                }

                (new FormDefinition())->update([
                    'priority' => $priority,
                    'category' => $category,
                    'nickname' => $nickname,
                    'access_control' => $accessControl,
                    'updated_at' => date('Y-m-d H:i:s'),
                    'updated_by' => $userId
                ], $id);
            }

            $db->commit();
        } catch (Throwable $e) {
            $db->rollBack();

            return ['success' => false, 'message' => 'Failed to save changes.'];
        }

        return ['success' => true, 'message' => 'Forms Administration settings saved successfully.'];
    }

    private function orderedRegistered(): array
    {
        $stmt = Database::connection()->query('SELECT * FROM form_definitions ORDER BY name ASC');

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
