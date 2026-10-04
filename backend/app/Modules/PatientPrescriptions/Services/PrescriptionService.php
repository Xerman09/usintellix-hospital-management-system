<?php

namespace App\Modules\PatientPrescriptions\Services;

use App\Core\Database;
use App\Core\PhiAccessGuard;
use App\Modules\Dispensing\Services\DispensingService;
use App\Modules\Encounters\Services\EncounterService;
use App\Modules\GeneralSettings\Services\GeneralSettingService;
use PDO;

/**
 * A prescription as the doctor writes it: one slip (prescriptions) with
 * many medicines (patient_prescriptions, one row per medicine line).
 *
 *   * list()    -- a patient's slips, newest first, with their medicines
 *   * create()  -- a new slip and its medicines, all or nothing
 *   * update()  -- change the slip and its medicines while it's active:
 *                  lines sent with an id are updated, lines without one
 *                  are added, lines left out are removed
 *   * cancel()  -- cancel the whole slip, with a reason
 *
 * Each medicine is either a Drug Catalog item (drug_id, so the pharmacy
 * can dispense it) or free text (title only).
 *
 * Philippine rules:
 *   * Dangerous drugs (RA 9165) go on their own prescription -- it's
 *     transcribed onto the DOH special prescription form -- and the
 *     prescribing doctor needs a current S2 license.
 *   * A prescription can be filled until valid_until, set when it's
 *     written from General Settings > prescription validity days.
 */
class PrescriptionService
{
    public const WRITER_ROLES = ['admin', 'receptionist', 'doctor'];

    public const STATUSES = ['active', 'cancelled'];

    public const STALE_MESSAGE = 'This prescription was just changed by someone else. Reload it and try again.';

    /** Medicine line fields, beyond the catalog link. */
    public const LINE_FIELDS = [
        'title', 'begin_date', 'end_date', 'quantity', 'dosage', 'route',
        'frequency', 'refills', 'directions', 'substitution_allowed', 'pharmacy',
        'comments', 'coding', 'occurrence', 'outcome', 'classification_type',
        'verification_status', 'referred_by', 'destination'
    ];

    private const MAX_LINES = 30;

    /** drugs.controlled_class of a dangerous drug under RA 9165. */
    public const DANGEROUS_CLASS = 'Dangerous Drug (RA 9165)';

    /** A patient's slips with their medicines, newest first. */
    public function list(int $patientId): array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT p.*, " . self::userNameSql('p.prescriber_user_id') . " AS prescriber_name,
                    " . self::userNameSql('p.cancelled_by') . " AS cancelled_by_name,
                    e.date_of_service AS encounter_date, e.reason_for_visit AS encounter_reason
             FROM prescriptions p
             LEFT JOIN encounters e ON e.id = p.encounter_id
             WHERE p.patient_id = :patient AND p.deleted_at IS NULL
             ORDER BY p.prescribed_date DESC, p.id DESC"
        );
        $stmt->execute(['patient' => $patientId]);
        $slips = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!$slips) {
            return [];
        }

        $lines = $this->lines(array_map(fn($s) => (int) $s['id'], $slips));

        return array_map(fn($s) => $this->format($s, $lines[(int) $s['id']] ?? []), $slips);
    }

    public function get(int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT p.*, " . self::userNameSql('p.prescriber_user_id') . " AS prescriber_name,
                    " . self::userNameSql('p.cancelled_by') . " AS cancelled_by_name,
                    e.date_of_service AS encounter_date, e.reason_for_visit AS encounter_reason
             FROM prescriptions p
             LEFT JOIN encounters e ON e.id = p.encounter_id
             WHERE p.id = :id AND p.deleted_at IS NULL"
        );
        $stmt->execute(['id' => $id]);
        $slip = $stmt->fetch(PDO::FETCH_ASSOC);

        return $slip ? $this->format($slip, $this->lines([$id])[$id] ?? []) : null;
    }

    /** For the form: the patient's visits and the doctors who can prescribe. */
    public function formOptions(int $patientId, array $user): array
    {
        $encounters = (new EncounterService())->list($patientId);

        // Same rule as the visit list: non-clinical staff don't see sensitive visits.
        if (!PhiAccessGuard::isClinicalRole($user['role'] ?? null)) {
            $encounters = array_values(array_filter($encounters, function ($e) {
                $sens = strtolower(trim((string) ($e['sensitivity'] ?? '')));
                return $sens !== 'sensitive' && $sens !== 'very sensitive';
            }));
        }
        $encounters = array_slice($encounters, 0, 30);

        $diagnoses = [];
        if ($encounters) {
            $ids = implode(',', array_map(fn($e) => (int) $e['id'], $encounters));
            foreach (Database::connection()->query(
                "SELECT encounter_id, code, description FROM encounter_diagnoses
                 WHERE deleted_at IS NULL AND encounter_id IN ({$ids}) ORDER BY encounter_id, sequence, id"
            )->fetchAll(PDO::FETCH_ASSOC) as $d) {
                $diagnoses[(int) $d['encounter_id']][] = trim(($d['description'] ?: '') . ($d['code'] ? " ({$d['code']})" : ''));
            }
        }

        $prescribers = $this->prescribers();
        $self = array_values(array_filter($prescribers, fn($p) => $p['user_id'] === (int) ($user['id'] ?? 0)));

        // The patient's assigned doctor, as the default when staff write on a doctor's behalf.
        $stmt = Database::connection()->prepare(
            "SELECT e.user_id FROM patients pt JOIN providers pr ON pr.id = pt.provider_id AND pr.deleted_at IS NULL
             JOIN employees e ON e.id = pr.employee_id WHERE pt.id = :id"
        );
        $stmt->execute(['id' => $patientId]);
        $assigned = (int) $stmt->fetchColumn();

        return [
            'encounters' => array_map(fn($e) => [
                'id' => (int) $e['id'],
                'date' => isset($e['date_of_service']) ? substr((string) $e['date_of_service'], 0, 10) : null,
                'reason' => $e['reason_for_visit'] ?? null,
                'diagnoses' => $diagnoses[(int) $e['id']] ?? []
            ], $encounters),
            'prescribers' => $prescribers,
            'default_prescriber_user_id' => $self ? $self[0]['user_id'] : ($assigned ?: null),
            'today' => date('Y-m-d'),
            'validity_days' => GeneralSettingService::prescriptionValidityDays()
        ];
    }

    public function create(array $data, array $user): array
    {
        $patientId = (int) ($data['patient_id'] ?? 0);
        [$header, $lines, $errors] = $this->validate($data, $patientId, $user, null);

        if ($errors) {
            return ['success' => false, 'message' => 'Some details need fixing.', 'errors' => $errors];
        }

        $db = Database::connection();
        $now = date('Y-m-d H:i:s');
        $userId = (int) $user['id'];
        $owns = $this->begin($db);

        try {
            $db->prepare(
                "INSERT INTO prescriptions (rx_number, patient_id, prescriber_user_id, encounter_id, prescribed_date, valid_until, diagnosis, notes, status, created_at, created_by)
                 VALUES (:tmp, :patient, :prescriber, :encounter, :date, :valid_until, :diagnosis, :notes, 'active', :now, :user)"
            )->execute([
                'tmp' => 'NEW-' . bin2hex(random_bytes(8)), 'patient' => $patientId, 'prescriber' => $header['prescriber_user_id'],
                'encounter' => $header['encounter_id'], 'date' => $header['prescribed_date'],
                'valid_until' => self::addDays($header['prescribed_date'], GeneralSettingService::prescriptionValidityDays()),
                'diagnosis' => $header['diagnosis'],
                'notes' => $header['notes'], 'now' => $now, 'user' => $userId
            ]);
            $id = (int) $db->lastInsertId();
            $number = 'RX-' . substr($header['prescribed_date'], 0, 4) . '-' . str_pad((string) $id, 5, '0', STR_PAD_LEFT);
            $db->prepare("UPDATE prescriptions SET rx_number = :n WHERE id = :id")->execute(['n' => $number, 'id' => $id]);

            foreach ($lines as $i => $line) {
                $this->insertLine($id, $patientId, $i + 1, $line, $header['prescribed_date'], $userId, $now);
            }

            DispensingService::refreshStatus($id);

            $this->commit($db, $owns);
        } catch (\Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        return ['success' => true, 'message' => "Prescription {$number} saved.", 'data' => ['id' => $id, 'rx_number' => $number]];
    }

    /** data.version: the version the editor loaded; refused if the slip changed since. */
    public function update(int $id, array $data, array $user): array
    {
        $db = Database::connection();
        $owns = $this->begin($db);

        try {
            $stmt = $db->prepare("SELECT * FROM prescriptions WHERE id = :id AND deleted_at IS NULL FOR UPDATE");
            $stmt->execute(['id' => $id]);
            $slip = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$slip) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'Prescription not found.', 'not_found' => true];
            }

            $seen = $data['version'] ?? null;
            if ($seen !== null && (string) $seen !== self::version($slip)) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => self::STALE_MESSAGE, 'stale' => true];
            }

            if ($slip['status'] !== 'active') {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'A cancelled prescription can\'t be changed.'];
            }

            // Once the pharmacy has given anything (or closed it), the prescription is a record of what was given.
            if (!in_array($slip['dispense_status'] ?? 'pending', ['pending', 'none'], true)) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'The pharmacy has already dispensed from this prescription, so it can\'t be changed. Cancel it and write a new one if needed.'];
            }

            $existing = [];
            $stmt = $db->prepare("SELECT * FROM patient_prescriptions WHERE prescription_id = :id AND deleted_at IS NULL");
            $stmt->execute(['id' => $id]);
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $existing[(int) $row['id']] = $row;
            }

            [$header, $lines, $errors] = $this->validate($data, (int) $slip['patient_id'], $user, $existing);

            if ($errors) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'Some details need fixing.', 'errors' => $errors];
            }

            $now = date('Y-m-d H:i:s');
            $userId = (int) $user['id'];

            $db->prepare(
                "UPDATE prescriptions SET prescriber_user_id = :prescriber, encounter_id = :encounter, prescribed_date = :date, valid_until = :valid_until,
                        diagnosis = :diagnosis, notes = :notes, revision = revision + 1, updated_at = :now, updated_by = :user
                 WHERE id = :id"
            )->execute([
                'prescriber' => $header['prescriber_user_id'], 'encounter' => $header['encounter_id'], 'date' => $header['prescribed_date'],
                // A changed date moves the validity with it; how long it's valid stays as given.
                'valid_until' => self::addDays($header['prescribed_date'], $slip['valid_until']
                    ? (int) ((strtotime($slip['valid_until']) - strtotime($slip['prescribed_date'])) / 86400)
                    : GeneralSettingService::prescriptionValidityDays()),
                'diagnosis' => $header['diagnosis'], 'notes' => $header['notes'], 'now' => $now, 'user' => $userId, 'id' => $id
            ]);

            $kept = [];
            foreach ($lines as $i => $line) {
                if ($line['id'] !== null) {
                    $kept[$line['id']] = true;
                    $this->updateLine($line['id'], $i + 1, $line, $header['prescribed_date'], $userId, $now);
                } else {
                    $this->insertLine($id, (int) $slip['patient_id'], $i + 1, $line, $header['prescribed_date'], $userId, $now);
                }
            }

            $remove = array_diff(array_keys($existing), array_keys($kept));
            if ($remove) {
                $db->prepare(
                    "UPDATE patient_prescriptions SET deleted_at = :now, deleted_by = :user
                     WHERE prescription_id = :id AND id IN (" . implode(',', array_map('intval', $remove)) . ")"
                )->execute(['now' => $now, 'user' => $userId, 'id' => $id]);
            }

            DispensingService::refreshStatus($id);

            $this->commit($db, $owns);
        } catch (\Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        return ['success' => true, 'message' => "Prescription {$slip['rx_number']} updated."];
    }

    public function cancel(int $id, string $reason, ?string $seen, array $user): array
    {
        $reason = trim($reason);
        if ($reason === '') {
            return ['success' => false, 'message' => 'Enter why the prescription is being cancelled.', 'errors' => ['reason' => 'Enter a reason.']];
        }

        $db = Database::connection();
        $owns = $this->begin($db);

        try {
            $stmt = $db->prepare("SELECT * FROM prescriptions WHERE id = :id AND deleted_at IS NULL FOR UPDATE");
            $stmt->execute(['id' => $id]);
            $slip = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$slip) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'Prescription not found.', 'not_found' => true];
            }
            if ($seen !== null && $seen !== self::version($slip)) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => self::STALE_MESSAGE, 'stale' => true];
            }
            if ($slip['status'] === 'cancelled') {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'This prescription is already cancelled.'];
            }

            $now = date('Y-m-d H:i:s');
            $db->prepare(
                "UPDATE prescriptions SET status = 'cancelled', cancelled_at = :now, cancelled_by = :user, cancel_reason = :reason,
                        revision = revision + 1, updated_at = :now2, updated_by = :user2 WHERE id = :id"
            )->execute(['now' => $now, 'user' => (int) $user['id'], 'reason' => mb_substr($reason, 0, 500), 'now2' => $now, 'user2' => (int) $user['id'], 'id' => $id]);

            $this->commit($db, $owns);
        } catch (\Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        return ['success' => true, 'message' => "Prescription {$slip['rx_number']} cancelled."];
    }

    /**
     * Everything the printed prescription shows: the facility, the
     * patient (name, age on the prescription date, sex, address), the
     * prescription and its medicines, and the doctor's licenses.
     */
    public function printData(int $id): ?array
    {
        $slip = $this->get($id);
        if (!$slip) {
            return null;
        }

        $db = Database::connection();

        $stmt = $db->prepare(
            "SELECT p.patient_no, p.first_name, p.middle_name, p.last_name, p.suffix, p.sex, p.birthdate,
                    c.address_line, c.city, c.province, c.zip_code
             FROM patients p
             LEFT JOIN patient_contacts c ON c.id = (SELECT MAX(c2.id) FROM patient_contacts c2 WHERE c2.patient_id = p.id AND c2.deleted_at IS NULL)
             WHERE p.id = :id"
        );
        $stmt->execute(['id' => $slip['patient_id']]);
        $patient = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $age = null;
        if (!empty($patient['birthdate'])) {
            $age = (new \DateTime($patient['birthdate']))->diff(new \DateTime($slip['prescribed_date']))->y;
        }

        // The visit's facility, else the main active facility.
        $facility = null;
        if ($slip['encounter_id']) {
            $stmt = $db->prepare(
                "SELECT f.* FROM encounters e JOIN facilities f ON f.id = e.facility_id AND f.deleted_at IS NULL WHERE e.id = :id"
            );
            $stmt->execute(['id' => $slip['encounter_id']]);
            $facility = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        }
        if (!$facility) {
            $facility = $db->query(
                "SELECT * FROM facilities WHERE deleted_at IS NULL AND COALESCE(is_inactive, 0) = 0
                 ORDER BY is_primary_business_entity DESC, is_service_location DESC, id LIMIT 1"
            )->fetch(PDO::FETCH_ASSOC) ?: null;
        }

        $prescriber = null;
        if ($slip['prescriber_user_id']) {
            $stmt = $db->prepare(
                "SELECT TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.middle_name, ''), ' ', COALESCE(e.last_name, ''), ' ', COALESCE(e.suffix, ''))) AS name,
                        pr.specialty, pr.license_number, pr.ptr_number, pr.ptr_date, pr.s2_number, pr.s2_expiry_date, u.username
                 FROM users u
                 LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
                 LEFT JOIN providers pr ON pr.employee_id = e.id AND pr.deleted_at IS NULL
                 WHERE u.id = :id LIMIT 1"
            );
            $stmt->execute(['id' => $slip['prescriber_user_id']]);
            $prescriber = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
            if ($prescriber) {
                $prescriber['name'] = preg_replace('/\s+/', ' ', trim((string) $prescriber['name'])) ?: $prescriber['username'];
                unset($prescriber['username']);
            }
        }

        return [
            'prescription' => $slip,
            'patient' => [
                'patient_no' => $patient['patient_no'] ?? null,
                'name' => preg_replace('/\s+/', ' ', trim(implode(' ', array_filter([
                    $patient['first_name'] ?? '', $patient['middle_name'] ?? '', $patient['last_name'] ?? '', $patient['suffix'] ?? ''
                ])))),
                'sex' => $patient['sex'] ?? null,
                'age' => $age,
                'address' => implode(', ', array_filter([$patient['address_line'] ?? null, $patient['city'] ?? null, $patient['province'] ?? null]))
            ],
            'facility' => $facility ? [
                'name' => $facility['name'],
                'address' => implode(', ', array_filter([$facility['physical_address_line1'] ?? null, $facility['physical_city'] ?? null, $facility['physical_state'] ?? null])),
                'phone' => $facility['phone'] ?? null,
                'email' => $facility['email'] ?? null
            ] : null,
            'prescriber' => $prescriber
        ];
    }

    /** The patient a slip belongs to (for access checks). */
    public function patientIdOf(int $id): ?int
    {
        $stmt = Database::connection()->prepare("SELECT patient_id FROM prescriptions WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $id]);
        $patientId = $stmt->fetchColumn();

        return $patientId !== false ? (int) $patientId : null;
    }

    /* ---------------------------------------------------------------
     * Validation
     * ------------------------------------------------------------- */

    /**
     * @param array<int, array>|null $existing current lines by id (update), null on create
     * @return array{0: array, 1: array, 2: array} header, lines, errors
     */
    private function validate(array $data, int $patientId, array $user, ?array $existing): array
    {
        $db = Database::connection();
        $errors = [];
        $today = date('Y-m-d');

        $date = trim((string) ($data['prescribed_date'] ?? ''));
        if ($date === '') {
            $date = $today;
        }
        if (!$this->isDate($date)) {
            $errors['prescribed_date'] = 'Enter a valid date.';
        } elseif ($date > $today) {
            $errors['prescribed_date'] = 'The prescription date can\'t be in the future.';
        }

        // Prescriber: chosen doctor, else the writer when they're a doctor.
        $prescribers = array_column($this->prescribers(), null, 'user_id');
        $prescriber = (int) ($data['prescriber_user_id'] ?? 0);
        if (!$prescriber && isset($prescribers[(int) $user['id']])) {
            $prescriber = (int) $user['id'];
        }
        if (!$prescriber) {
            $errors['prescriber_user_id'] = 'Choose the prescribing doctor.';
        } elseif (!isset($prescribers[$prescriber])) {
            // An existing slip may keep a prescriber who isn't set up as a doctor (older records).
            $keep = false;
            if ($existing !== null && isset($data['id'])) {
                $stmt = $db->prepare("SELECT prescriber_user_id FROM prescriptions WHERE id = :id");
                $stmt->execute(['id' => (int) $data['id']]);
                $keep = (int) $stmt->fetchColumn() === $prescriber;
            }
            if (!$keep) {
                $errors['prescriber_user_id'] = 'Choose a doctor from the list.';
            }
        }
        if (($user['role'] ?? '') === 'doctor' && $prescriber && $prescriber !== (int) $user['id']) {
            $errors['prescriber_user_id'] = 'Doctors can only write prescriptions under their own name.';
        }

        $encounterId = (int) ($data['encounter_id'] ?? 0) ?: null;
        if ($encounterId !== null) {
            $stmt = $db->prepare("SELECT patient_id FROM encounters WHERE id = :id AND deleted_at IS NULL");
            $stmt->execute(['id' => $encounterId]);
            if ((int) $stmt->fetchColumn() !== $patientId) {
                $errors['encounter_id'] = 'That visit isn\'t this patient\'s.';
            }
        }

        $header = [
            'prescribed_date' => $date,
            'prescriber_user_id' => $prescriber ?: null,
            'encounter_id' => $encounterId,
            'diagnosis' => $this->text($data['diagnosis'] ?? null, 500),
            'notes' => $this->text($data['notes'] ?? null, 5000)
        ];

        $rawLines = is_array($data['items'] ?? null) ? array_values(array_filter($data['items'], 'is_array')) : [];
        $rawLines = array_values(array_filter($rawLines, fn($l) => !$this->isBlankLine($l)));

        if (!$rawLines) {
            $errors['items'] = 'Add at least one medicine.';
        } elseif (count($rawLines) > self::MAX_LINES) {
            $errors['items'] = 'A prescription can have at most ' . self::MAX_LINES . ' medicines.';
        }

        $drugIds = array_values(array_unique(array_filter(array_map(fn($l) => (int) ($l['drug_id'] ?? 0), $rawLines))));
        $drugs = [];
        if ($drugIds) {
            foreach ($db->query("SELECT id, name, is_active, deleted_at, controlled_class FROM drugs WHERE id IN (" . implode(',', $drugIds) . ")")->fetchAll(PDO::FETCH_ASSOC) as $d) {
                $drugs[(int) $d['id']] = $d;
            }
        }

        $lines = [];
        $seenDrugs = [];
        foreach ($rawLines as $i => $raw) {
            $lineId = (int) ($raw['id'] ?? 0) ?: null;
            $key = "items.{$i}";

            if ($lineId !== null && ($existing === null || !isset($existing[$lineId]))) {
                $errors["{$key}.id"] = 'This medicine line no longer exists. Reload the prescription.';
                continue;
            }

            $drugId = (int) ($raw['drug_id'] ?? 0) ?: null;
            $drug = $drugId ? ($drugs[$drugId] ?? null) : null;
            $wasLinked = $lineId !== null && (int) ($existing[$lineId]['drug_id'] ?? 0) === $drugId;

            if ($drugId !== null && (!$drug || $drug['deleted_at'] !== null || (!$drug['is_active'] && !$wasLinked))) {
                $errors["{$key}.drug_id"] = 'This medicine is no longer in the Drug Catalog.';
            }
            if ($drugId !== null) {
                if (isset($seenDrugs[$drugId])) {
                    $errors["{$key}.drug_id"] = 'This medicine is already on the prescription (line ' . ($seenDrugs[$drugId] + 1) . ').';
                }
                $seenDrugs[$drugId] = $i;
            }

            $title = trim((string) ($raw['title'] ?? ''));
            if ($title === '' && $drug) {
                $title = $drug['name'];
            }
            if ($title === '') {
                $errors["{$key}.title"] = 'Choose a medicine from the catalog, or type its name.';
            }

            $line = ['id' => $lineId, 'drug_id' => $drugId, 'title' => mb_substr($title, 0, 255)];
            foreach (self::LINE_FIELDS as $field) {
                if ($field === 'title') continue;
                $line[$field] = $raw[$field] ?? null;
            }

            foreach (['begin_date', 'end_date'] as $field) {
                $line[$field] = trim((string) ($line[$field] ?? ''));
                if ($line[$field] === '') {
                    $line[$field] = null;
                } elseif (!$this->isDate($line[$field])) {
                    $errors["{$key}.{$field}"] = 'Enter a valid date.';
                }
            }
            if ($line['begin_date'] && $line['end_date'] && $line['end_date'] < $line['begin_date'] && !isset($errors["{$key}.end_date"])) {
                $errors["{$key}.end_date"] = 'The end date is before the start date.';
            }

            $refills = trim((string) ($line['refills'] ?? ''));
            if ($refills === '') {
                $line['refills'] = null;
            } elseif (!ctype_digit($refills) || (int) $refills > 99) {
                $errors["{$key}.refills"] = 'Refills must be a whole number from 0 to 99.';
            } else {
                $line['refills'] = (int) $refills;
            }

            // Substitution is allowed unless the doctor says otherwise.
            $line['substitution_allowed'] = $line['substitution_allowed'] === null || $line['substitution_allowed'] === ''
                || in_array($line['substitution_allowed'], [1, '1', true, 'true'], true) ? 1 : 0;
            foreach (['quantity' => 50, 'dosage' => 100, 'route' => 100, 'frequency' => 100, 'pharmacy' => 255, 'occurrence' => 100,
                      'outcome' => 100, 'classification_type' => 100, 'verification_status' => 100, 'referred_by' => 255, 'destination' => 255] as $field => $max) {
                $line[$field] = $this->text($line[$field], $max);
            }
            foreach (['directions', 'comments', 'coding'] as $field) {
                $line[$field] = $this->text($line[$field], 5000);
            }

            $lines[] = $line;
        }

        // Dangerous drugs: on their own prescription, by a doctor with a current S2.
        $dangerous = array_values(array_filter($lines, fn($l) => $l['drug_id'] && ($drugs[$l['drug_id']]['controlled_class'] ?? '') === self::DANGEROUS_CLASS));
        if ($dangerous) {
            if (count($dangerous) < count($lines)) {
                $names = implode(', ', array_map(fn($l) => $drugs[$l['drug_id']]['name'], $dangerous));
                $errors['items'] = "Dangerous drugs (RA 9165) must be on their own prescription, for the DOH special prescription form. "
                    . "Remove {$names} here and write {$this->them(count($dangerous))} on a separate prescription.";
            }

            if ($header['prescriber_user_id'] && !isset($errors['prescriber_user_id'])) {
                $doctor = $prescribers[$header['prescriber_user_id']] ?? null;
                if (!$doctor || !$doctor['s2_number']) {
                    $errors['prescriber_user_id'] = ($doctor ? $doctor['name'] : 'This doctor') . ' has no S2 license on file, which is needed to prescribe dangerous drugs. An administrator can add it under Providers.';
                } elseif ($doctor['s2_expiry_date'] && $doctor['s2_expiry_date'] < $header['prescribed_date']) {
                    $errors['prescriber_user_id'] = "{$doctor['name']}'s S2 license expired on {$doctor['s2_expiry_date']}, so they can't prescribe dangerous drugs. An administrator can update it under Providers.";
                }
            }
        }

        return [$header, $lines, $errors];
    }

    private function them(int $count): string
    {
        return $count === 1 ? 'it' : 'them';
    }

    private function isBlankLine(array $line): bool
    {
        if (!empty($line['id']) || !empty($line['drug_id'])) {
            return false;
        }
        foreach (['title', 'dosage', 'frequency', 'quantity', 'directions'] as $field) {
            if (trim((string) ($line[$field] ?? '')) !== '') {
                return false;
            }
        }
        return true;
    }

    /* ---------------------------------------------------------------
     * Writing lines
     * ------------------------------------------------------------- */

    private function insertLine(int $slipId, int $patientId, int $lineNo, array $line, string $slipDate, int $userId, string $now): void
    {
        $fields = $this->lineValues($line, $slipDate);
        $columns = array_keys($fields);

        Database::connection()->prepare(
            "INSERT INTO patient_prescriptions (patient_id, prescription_id, line_no, drug_id, " . implode(', ', $columns) . ", created_at, created_by)
             VALUES (:patient_id, :prescription_id, :line_no, :drug_id, :" . implode(', :', $columns) . ", :created_at, :created_by)"
        )->execute(array_merge($fields, [
            'patient_id' => $patientId, 'prescription_id' => $slipId, 'line_no' => $lineNo, 'drug_id' => $line['drug_id'],
            'created_at' => $now, 'created_by' => $userId
        ]));
    }

    private function updateLine(int $lineId, int $lineNo, array $line, string $slipDate, int $userId, string $now): void
    {
        $fields = $this->lineValues($line, $slipDate);

        Database::connection()->prepare(
            "UPDATE patient_prescriptions SET line_no = :line_no, drug_id = :drug_id, "
            . implode(', ', array_map(fn($c) => "{$c} = :{$c}", array_keys($fields)))
            . ", updated_at = :updated_at, updated_by = :updated_by WHERE id = :id"
        )->execute(array_merge($fields, [
            'line_no' => $lineNo, 'drug_id' => $line['drug_id'], 'updated_at' => $now, 'updated_by' => $userId, 'id' => $lineId
        ]));
    }

    private function lineValues(array $line, string $slipDate): array
    {
        $values = [];
        foreach (self::LINE_FIELDS as $field) {
            $values[$field] = $line[$field];
        }
        // A medicine starts on the prescription date unless told otherwise.
        $values['begin_date'] = $values['begin_date'] ?: $slipDate;

        return $values;
    }

    /* ---------------------------------------------------------------
     * Reading
     * ------------------------------------------------------------- */

    /** slip id => medicine lines, in line order. */
    private function lines(array $slipIds): array
    {
        $rows = Database::connection()->query(
            "SELECT pp.*, d.name AS drug_name, d.generic_name AS drug_generic_name, d.brand_name AS drug_brand_name, d.strength AS drug_strength,
                    d.is_active AS drug_is_active, d.controlled_class AS drug_controlled_class, du.name AS drug_unit_name, df.name AS drug_dosage_form
             FROM patient_prescriptions pp
             LEFT JOIN drugs d ON d.id = pp.drug_id
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN dosage_forms df ON df.id = d.dosage_form_id
             WHERE pp.deleted_at IS NULL AND pp.prescription_id IN (" . implode(',', array_map('intval', $slipIds)) . ")
             ORDER BY pp.prescription_id, pp.line_no, pp.id"
        )->fetchAll(PDO::FETCH_ASSOC);

        $out = [];
        foreach ($rows as $r) {
            $line = ['id' => (int) $r['id'], 'line_no' => (int) $r['line_no'], 'drug_id' => $r['drug_id'] !== null ? (int) $r['drug_id'] : null,
                     'medication_id' => $r['medication_id'] !== null ? (int) $r['medication_id'] : null];
            foreach (self::LINE_FIELDS as $field) {
                $line[$field] = $r[$field];
            }
            $line['refills'] = $r['refills'] !== null ? (int) $r['refills'] : null;
            $line['substitution_allowed'] = (int) $r['substitution_allowed'];
            $line['drug_name'] = $r['drug_name'];
            $line['drug_generic_name'] = $r['drug_generic_name'];
            $line['drug_strength'] = $r['drug_strength'];
            $line['drug_unit_name'] = $r['drug_unit_name'];
            $line['drug_brand_name'] = $r['drug_brand_name'];
            $line['drug_dosage_form'] = $r['drug_dosage_form'];
            $line['is_dangerous_drug'] = $r['drug_controlled_class'] === self::DANGEROUS_CLASS;
            $line['drug_is_active'] = $r['drug_id'] !== null ? (bool) $r['drug_is_active'] : null;
            $out[(int) $r['prescription_id']][] = $line;
        }

        return $out;
    }

    private function format(array $s, array $lines): array
    {
        $today = date('Y-m-d');
        $current = array_filter($lines, fn($l) => $l['end_date'] === null || $l['end_date'] >= $today);

        return [
            'id' => (int) $s['id'],
            'rx_number' => $s['rx_number'],
            'patient_id' => (int) $s['patient_id'],
            'prescribed_date' => $s['prescribed_date'],
            'valid_until' => $s['valid_until'] ?? null,
            // Past its validity, the pharmacy can no longer fill it.
            'is_expired' => !empty($s['valid_until']) && $s['valid_until'] < $today && $s['status'] !== 'cancelled',
            'has_dangerous_drug' => (bool) array_filter($lines, fn($l) => $l['is_dangerous_drug']),
            'prescriber_user_id' => $s['prescriber_user_id'] !== null ? (int) $s['prescriber_user_id'] : null,
            'prescriber_name' => $s['prescriber_name'],
            'encounter_id' => $s['encounter_id'] !== null ? (int) $s['encounter_id'] : null,
            'encounter_date' => $s['encounter_date'] ? substr($s['encounter_date'], 0, 10) : null,
            'encounter_reason' => $s['encounter_reason'],
            'diagnosis' => $s['diagnosis'],
            'notes' => $s['notes'],
            'status' => $s['status'],
            // What the patient chart shows: cancelled, active (some medicine still current) or ended.
            'display_status' => $s['status'] === 'cancelled' ? 'cancelled' : ($current ? 'active' : 'ended'),
            'cancelled_at' => $s['cancelled_at'],
            'cancelled_by_name' => $s['cancelled_by_name'],
            'cancel_reason' => $s['cancel_reason'],
            'dispense_status' => $s['dispense_status'] ?? 'pending',
            'dispense_status_label' => DispensingService::STATUS_LABELS[$s['dispense_status'] ?? 'pending'] ?? null,
            'can_edit' => $s['status'] === 'active' && in_array($s['dispense_status'] ?? 'pending', ['pending', 'none'], true),
            'created_at' => $s['created_at'],
            'updated_at' => $s['updated_at'],
            // Sent back on edit / cancel so a change by someone else in between is caught.
            'version' => self::version($s),
            'items' => $lines
        ];
    }

    /** Users set up as doctors (providers), for "prescribed by". */
    private function prescribers(): array
    {
        $rows = Database::connection()->query(
            "SELECT u.id AS user_id, pr.id AS provider_id, pr.license_number, pr.specialty,
                    pr.ptr_number, pr.ptr_date, pr.s2_number, pr.s2_expiry_date,
                    TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))) AS name, u.username
             FROM providers pr
             JOIN employees e ON e.id = pr.employee_id AND e.deleted_at IS NULL
             JOIN users u ON u.id = e.user_id
             WHERE pr.deleted_at IS NULL
             ORDER BY e.last_name, e.first_name"
        )->fetchAll(PDO::FETCH_ASSOC);

        return array_map(fn($r) => [
            'user_id' => (int) $r['user_id'], 'provider_id' => (int) $r['provider_id'],
            'name' => $r['name'] !== '' ? $r['name'] : $r['username'],
            'license_number' => $r['license_number'], 'specialty' => $r['specialty'],
            'ptr_number' => $r['ptr_number'], 'ptr_date' => $r['ptr_date'],
            's2_number' => $r['s2_number'], 's2_expiry_date' => $r['s2_expiry_date'],
            // Can prescribe dangerous drugs today.
            's2_valid' => $r['s2_number'] !== null && $r['s2_number'] !== '' && ($r['s2_expiry_date'] === null || $r['s2_expiry_date'] >= date('Y-m-d'))
        ], $rows);
    }

    /* ---------------------------------------------------------------
     * Helpers
     * ------------------------------------------------------------- */

    private function text($value, int $max): ?string
    {
        $value = trim((string) ($value ?? ''));
        return $value === '' ? null : mb_substr($value, 0, $max);
    }

    private function isDate(string $value): bool
    {
        $d = \DateTime::createFromFormat('Y-m-d', $value);
        return $d !== false && $d->format('Y-m-d') === $value;
    }

    private function begin(PDO $db): bool
    {
        if (!$db->inTransaction()) {
            $db->beginTransaction();
            return true;
        }
        $db->exec('SAVEPOINT prescription_step');
        return false;
    }

    private function commit(PDO $db, bool $owns): void
    {
        $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT prescription_step');
    }

    private function rollBack(PDO $db, bool $owns): void
    {
        $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT prescription_step');
    }

    private static function addDays(string $date, int $days): string
    {
        return date('Y-m-d', strtotime("{$date} +{$days} days"));
    }

    private static function version(array $slip): string
    {
        return (string) (int) ($slip['revision'] ?? 0);
    }

    private static function userNameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username)
                 FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
                 WHERE u.id = {$column} LIMIT 1)";
    }
}
