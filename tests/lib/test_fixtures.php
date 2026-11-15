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

        // Child rows first where a foreign key would otherwise complain, then
        // the parents. Each is scoped to the fixture patient except the two
        // queues keyed only by their own parent row.
        $db->prepare('DELETE FROM portal_care_gap_requests WHERE patient_id = ?')->execute([$w['patient_id']]);
        $db->prepare('DELETE FROM portal_questionnaire_responses WHERE patient_id = ?')->execute([$w['patient_id']]);
        $db->prepare('DELETE FROM portal_questionnaire_assignments WHERE patient_id = ?')->execute([$w['patient_id']]);
        $db->prepare('DELETE FROM patient_insurance_requests WHERE patient_id = ?')->execute([$w['patient_id']]);
        $db->prepare('DELETE FROM patient_uploads WHERE patient_id = ?')->execute([$w['patient_id']]);
        $db->prepare('DELETE FROM patient_insurances WHERE patient_id = ?')->execute([$w['patient_id']]);
        $db->prepare('DELETE FROM patient_documents WHERE patient_id = ?')->execute([$w['patient_id']]);
        $db->prepare('DELETE FROM patient_reminder_actions WHERE patient_reminder_id IN (SELECT id FROM patient_reminders WHERE patient_id = ?)')->execute([$w['patient_id']]);
        $db->prepare('DELETE FROM patient_reminders WHERE patient_id = ?')->execute([$w['patient_id']]);
        $db->prepare('DELETE FROM appointments WHERE patient_id = ?')->execute([$w['patient_id']]);
        $db->prepare('DELETE FROM portal_audit_logs WHERE patient_id = ?')->execute([$w['patient_id']]);
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
