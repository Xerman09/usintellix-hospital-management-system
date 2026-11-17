<?php

namespace App\Modules\MyChart\Services;

use App\Core\Database;
use PDO;

/**
 * The chart the patient could not see (Phase M19): allergies, conditions,
 * medicines, operations, implants and vaccinations.
 *
 * Read schema 343's header for the full argument. Three things govern every
 * method here.
 *
 * ONE: verification_status is a GATE, not a label.
 *
 * These tables carry the FHIR verification set -- Unconfirmed, Confirmed,
 * Refuted, Entered in Error -- and two of those values mean the opposite of the
 * row's own content. `Refuted` means a clinician decided the patient does NOT
 * have this. `Entered in Error` means the row should never have existed. In this
 * database today there is a Refuted problem and a Refuted medication, so a screen
 * that listed what the tables hold would tell somebody they have a condition that
 * was explicitly ruled out. Those two are never sent. NULL is treated as
 * Unconfirmed, because an absent assertion is not an assertion.
 *
 * TWO: nothing is interpreted, and staff free text never leaves the building.
 *
 * What is recorded is shown, in the words it was recorded in. `comments` on every
 * one of these tables is written by staff for staff -- nobody drafted it for the
 * person it describes -- and it is never sent. Neither is coding, classification
 * or outcome, which tell a patient nothing and invite a search engine.
 *
 * THREE: an incomplete list must not read as a complete one.
 *
 * Every section carries wording, from portal_chart_sections, saying what the list
 * is and what it is not -- and an empty section says "nothing has been written
 * down", never "you have none". That difference is the single most likely harm
 * this phase could do and it costs one sentence to prevent.
 */
class PortalChartService
{
    /** Who may read the correction queue. */
    public const REVIEW_ROLES = ['admin', 'doctor', 'clinician', 'nurse'];

    /** Who may answer a correction, or edit the wording a patient reads. */
    public const DECIDE_ROLES = ['admin', 'doctor', 'clinician'];

    /** Who may turn a section on or off. */
    public const EDIT_ROLES = ['admin'];

    /**
     * The verification values that may be shown, and the ones that may not.
     *
     * Kept as data rather than an `if`, because the hidden list is the safety
     * rule of this phase and it should be readable at a glance by somebody
     * deciding whether to add a seventh section.
     */
    public const VERIFICATION_SHOWN = ['Confirmed', 'Unconfirmed'];
    public const VERIFICATION_HIDDEN = ['Refuted', 'Entered in Error'];

    /** NULL and anything unrecognised land here: shown, but never as fact. */
    public const VERIFICATION_DEFAULT = 'Unconfirmed';

    /**
     * Where each section's items come from.
     *
     * Five of the six share the same "issue" shape (title, begin_date, end_date,
     * verification_status) because they are all the same lists pattern in the
     * schema. Immunizations is its own shape and is read separately.
     */
    public const SECTIONS = ['allergies', 'conditions', 'medications', 'procedures', 'devices', 'immunizations'];

    private const SOURCE = [
        'conditions' => 'patient_medical_problems',
        'medications' => 'patient_medications',
        'procedures' => 'patient_surgeries',
        'devices' => 'patient_medical_devices',
    ];

    /** What the patient is told about the chart as a whole, above all of it. */
    public const CAVEATS = [
        'This is what this hospital has written down. Care you had somewhere else will not be here unless someone added it.',
        'Nothing here is a diagnosis on its own — it is a record of what was noted, and when.',
        'If something looks wrong or is missing, tell us. You cannot change your own record, but we will look at what you say.',
        'Items marked "not confirmed" have been noted but not checked. Saying whether they are right is genuinely useful.',
    ];

    /** What a patient may ask for, and how each reads back to them. */
    public const ASKS = [
        'remove' => 'asked for it to be taken off',
        'correct' => 'said it is wrong',
        'add_detail' => 'had something to add',
        'unsure' => 'was not sure',
    ];

    // ==================================================================
    // The patient's side
    // ==================================================================

    /**
     * The whole chart, section by section, as the patient should read it.
     */
    public static function mine(int $patientId): array
    {
        $db = Database::connection();
        $settings = self::settings($db);

        if (!$settings['allow']) {
            return [
                'enabled' => false,
                'sections' => [],
                'caveats' => [],
                'pending' => [],
                'message' => 'This clinic is not showing health records in My Chart at the moment.',
            ];
        }

        $pending = self::pendingFor($db, $patientId);
        $sections = [];

        foreach (self::enabledSections($db) as $section) {
            $code = $section['section_code'];

            $items = $code === 'immunizations'
                ? self::immunizations($db, $patientId, $settings)
                : ($code === 'allergies'
                    ? self::allergies($db, $patientId, $settings)
                    : self::issues($db, $patientId, self::SOURCE[$code] ?? '', $settings));

            // An open request is attached to its item rather than listed apart,
            // so the patient sees "you told us about this" where they said it.
            foreach ($items as &$item) {
                $key = $code . ':' . $item['id'];
                $item['correction'] = $pending[$key] ?? null;
                $item['can_correct'] = $settings['allow_corrections']
                    && (int) $section['allow_corrections'] === 1
                    && !isset($pending[$key]);
            }
            unset($item);

            $sections[] = [
                'code' => $code,
                'label' => $section['label'],
                'blurb' => $section['blurb'],
                'empty_text' => $section['empty_text'],
                'allow_corrections' => (int) $section['allow_corrections'] === 1 && $settings['allow_corrections'],
                'count' => count($items),
                'items' => $items,
            ];
        }

        return [
            'enabled' => true,
            'sections' => $sections,
            'caveats' => self::CAVEATS,
            'pending' => array_values($pending),
            'pending_limit' => $settings['max_pending'],
            'can_correct' => $settings['allow_corrections'] && count($pending) < $settings['max_pending'],
            'server_time' => self::now($db),
        ];
    }

    /**
     * Say that something on the chart does not look right.
     *
     * Never an edit. This raises a request against one named item, which a
     * clinician answers. The patient's own words are kept verbatim -- a form with
     * tick boxes would lose the thing that makes these useful, which is that the
     * patient knows something the record does not.
     */
    public static function requestCorrection(int $patientId, array $input, ?array $user): array
    {
        $db = Database::connection();
        $settings = self::settings($db);

        if (!$settings['allow'] || !$settings['allow_corrections']) {
            return self::fail('This clinic is not taking corrections through My Chart at the moment.');
        }

        $code = trim((string) ($input['section'] ?? ''));
        $itemId = (int) ($input['item_id'] ?? 0);
        $says = trim((string) ($input['says'] ?? ''));
        $asks = (string) ($input['asks'] ?? 'unsure');

        if (!in_array($code, self::SECTIONS, true) || $itemId <= 0) {
            return self::fail('Which item?');
        }

        if (!isset(self::ASKS[$asks])) {
            $asks = 'unsure';
        }

        if ($says === '') {
            return self::fail(
                'Please say what is wrong with it.',
                false,
                ['says' => 'Even a few words help — we cannot act on a flag with nothing in it.']
            );
        }

        $section = self::sectionRow($db, $code);

        if (!$section || (int) $section['is_enabled'] !== 1) {
            return self::fail('That part of your record is not available here.');
        }

        if ((int) $section['allow_corrections'] !== 1) {
            return self::fail('Please telephone the clinic about anything in ' . $section['label'] . '.');
        }

        // The item has to be one of this patient's own, and one they are actually
        // being shown. Correcting something hidden from them is not possible, and
        // an id from another patient's chart must not resolve at all.
        $item = self::ownItem($db, $patientId, $code, $itemId, $settings);

        if (!$item) {
            return self::fail('That item is not on your record.', true);
        }

        $open = self::pendingFor($db, $patientId);

        if (isset($open[$code . ':' . $itemId])) {
            return self::fail('You have already told us about this one. We will come back to you.');
        }

        if (count($open) >= $settings['max_pending']) {
            return self::fail(sprintf(
                'You have %d things waiting for an answer already. We will deal with those first.',
                count($open)
            ));
        }

        $now = self::now($db);

        $db->prepare(
            "INSERT INTO portal_chart_corrections
                (patient_id, section_code, item_id, item_label, says, asks, status, created_at, created_by)
             VALUES (:p, :s, :i, :label, :says, :asks, 'pending', :now, :by)"
        )->execute([
            'p' => $patientId,
            's' => $code,
            'i' => $itemId,
            // Copied, not joined: the row may be corrected or removed before
            // anybody reads this, and "the patient says this is wrong" means
            // nothing once you cannot see what "this" was.
            'label' => mb_substr((string) $item['title'], 0, 200),
            'says' => mb_substr($says, 0, 2000),
            'asks' => $asks,
            'now' => $now,
            'by' => self::actorId($user),
        ]);

        PortalAudit::action($user, $patientId, 'Chart Correction Raised', sprintf(
            'Patient said something was wrong with %s item #%d (%s): %s',
            $code,
            $itemId,
            self::ASKS[$asks],
            mb_substr($says, 0, 200)
        ));

        return [
            'success' => true,
            'message' => 'Thank you. Someone will look at this and you will get an answer either way.',
            'data' => ['id' => (int) $db->lastInsertId()],
        ];
    }

    /** Take back something they raised, while it is still waiting. */
    public static function withdrawCorrection(int $patientId, array $input, ?array $user): array
    {
        $db = Database::connection();
        $id = (int) ($input['id'] ?? 0);

        if ($id <= 0) {
            return self::fail('Which one?');
        }

        $stmt = $db->prepare(
            "UPDATE portal_chart_corrections
                SET status = 'withdrawn', updated_at = :now
              WHERE id = :id AND patient_id = :p AND status = 'pending'"
        );
        $stmt->execute(['now' => self::now($db), 'id' => $id, 'p' => $patientId]);

        if ($stmt->rowCount() === 0) {
            return self::fail('That has already been answered or taken back.');
        }

        PortalAudit::action($user, $patientId, 'Chart Correction Withdrawn', "Patient withdrew correction #{$id}.");

        return ['success' => true, 'message' => 'Taken back. Nothing on your record has changed.'];
    }

    // ==================================================================
    // Reading the chart
    // ==================================================================

    /**
     * Allergies, which carry a reaction and a severity the others do not.
     *
     * Severity is shown exactly as recorded and never mapped onto a scale of our
     * own: "Moderate" means whatever the clinician who typed it meant, and
     * turning it into a colour or a number would invent precision. Four of the
     * six allergies in this database have no severity at all, which is said
     * rather than hidden -- "not recorded" is information.
     */
    private static function allergies(PDO $db, int $patientId, array $settings): array
    {
        $stmt = $db->prepare(
            "SELECT pa.id, al.name AS title, pa.reaction, pa.severity, pa.begin_date, pa.end_date,
                    pa.verification_status, pa.referred_by, pa.created_at
               FROM patient_allergies pa
               JOIN allergies al ON al.id = pa.allergy_id
              WHERE pa.patient_id = :p AND pa.deleted_at IS NULL
              ORDER BY al.name"
        );
        $stmt->execute(['p' => $patientId]);

        $out = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            if (!self::mayShow($row['verification_status'], $settings)) {
                continue;
            }

            $out[] = self::common($row) + [
                'reaction' => self::clean($row['reaction']),
                'severity' => self::clean($row['severity']),
                'detail' => self::allergyDetail($row),
            ];
        }

        return $out;
    }

    /** One line a patient can read, built only from what was recorded. */
    private static function allergyDetail(array $row): string
    {
        $reaction = self::clean($row['reaction']);
        $severity = self::clean($row['severity']);

        if ($reaction !== null && $severity !== null) {
            return "Recorded reaction: {$reaction} ({$severity}).";
        }

        if ($reaction !== null) {
            return "Recorded reaction: {$reaction}. How severe it is has not been written down.";
        }

        if ($severity !== null) {
            return "Recorded as {$severity}. What happens has not been written down.";
        }

        return 'What happens, and how severe it is, have not been written down. Telling us would make this more useful.';
    }

    /**
     * The four sections that share the lists shape: conditions, medicines,
     * operations, implants.
     */
    private static function issues(PDO $db, int $patientId, string $table, array $settings): array
    {
        if ($table === '' || !preg_match('/^[a-z_]+$/', $table)) {
            return [];
        }

        $stmt = $db->prepare(
            "SELECT id, title, begin_date, end_date, verification_status, referred_by, created_at
               FROM `{$table}`
              WHERE patient_id = :p AND deleted_at IS NULL
              ORDER BY (end_date IS NOT NULL), begin_date DESC, title"
        );
        $stmt->execute(['p' => $patientId]);

        $out = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            if (!self::mayShow($row['verification_status'], $settings)) {
                continue;
            }

            $out[] = self::common($row);
        }

        return $out;
    }

    /**
     * Vaccinations.
     *
     * No verification gate here: the table has no verification_status, because a
     * vaccination is an event that happened rather than a claim about the
     * patient. `completion_status` is read instead, and a refusal is not shown as
     * a vaccination -- "refused" on a list headed Vaccinations reads as "had it".
     */
    private static function immunizations(PDO $db, int $patientId, array $settings): array
    {
        $stmt = $db->prepare(
            "SELECT id, vaccine_name, administered_at, route, administration_site,
                    manufacturer, completion_status, created_at
               FROM patient_immunizations
              WHERE patient_id = :p AND deleted_at IS NULL
              ORDER BY administered_at DESC, id DESC"
        );
        $stmt->execute(['p' => $patientId]);

        $out = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $status = strtolower(trim((string) $row['completion_status']));

            if (str_contains($status, 'refus') || str_contains($status, 'error')) {
                continue;
            }

            $given = self::clean($row['administered_at']);

            $out[] = [
                'id' => (int) $row['id'],
                'title' => self::clean($row['vaccine_name']) ?? 'Vaccination',
                'given_on' => $given ? substr($given, 0, 10) : null,
                'when' => $given ? self::prettyDate(substr($given, 0, 10)) : 'Date not recorded',
                // Manufacturer is kept because a patient is sometimes asked for
                // it by name -- for travel, or a second dose of the same brand.
                'manufacturer' => self::clean($row['manufacturer']),
                'route' => self::clean($row['route']),
                'status' => 'confirmed',
                'status_note' => null,
                'active' => true,
                'detail' => self::clean($row['completion_status']) !== null
                    && !str_contains($status, 'complete')
                        ? 'Recorded as ' . self::clean($row['completion_status']) . '.'
                        : null,
            ];
        }

        return $out;
    }

    /**
     * The fields every list shares, shaped for reading.
     *
     * `active` carries the distinction a patient most needs and the raw row makes
     * hardest to see: an end_date means this is over. A finished course of
     * medicine listed beside a current one, with nothing to tell them apart, is
     * how somebody ends up taking the wrong thing.
     */
    private static function common(array $row): array
    {
        $status = self::normaliseVerification($row['verification_status']);
        $ended = self::clean($row['end_date']);
        $began = self::clean($row['begin_date']);

        return [
            'id' => (int) $row['id'],
            'title' => self::clean($row['title']) ?? 'Not named',
            'began_on' => $began ? substr($began, 0, 10) : null,
            'ended_on' => $ended ? substr($ended, 0, 10) : null,
            'since' => $began ? 'Noted ' . self::prettyDate(substr($began, 0, 10)) : 'Date not recorded',
            'until' => $ended ? 'Ended ' . self::prettyDate(substr($ended, 0, 10)) : null,
            'active' => $ended === null,
            'status' => $status === 'Confirmed' ? 'confirmed' : 'unconfirmed',
            // The sentence that stops an unconfirmed note reading as a fact.
            'status_note' => $status === 'Confirmed'
                ? null
                : 'Noted but not confirmed. If you know whether this is right, please tell us.',
            'recorded' => self::clean($row['created_at']) ? substr((string) $row['created_at'], 0, 10) : null,
        ];
    }

    /**
     * May this row be shown at all?
     *
     * The whole safety rule of M19 in one method. Refuted and Entered in Error
     * never pass, whatever the settings say -- they are not a preference.
     */
    private static function mayShow(?string $verification, array $settings): bool
    {
        $status = self::normaliseVerification($verification);

        if (in_array($status, self::VERIFICATION_HIDDEN, true)) {
            return false;
        }

        if ($status !== 'Confirmed' && !$settings['show_unconfirmed']) {
            return false;
        }

        return in_array($status, self::VERIFICATION_SHOWN, true);
    }

    /**
     * NULL, blank and anything unrecognised become Unconfirmed.
     *
     * Never Confirmed: a row that does not say it was verified has not been
     * verified, and guessing upwards is the one direction that can hurt.
     */
    public static function normaliseVerification(?string $value): string
    {
        $value = trim((string) $value);

        foreach (array_merge(self::VERIFICATION_SHOWN, self::VERIFICATION_HIDDEN) as $known) {
            if (strcasecmp($value, $known) === 0) {
                return $known;
            }
        }

        return self::VERIFICATION_DEFAULT;
    }

    /**
     * One of this patient's own items, if they are allowed to see it.
     *
     * Goes through the same gate the chart does, so a hidden row cannot be
     * reached by guessing its id -- and an item from another patient's chart
     * resolves to nothing at all.
     */
    private static function ownItem(PDO $db, int $patientId, string $code, int $itemId, array $settings): ?array
    {
        if ($code === 'immunizations') {
            $stmt = $db->prepare(
                'SELECT id, vaccine_name AS title FROM patient_immunizations
                  WHERE id = :i AND patient_id = :p AND deleted_at IS NULL LIMIT 1'
            );
            $stmt->execute(['i' => $itemId, 'p' => $patientId]);

            return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        }

        if ($code === 'allergies') {
            $stmt = $db->prepare(
                'SELECT pa.id, al.name AS title, pa.verification_status
                   FROM patient_allergies pa JOIN allergies al ON al.id = pa.allergy_id
                  WHERE pa.id = :i AND pa.patient_id = :p AND pa.deleted_at IS NULL LIMIT 1'
            );
        } else {
            $table = self::SOURCE[$code] ?? '';

            if ($table === '' || !preg_match('/^[a-z_]+$/', $table)) {
                return null;
            }

            $stmt = $db->prepare(
                "SELECT id, title, verification_status FROM `{$table}`
                  WHERE id = :i AND patient_id = :p AND deleted_at IS NULL LIMIT 1"
            );
        }

        $stmt->execute(['i' => $itemId, 'p' => $patientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;

        if (!$row || !self::mayShow($row['verification_status'] ?? null, $settings)) {
            return null;
        }

        return $row;
    }

    /** This patient's open corrections, keyed by section and item. */
    private static function pendingFor(PDO $db, int $patientId): array
    {
        $stmt = $db->prepare(
            "SELECT id, section_code, item_id, item_label, says, asks, created_at
               FROM portal_chart_corrections
              WHERE patient_id = :p AND status = 'pending'
              ORDER BY created_at"
        );
        $stmt->execute(['p' => $patientId]);

        $out = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $out[$row['section_code'] . ':' . (int) $row['item_id']] = [
                'id' => (int) $row['id'],
                'section' => $row['section_code'],
                'item_id' => (int) $row['item_id'],
                'item_label' => $row['item_label'],
                'says' => $row['says'],
                'asks' => $row['asks'],
                'asks_text' => self::ASKS[$row['asks']] ?? '',
                'raised_on' => substr((string) $row['created_at'], 0, 10),
                'note' => 'Waiting for someone to look at this. Your record has not changed.',
            ];
        }

        return $out;
    }

    // ==================================================================
    // The clinic's side
    // ==================================================================

    /** The correction queue, oldest first, because that is who has waited longest. */
    public static function queue(string $status = 'pending', string $query = ''): array
    {
        $db = Database::connection();

        $where = [];
        $params = [];

        if (in_array($status, ['pending', 'accepted', 'declined', 'withdrawn'], true)) {
            $where[] = 'c.status = :s';
            $params['s'] = $status;
        }

        $query = trim($query);

        if ($query !== '') {
            $where[] = "(CONCAT(COALESCE(p.first_name,''), ' ', COALESCE(p.last_name,'')) LIKE :q
                         OR p.patient_no LIKE :q OR c.item_label LIKE :q)";
            $params['q'] = '%' . $query . '%';
        }

        $sql = "SELECT c.*,
                       NULLIF(TRIM(CONCAT(COALESCE(p.first_name,''), ' ', COALESCE(p.last_name,''))), '') AS patient_name,
                       p.patient_no
                  FROM portal_chart_corrections c
                  LEFT JOIN patients p ON p.id = c.patient_id"
            . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
            . ' ORDER BY c.status = "pending" DESC, c.created_at LIMIT 200';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        $items = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $items[] = [
                'id' => (int) $row['id'],
                'patient' => $row['patient_name'] ?: ('Patient #' . $row['patient_id']),
                'patient_no' => $row['patient_no'],
                'patient_id' => (int) $row['patient_id'],
                'section' => $row['section_code'],
                'section_label' => self::sectionLabel($db, $row['section_code']),
                'item_id' => (int) $row['item_id'],
                // What it was called when they objected. The live row may read
                // differently now, which is itself worth seeing.
                'item_label' => $row['item_label'],
                'says' => $row['says'],
                'asks' => $row['asks'],
                'asks_text' => self::ASKS[$row['asks']] ?? '',
                'status' => $row['status'],
                'response' => $row['response'],
                'raised_at' => $row['created_at'],
                'reviewed_at' => $row['reviewed_at'],
            ];
        }

        $counts = $db->query(
            "SELECT status, COUNT(*) n FROM portal_chart_corrections GROUP BY status"
        )->fetchAll(PDO::FETCH_KEY_PAIR);

        return [
            'items' => $items,
            'counts' => array_map('intval', $counts),
            'settings' => self::settings($db),
            'asks' => self::ASKS,
        ];
    }

    /**
     * Answer one.
     *
     * Accepting records that the clinician agreed; it does NOT edit the chart.
     * The correction a patient asked for is made on the staff screen for that
     * list, by somebody qualified to make it, with all the normal checks. A
     * portal endpoint that wrote to patient_allergies because a patient asked it
     * to would be the single most dangerous thing in this codebase.
     */
    public static function decide(array $input, ?array $user): array
    {
        $db = Database::connection();

        $id = (int) ($input['id'] ?? 0);
        $decision = (string) ($input['decision'] ?? '');
        $response = trim((string) ($input['response'] ?? ''));

        if ($id <= 0 || !in_array($decision, ['accepted', 'declined'], true)) {
            return self::fail('Which one, and what was decided?');
        }

        // A decline with no reason is worse than no reply: the patient is told
        // no and learns nothing. An acceptance may stand on its own.
        if ($decision === 'declined' && $response === '') {
            return self::fail(
                'Please say why.',
                false,
                ['response' => 'The patient reads this. Being told no with no reason is worse than not being able to ask.']
            );
        }

        $row = $db->prepare('SELECT * FROM portal_chart_corrections WHERE id = :id LIMIT 1');
        $row->execute(['id' => $id]);
        $correction = $row->fetch(PDO::FETCH_ASSOC);

        if (!$correction) {
            return self::fail('That request was not found.', true);
        }

        if ($correction['status'] !== 'pending') {
            return self::fail('That one has already been ' . $correction['status'] . '.');
        }

        $now = self::now($db);

        $db->prepare(
            "UPDATE portal_chart_corrections
                SET status = :s, response = :r, reviewed_by = :by, reviewed_at = :now, updated_at = :now
              WHERE id = :id AND status = 'pending'"
        )->execute([
            's' => $decision,
            'r' => $response !== '' ? mb_substr($response, 0, 500) : null,
            'by' => self::actorId($user),
            'now' => $now,
            'id' => $id,
        ]);

        PortalAudit::action($user, (int) $correction['patient_id'], 'Chart Correction Answered', sprintf(
            'Correction #%d on %s item #%d (%s) was %s.%s',
            $id,
            $correction['section_code'],
            (int) $correction['item_id'],
            $correction['item_label'],
            $decision,
            $response !== '' ? ' Reason: ' . mb_substr($response, 0, 200) : ''
        ));

        self::notifyAnswered($db, (int) $correction['patient_id'], $correction, $decision, $response);

        return [
            'success' => true,
            'message' => $decision === 'accepted'
                ? 'Marked as agreed. Make the change on the patient\'s own record — this does not do it for you.'
                : 'Marked as declined. The patient has been told, with your reason.',
        ];
    }

    /** The sections, for the desk screen's own list. */
    public static function sections(): array
    {
        $db = Database::connection();

        $rows = $db->query(
            'SELECT * FROM portal_chart_sections ORDER BY sequence, id'
        )->fetchAll(PDO::FETCH_ASSOC);

        return [
            'items' => array_map(static fn($r) => [
                'id' => (int) $r['id'],
                'code' => $r['section_code'],
                'label' => $r['label'],
                'blurb' => $r['blurb'],
                'empty_text' => $r['empty_text'],
                'is_enabled' => (int) $r['is_enabled'] === 1,
                'allow_corrections' => (int) $r['allow_corrections'] === 1,
                'sequence' => (int) $r['sequence'],
            ], $rows),
            'settings' => self::settings($db),
            'verification_shown' => self::VERIFICATION_SHOWN,
            'verification_hidden' => self::VERIFICATION_HIDDEN,
        ];
    }

    /** Change a section's wording, or switch it off. */
    public static function saveSection(array $input, ?array $user): array
    {
        $db = Database::connection();
        $code = trim((string) ($input['code'] ?? ''));

        if (!in_array($code, self::SECTIONS, true)) {
            return self::fail('Which section?');
        }

        $label = trim((string) ($input['label'] ?? ''));

        if ($label === '') {
            return self::fail('A section needs a heading.', false, ['label' => 'Required.']);
        }

        $db->prepare(
            'UPDATE portal_chart_sections
                SET label = :label, blurb = :blurb, empty_text = :empty,
                    is_enabled = :on, allow_corrections = :corr,
                    updated_at = :now, updated_by = :by
              WHERE section_code = :code'
        )->execute([
            'label' => mb_substr($label, 0, 80),
            'blurb' => mb_substr(trim((string) ($input['blurb'] ?? '')), 0, 400) ?: null,
            'empty' => mb_substr(trim((string) ($input['empty_text'] ?? '')), 0, 300) ?: null,
            'on' => !empty($input['is_enabled']) ? 1 : 0,
            'corr' => !empty($input['allow_corrections']) ? 1 : 0,
            'now' => self::now($db),
            'by' => self::actorId($user),
            'code' => $code,
        ]);

        PortalAudit::action($user, null, 'Chart Section Changed', sprintf(
            'Staff changed the patient-facing wording for the %s section.',
            $code
        ));

        return ['success' => true, 'message' => 'Saved. Patients see this wording from now on.'];
    }

    /**
     * What one patient would be shown, exactly as they would see it.
     *
     * For the desk, so a clinician answering "why can my patient see that?" or
     * "why can they not?" looks at the same thing the patient does rather than at
     * the raw table.
     */
    public static function preview(int $patientId): array
    {
        return self::mine($patientId);
    }

    // ==================================================================
    // Plumbing
    // ==================================================================

    private static function notifyAnswered(PDO $db, int $patientId, array $correction, string $decision, string $response): void
    {
        try {
            PortalNotificationService::queue(
                $patientId,
                'chart_correction_answered',
                [
                    'what' => $correction['item_label'],
                    'outcome' => $decision === 'accepted'
                        ? 'agreed with you and will put it right'
                        : 'looked at it and is not changing it',
                    'response' => $response !== '' ? $response : '',
                    'link_id' => (int) $correction['id'],
                ],
                'chart_correction:' . (int) $correction['id']
            );
        } catch (\Throwable $e) {
            // The decision is recorded and audited; the message is a courtesy.
        }
    }

    private static function enabledSections(PDO $db): array
    {
        return $db->query(
            'SELECT * FROM portal_chart_sections WHERE is_enabled = 1 ORDER BY sequence, id'
        )->fetchAll(PDO::FETCH_ASSOC);
    }

    private static function sectionRow(PDO $db, string $code): ?array
    {
        $stmt = $db->prepare('SELECT * FROM portal_chart_sections WHERE section_code = :c LIMIT 1');
        $stmt->execute(['c' => $code]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private static function sectionLabel(PDO $db, string $code): string
    {
        static $cache = [];

        if (!array_key_exists($code, $cache)) {
            $row = self::sectionRow($db, $code);
            $cache[$code] = $row['label'] ?? $code;
        }

        return $cache[$code];
    }

    /** The hospital's chart policy, bounded. */
    public static function settings(?PDO $db = null): array
    {
        $db = $db ?? Database::connection();

        try {
            $row = $db->query(
                'SELECT portal_allow_chart, portal_chart_show_unconfirmed,
                        portal_allow_chart_corrections, portal_chart_max_pending
                   FROM general_settings ORDER BY id LIMIT 1'
            )->fetch(PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            $row = null;
        }

        $max = (int) ($row['portal_chart_max_pending'] ?? 5);

        return [
            'allow' => (int) ($row['portal_allow_chart'] ?? 1) === 1,
            'show_unconfirmed' => (int) ($row['portal_chart_show_unconfirmed'] ?? 1) === 1,
            'allow_corrections' => (int) ($row['portal_allow_chart_corrections'] ?? 1) === 1,
            'max_pending' => ($max >= 1 && $max <= 50) ? $max : 5,
        ];
    }

    /** The database's clock, not PHP's -- they are seven hours apart here. */
    private static function now(PDO $db): string
    {
        return (string) $db->query('SELECT NOW()')->fetchColumn();
    }

    /** Null, empty and whitespace all become null, so callers test one thing. */
    private static function clean($value): ?string
    {
        $value = trim((string) $value);

        return ($value === '' || $value === '0000-00-00' || $value === '0000-00-00 00:00:00') ? null : $value;
    }

    private static function prettyDate(string $date): string
    {
        $ts = strtotime($date);

        return $ts === false ? $date : date('j M Y', $ts);
    }

    private static function actorId(?array $user): int
    {
        return (int) ($user['id'] ?? 0);
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
