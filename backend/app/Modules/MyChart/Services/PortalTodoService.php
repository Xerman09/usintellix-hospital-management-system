<?php

namespace App\Modules\MyChart\Services;

use App\Core\Database;
use App\Modules\PatientReminders\Services\PatientReminderService;
use PDO;
use Throwable;

/**
 * The My Chart To-Do list (Phase 6): everything waiting for the patient, in one place.
 *
 * Nothing here is new data -- each item is read from the part of the portal that owns
 * it, so the list cannot drift from what those screens show:
 *
 *   results to read     released results whose notification is still unread
 *   messages            unread replies from the care team
 *   check-in            an appointment open for e-check-in
 *   consents            the privacy notice never acknowledged
 *   balance             what the ledger says is owed
 *   appointments        what is booked next
 *   health maintenance  patient_reminders, from the practice rules engine
 */
class PortalTodoService
{
    /** Each item: what it is, how urgent, and where it takes the patient. */
    public static function list(int $patientId): array
    {
        $db = Database::connection();
        $items = [];

        foreach ([
            self::results($db, $patientId),
            self::messages($db, $patientId),
            self::checkins($patientId),
            self::consents($db, $patientId),
            self::balance($patientId),
            self::appointments($db, $patientId),
            self::healthMaintenance($db, $patientId),
        ] as $group) {
            foreach ($group as $item) {
                $items[] = $item;
            }
        }

        // Anything overdue first, then what needs doing, then what is only worth knowing.
        $rank = ['overdue' => 0, 'todo' => 1, 'info' => 2];
        usort($items, static fn($a, $b) => [$rank[$a['urgency']] ?? 3, $a['title']] <=> [$rank[$b['urgency']] ?? 3, $b['title']]);

        return [
            'items' => $items,
            'counts' => [
                'total' => count($items),
                'overdue' => count(array_filter($items, static fn($i) => $i['urgency'] === 'overdue')),
                'todo' => count(array_filter($items, static fn($i) => $i['urgency'] === 'todo')),
            ],
            'server_time' => (string) $db->query("SELECT NOW()")->fetchColumn(),
        ];
    }

    private static function item(string $kind, string $title, string $detail, string $urgency, ?string $tab, ?int $linkId = null, ?string $action = null): array
    {
        return [
            'kind' => $kind,
            'title' => $title,
            'detail' => $detail,
            'urgency' => $urgency,
            'tab' => $tab,
            'link_id' => $linkId,
            'action' => $action,
        ];
    }

    /** Results released to the patient that they have not opened yet. */
    private static function results(PDO $db, int $patientId): array
    {
        $stmt = $db->prepare(
            "SELECT COUNT(*) FROM patient_notifications
             WHERE patient_id = :p AND channel = 'in_app' AND event_type = 'result_released' AND read_at IS NULL"
        );
        $stmt->execute(['p' => $patientId]);
        $unread = (int) $stmt->fetchColumn();

        if ($unread === 0) {
            return [];
        }

        return [self::item('results', $unread === 1 ? 'A test result to read' : "{$unread} test results to read",
            'Your results have been checked and released to you.', 'todo', 'mychart_results', null, 'Read them')];
    }

    /** Unread replies from the care team. */
    private static function messages(PDO $db, int $patientId): array
    {
        try {
            $stmt = $db->prepare(
                "SELECT COUNT(*) FROM messages m
                 JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
                 JOIN users u ON u.id = cp.user_id
                 JOIN patients p ON p.user_id = u.id
                 WHERE p.id = :p AND m.sender_id <> u.id AND m.deleted_at IS NULL
                   AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)"
            );
            $stmt->execute(['p' => $patientId]);
            $unread = (int) $stmt->fetchColumn();
        } catch (Throwable $e) {
            return [];
        }

        if ($unread === 0) {
            return [];
        }

        return [self::item('messages', $unread === 1 ? 'A reply from your care team' : "{$unread} unread messages",
            'Someone from your care team has written to you.', 'todo', 'messaging', null, 'Read')];
    }

    /** Appointments open for e-check-in, and the paperwork still outstanding. */
    private static function checkins(int $patientId): array
    {
        $open = PortalCheckinService::open($patientId);
        $items = [];

        foreach ($open['items'] as $a) {
            if (($a['checkin_status'] ?? null) === 'completed') {
                continue;
            }

            $left = $a['of'] - $a['done'];
            $items[] = self::item('checkin', $a['done'] > 0 ? 'Finish checking in' : 'Check in for your visit',
                $a['done'] > 0
                    ? "{$left} of {$a['of']} steps left for your visit on " . substr((string) $a['when'], 0, 10) . '.'
                    : 'It takes a couple of minutes and saves time at the desk.',
                'todo', 'mychart_checkin', $a['appointment_id'], $a['done'] > 0 ? 'Carry on' : 'Check in');
        }

        return $items;
    }

    /** The privacy notice, if it has never been acknowledged. */
    private static function consents(PDO $db, int $patientId): array
    {
        $stmt = $db->prepare("SELECT COUNT(*) FROM npp_consent_log WHERE patient_id = :p");
        $stmt->execute(['p' => $patientId]);

        if ((int) $stmt->fetchColumn() > 0) {
            return [];
        }

        return [self::item('consents', 'Sign the privacy notice',
            'We have no record of you acknowledging how your information is used.', 'todo', 'mychart_checkin', null, 'Read and sign')];
    }

    /** What the ledger says is owed, and anything waiting at the cashier. */
    private static function balance(int $patientId): array
    {
        $owed = PortalPaymentService::outstanding($patientId);
        $items = [];

        if ($owed['balance'] > 0) {
            $items[] = self::item('balance', 'You have a balance to pay',
                self::money($owed['balance'], $owed['money']) . ' is outstanding on your account.',
                'todo', 'billing', null, 'See the statement');
        }

        if (($owed['pending'] ?? 0) > 0) {
            $items[] = self::item('payment_waiting', 'A payment is waiting to be confirmed',
                self::money($owed['pending'], $owed['money']) . ' will show once the cashier confirms it.',
                'info', 'billing', null, null);
        }

        return $items;
    }

    /** The next booked appointment, as something to know rather than to do. */
    private static function appointments(PDO $db, int $patientId): array
    {
        $stmt = $db->prepare(
            "SELECT a.id, a.appointment_date, a.appointment_time,
                    NULLIF(TRIM(CONCAT(COALESCE(pe.first_name, ''), ' ', COALESCE(pe.last_name, ''))), '') AS doctor
             FROM appointments a
             LEFT JOIN providers pr ON pr.id = a.provider_id
             LEFT JOIN employees pe ON pe.id = pr.employee_id
             WHERE a.patient_id = :p AND a.deleted_at IS NULL AND a.is_provider_block = 0 AND a.status = 'scheduled'
               AND a.appointment_date >= CURDATE()
             ORDER BY a.appointment_date, a.appointment_time LIMIT 1"
        );
        $stmt->execute(['p' => $patientId]);
        $a = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$a) {
            return [];
        }

        return [self::item('appointment', 'Your next appointment',
            trim($a['appointment_date'] . ' at ' . substr((string) $a['appointment_time'], 0, 5)
                . ($a['doctor'] ? ' with ' . $a['doctor'] : '')) . '.',
            'info', 'mychart_visits', (int) $a['id'], null)];
    }

    /**
     * Vaccinations and screenings that are due, from the practice rules engine -- which
     * already matches each rule against the patient's age and sex. The rules are run for
     * this patient first, so the list is current rather than whatever was last saved.
     */
    private static function healthMaintenance(PDO $db, int $patientId): array
    {
        try {
            (new PatientReminderService())->processForPatient($patientId);
        } catch (Throwable $e) {
            // A rule that cannot be evaluated must not take the whole To-Do list down.
            error_log('health maintenance for the To-Do list failed: ' . $e->getMessage());
        }

        // Only rules the hospital has marked as patient-facing (practice_rules.is_patient_reminder)
        // are shown. The engine matches on age and sex alone, so without this gate a patient
        // with no diabetes would be told their "Diabetes Eye Exam" is due, and administrative
        // rules ("Data Entry - Social Security Number") would reach them as well. Switching a
        // rule on for patients is a clinical decision, made per rule by the hospital.
        $stmt = $db->prepare(
            "SELECT r.item_label, r.due_status
             FROM patient_reminders r
             JOIN practice_rules pr ON pr.id = r.practice_rule_id AND pr.deleted_at IS NULL
             WHERE r.patient_id = :p AND r.deleted_at IS NULL AND r.due_status IN ('due', 'past_due')
               AND pr.is_patient_reminder = 1
             ORDER BY r.due_status DESC, r.item_label"
        );
        $stmt->execute(['p' => $patientId]);

        return array_map(static fn(array $r) => self::item(
            'health_maintenance',
            $r['due_status'] === 'past_due' ? $r['item_label'] . ' is overdue' : $r['item_label'] . ' is due',
            $r['due_status'] === 'past_due'
                ? 'This was due a while ago. Please book an appointment when you can.'
                : 'Please book an appointment when it suits you.',
            $r['due_status'] === 'past_due' ? 'overdue' : 'todo',
            'appointments', null, 'Book'
        ), $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    private static function money(float $v, array $m): string
    {
        $n = number_format($v, (int) ($m['decimals'] ?? 2));

        return ($m['position'] ?? 'prefix') === 'suffix' ? $n . ($m['symbol'] ?? '') : ($m['symbol'] ?? '') . $n;
    }
}
