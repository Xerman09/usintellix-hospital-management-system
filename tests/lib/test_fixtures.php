<?php

declare(strict_types=1);

/**
 * The synthetic world the write tests act on (Phase M9.5).
 *
 * One patient, one provider, one encounter, and whatever appointments a test
 * asks for -- all inside the disposable database from test_database.php, and all
 * named so that a human who ever sees one of these rows in a real database knows
 * immediately that it does not belong there: patient number ZZTEST-0001, surname
 * "Testpatient", username zz_test_patient.
 *
 * Nothing is copied from the live database. That is not laziness about realism;
 * it is that copying rows would put real patients' names, birthdates and
 * diagnoses into a second database with weaker handling, and a test does not
 * need a real person to prove that a cancel writes a cancelled row.
 *
 * Where the application has a service that builds something, the fixtures call
 * it rather than writing the rows by hand -- patient_reminders come from
 * PatientReminderService::processForPatient(), which is the same code path the
 * nightly job uses. Hand-inserted reminders would prove only that the test can
 * write reminders.
 *
 * world() is idempotent: it looks for its own rows first and reuses them, so a
 * suite can call it without caring whether a previous run left the database in
 * place. clearPortalWrites() empties only what the portal writes, which is what
 * makes a second run of the same suite give the same numbers as the first.
 */

require_once __DIR__ . '/test_database.php';

use App\Core\Database;
use App\Modules\PatientReminders\Services\PatientReminderService;

final class TestFixtures
{
    public const PATIENT_NO = 'ZZTEST-0001';
    public const PATIENT_USERNAME = 'zz_test_patient';
    public const PROVIDER_USERNAME = 'zz_test_provider';
    public const STAFF_USERNAME = 'zz_test_staff';

    /**
     * A second patient, added in Phase M18 because Fast Pass cannot be tested
     * with one. Its whole subject is a queue: who is offered a slot first, what
     * the other people in the round are told when somebody accepts, and that one
     * patient's answer cannot touch another's appointment. Every one of those
     * assertions needs two people.
     *
     * Built on demand by secondPatient(), not by world(), so suites written
     * before M18 see exactly the database they saw before. Same disabled
     * password and same ZZTEST naming, for the same reasons.
     */
    public const PATIENT_TWO_NO = 'ZZTEST-0002';
    public const PATIENT_TWO_USERNAME = 'zz_test_patient_two';

    /** Every fixture patient number, for assertions about who is in the database. */
    public const PATIENT_NUMBERS = [self::PATIENT_NO, self::PATIENT_TWO_NO];

    /**
     * A diagnosis code deliberately chosen to be one the guide catalogue can
     * match: M9's resolution is exact code, then longest keyword, then the
     * 3-character category, and E11.9 exercises the category step (the seeded
     * guide is E11). encounter_diagnoses is empty in every database this project
     * has, so this is the only way the After-Visit Summary's coded-diagnosis
     * path gets exercised at all.
     */
    public const DIAGNOSIS_CODE = 'E11.9';
    public const DIAGNOSIS_TEXT = 'Type 2 diabetes mellitus without complications';

    private static ?array $world = null;
    private static ?array $secondPatient = null;
    private static ?array $chart = null;

    /**
     * @return array{patient_id:int, patient_user_id:int, provider_id:int,
     *               staff_user_id:int, employee_id:int, department_id:int,
     *               encounter_id:int}
     */
    public static function world(): array
    {
        if (self::$world !== null) {
            return self::$world;
        }

        // Refuse to build fixtures anywhere but the disposable database. Every
        // method below writes, so this is the last line of defence after
        // TestDatabase's own guards.
        $db = Database::connection();
        $on = (string) $db->query('SELECT DATABASE()')->fetchColumn();

        if (strcasecmp($on, TestDatabase::name()) !== 0) {
            throw new RuntimeException("TestFixtures: refusing to write fixtures into {$on}.");
        }

        $departmentId = self::departmentId($db);
        $patientRoleId = self::roleId($db, 'patient');
        $doctorRoleId = self::roleId($db, 'doctor') ?? self::roleId($db, 'admin');

        $patientUserId = self::user($db, self::PATIENT_USERNAME, $patientRoleId);
        $providerUserId = self::user($db, self::PROVIDER_USERNAME, $doctorRoleId);
        $staffUserId = self::user($db, self::STAFF_USERNAME, $doctorRoleId);

        $patientId = self::patient($db, $patientUserId);
        $employeeId = self::employee($db, $providerUserId, $departmentId);
        $providerId = self::provider($db, $employeeId);
        $encounterId = self::encounter($db, $patientId, $providerId);
        $insurerId = self::insurer($db);

        self::$world = [
            'patient_id' => $patientId,
            'patient_user_id' => $patientUserId,
            'provider_id' => $providerId,
            'staff_user_id' => $staffUserId,
            'employee_id' => $employeeId,
            'department_id' => $departmentId,
            'encounter_id' => $encounterId,
            'insurer_id' => $insurerId,
        ];

        return self::$world;
    }

    /**
     * The user array the portal services expect for audit purposes. Only 'id' is
     * read (PortalAudit writes it as user_id, and the services' actorId() falls
     * back to 0), but role and username are included because a test that prints
     * this is easier to read with them.
     */
    public static function patientUser(): array
    {
        $w = self::world();

        return ['id' => $w['patient_user_id'], 'role' => 'patient', 'username' => self::PATIENT_USERNAME];
    }

    public static function staffUser(): array
    {
        $w = self::world();

        return ['id' => $w['staff_user_id'], 'role' => 'doctor', 'username' => self::STAFF_USERNAME];
    }

    /**
     * Generate this patient's health-maintenance reminders with the real engine,
     * so what the portal reads is what the nightly job would have produced.
     *
     * @return int the number of reminder rows the patient now has
     */
    public static function generateReminders(): int
    {
        $w = self::world();

        (new PatientReminderService())->processForPatient($w['patient_id']);

        $db = Database::connection();
        $stmt = $db->prepare('SELECT COUNT(*) FROM patient_reminders WHERE patient_id = ? AND deleted_at IS NULL');
        $stmt->execute([$w['patient_id']]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * The second patient, created on first use.
     *
     * Deliberately NOT part of world(): a suite that does not ask for a second
     * patient should not get one, because several suites assert on what is in
     * the database and a surprise row would be read as a leak.
     *
     * Male and younger than the first, so health-maintenance rules resolve to a
     * different set -- if a test ever needs two patients with different reminders
     * it has them, and if it needs two who are interchangeable it still has that.
     *
     * @return array{patient_id:int, patient_user_id:int}
     */
    public static function secondPatient(): array
    {
        if (self::$secondPatient !== null) {
            return self::$secondPatient;
        }

        $w = self::world();   // also runs the "am I in the test database" guard
        $db = Database::connection();

        $userId = self::user($db, self::PATIENT_TWO_USERNAME, self::roleId($db, 'patient'));

        $stmt = $db->prepare('SELECT id FROM patients WHERE patient_no = ? LIMIT 1');
        $stmt->execute([self::PATIENT_TWO_NO]);
        $patientId = $stmt->fetchColumn();

        if ($patientId === false) {
            $stmt = $db->prepare(
                "INSERT INTO patients
                    (user_id, patient_no, first_name, last_name, sex, birthdate, civil_status,
                     blood_type, height, weight, created_at)
                 VALUES (:u, :no, 'Zy', 'Testpatient', 'male', :dob, 'Single', 'A+', 172.00, 70.00, NOW())"
            );
            $stmt->execute([
                'u' => $userId,
                'no' => self::PATIENT_TWO_NO,
                'dob' => date('Y-m-d', strtotime('-38 years')),
            ]);
            $patientId = (int) $db->lastInsertId();
        }

        self::$secondPatient = [
            'patient_id' => (int) $patientId,
            'patient_user_id' => $userId,
            'provider_id' => $w['provider_id'],
        ];

        return self::$secondPatient;
    }

    /** The portal user array for the second patient. */
    public static function secondPatientUser(): array
    {
        $two = self::secondPatient();

        return ['id' => $two['patient_user_id'], 'role' => 'patient', 'username' => self::PATIENT_TWO_USERNAME];
    }

    /**
     * An appointment for a named patient with the shared fixture provider.
     *
     * Same provider on purpose: Fast Pass only ever matches within one doctor's
     * diary, so two patients who are to compete for a slot must share one.
     */
    public static function appointmentFor(
        int $patientId,
        string $date,
        string $time = '10:00:00',
        string $status = 'scheduled'
    ): int {
        $w = self::world();
        $db = Database::connection();

        $stmt = $db->prepare(
            "INSERT INTO appointments
                (patient_id, provider_id, is_provider_block, appointment_date, appointment_time,
                 is_all_day, reason, status, created_at, created_by)
             VALUES (:p, :prov, 0, :d, :t, 0, 'Fixture appointment', :s, NOW(), :by)"
        );
        $stmt->execute([
            'p' => $patientId,
            'prov' => $w['provider_id'],
            'd' => $date,
            't' => $time,
            's' => $status,
            'by' => $w['staff_user_id'],
        ]);

        return (int) $db->lastInsertId();
    }

    /**
     * A fresh scheduled appointment for the fixture patient, returned by id.
     *
     * Tests that cancel or move an appointment need their own, because the point
     * of the test is that the row changes -- sharing one would make the second
     * test depend on the first one's outcome.
     */
    public static function appointment(string $date, string $time = '10:00:00', string $status = 'scheduled'): int
    {
        $w = self::world();
        $db = Database::connection();

        $stmt = $db->prepare(
            "INSERT INTO appointments
                (patient_id, provider_id, is_provider_block, appointment_date, appointment_time,
                 is_all_day, reason, status, created_at, created_by)
             VALUES (:p, :prov, 0, :d, :t, 0, 'Fixture appointment', :s, NOW(), :by)"
        );
        $stmt->execute([
            'p' => $w['patient_id'],
            'prov' => $w['provider_id'],
            'd' => $date,
            't' => $time,
            's' => $status,
            'by' => $w['staff_user_id'],
        ]);

        return (int) $db->lastInsertId();
    }

    /**
     * A chart for the fixture patient, built so the M19 verification gate has
     * something definite to decide (Phase M19).
     *
     * The point of these rows is the `verification_status` spread, not the
     * clinical content. Every value the staff screen can produce is represented,
     * including the two that mean the opposite of the row's own content:
     *
     *   Confirmed         shown plainly
     *   Unconfirmed       shown, labelled as not confirmed
     *   NULL              shown, treated as Unconfirmed -- never as Confirmed
     *   Refuted           NEVER SHOWN: a clinician decided this is not true
     *   Entered in Error  NEVER SHOWN: the row should not exist
     *
     * Without a Refuted and an Entered in Error row in here, the assertion that
     * matters most in that suite would pass against a chart that has never been
     * asked the question.
     *
     * Every row also carries a `comments` value, because the other thing worth
     * proving is that staff free text never reaches the patient.
     *
     * @return array{allergy_ok:int, allergy_unconfirmed:int, allergy_refuted:int,
     *               condition_error:int, condition_ended:int, medication_ok:int,
     *               surgery_ok:int, device_null:int, immunization_ok:int,
     *               immunization_refused:int}
     */
    public static function chart(): array
    {
        if (self::$chart !== null) {
            return self::$chart;
        }

        $w = self::world();
        $db = Database::connection();

        // Three separate allergens, because patient_allergies carries a UNIQUE
        // key on (patient_id, allergy_id) -- a patient can be recorded against
        // any given allergen once. Each is looked up by name and created if
        // absent, so the fixture does not depend on seed ordering.
        $ids = [];

        $ids['allergy_ok'] = self::allergyRow(
            $db, $w['patient_id'], self::lookup($db, 'allergies', 'ZZTEST Allergen Confirmed'), 'Confirmed', 'Swelling', 'Severe'
        );
        $ids['allergy_unconfirmed'] = self::allergyRow(
            $db, $w['patient_id'], self::lookup($db, 'allergies', 'ZZTEST Allergen Unconfirmed'), 'Unconfirmed', null, null
        );
        $ids['allergy_refuted'] = self::allergyRow(
            $db, $w['patient_id'], self::lookup($db, 'allergies', 'ZZTEST Allergen Refuted'), 'Refuted', 'Rash', 'Mild'
        );

        $ids['condition_error'] = self::issueRow($db, 'patient_medical_problems', $w['patient_id'], 'ZZTEST Condition In Error', 'Entered in Error', null);
        $ids['condition_ended'] = self::issueRow($db, 'patient_medical_problems', $w['patient_id'], 'ZZTEST Condition Resolved', 'Confirmed', date('Y-m-d', strtotime('-30 days')));

        $ids['medication_ok'] = self::issueRow($db, 'patient_medications', $w['patient_id'], 'ZZTEST Medicine', 'Confirmed', null);
        $ids['surgery_ok'] = self::issueRow($db, 'patient_surgeries', $w['patient_id'], 'ZZTEST Operation', 'Unconfirmed', null);
        $ids['device_null'] = self::issueRow($db, 'patient_medical_devices', $w['patient_id'], 'ZZTEST Implant', null, null);

        $ids['immunization_ok'] = self::immunizationRow($db, $w['patient_id'], 'ZZTEST Vaccine', 'Completed');
        $ids['immunization_refused'] = self::immunizationRow($db, $w['patient_id'], 'ZZTEST Vaccine Refused', 'Refused');

        self::$chart = $ids;

        return $ids;
    }

    /** A lookup row by name, created if it is not there. */
    private static function lookup(PDO $db, string $table, string $name): int
    {
        if (!preg_match('/^[a-z_]+$/', $table)) {
            throw new RuntimeException("TestFixtures: refusing to touch table {$table}.");
        }

        $stmt = $db->prepare("SELECT id FROM `{$table}` WHERE name = ? LIMIT 1");
        $stmt->execute([$name]);
        $id = $stmt->fetchColumn();

        if ($id !== false) {
            return (int) $id;
        }

        $db->prepare("INSERT INTO `{$table}` (name, created_at) VALUES (?, NOW())")->execute([$name]);

        return (int) $db->lastInsertId();
    }

    private static function allergyRow(PDO $db, int $patientId, int $allergyId, ?string $verification, ?string $reaction, ?string $severity): int
    {
        $stmt = $db->prepare(
            "SELECT id FROM patient_allergies
              WHERE patient_id = ? AND allergy_id = ? AND comments = ? AND deleted_at IS NULL LIMIT 1"
        );
        $marker = 'ZZTEST staff-only note (' . ($verification ?? 'null') . ')';
        $stmt->execute([$patientId, $allergyId, $marker]);
        $id = $stmt->fetchColumn();

        if ($id !== false) {
            return (int) $id;
        }

        $db->prepare(
            "INSERT INTO patient_allergies
                (patient_id, allergy_id, reaction, severity, begin_date, comments, verification_status, created_at)
             VALUES (:p, :a, :r, :s, :began, :c, :v, NOW())"
        )->execute([
            'p' => $patientId,
            'a' => $allergyId,
            'r' => $reaction,
            's' => $severity,
            'began' => date('Y-m-d', strtotime('-200 days')),
            'c' => $marker,
            'v' => $verification,
        ]);

        return (int) $db->lastInsertId();
    }

    /** One row in any of the four tables that share the lists shape. */
    private static function issueRow(PDO $db, string $table, int $patientId, string $title, ?string $verification, ?string $endDate): int
    {
        if (!preg_match('/^patient_[a-z_]+$/', $table)) {
            throw new RuntimeException("TestFixtures: refusing to touch table {$table}.");
        }

        $stmt = $db->prepare("SELECT id FROM `{$table}` WHERE patient_id = ? AND title = ? AND deleted_at IS NULL LIMIT 1");
        $stmt->execute([$patientId, $title]);
        $id = $stmt->fetchColumn();

        if ($id !== false) {
            return (int) $id;
        }

        $db->prepare(
            "INSERT INTO `{$table}` (patient_id, title, begin_date, end_date, comments, verification_status, created_at)
             VALUES (:p, :t, :began, :ended, :c, :v, NOW())"
        )->execute([
            'p' => $patientId,
            't' => $title,
            'began' => date('Y-m-d', strtotime('-120 days')),
            'ended' => $endDate,
            'c' => 'ZZTEST staff-only note that must never reach the patient',
            'v' => $verification,
        ]);

        return (int) $db->lastInsertId();
    }

    private static function immunizationRow(PDO $db, int $patientId, string $vaccine, string $completion): int
    {
        $stmt = $db->prepare('SELECT id FROM patient_immunizations WHERE patient_id = ? AND vaccine_name = ? AND deleted_at IS NULL LIMIT 1');
        $stmt->execute([$patientId, $vaccine]);
        $id = $stmt->fetchColumn();

        if ($id !== false) {
            return (int) $id;
        }

        $db->prepare(
            "INSERT INTO patient_immunizations
                (patient_id, vaccine_name, administered_at, manufacturer, route, completion_status, notes, created_at)
             VALUES (:p, :v, :at, 'ZZTEST Pharma', 'Intramuscular', :c, 'ZZTEST staff-only note', NOW())"
        )->execute([
            'p' => $patientId,
            'v' => $vaccine,
            'at' => date('Y-m-d H:i:s', strtotime('-400 days')),
            'c' => $completion,
        ]);

        return (int) $db->lastInsertId();
    }

    /**
     * Empty the tables the portal writes to, leaving schema, seeds and the
     * fixture world in place.
     *
     * Deliberately a DELETE of the fixture patient's rows rather than a TRUNCATE
     * of each table: a TRUNCATE would also remove anything a human had put in
     * this database to look at, and the fixture patient is the only patient, so
     * the effect on test state is identical.
     */
    public static function clearPortalWrites(): void
    {
        $w = self::world();
        $db = Database::connection();

        // The files live under TestDatabase::uploadRoot(), which exists only for
        // test runs, so they can be removed wholesale rather than matched by name.
        // That matters: an accepted upload is named doc_from_portal_* whether a
        // patient or a test produced it, so inside a shared directory there would
        // be no safe pattern to clean up by.
        TestDatabase::clearUploadRoot();

        // Every fixture patient, not just the first. The second one (M18) may or
        // may not have been built by the suite that is running, so it is looked
        // up by patient number rather than assumed into existence -- calling
        // secondPatient() here would create the row this method is clearing.
        $ids = [$w['patient_id']];

        $find = $db->prepare('SELECT id FROM patients WHERE patient_no = ?');

        foreach (self::PATIENT_NUMBERS as $no) {
            $find->execute([$no]);
            $id = $find->fetchColumn();

            if ($id !== false && !in_array((int) $id, $ids, true)) {
                $ids[] = (int) $id;
            }
        }

        $in = implode(',', array_map('intval', $ids));

        // Child rows first where a foreign key would otherwise complain, then
        // the parents. Each is scoped to the fixture patients except the queues
        // keyed only by their own parent row.
        //
        // The Fast Pass tables go before appointments: an offer and a waitlist
        // entry both point at an appointment row, and a waitlist entry whose
        // appointment had been deleted would make the next run's eligibility
        // query answer a question about a booking that no longer exists.
        $db->exec("DELETE FROM portal_fastpass_offers WHERE patient_id IN ({$in})");
        $db->exec("DELETE FROM portal_fastpass_waitlist WHERE patient_id IN ({$in})");

        // Slots are keyed by provider rather than patient, so they are cleared
        // by the fixture provider. Anything else in this database belongs to a
        // provider the fixtures did not create and is left alone.
        $db->prepare('DELETE FROM portal_fastpass_offers WHERE slot_id IN (SELECT id FROM portal_fastpass_slots WHERE provider_id = ?)')
            ->execute([$w['provider_id']]);
        $db->prepare('DELETE FROM portal_fastpass_slots WHERE provider_id = ?')->execute([$w['provider_id']]);

        // M19. Corrections before the chart rows they point at.
        $db->exec("DELETE FROM portal_chart_corrections WHERE patient_id IN ({$in})");

        $db->exec("DELETE FROM portal_care_gap_requests WHERE patient_id IN ({$in})");
        $db->exec("DELETE FROM portal_questionnaire_responses WHERE patient_id IN ({$in})");
        $db->exec("DELETE FROM portal_questionnaire_assignments WHERE patient_id IN ({$in})");
        $db->exec("DELETE FROM patient_insurance_requests WHERE patient_id IN ({$in})");
        $db->exec("DELETE FROM patient_uploads WHERE patient_id IN ({$in})");
        $db->exec("DELETE FROM patient_insurances WHERE patient_id IN ({$in})");
        $db->exec("DELETE FROM patient_documents WHERE patient_id IN ({$in})");
        $db->exec("DELETE FROM patient_reminder_actions WHERE patient_reminder_id IN (SELECT id FROM patient_reminders WHERE patient_id IN ({$in}))");
        $db->exec("DELETE FROM patient_reminders WHERE patient_id IN ({$in})");
        $db->exec("DELETE FROM patient_notifications WHERE patient_id IN ({$in})");
        $db->exec("DELETE FROM appointments WHERE patient_id IN ({$in})");
        $db->exec("DELETE FROM portal_audit_logs WHERE patient_id IN ({$in})");
    }

    // ------------------------------------------------------------------
    // Row builders. Each one looks for its own row first.
    // ------------------------------------------------------------------

    /**
     * Departments come from the seeds, but their ids are not stable across
     * databases -- the live one has hand-created rows that shift the numbering,
     * so Internal Medicine is id 3 there and id 2 here. Looked up by name for
     * that reason, with a fallback to whatever exists.
     */
    private static function departmentId(PDO $db): int
    {
        $id = $db->query("SELECT id FROM departments WHERE name LIKE 'Internal Medicine%' LIMIT 1")->fetchColumn();

        if ($id === false) {
            $id = $db->query('SELECT id FROM departments ORDER BY id LIMIT 1')->fetchColumn();
        }

        if ($id === false) {
            throw new RuntimeException('TestFixtures: no departments exist -- were the seeds applied?');
        }

        return (int) $id;
    }

    private static function roleId(PDO $db, string $name): ?int
    {
        $stmt = $db->prepare('SELECT id FROM roles WHERE name = ? LIMIT 1');
        $stmt->execute([$name]);
        $id = $stmt->fetchColumn();

        return $id === false ? null : (int) $id;
    }

    private static function user(PDO $db, string $username, ?int $roleId): int
    {
        $stmt = $db->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
        $stmt->execute([$username]);
        $id = $stmt->fetchColumn();

        if ($id !== false) {
            return (int) $id;
        }

        // A real hash of a value nobody can use to sign in: the password column
        // is NOT NULL, and putting a plausible password here -- even a weak one
        // -- would create an account that works if this database were ever
        // reachable. password_verify() against any input fails for this string.
        $stmt = $db->prepare('INSERT INTO users (username, password, role_id, created_at) VALUES (?, ?, ?, NOW())');
        $stmt->execute([$username, '*DISABLED-TEST-FIXTURE-NO-LOGIN*', $roleId]);

        return (int) $db->lastInsertId();
    }

    private static function patient(PDO $db, int $userId): int
    {
        $stmt = $db->prepare('SELECT id FROM patients WHERE patient_no = ? LIMIT 1');
        $stmt->execute([self::PATIENT_NO]);
        $id = $stmt->fetchColumn();

        if ($id !== false) {
            return (int) $id;
        }

        // Female, 52, so that the health-maintenance rules with real demographic
        // criteria resolve to a known set: mammogram and cervical screening apply,
        // prostate does not. A test asserting "the patient sees four items and not
        // the fifth" needs the demographics to be a decision, not an accident.
        $stmt = $db->prepare(
            "INSERT INTO patients
                (user_id, patient_no, first_name, last_name, sex, birthdate, civil_status,
                 blood_type, height, weight, created_at)
             VALUES (:u, :no, 'Zz', 'Testpatient', 'female', :dob, 'Single', 'O+', 160.00, 60.00, NOW())"
        );
        $stmt->execute([
            'u' => $userId,
            'no' => self::PATIENT_NO,
            'dob' => date('Y-m-d', strtotime('-52 years')),
        ]);

        return (int) $db->lastInsertId();
    }

    private static function employee(PDO $db, int $userId, int $departmentId): int
    {
        $stmt = $db->prepare('SELECT id FROM employees WHERE user_id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $id = $stmt->fetchColumn();

        if ($id !== false) {
            return (int) $id;
        }

        $stmt = $db->prepare(
            "INSERT INTO employees
                (user_id, employee_no, first_name, last_name, email, phone, department_id, created_at)
             VALUES (:u, 'ZZTEST-EMP-1', 'Zz', 'Testdoctor', 'zz.testdoctor@example.invalid',
                     '000-0000000', :d, NOW())"
        );
        $stmt->execute(['u' => $userId, 'd' => $departmentId]);

        return (int) $db->lastInsertId();
    }

    private static function provider(PDO $db, int $employeeId): int
    {
        $stmt = $db->prepare('SELECT id FROM providers WHERE employee_id = ? LIMIT 1');
        $stmt->execute([$employeeId]);
        $id = $stmt->fetchColumn();

        if ($id !== false) {
            return (int) $id;
        }

        $stmt = $db->prepare("INSERT INTO providers (employee_id, specialty, created_at) VALUES (?, 'Internal Medicine', NOW())");
        $stmt->execute([$employeeId]);

        return (int) $db->lastInsertId();
    }

    /**
     * Two priced packages built so that reconciliation has something definite to
     * decide (Phase M16).
     *
     * The live database's four packages are not usable as a test fixture: exactly
     * one of them reconciles, and only against its discounted price, which is an
     * accident of data entry rather than a property anyone chose. A test that
     * asserted on it would be asserting on a typo. These two are explicit:
     *
     *   ZZTEST-PKG-OK    items sum to BOTH prices' bases cleanly -- the covered
     *                    amounts total the discounted price, and quantity x unit
     *                    totals the standard price, so both bases reconcile and
     *                    each exercises a different branch of reconcile().
     *   ZZTEST-PKG-OFF   items deliberately 100.00 short, so neither basis
     *                    reconciles and the "no breakdown" path is exercised.
     *
     * A third case -- a package with no items at all -- is whatever the schema
     * files already inserted, so it needs no fixture.
     *
     * @return array{ok:int, off:int, empty:int}
     */
    public static function packages(): array
    {
        $db = Database::connection();

        $ok = self::package(
            $db,
            'ZZTEST-PKG-OK',
            'Zz Test Package (reconciles)',
            '10000.00',
            '9000.00',
            [
                // covered_amount sums to 9,000 (the discounted price);
                // quantity x unit_price sums to 10,000 (the standard price).
                ['Zz room and board', 2, '2500.00', '4000.00'],
                ['Zz theatre fee', 1, '3500.00', '3000.00'],
                ['Zz surgeon fee', 1, '1500.00', '2000.00'],
            ]
        );

        $off = self::package(
            $db,
            'ZZTEST-PKG-OFF',
            'Zz Test Package (does not reconcile)',
            '20000.00',
            '18000.00',
            [
                // 100 short of the discounted price and 2,100 short of the
                // standard one, so neither basis can show a breakdown.
                ['Zz room and board', 2, '4000.00', '8000.00'],
                ['Zz theatre fee', 1, '9900.00', '9900.00'],
            ]
        );

        $empty = (int) $db->query(
            "SELECT id FROM billing_service_packages
              WHERE package_code NOT LIKE 'ZZTEST%' ORDER BY id LIMIT 1"
        )->fetchColumn();

        return ['ok' => $ok, 'off' => $off, 'empty' => $empty];
    }

    /**
     * One package plus its items. Items are rewritten on every call so a changed
     * fixture definition takes effect without needing the database rebuilt.
     */
    private static function package(
        PDO $db,
        string $code,
        string $name,
        string $standard,
        string $discounted,
        array $items
    ): int {
        $stmt = $db->prepare('SELECT id FROM billing_service_packages WHERE package_code = ? LIMIT 1');
        $stmt->execute([$code]);
        $id = $stmt->fetchColumn();

        if ($id === false) {
            $stmt = $db->prepare(
                "INSERT INTO billing_service_packages
                    (package_code, package_name, package_type, standard_package_price,
                     discounted_price, included_bed_days, included_room_type,
                     inclusions_summary, exclusions_summary, is_active, created_at)
                 VALUES (:code, :name, 'surgical_procedure', :std, :disc, 2, 'Zz Test Room',
                         'Zz test inclusions: room, theatre, surgeon.',
                         'Zz test exclusions: anything not listed.', 1, NOW())"
            );
            $stmt->execute(['code' => $code, 'name' => $name, 'std' => $standard, 'disc' => $discounted]);
            $id = (int) $db->lastInsertId();
        }

        $id = (int) $id;

        $db->prepare('DELETE FROM billing_package_items WHERE package_id = ?')->execute([$id]);

        $line = $db->prepare(
            "INSERT INTO billing_package_items
                (package_id, item_code, item_name, category, quantity, unit_price, covered_amount, is_mandatory)
             VALUES (:p, :code, :name, 'service', :qty, :unit, :covered, 1)"
        );

        foreach ($items as $i => [$itemName, $qty, $unit, $covered]) {
            $line->execute([
                'p' => $id,
                // Deliberately NOT a real tariff code. In the live data these
                // codes collide with billing_tariff_master while naming a
                // different service, and nothing may join on them.
                'code' => 'ZZTEST-ITEM-' . ($i + 1),
                'name' => $itemName,
                'qty' => $qty,
                'unit' => $unit,
                'covered' => $covered,
            ]);
        }

        // Visible to patients, so the catalogue and request paths can be tested.
        $db->prepare(
            "INSERT INTO portal_package_visibility
                (package_id, patient_label, patient_blurb, is_patient_visible, sequence, created_at)
             VALUES (:p, :label, 'A test package, not a real one.', 1, 900, NOW())
             ON DUPLICATE KEY UPDATE patient_label = VALUES(patient_label), is_patient_visible = 1"
        )->execute(['p' => $id, 'label' => $name]);

        return $id;
    }

    /**
     * An insurer the desk can actually apply.
     *
     * PortalInsuranceService lets a patient type an insurer name it does not
     * recognise -- deliberately, since a patient should not have to find their
     * payer in the hospital's list -- but the desk cannot then apply the request,
     * because patient_insurances needs a real insurance_id. The refusal explains
     * exactly that. So a test of the apply path needs a payer on file, and a test
     * of the refusal needs one that is only typed; this provides the former.
     */
    private static function insurer(PDO $db): int
    {
        $stmt = $db->prepare('SELECT id FROM insurances WHERE insurance_id = ? LIMIT 1');
        $stmt->execute(['ZZTEST-INS']);
        $id = $stmt->fetchColumn();

        if ($id !== false) {
            return (int) $id;
        }

        $stmt = $db->prepare("INSERT INTO insurances (insurance_id, name, created_at) VALUES ('ZZTEST-INS', 'Zz Test Assurance', NOW())");
        $stmt->execute();

        return (int) $db->lastInsertId();
    }

    /**
     * A past encounter carrying a coded diagnosis, which is the thing no database
     * in this project has ever had. See DIAGNOSIS_CODE.
     */
    private static function encounter(PDO $db, int $patientId, int $providerId): int
    {
        $stmt = $db->prepare(
            'SELECT id FROM encounters WHERE patient_id = ? AND reason_for_visit = ? LIMIT 1'
        );
        $stmt->execute([$patientId, 'Fixture encounter']);
        $id = $stmt->fetchColumn();

        if ($id === false) {
            $stmt = $db->prepare(
                "INSERT INTO encounters
                    (patient_id, encounter_provider_id, date_of_service, reason_for_visit, created_at)
                 VALUES (:p, :prov, :dos, 'Fixture encounter', NOW())"
            );
            $stmt->execute([
                'p' => $patientId,
                'prov' => $providerId,
                'dos' => date('Y-m-d H:i:s', strtotime('-14 days')),
            ]);
            $id = (int) $db->lastInsertId();
        }

        $id = (int) $id;

        $stmt = $db->prepare('SELECT COUNT(*) FROM encounter_diagnoses WHERE encounter_id = ? AND deleted_at IS NULL');
        $stmt->execute([$id]);

        if ((int) $stmt->fetchColumn() === 0) {
            $stmt = $db->prepare(
                'INSERT INTO encounter_diagnoses (encounter_id, code, description, sequence, created_at)
                 VALUES (?, ?, ?, 1, NOW())'
            );
            $stmt->execute([$id, self::DIAGNOSIS_CODE, self::DIAGNOSIS_TEXT]);
        }

        return $id;
    }
}
