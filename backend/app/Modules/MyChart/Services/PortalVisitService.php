<?php

namespace App\Modules\MyChart\Services;

use App\Core\Database;
use PDO;

/**
 * Visits in My Chart (Phase 3): what is coming up, what has happened, and the
 * summary of each one.
 *
 * Nothing new is recorded here -- it is assembly over what the hospital already
 * captures: appointments, radiology bookings, encounters, ER visits, inpatient
 * admissions, the encounter sections, and the signed discharge summary.
 *
 * As everywhere in My Chart, the patient id is resolved by PortalGuard and passed
 * in; every query is scoped to it, so a visit belonging to someone else simply does
 * not exist as far as this service is concerned.
 */
class PortalVisitService
{
    /** Staff-only words that a patient should not meet in a summary. */
    private const PROVIDER_NAME = "NULLIF(TRIM(CONCAT(COALESCE(pe.first_name, ''), ' ', COALESCE(pe.last_name, ''))), '')";

    // ------------------------------------------------------------------
    // The list
    // ------------------------------------------------------------------

    /**
     * Upcoming and past visits in one chronological list.
     *
     * Upcoming: booked appointments, and radiology bookings (which are appointments at
     * a machine) with the preparation the study needs.
     * Past: clinic encounters, ER visits and inpatient stays.
     */
    public static function list(int $patientId): array
    {
        $db = Database::connection();
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $today = substr($now, 0, 10);

        return [
            'upcoming' => array_merge(self::upcomingAppointments($db, $patientId, $today), self::upcomingStudies($db, $patientId, $now)),
            'past' => self::pastVisits($db, $patientId, $today),
            'server_time' => $now,
        ];
    }

    private static function upcomingAppointments(PDO $db, int $patientId, string $today): array
    {
        $stmt = $db->prepare(
            "SELECT a.id, a.appointment_date, a.appointment_time, a.is_all_day, a.reason, a.status, a.title,
                    f.name AS facility, vc.name AS visit_category, d.name AS department,
                    " . self::PROVIDER_NAME . " AS doctor
             FROM appointments a
             LEFT JOIN facilities f ON f.id = a.facility_id
             LEFT JOIN visit_categories vc ON vc.id = a.visit_category_id
             LEFT JOIN providers pr ON pr.id = a.provider_id
             LEFT JOIN employees pe ON pe.id = pr.employee_id
             LEFT JOIN departments d ON d.id = pe.department_id
             WHERE a.patient_id = :p AND a.deleted_at IS NULL AND a.is_provider_block = 0
               AND a.appointment_date >= :today
               AND (a.status IS NULL OR a.status NOT IN ('cancelled', 'no_show', 'deleted'))
             ORDER BY a.appointment_date, a.appointment_time
             LIMIT 60"
        );
        $stmt->execute(['p' => $patientId, 'today' => $today]);

        return array_map(static fn(array $r) => [
            'kind' => 'appointment',
            'id' => (int) $r['id'],
            'when' => trim($r['appointment_date'] . ' ' . ((int) $r['is_all_day'] === 1 ? '' : (string) $r['appointment_time'])),
            'all_day' => (int) $r['is_all_day'] === 1,
            'title' => $r['title'] ?: ($r['visit_category'] ?: 'Appointment'),
            'facility' => $r['facility'],
            'department' => $r['department'],
            'doctor' => $r['doctor'],
            'reason' => $r['reason'],
            'status' => $r['status'],
            'prepare' => [],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Booked imaging, with the preparation the study itself carries (procedure_order_configs.
     * rad_prep), and lab tests still to be collected that need fasting. The wording comes
     * from the catalogue, which is already written for the patient.
     */
    private static function upcomingStudies(PDO $db, int $patientId, string $now): array
    {
        $out = [];

        $rad = $db->prepare(
            "SELECT b.id, b.start_at, b.status, c.name AS study, c.rad_prep, c.rad_modality,
                    rm.name AS room, rm.location
             FROM rad_bookings b
             JOIN patient_procedure_orders o ON o.id = b.order_id AND o.deleted_at IS NULL
             LEFT JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             LEFT JOIN rad_rooms rm ON rm.id = b.room_id
             WHERE b.patient_id = :p AND b.status IN ('booked', 'arrived') AND b.start_at >= :now
             ORDER BY b.start_at
             LIMIT 30"
        );
        $rad->execute(['p' => $patientId, 'now' => $now]);

        foreach ($rad->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $out[] = [
                'kind' => 'imaging',
                'id' => (int) $r['id'],
                'when' => $r['start_at'],
                'all_day' => false,
                'title' => $r['study'] ?: 'Imaging',
                'facility' => $r['location'],
                'department' => 'Radiology',
                'doctor' => null,
                'reason' => null,
                'status' => $r['status'],
                'where' => $r['room'],
                'prepare' => array_values(array_filter([
                    $r['rad_prep'] ?: null,
                    'Please come 15 minutes early and bring a list of your medicines.',
                ])),
            ];
        }

        $lab = $db->prepare(
            "SELECT r.id, r.collect_at, r.fasting, r.status, GROUP_CONCAT(c.name ORDER BY c.name SEPARATOR ', ') AS tests
             FROM lab_requests r
             JOIN patient_procedure_orders o ON o.lab_request_id = r.id AND o.deleted_at IS NULL
             LEFT JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             WHERE r.patient_id = :p AND r.status NOT IN ('cancelled', 'completed')
               AND o.status = 'pending' AND r.collect_at IS NOT NULL AND r.collect_at >= :now
             GROUP BY r.id, r.collect_at, r.fasting, r.status
             ORDER BY r.collect_at
             LIMIT 30"
        );
        $lab->execute(['p' => $patientId, 'now' => $now]);

        foreach ($lab->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $out[] = [
                'kind' => 'lab',
                'id' => (int) $r['id'],
                'when' => $r['collect_at'],
                'all_day' => false,
                'title' => $r['tests'] ?: 'Laboratory tests',
                'facility' => null,
                'department' => 'Laboratory',
                'doctor' => null,
                'reason' => null,
                'status' => $r['status'],
                'prepare' => (int) $r['fasting'] === 1
                    ? ['Nothing to eat or drink except water for 8 hours before the sample is taken. Take your usual medicines unless your doctor said otherwise.']
                    : [],
            ];
        }

        usort($out, static fn($a, $b) => strcmp((string) $a['when'], (string) $b['when']));

        return $out;
    }

    private static function pastVisits(PDO $db, int $patientId, string $today): array
    {
        $out = [];

        $enc = $db->prepare(
            "SELECT e.id, e.date_of_service, e.reason_for_visit, f.name AS facility, vc.name AS visit_category,
                    d.name AS department, " . self::PROVIDER_NAME . " AS doctor,
                    (SELECT COUNT(*) FROM encounter_diagnoses x WHERE x.encounter_id = e.id AND x.deleted_at IS NULL) AS diagnoses
             FROM encounters e
             LEFT JOIN facilities f ON f.id = e.facility_id
             LEFT JOIN visit_categories vc ON vc.id = e.visit_category_id
             LEFT JOIN providers pr ON pr.id = e.encounter_provider_id
             LEFT JOIN employees pe ON pe.id = pr.employee_id
             LEFT JOIN departments d ON d.id = pe.department_id
             WHERE e.patient_id = :p AND e.deleted_at IS NULL AND e.date_of_service <= :today
             ORDER BY e.date_of_service DESC, e.id DESC
             LIMIT 100"
        );
        $enc->execute(['p' => $patientId, 'today' => $today]);

        foreach ($enc->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $out[] = [
                'kind' => 'encounter',
                'id' => (int) $r['id'],
                'when' => $r['date_of_service'],
                'title' => $r['visit_category'] ?: 'Clinic visit',
                'facility' => $r['facility'],
                'department' => $r['department'],
                'doctor' => $r['doctor'],
                'reason' => $r['reason_for_visit'],
                'has_summary' => true,
                'diagnoses' => (int) $r['diagnoses'],
            ];
        }

        $er = $db->prepare(
            "SELECT v.id, v.visit_no, v.arrived_at, v.chief_complaint, v.disposition, v.closed_at, v.er_diagnosis, v.follow_up
             FROM er_visits v
             WHERE v.patient_id = :p AND v.arrived_at IS NOT NULL
             ORDER BY v.arrived_at DESC
             LIMIT 50"
        );
        $er->execute(['p' => $patientId]);

        foreach ($er->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $out[] = [
                'kind' => 'er',
                'id' => (int) $r['id'],
                'when' => $r['arrived_at'],
                'title' => 'Emergency room visit',
                'facility' => null,
                'department' => 'Emergency',
                'doctor' => null,
                'reason' => $r['chief_complaint'],
                'left_at' => $r['closed_at'],
                'outcome' => $r['disposition'],
                'diagnosis' => $r['er_diagnosis'],
                'follow_up' => $r['follow_up'],
                'has_summary' => false,
            ];
        }

        $adm = $db->prepare(
            "SELECT a.id, a.admission_number, a.admission_date, a.discharge_date, a.status, a.admitting_diagnosis,
                    a.attending_physician, a.discharge_disposition, w.ward_name, b.bed_number,
                    (SELECT s.id FROM inpatient_discharge_summaries s
                      WHERE s.admission_id = a.id AND s.deleted_at IS NULL AND s.is_finalized = 1 AND s.signature_date IS NOT NULL
                      ORDER BY s.id DESC LIMIT 1) AS summary_id
             FROM inpatient_admissions a
             LEFT JOIN hospital_wards w ON w.id = a.ward_id
             LEFT JOIN hospital_beds b ON b.id = a.bed_id
             WHERE a.patient_id = :p
             ORDER BY a.admission_date DESC
             LIMIT 50"
        );
        $adm->execute(['p' => $patientId]);

        foreach ($adm->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $out[] = [
                'kind' => 'admission',
                'id' => (int) $r['id'],
                'when' => $r['admission_date'],
                'title' => 'Hospital stay',
                'facility' => null,
                'department' => $r['ward_name'],
                'doctor' => $r['attending_physician'],
                'reason' => $r['admitting_diagnosis'],
                'admission_number' => $r['admission_number'],
                'ward' => $r['ward_name'],
                'bed' => $r['bed_number'],
                'left_at' => $r['discharge_date'],
                'status' => $r['status'],
                'outcome' => $r['discharge_disposition'],
                // Only a finalised, signed summary is ever offered to the patient.
                'has_summary' => $r['summary_id'] !== null,
            ];
        }

        usort($out, static fn($a, $b) => strcmp((string) $b['when'], (string) $a['when']));

        return array_slice($out, 0, 150);
    }

    // ------------------------------------------------------------------
    // After-visit summary
    // ------------------------------------------------------------------

    /**
     * Everything the patient should take home from one clinic visit. Returns null when
     * the encounter is not theirs, so the controller can answer "not available" without
     * telling them whether it exists.
     */
    public static function avs(int $patientId, int $encounterId): ?array
    {
        $db = Database::connection();

        $stmt = $db->prepare(
            "SELECT e.id, e.patient_id, e.date_of_service, e.reason_for_visit, f.name AS facility, vc.name AS visit_category,
                    vt.type AS visit_type, d.name AS department, " . self::PROVIDER_NAME . " AS doctor,
                    dd.name AS discharge_disposition
             FROM encounters e
             LEFT JOIN facilities f ON f.id = e.facility_id
             LEFT JOIN visit_categories vc ON vc.id = e.visit_category_id
             LEFT JOIN visit_types vt ON vt.id = e.visit_type_id
             LEFT JOIN providers pr ON pr.id = e.encounter_provider_id
             LEFT JOIN employees pe ON pe.id = pr.employee_id
             LEFT JOIN departments d ON d.id = pe.department_id
             LEFT JOIN discharge_dispositions dd ON dd.id = e.discharge_disposition_id
             WHERE e.id = :e AND e.patient_id = :p AND e.deleted_at IS NULL"
        );
        $stmt->execute(['e' => $encounterId, 'p' => $patientId]);
        $enc = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$enc) {
            return null;
        }

        // date_of_service is a DATETIME while a prescription's begin_date is a DATE, so the
        // day alone is what the two can be compared on.
        $date = substr((string) $enc['date_of_service'], 0, 10);

        $diagnoses = $db->prepare(
            "SELECT code, description FROM encounter_diagnoses
             WHERE encounter_id = :e AND deleted_at IS NULL ORDER BY sequence, id"
        );
        $diagnoses->execute(['e' => $encounterId]);

        $instructions = $db->prepare(
            "SELECT instructions, item_date FROM encounter_clinical_instruction_items
             WHERE encounter_id = :e AND deleted_at IS NULL AND instructions IS NOT NULL AND instructions <> ''
             ORDER BY id"
        );
        $instructions->execute(['e' => $encounterId]);

        // The plan is what the patient is told to do; the assessment is the doctor's
        // reasoning. Subjective and objective notes are clinical shorthand and are left out.
        $soap = $db->prepare(
            "SELECT assessment, plan FROM encounter_soap_notes
             WHERE encounter_id = :e AND deleted_at IS NULL ORDER BY id DESC LIMIT 1"
        );
        $soap->execute(['e' => $encounterId]);
        $note = $soap->fetch(PDO::FETCH_ASSOC) ?: [];

        $vitals = $db->prepare(
            "SELECT weight, height, bmi, bp_systolic, bp_diastolic, pulse, respiration, temperature, temp_location, oxygen_saturation
             FROM encounter_vitals WHERE encounter_id = :e ORDER BY id DESC LIMIT 1"
        );
        $vitals->execute(['e' => $encounterId]);

        $plan = $db->prepare(
            "SELECT code_text, description, item_date, target_date, status
             FROM encounter_care_plan_items
             WHERE encounter_id = :e AND deleted_at IS NULL ORDER BY id"
        );
        $plan->execute(['e' => $encounterId]);

        return [
            'encounter_id' => (int) $enc['id'],
            'date' => $date,
            'title' => $enc['visit_category'] ?: 'Clinic visit',
            'visit_type' => $enc['visit_type'],
            'facility' => $enc['facility'],
            'department' => $enc['department'],
            'doctor' => $enc['doctor'],
            'reason' => $enc['reason_for_visit'],
            'sent_home_as' => $enc['discharge_disposition'],
            'diagnoses' => $diagnoses->fetchAll(PDO::FETCH_ASSOC),
            'assessment' => self::blank($note['assessment'] ?? null),
            'plan' => self::blank($note['plan'] ?? null),
            'instructions' => array_column($instructions->fetchAll(PDO::FETCH_ASSOC), 'instructions'),
            'vitals' => self::vitalsOut($vitals->fetch(PDO::FETCH_ASSOC) ?: []),
            'medicines' => self::medicines($db, $patientId, $date),
            'care_plan' => $plan->fetchAll(PDO::FETCH_ASSOC),
            'follow_up' => self::followUp($db, $patientId, $date),
            'care_team' => self::careTeam($db, $patientId),
        ];
    }

    /**
     * Medicines started or stopped around this visit.
     *
     * patient_prescriptions carries no encounter id, so this matches on the date: a
     * prescription beginning on the day of the visit was started at it, and one ending
     * that day was stopped at it. Anything the patient was already taking is on the
     * Medications screen, not here.
     */
    private static function medicines(PDO $db, int $patientId, string $date): array
    {
        $stmt = $db->prepare(
            "SELECT title, dosage, route, frequency, quantity, directions, begin_date, end_date
             FROM patient_prescriptions
             WHERE patient_id = :p AND deleted_at IS NULL AND (begin_date = :d1 OR end_date = :d2)
             ORDER BY begin_date = :d3 DESC, title"
        );
        $stmt->execute(['p' => $patientId, 'd1' => $date, 'd2' => $date, 'd3' => $date]);

        return array_map(static fn(array $r) => [
            'name' => $r['title'],
            'dosage' => $r['dosage'],
            'route' => $r['route'],
            'frequency' => $r['frequency'],
            'directions' => $r['directions'],
            'change' => ((string) $r['begin_date'] === $date) ? 'started' : 'stopped',
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /** The next appointment booked after this visit, which is what "follow-up" means to a patient. */
    private static function followUp(PDO $db, int $patientId, string $date): ?array
    {
        $stmt = $db->prepare(
            "SELECT a.appointment_date, a.appointment_time, a.reason, f.name AS facility,
                    " . self::PROVIDER_NAME . " AS doctor
             FROM appointments a
             LEFT JOIN facilities f ON f.id = a.facility_id
             LEFT JOIN providers pr ON pr.id = a.provider_id
             LEFT JOIN employees pe ON pe.id = pr.employee_id
             WHERE a.patient_id = :p AND a.deleted_at IS NULL AND a.is_provider_block = 0
               AND a.appointment_date > :d
               AND (a.status IS NULL OR a.status NOT IN ('cancelled', 'no_show', 'deleted'))
             ORDER BY a.appointment_date, a.appointment_time
             LIMIT 1"
        );
        $stmt->execute(['p' => $patientId, 'd' => $date]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /** The patient's active care team, in plain roles. */
    private static function careTeam(PDO $db, int $patientId): array
    {
        $stmt = $db->prepare(
            "SELECT m.member_type, m.note, m.status,
                    COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''),
                             NULLIF(TRIM(CONCAT(COALESCE(rp.first_name, ''), ' ', COALESCE(rp.last_name, ''))), '')) AS name,
                    r.name AS role
             FROM care_teams t
             JOIN care_team_members m ON m.care_team_id = t.id
             LEFT JOIN users u ON u.id = m.user_id
             LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
             LEFT JOIN related_persons rp ON rp.id = m.related_person_id
             LEFT JOIN roles r ON r.id = m.role_id
             WHERE t.patient_id = :p AND (t.status IS NULL OR t.status = 'active')
               AND (m.status IS NULL OR m.status = 'active')
             ORDER BY m.id
             LIMIT 20"
        );
        $stmt->execute(['p' => $patientId]);

        return array_values(array_filter(array_map(static fn(array $r) => [
            'name' => $r['name'],
            'role' => $r['role'] ?: $r['member_type'],
            'note' => $r['note'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC)), static fn($m) => $m['name'] !== null));
    }

    private static function blank(?string $v): ?string
    {
        return ($v === null || trim($v) === '') ? null : trim($v);
    }

    /** Only the vitals that were actually recorded, in words a patient reads. */
    private static function vitalsOut(array $v): array
    {
        if (!$v) {
            return [];
        }

        $out = [];
        $add = static function (string $label, $value, string $units = '') use (&$out) {
            if ($value !== null && (string) $value !== '' && (float) $value != 0.0) {
                $out[] = ['label' => $label, 'value' => trim((string) $value . ' ' . $units)];
            }
        };

        if (!empty($v['bp_systolic']) && !empty($v['bp_diastolic'])) {
            $out[] = ['label' => 'Blood pressure', 'value' => "{$v['bp_systolic']}/{$v['bp_diastolic']} mmHg"];
        }

        $add('Pulse', $v['pulse'] ?? null, 'beats a minute');
        $add('Breathing rate', $v['respiration'] ?? null, 'a minute');
        $add('Temperature', $v['temperature'] ?? null, '°C' . (!empty($v['temp_location']) ? " ({$v['temp_location']})" : ''));
        $add('Oxygen in the blood', $v['oxygen_saturation'] ?? null, '%');
        $add('Weight', $v['weight'] ?? null, 'kg');
        $add('Height', $v['height'] ?? null, 'cm');
        $add('Body mass index', $v['bmi'] ?? null);

        return $out;
    }

    // ------------------------------------------------------------------
    // Discharge summary
    // ------------------------------------------------------------------

    /**
     * The discharge summary of one hospital stay -- only when it is finalised and the
     * attending physician has signed it. A draft is never shown: the patient would
     * otherwise read a diagnosis that is still being written.
     */
    public static function dischargeSummary(int $patientId, int $admissionId): ?array
    {
        $db = Database::connection();

        $stmt = $db->prepare(
            "SELECT s.summary_number, s.admitting_diagnosis, s.discharge_diagnosis, s.hospital_course_summary,
                    s.significant_procedures, s.discharge_condition, s.discharge_disposition, s.discharge_medications,
                    s.diet_instructions, s.activity_restrictions, s.follow_up_instructions, s.attending_physician_name,
                    s.physician_license_number, s.signature_date,
                    a.admission_number, a.admission_date, a.discharge_date, w.ward_name, b.bed_number
             FROM inpatient_discharge_summaries s
             JOIN inpatient_admissions a ON a.id = s.admission_id
             LEFT JOIN hospital_wards w ON w.id = a.ward_id
             LEFT JOIN hospital_beds b ON b.id = a.bed_id
             WHERE s.admission_id = :adm AND s.patient_id = :p AND s.deleted_at IS NULL
               AND s.is_finalized = 1 AND s.signature_date IS NOT NULL
             ORDER BY s.id DESC
             LIMIT 1"
        );
        $stmt->execute(['adm' => $admissionId, 'p' => $patientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        return [
            'summary_number' => $row['summary_number'],
            'admission_number' => $row['admission_number'],
            'admitted_on' => $row['admission_date'],
            'discharged_on' => $row['discharge_date'],
            'ward' => $row['ward_name'],
            'bed' => $row['bed_number'],
            'admitting_diagnosis' => $row['admitting_diagnosis'],
            'discharge_diagnosis' => $row['discharge_diagnosis'],
            'hospital_course' => $row['hospital_course_summary'],
            'procedures' => self::blank($row['significant_procedures']),
            'condition' => $row['discharge_condition'],
            'sent_home_as' => $row['discharge_disposition'],
            'medicines' => self::blank($row['discharge_medications']),
            'diet' => self::blank($row['diet_instructions']),
            'activity' => self::blank($row['activity_restrictions']),
            'follow_up' => $row['follow_up_instructions'],
            'attending' => $row['attending_physician_name'],
            'license_no' => $row['physician_license_number'],
            'signed_at' => $row['signature_date'],
            'care_team' => self::careTeam($db, $patientId),
        ];
    }
}
