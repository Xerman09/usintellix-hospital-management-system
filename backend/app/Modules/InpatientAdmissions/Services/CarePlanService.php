<?php

namespace App\Modules\InpatientAdmissions\Services;

use App\Core\Database;
use App\Modules\InpatientAdmissions\Models\InpatientCarePlan;
use App\Modules\InpatientAdmissions\Models\InpatientAdmission;
use PDO;
use Exception;

class CarePlanService
{
    public const EVALUATION_STATES = [
        'In Progress' => [
            'label' => 'In Progress',
            'color' => '#0284c7',
            'bg' => '#e0f2fe',
            'border' => '#bae6fd',
            'icon' => '🔵',
            'description' => 'Interventions actively underway; awaiting end-of-shift outcome evaluation.'
        ],
        'Goal Met' => [
            'label' => 'Goal Met',
            'color' => '#16a34a',
            'bg' => '#dcfce7',
            'border' => '#bbf7d0',
            'icon' => '🟢',
            'description' => 'Patient achieved target SMART outcome criteria within the designated timeframe.'
        ],
        'Partially Met' => [
            'label' => 'Partially Met',
            'color' => '#ca8a04',
            'bg' => '#fef9c3',
            'border' => '#fde047',
            'icon' => '🟡',
            'description' => 'Patient showing measurable progress toward goal; continue current nursing interventions.'
        ],
        'Unmet/Revised' => [
            'label' => 'Unmet/Revised',
            'color' => '#dc2626',
            'bg' => '#fee2e2',
            'border' => '#fecaca',
            'icon' => '🔴',
            'description' => 'Goal not achieved or clinical status changed; nursing interventions and timeframe revised.'
        ],
    ];

    public const PRIORITY_LEVELS = [
        'High / Acute',
        'Medium / Standard',
        'Low / Maintenance',
    ];

    public const SHIFTS = [
        'Day Shift (07:00-15:00)',
        'Evening Shift (15:00-23:00)',
        'Night Shift (23:00-07:00)',
    ];

    public const NANDA_TEMPLATES = [
        [
            'code' => '00132',
            'domain' => 'Domain 12: Comfort',
            'diagnosis' => 'Acute Pain',
            'priority' => 'High / Acute',
            'related_to' => 'Surgical incision, tissue trauma, or acute inflammatory process',
            'as_evidenced_by' => 'Patient self-report of pain >= 5/10 on NRS, facial grimacing, guarding behavior, elevated HR/BP',
            'measurable_goals' => 'Patient will report satisfactory pain control (NRS <= 3/10) within 1 hour of analgesic administration and demonstrate relaxed body posture throughout the 8-hour shift.',
            'nursing_interventions' => "1. Assess pain intensity (0-10 NRS), location, quality, and radiation every 2-4 hours and 30-60 mins post-intervention.\n2. Administer prescribed analgesics on schedule or PRN before pain becomes severe.\n3. Implement non-pharmacological comfort measures (repositioning, splinting incision, ice/heat pack, quiet environment).\n4. Monitor vital signs and sedation score prior to and following opioid administration.",
            'rationale' => 'Multimodal pain management and timely reassessment prevent central sensitization, reduce sympathetic stress response, and facilitate early mobilization.'
        ],
        [
            'code' => '00032',
            'domain' => 'Domain 4: Activity/Rest',
            'diagnosis' => 'Ineffective Breathing Pattern',
            'priority' => 'High / Acute',
            'related_to' => 'Alveolar hypoventilation, pain on inspiration, respiratory muscle fatigue, or airway inflammation',
            'as_evidenced_by' => 'Tachypnea (RR > 22/min), SpO2 < 92% on room air, use of accessory muscles, dyspnea on exertion',
            'measurable_goals' => 'Patient will maintain eupnea (RR 12-20/min) and SpO2 >= 95% (or >= 90% in COPD) with clear bilateral breath sounds throughout the shift.',
            'nursing_interventions' => "1. Auscultate lung fields bilaterally every 4 hours and PRN; monitor continuous pulse oximetry and respiratory rate.\n2. Position patient in High-Fowler's or Semi-Fowler's (30-45 degrees) to maximize diaphragmatic excursion.\n3. Coach patient on incentive spirometry (10 breaths every hour while awake) and splinted cough/deep breathing.\n4. Administer supplemental oxygen and bronchodilators/nebulizers as ordered.",
            'rationale' => 'Upright positioning and sustained maximal inspiration prevent basilar atelectasis, optimize ventilation-perfusion matching, and promote mucociliary clearance.'
        ],
        [
            'code' => '00004',
            'domain' => 'Domain 11: Safety/Protection',
            'diagnosis' => 'Risk for Infection',
            'priority' => 'Medium / Standard',
            'related_to' => 'Invasive lines (IV/central line, urinary catheter), surgical wound, or immunocompromised status',
            'as_evidenced_by' => 'Risk diagnosis — presence of invasive medical devices and breach of primary skin barrier',
            'measurable_goals' => 'Patient will remain free of healthcare-associated infection as evidenced by normothermia (Temp < 38.0°C), normalizing WBC count, and clean/dry/intact wound or catheter sites during hospitalization.',
            'nursing_interventions' => "1. Perform strict hand hygiene and aseptic technique during all IV access, dressing changes, and catheter care.\n2. Assess surgical incisions and IV insertion sites every shift for erythema, warmth, induration, or purulent drainage (phlebitis score).\n3. Monitor temperature every 4 hours and review daily WBC and inflammatory markers.\n4. Evaluate daily necessity of indwelling urinary catheters and invasive lines with medical team for early removal.",
            'rationale' => 'Strict aseptic bundle adherence and early device removal minimize microbial colonization and bloodstream/surgical site infection risk.'
        ],
        [
            'code' => '00155',
            'domain' => 'Domain 11: Safety/Protection',
            'diagnosis' => 'Risk for Falls',
            'priority' => 'High / Acute',
            'related_to' => 'Post-operative weakness, orthostatic hypotension, sedative/opioid medications, or unfamiliar hospital environment',
            'as_evidenced_by' => 'Morse Fall Scale score >= 45, unsteady gait, history of dizziness, or tethered IV poles/drains',
            'measurable_goals' => 'Patient will sustain zero falls during the shift and consistently use the nurse call bell for assistance before transferring or ambulating.',
            'nursing_interventions' => "1. Complete Morse Fall Scale assessment each shift; apply yellow fall-risk wristband and door magnet.\n2. Keep bed in lowest locked position with 2 upper side rails up, call light and personal items within easy reach, and non-skid footwear applied.\n3. Provide 1-person or standby assist during all bedside transfers and bathroom visits; check orthostatic vitals if dizzy.\n4. Conduct purposeful hourly rounding (4 Ps: Pain, Position, Potty, Possessions).",
            'rationale' => 'Proactive environmental modification and hourly rounding address patient elimination and mobility needs before unsafe unassisted ambulation occurs.'
        ],
        [
            'code' => '00085',
            'domain' => 'Domain 4: Activity/Rest',
            'diagnosis' => 'Impaired Physical Mobility',
            'priority' => 'Medium / Standard',
            'related_to' => 'Musculoskeletal impairment, surgical restrictions, deconditioning, or pain',
            'as_evidenced_by' => 'Limited range of motion, slow/guarded movement, requirement for assistive device or staff assistance to transfer',
            'measurable_goals' => 'Patient will safely transfer from bed to chair and ambulate prescribed distance with assistive device and minimal assistance at least 2-3 times this shift.',
            'nursing_interventions' => "1. Assess baseline functional mobility, muscle strength, and weight-bearing status prior to mobilization.\n2. Pre-medicate with prescribed analgesic 30 minutes prior to planned physical therapy or ambulation sessions.\n3. Perform active or passive range-of-motion (ROM) exercises every 4 hours and encourage ankle pumps in bed.\n4. Collaborate with Physical Therapy and ensure DVT prophylaxis (SCDs / pharmacological prophylaxis) is active.",
            'rationale' => 'Early progressive mobilization preserves muscle mass, prevents venous thromboembolism, stimulates gastrointestinal motility, and reduces hospital length of stay.'
        ],
        [
            'code' => '00046',
            'domain' => 'Domain 11: Safety/Protection',
            'diagnosis' => 'Impaired Skin Integrity / Risk for Pressure Injury',
            'priority' => 'Medium / Standard',
            'related_to' => 'Prolonged immobility, shearing forces, moisture exposure, or altered tissue perfusion/nutrition',
            'as_evidenced_by' => 'Braden Scale score <= 18, non-blanchable erythema over bony prominences, or existing stage I/II skin breakdown',
            'measurable_goals' => 'Patient will maintain intact skin over bony prominences (or demonstrate progressive granulation of existing wound) with zero new hospital-acquired pressure injuries this shift.',
            'nursing_interventions' => "1. Perform comprehensive skin inspection and Braden Scale assessment every shift, focusing on sacrum, heels, trochanters, and medical device sites.\n2. Turn and reposition bedbound patient at least every 2 hours using lift sheet to prevent friction/shear; offload heels with pillows.\n3. Keep skin clean and dry; apply moisture barrier cream after incontinence episodes and utilize pressure-redistributing mattress.\n4. Collaborate with Wound Care Nurse and Dietitian to optimize protein and caloric intake.",
            'rationale' => 'Scheduled offloading relieves capillary closing pressure over bony prominences, restoring microcirculation and preventing ischemic tissue necrosis.'
        ],
        [
            'code' => '00027',
            'domain' => 'Domain 2: Nutrition',
            'diagnosis' => 'Deficient Fluid Volume',
            'priority' => 'High / Acute',
            'related_to' => 'Active gastrointestinal losses, fever/diaphoresis, inadequate oral intake, or third-spacing',
            'as_evidenced_by' => 'Dry mucous membranes, decreased urine output (< 0.5 mL/kg/hr), tachycardia, concentrated urine, or hypotension',
            'measurable_goals' => 'Patient will achieve euvolemia as evidenced by urine output >= 30 mL/hr (0.5 mL/kg/hr), moist mucous membranes, and stable blood pressure/heart rate during the shift.',
            'nursing_interventions' => "1. Strictly monitor and record hourly Intake and Output (I&O) and daily morning weight.\n2. Administer prescribed IV isotonic crystalloids and encourage oral fluid hydration per diet order.\n3. Monitor serum electrolytes, BUN/Creatinine, hematocrit, and urine specific gravity.\n4. Assess skin turgor, mucous membranes, capillary refill, and orthostatic vital signs every 4 hours.",
            'rationale' => 'Close hemodynamic and I&O surveillance guides targeted fluid resuscitation while preventing both hypovolemic renal injury and fluid overload.'
        ],
    ];

    public function options(): array
    {
        return [
            'evaluation_states' => self::EVALUATION_STATES,
            'priority_levels' => self::PRIORITY_LEVELS,
            'shifts' => self::SHIFTS,
            'nanda_templates' => self::NANDA_TEMPLATES,
        ];
    }

    public function listByAdmission(int $admissionId, ?string $evalStatus = null): array
    {
        $db = Database::connection();
        $params = ['admission_id' => $admissionId];

        $where = "c.admission_id = :admission_id AND c.deleted_at IS NULL";
        if (!empty($evalStatus) && $evalStatus !== 'all' && array_key_exists($evalStatus, self::EVALUATION_STATES)) {
            $where .= " AND c.evaluation_status = :eval_status";
            $params['eval_status'] = $evalStatus;
        }

        $sql = "SELECT c.*,
                       a.admission_number, a.patient_name, a.patient_mrn, a.patient_age, a.gender,
                       a.admitting_diagnosis, a.attending_physician,
                       w.ward_name, b.bed_number
                FROM inpatient_care_plans c
                JOIN inpatient_admissions a ON a.id = c.admission_id
                LEFT JOIN hospital_wards w ON w.id = a.ward_id
                LEFT JOIN hospital_beds b ON b.id = a.bed_id
                WHERE {$where}
                ORDER BY
                    CASE c.priority_level
                        WHEN 'High / Acute' THEN 1
                        WHEN 'Medium / Standard' THEN 2
                        ELSE 3
                    END ASC,
                    c.plan_datetime DESC,
                    c.id DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function get(int $id): ?array
    {
        $db = Database::connection();
        $sql = "SELECT c.*,
                       a.admission_number, a.patient_name, a.patient_mrn, a.patient_age, a.gender,
                       a.admitting_diagnosis, a.attending_physician,
                       w.ward_name, b.bed_number
                FROM inpatient_care_plans c
                JOIN inpatient_admissions a ON a.id = c.admission_id
                LEFT JOIN hospital_wards w ON w.id = a.ward_id
                LEFT JOIN hospital_beds b ON b.id = a.bed_id
                WHERE c.id = :id AND c.deleted_at IS NULL
                LIMIT 1";

        $stmt = $db->prepare($sql);
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function store(array $data, ?int $userId, array $actor = []): array
    {
        $admissionId = (int) ($data['admission_id'] ?? 0);
        if ($admissionId <= 0) {
            throw new Exception('Admission ID is required.');
        }

        $admission = (new InpatientAdmission())->where('id', $admissionId)->first();
        if (!$admission) {
            throw new Exception('Inpatient admission record not found.');
        }

        $patientId = (int) ($admission['patient_id'] ?? ($data['patient_id'] ?? 0));
        if ($patientId <= 0) {
            $patientId = $admissionId;
        }

        $nursingDiagnosis = trim((string) ($data['nursing_diagnosis'] ?? ''));
        $measurableGoals = trim((string) ($data['measurable_goals'] ?? ''));
        $nursingInterventions = trim((string) ($data['nursing_interventions'] ?? ''));

        if ($nursingDiagnosis === '') {
            throw new Exception('NANDA Nursing Diagnosis is required.');
        }
        if ($measurableGoals === '') {
            throw new Exception('Measurable Patient Goals (NOC / SMART outcomes) are required.');
        }
        if ($nursingInterventions === '') {
            throw new Exception('Nursing Interventions (NIC) are required.');
        }

        $priority = $data['priority_level'] ?? 'Medium / Standard';
        if (!in_array($priority, self::PRIORITY_LEVELS, true)) {
            $priority = 'Medium / Standard';
        }

        $shift = trim((string) ($data['shift'] ?? 'Day Shift (07:00-15:00)'));
        if (!in_array($shift, self::SHIFTS, true)) {
            $shift = 'Day Shift (07:00-15:00)';
        }

        $evalStatus = $data['evaluation_status'] ?? 'In Progress';
        if (!array_key_exists($evalStatus, self::EVALUATION_STATES)) {
            $evalStatus = 'In Progress';
        }

        $planDateTime = !empty($data['plan_datetime'])
            ? date('Y-m-d H:i:s', strtotime($data['plan_datetime']))
            : date('Y-m-d H:i:s');

        $nurseName = trim((string) ($data['nurse_name'] ?? ''));
        $nurseCredentials = trim((string) ($data['nurse_credentials'] ?? 'RN, BSN'));
        $nurseId = !empty($data['nurse_id']) ? (int) $data['nurse_id'] : null;

        if ($nurseName === '') {
            if (!empty($actor['first_name']) || !empty($actor['last_name'])) {
                $nurseName = trim(($actor['first_name'] ?? '') . ' ' . ($actor['last_name'] ?? ''));
            } else {
                $nurseName = $admission['primary_nurse'] ?: 'Registered Nurse';
            }
        }
        if (!$nurseId && !empty($actor['id'])) {
            $nurseId = (int) $actor['id'];
        }

        $shiftEvalNotes = !empty($data['shift_evaluation_notes']) ? trim((string) $data['shift_evaluation_notes']) : null;
        $evaluatedBy = null;
        $evaluatedByName = null;
        $evaluatedAt = null;

        if ($evalStatus !== 'In Progress' || $shiftEvalNotes !== null) {
            $evaluatedBy = $userId;
            $evaluatedByName = $nurseName;
            $evaluatedAt = date('Y-m-d H:i:s');
        }

        $db = Database::connection();
        $carePlanNumber = $this->generateCarePlanNumber($db);

        $sql = "INSERT INTO inpatient_care_plans (
            care_plan_number, admission_id, patient_id, plan_datetime, shift,
            nurse_id, nurse_name, nurse_credentials, priority_level,
            nanda_code, nanda_domain, nursing_diagnosis, related_to, as_evidenced_by,
            measurable_goals, nursing_interventions, rationale,
            evaluation_status, shift_evaluation_notes, evaluated_by, evaluated_by_name, evaluated_at,
            created_by, created_at
        ) VALUES (
            :care_plan_number, :admission_id, :patient_id, :plan_datetime, :shift,
            :nurse_id, :nurse_name, :nurse_credentials, :priority_level,
            :nanda_code, :nanda_domain, :nursing_diagnosis, :related_to, :as_evidenced_by,
            :measurable_goals, :nursing_interventions, :rationale,
            :evaluation_status, :shift_evaluation_notes, :evaluated_by, :evaluated_by_name, :evaluated_at,
            :created_by, NOW()
        )";

        $stmt = $db->prepare($sql);
        $stmt->execute([
            'care_plan_number' => $carePlanNumber,
            'admission_id' => $admissionId,
            'patient_id' => $patientId,
            'plan_datetime' => $planDateTime,
            'shift' => $shift,
            'nurse_id' => $nurseId,
            'nurse_name' => $nurseName,
            'nurse_credentials' => $nurseCredentials ?: 'RN',
            'priority_level' => $priority,
            'nanda_code' => !empty($data['nanda_code']) ? trim((string) $data['nanda_code']) : null,
            'nanda_domain' => !empty($data['nanda_domain']) ? trim((string) $data['nanda_domain']) : null,
            'nursing_diagnosis' => $nursingDiagnosis,
            'related_to' => !empty($data['related_to']) ? trim((string) $data['related_to']) : null,
            'as_evidenced_by' => !empty($data['as_evidenced_by']) ? trim((string) $data['as_evidenced_by']) : null,
            'measurable_goals' => $measurableGoals,
            'nursing_interventions' => $nursingInterventions,
            'rationale' => !empty($data['rationale']) ? trim((string) $data['rationale']) : null,
            'evaluation_status' => $evalStatus,
            'shift_evaluation_notes' => $shiftEvalNotes,
            'evaluated_by' => $evaluatedBy,
            'evaluated_by_name' => $evaluatedByName,
            'evaluated_at' => $evaluatedAt,
            'created_by' => $userId,
        ]);

        $planId = (int) $db->lastInsertId();

        return [
            'id' => $planId,
            'care_plan_number' => $carePlanNumber,
            'admission_id' => $admissionId,
            'nursing_diagnosis' => $nursingDiagnosis,
            'evaluation_status' => $evalStatus,
        ];
    }

    public function update(int $id, array $data, ?int $userId, array $actor = []): bool
    {
        $existing = $this->get($id);
        if (!$existing) {
            throw new Exception('Nursing care plan record not found.');
        }

        $nursingDiagnosis = trim((string) ($data['nursing_diagnosis'] ?? $existing['nursing_diagnosis']));
        $measurableGoals = trim((string) ($data['measurable_goals'] ?? $existing['measurable_goals']));
        $nursingInterventions = trim((string) ($data['nursing_interventions'] ?? $existing['nursing_interventions']));

        if ($nursingDiagnosis === '' || $measurableGoals === '' || $nursingInterventions === '') {
            throw new Exception('Nursing diagnosis, measurable goals, and interventions are required.');
        }

        $priority = $data['priority_level'] ?? $existing['priority_level'];
        if (!in_array($priority, self::PRIORITY_LEVELS, true)) {
            $priority = $existing['priority_level'];
        }

        $shift = $data['shift'] ?? $existing['shift'];
        if (!in_array($shift, self::SHIFTS, true)) {
            $shift = $existing['shift'];
        }

        $evalStatus = $data['evaluation_status'] ?? $existing['evaluation_status'];
        if (!array_key_exists($evalStatus, self::EVALUATION_STATES)) {
            $evalStatus = $existing['evaluation_status'];
        }

        $planDateTime = !empty($data['plan_datetime'])
            ? date('Y-m-d H:i:s', strtotime($data['plan_datetime']))
            : $existing['plan_datetime'];

        $actorName = trim(($actor['first_name'] ?? '') . ' ' . ($actor['last_name'] ?? ''));
        if ($actorName === '') {
            $actorName = !empty($data['nurse_name']) ? trim((string) $data['nurse_name']) : $existing['nurse_name'];
        }

        $evaluatedBy = $existing['evaluated_by'];
        $evaluatedByName = $existing['evaluated_by_name'];
        $evaluatedAt = $existing['evaluated_at'];

        if ($evalStatus !== $existing['evaluation_status'] || isset($data['shift_evaluation_notes'])) {
            $evaluatedBy = $userId;
            $evaluatedByName = $actorName;
            $evaluatedAt = date('Y-m-d H:i:s');
        }

        $db = Database::connection();
        $sql = "UPDATE inpatient_care_plans SET
            plan_datetime = :plan_datetime,
            shift = :shift,
            nurse_name = :nurse_name,
            nurse_credentials = :nurse_credentials,
            priority_level = :priority_level,
            nanda_code = :nanda_code,
            nanda_domain = :nanda_domain,
            nursing_diagnosis = :nursing_diagnosis,
            related_to = :related_to,
            as_evidenced_by = :as_evidenced_by,
            measurable_goals = :measurable_goals,
            nursing_interventions = :nursing_interventions,
            rationale = :rationale,
            evaluation_status = :evaluation_status,
            shift_evaluation_notes = :shift_evaluation_notes,
            evaluated_by = :evaluated_by,
            evaluated_by_name = :evaluated_by_name,
            evaluated_at = :evaluated_at,
            updated_by = :updated_by,
            updated_at = NOW()
            WHERE id = :id";

        $stmt = $db->prepare($sql);
        return $stmt->execute([
            'plan_datetime' => $planDateTime,
            'shift' => $shift,
            'nurse_name' => !empty($data['nurse_name']) ? trim((string) $data['nurse_name']) : $existing['nurse_name'],
            'nurse_credentials' => !empty($data['nurse_credentials']) ? trim((string) $data['nurse_credentials']) : $existing['nurse_credentials'],
            'priority_level' => $priority,
            'nanda_code' => isset($data['nanda_code']) ? trim((string) $data['nanda_code']) : $existing['nanda_code'],
            'nanda_domain' => isset($data['nanda_domain']) ? trim((string) $data['nanda_domain']) : $existing['nanda_domain'],
            'nursing_diagnosis' => $nursingDiagnosis,
            'related_to' => isset($data['related_to']) ? trim((string) $data['related_to']) : $existing['related_to'],
            'as_evidenced_by' => isset($data['as_evidenced_by']) ? trim((string) $data['as_evidenced_by']) : $existing['as_evidenced_by'],
            'measurable_goals' => $measurableGoals,
            'nursing_interventions' => $nursingInterventions,
            'rationale' => isset($data['rationale']) ? trim((string) $data['rationale']) : $existing['rationale'],
            'evaluation_status' => $evalStatus,
            'shift_evaluation_notes' => isset($data['shift_evaluation_notes']) ? trim((string) $data['shift_evaluation_notes']) : $existing['shift_evaluation_notes'],
            'evaluated_by' => $evaluatedBy,
            'evaluated_by_name' => $evaluatedByName,
            'evaluated_at' => $evaluatedAt,
            'updated_by' => $userId,
            'id' => $id,
        ]);
    }

    /**
     * Quick shift evaluation update (Goal Met, Partially Met, Unmet/Revised, In Progress)
     */
    public function evaluate(int $id, array $data, ?int $userId, array $actor = []): bool
    {
        $existing = $this->get($id);
        if (!$existing) {
            throw new Exception('Nursing care plan record not found.');
        }

        $evalStatus = trim((string) ($data['evaluation_status'] ?? ''));
        if (!array_key_exists($evalStatus, self::EVALUATION_STATES)) {
            throw new Exception('Valid evaluation status (Goal Met, Partially Met, Unmet/Revised, In Progress) is required.');
        }

        $notes = isset($data['shift_evaluation_notes'])
            ? trim((string) $data['shift_evaluation_notes'])
            : $existing['shift_evaluation_notes'];

        $evaluatorName = trim((string) ($data['evaluated_by_name'] ?? ''));
        if ($evaluatorName === '') {
            $evaluatorName = trim(($actor['first_name'] ?? '') . ' ' . ($actor['last_name'] ?? ''));
        }
        if ($evaluatorName === '') {
            $evaluatorName = $actor['username'] ?? $existing['nurse_name'] ?? 'Shift RN';
        }

        $db = Database::connection();
        $stmt = $db->prepare("UPDATE inpatient_care_plans SET
            evaluation_status = :status,
            shift_evaluation_notes = :notes,
            evaluated_by = :uid,
            evaluated_by_name = :uname,
            evaluated_at = NOW(),
            updated_by = :uid,
            updated_at = NOW()
            WHERE id = :id");

        return $stmt->execute([
            'status' => $evalStatus,
            'notes' => $notes,
            'uid' => $userId,
            'uname' => $evaluatorName,
            'id' => $id,
        ]);
    }

    public function delete(int $id, ?int $userId): bool
    {
        $existing = $this->get($id);
        if (!$existing) {
            throw new Exception('Nursing care plan record not found.');
        }

        $db = Database::connection();
        $stmt = $db->prepare("UPDATE inpatient_care_plans SET deleted_at = NOW(), updated_by = :u WHERE id = :id");
        return $stmt->execute(['u' => $userId, 'id' => $id]);
    }

    private function generateCarePlanNumber(PDO $db): string
    {
        $prefix = 'NCP-' . date('ymd') . '-';
        $stmt = $db->prepare("SELECT COUNT(*) FROM inpatient_care_plans WHERE care_plan_number LIKE :p");
        $stmt->execute(['p' => $prefix . '%']);
        $seq = (int) $stmt->fetchColumn() + 1;
        return sprintf('%s%03d', $prefix, $seq);
    }
}
