<?php

namespace App\Modules\PatientReminders\Services;

use App\Core\Database;
use DateTime;
use PDO;

class PatientReminderService
{
    private const SORT_COLUMNS = [
        'item'        => 'r.item_label',
        'patient'     => "CONCAT(p.last_name, ', ', p.first_name)",
        'due_status'  => 'r.due_status',
        'date_created'=> 'r.date_created',
        'email_auth'  => 'p.allow_email',
        'sms_auth'    => 'p.allow_sms',
        'date_sent'   => 'r.date_sent',
        'voice_sent'  => 'r.voice_sent',
        'email_sent'  => 'r.email_sent',
        'sms_sent'    => 'r.sms_sent',
        'mail_sent'   => 'r.mail_sent'
    ];

    /**
     * Paginated, sortable list of currently-generated reminder items,
     * joined with the patient's name and consent (auth) flags.
     */
    public function list(string $sort, string $dir, int $page, int $perPage): array
    {
        $sortColumn = self::SORT_COLUMNS[$sort] ?? self::SORT_COLUMNS['item'];
        $direction = strtolower($dir) === 'desc' ? 'DESC' : 'ASC';

        $page = max(1, $page);
        $perPage = max(1, min(200, $perPage));
        $offset = ($page - 1) * $perPage;

        $total = (int) Database::connection()
            ->query("SELECT COUNT(*) c FROM patient_reminders r WHERE r.deleted_at IS NULL")
            ->fetch(PDO::FETCH_ASSOC)['c'];

        $stmt = Database::connection()->prepare(
            "SELECT r.id, r.item_label, r.due_status, r.date_created, r.date_sent,
                    r.voice_sent, r.email_sent, r.sms_sent, r.mail_sent,
                    p.id AS patient_id, p.first_name, p.last_name,
                    p.allow_email, p.allow_sms
             FROM patient_reminders r
             JOIN patients p ON p.id = r.patient_id
             WHERE r.deleted_at IS NULL
             ORDER BY {$sortColumn} {$direction}
             LIMIT {$perPage} OFFSET {$offset}"
        );
        $stmt->execute();

        return [
            'rows' => $stmt->fetchAll(PDO::FETCH_ASSOC),
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage
        ];
    }

    /**
     * Evaluate every active "Patient Reminder" type practice_rules row
     * against every active patient's demographics, and upsert one
     * patient_reminders row per (rule, patient) match. Re-running is
     * safe -- existing rows have their due_status recomputed instead
     * of being duplicated, and date_created is preserved.
     */
    public function process(int $userId): array
    {
        $rules = $this->fetchReminderRules();
        $patients = $this->fetchActivePatients();

        $matched = 0;
        $now = date('Y-m-d H:i:s');

        foreach ($rules as $rule) {
            $demographics = json_decode($rule['demographics_criteria'] ?? '[]', true) ?: [];
            $actions = json_decode($rule['actions_list'] ?? '[]', true) ?: [];
            $targets = json_decode($rule['clinical_targets'] ?? '[]', true) ?: [];
            $intervals = json_decode($rule['reminder_intervals'] ?? '{}', true) ?: [];

            $itemLabel = $actions[0]['category_title'] ?? ($targets[0]['criteria'] ?? $rule['title']);
            $pastDueDays = $this->intervalToDays($intervals, 'patient_past_due');

            foreach ($patients as $patient) {
                if (!$this->matchesDemographics($demographics, $patient)) {
                    continue;
                }

                $matched++;
                $this->upsertReminder((int) $rule['id'], (int) $patient['id'], $itemLabel, $now, $pastDueDays, $userId);
            }
        }

        return [
            'success' => true,
            'message' => "Processed {$matched} matching reminder(s) across " . count($rules) . ' rule(s).',
            'data' => ['matched' => $matched, 'rules_evaluated' => count($rules)]
        ];
    }

    /**
     * Same matching as process(), plus marks every currently due/
     * past-due, not-yet-sent reminder as sent on each channel the
     * patient has actually consented to (allow_email/allow_sms/
     * allow_voice_calls/allow_postcard = 'yes'). A reminder with no
     * consented channel is left unsent -- there is nothing to send it
     * through.
     */
    public function processAndSend(int $userId): array
    {
        $processResult = $this->process($userId);
        $now = date('Y-m-d H:i:s');

        $stmt = Database::connection()->prepare(
            "SELECT r.id, p.allow_email, p.allow_sms, p.allow_voice_calls, p.allow_postcard
             FROM patient_reminders r
             JOIN patients p ON p.id = r.patient_id
             WHERE r.deleted_at IS NULL AND r.due_status IN ('due', 'past_due') AND r.date_sent IS NULL"
        );
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $sent = 0;

        foreach ($rows as $row) {
            $emailSent = $row['allow_email'] === 'yes' ? 1 : 0;
            $smsSent = $row['allow_sms'] === 'yes' ? 1 : 0;
            $voiceSent = $row['allow_voice_calls'] === 'yes' ? 1 : 0;
            $mailSent = $row['allow_postcard'] === 'yes' ? 1 : 0;

            if (!$emailSent && !$smsSent && !$voiceSent && !$mailSent) {
                continue;
            }

            $update = Database::connection()->prepare(
                "UPDATE patient_reminders
                 SET date_sent = ?, email_sent = ?, sms_sent = ?, voice_sent = ?, mail_sent = ?, updated_at = ?, updated_by = ?
                 WHERE id = ?"
            );
            $update->execute([$now, $emailSent, $smsSent, $voiceSent, $mailSent, $now, $userId, $row['id']]);
            $sent++;
        }

        $data = array_merge($processResult['data'], ['sent' => $sent]);

        return [
            'success' => true,
            'message' => "Processed {$data['matched']} reminder(s), sent notifications for {$sent}.",
            'data' => $data
        ];
    }

    private function upsertReminder(int $ruleId, int $patientId, string $itemLabel, string $now, ?int $pastDueDays, int $userId): void
    {
        $existingStmt = Database::connection()->prepare(
            "SELECT id, date_created FROM patient_reminders WHERE practice_rule_id = ? AND patient_id = ? AND deleted_at IS NULL"
        );
        $existingStmt->execute([$ruleId, $patientId]);
        $existing = $existingStmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            $dueStatus = $this->computeDueStatus($existing['date_created'], $pastDueDays);

            $update = Database::connection()->prepare(
                "UPDATE patient_reminders SET item_label = ?, due_status = ?, updated_at = ?, updated_by = ? WHERE id = ?"
            );
            $update->execute([$itemLabel, $dueStatus, $now, $userId, $existing['id']]);
            return;
        }

        $dueStatus = $this->computeDueStatus($now, $pastDueDays);

        $insert = Database::connection()->prepare(
            "INSERT INTO patient_reminders (practice_rule_id, patient_id, item_label, due_status, date_created, created_at, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        $insert->execute([$ruleId, $patientId, $itemLabel, $dueStatus, $now, $now, $userId]);
    }

    private function computeDueStatus(string $dateCreated, ?int $pastDueDays): string
    {
        if ($pastDueDays === null) {
            return 'due';
        }

        $elapsedDays = (strtotime('now') - strtotime($dateCreated)) / 86400;

        return $elapsedDays >= $pastDueDays ? 'past_due' : 'due';
    }

    /**
     * AND semantics across every demographics_criteria row. Only
     * "Age Min (Years)", "Age Max (Years)", and "Sex" are understood;
     * any other criteria text is treated as always-matching so
     * freeform rows entered via the Practice Rules editor don't
     * silently exclude every patient.
     */
    private function matchesDemographics(array $criteriaRows, array $patient): bool
    {
        foreach ($criteriaRows as $row) {
            $criteria = strtolower(trim($row['criteria'] ?? ''));
            $characteristics = trim((string) ($row['characteristics'] ?? ''));
            $requirement = strtolower(trim($row['requirements'] ?? 'required inclusion'));
            $isExclusion = str_contains($requirement, 'exclusion');

            $matched = true;

            if ($criteria === 'age min (years)' && is_numeric($characteristics)) {
                $matched = $patient['age'] >= (float) $characteristics;
            } elseif ($criteria === 'age max (years)' && is_numeric($characteristics)) {
                $matched = $patient['age'] <= (float) $characteristics;
            } elseif ($criteria === 'sex' && $characteristics !== '') {
                $matched = strtolower($patient['sex']) === strtolower($characteristics);
            }

            if ($isExclusion) {
                $matched = !$matched;
            }

            if (!$matched) {
                return false;
            }
        }

        return true;
    }

    private function intervalToDays(array $intervals, string $prefix): ?int
    {
        if (isset($intervals["{$prefix}_val"])) {
            return $this->unitsToDays((float) $intervals["{$prefix}_val"], (string) ($intervals["{$prefix}_unit"] ?? 'Day'));
        }

        if (isset($intervals[$prefix]) && is_string($intervals[$prefix]) && preg_match('/([\d.]+)\s*([A-Za-z]+)/', $intervals[$prefix], $m)) {
            return $this->unitsToDays((float) $m[1], $m[2]);
        }

        return null;
    }

    private function unitsToDays(float $value, string $unit): int
    {
        $unit = strtolower(rtrim($unit, 's'));

        $multiplier = match ($unit) {
            'day' => 1,
            'week' => 7,
            'month' => 30,
            'year' => 365,
            default => 1
        };

        return (int) round($value * $multiplier);
    }

    private function fetchReminderRules(): array
    {
        return Database::connection()->query(
            "SELECT id, title, demographics_criteria, clinical_targets, actions_list, reminder_intervals
             FROM practice_rules
             WHERE type = 'Patient Reminder' AND deleted_at IS NULL"
        )->fetchAll(PDO::FETCH_ASSOC);
    }

    private function fetchActivePatients(): array
    {
        $rows = Database::connection()
            ->query("SELECT id, sex, birthdate FROM patients WHERE deleted_at IS NULL")
            ->fetchAll(PDO::FETCH_ASSOC);

        $now = new DateTime();

        return array_map(function (array $row) use ($now) {
            $row['age'] = (new DateTime($row['birthdate']))->diff($now)->y;
            return $row;
        }, $rows);
    }
}
