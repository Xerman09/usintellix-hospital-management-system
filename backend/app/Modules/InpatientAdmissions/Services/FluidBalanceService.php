<?php

namespace App\Modules\InpatientAdmissions\Services;

use App\Core\Database;
use App\Modules\InpatientAdmissions\Models\InpatientFluidBalance;
use App\Modules\InpatientAdmissions\Models\InpatientAdmission;
use PDO;
use Exception;

class FluidBalanceService
{
    public const ALERT_LEVELS = [
        'Normal / Euvolemic' => [
            'label' => 'Normal / Euvolemic',
            'icon' => '🟢',
            'color' => '#16a34a',
            'bg' => '#dcfce7',
            'border' => '#bbf7d0',
            'message' => '24-hour fluid intake and output are balanced within physiological target range.'
        ],
        'Fluid Overload Warning' => [
            'label' => 'Fluid Overload Warning',
            'icon' => '🟠',
            'color' => '#ea580c',
            'bg' => '#ffedd5',
            'border' => '#fed7aa',
            'message' => 'Positive 24h net balance (>= +1,000 mL). Monitor lung bases for crackles, peripheral edema, and SpO2.'
        ],
        'Critical Fluid Overload' => [
            'label' => 'Critical Fluid Overload',
            'icon' => '🔴',
            'color' => '#dc2626',
            'bg' => '#fee2e2',
            'border' => '#fecaca',
            'message' => 'CRITICAL POSITIVE BALANCE (>= +2,000 mL / 24h). High risk of pulmonary edema / cardiac decompensation. Notify attending physician and review IV infusion rates / diuretic orders.'
        ],
        'Negative Balance / Dehydration Warning' => [
            'label' => 'Negative Balance / Dehydration Warning',
            'icon' => '🟡',
            'color' => '#ca8a04',
            'bg' => '#fef9c3',
            'border' => '#fde047',
            'message' => 'Negative 24h net balance (<= -800 mL). Assess mucous membranes, orthostatic blood pressure, and hydration status.'
        ],
        'Critical Negative Balance / Oliguria' => [
            'label' => 'Critical Negative Balance / Oliguria',
            'icon' => '🔴',
            'color' => '#dc2626',
            'bg' => '#fee2e2',
            'border' => '#fecaca',
            'message' => 'CRITICAL NEGATIVE BALANCE (<= -1,500 mL / 24h) or severe oliguria. High risk of hypovolemic shock / acute kidney injury (AKI). Notify physician immediately.'
        ],
    ];

    public const SHIFTS = [
        'Day Shift (07:00-15:00)',
        'Evening Shift (15:00-23:00)',
        'Night Shift (23:00-07:00)',
    ];

    public static function determineAlertLevel(int $net24hMl, int $urine24hMl = 0, int $entriesCount24h = 0): string
    {
        if ($net24hMl >= 2000) {
            return 'Critical Fluid Overload';
        }
        if ($net24hMl <= -1500 || ($entriesCount24h >= 3 && $urine24hMl > 0 && $urine24hMl < 400)) {
            return 'Critical Negative Balance / Oliguria';
        }
        if ($net24hMl >= 1000) {
            return 'Fluid Overload Warning';
        }
        if ($net24hMl <= -800) {
            return 'Negative Balance / Dehydration Warning';
        }
        return 'Normal / Euvolemic';
    }

    public function listByAdmission(int $admissionId): array
    {
        $db = Database::connection();

        $sql = "SELECT f.*,
                       a.admission_number, a.patient_name, a.patient_mrn, a.patient_age, a.gender,
                       a.admitting_diagnosis, a.attending_physician,
                       w.ward_name, b.bed_number
                FROM inpatient_fluid_balance f
                JOIN inpatient_admissions a ON a.id = f.admission_id
                LEFT JOIN hospital_wards w ON w.id = a.ward_id
                LEFT JOIN hospital_beds b ON b.id = a.bed_id
                WHERE f.admission_id = :admission_id AND f.deleted_at IS NULL
                ORDER BY f.recorded_at DESC, f.id DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute(['admission_id' => $admissionId]);
        $entries = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $summary24h = $this->computeSummary($entries);

        return [
            'entries' => $entries,
            'summary_24h' => $summary24h,
            'alert_levels' => self::ALERT_LEVELS,
            'shifts' => self::SHIFTS,
        ];
    }

    public function computeSummary(array $entries): array
    {
        $cutoffTimestamp = time() - (24 * 3600);
        // If the latest entry is older than 24h from wall-clock now, anchor the 24h window to the latest recorded entry
        if (!empty($entries)) {
            $latestTime = strtotime($entries[0]['recorded_at'] ?? '');
            if ($latestTime && $latestTime < $cutoffTimestamp) {
                $cutoffTimestamp = $latestTime - (24 * 3600);
            }
        }

        $intakeOral = 0;
        $intakeIv = 0;
        $intakeBlood = 0;
        $intakeEnteral = 0;
        $intakeOther = 0;
        $intakeTotal24h = 0;

        $outputUrine = 0;
        $outputDrain = 0;
        $outputEmesis = 0;
        $outputNg = 0;
        $outputChestTube = 0;
        $outputStoolOther = 0;
        $outputTotal24h = 0;

        $cumulativeStayIntake = 0;
        $cumulativeStayOutput = 0;
        $entriesCount24h = 0;

        foreach ($entries as $row) {
            $rowIn = (int) ($row['intake_total_ml'] ?? 0);
            $rowOut = (int) ($row['output_total_ml'] ?? 0);
            $cumulativeStayIntake += $rowIn;
            $cumulativeStayOutput += $rowOut;

            $recTs = strtotime($row['recorded_at'] ?? '');
            if ($recTs >= $cutoffTimestamp) {
                $entriesCount24h++;
                $intakeOral += (int) ($row['intake_oral_ml'] ?? 0);
                $intakeIv += (int) ($row['intake_iv_ml'] ?? 0);
                $intakeBlood += (int) ($row['intake_blood_ml'] ?? 0);
                $intakeEnteral += (int) ($row['intake_enteral_ml'] ?? 0);
                $intakeOther += (int) ($row['intake_other_ml'] ?? 0);
                $intakeTotal24h += $rowIn;

                $outputUrine += (int) ($row['output_urine_ml'] ?? 0);
                $outputDrain += (int) ($row['output_drain_ml'] ?? 0);
                $outputEmesis += (int) ($row['output_emesis_ml'] ?? 0);
                $outputNg += (int) ($row['output_ng_ml'] ?? 0);
                $outputChestTube += (int) ($row['output_chest_tube_ml'] ?? 0);
                $outputStoolOther += (int) ($row['output_stool_other_ml'] ?? 0);
                $outputTotal24h += $rowOut;
            }
        }

        $net24h = $intakeTotal24h - $outputTotal24h;
        $cumulativeStayNet = $cumulativeStayIntake - $cumulativeStayOutput;

        $alertLevel = self::determineAlertLevel($net24h, $outputUrine, $entriesCount24h);
        $alertMeta = self::ALERT_LEVELS[$alertLevel] ?? self::ALERT_LEVELS['Normal / Euvolemic'];

        return [
            'entries_count_24h' => $entriesCount24h,
            'intake_24h' => [
                'oral_ml' => $intakeOral,
                'iv_ml' => $intakeIv,
                'blood_ml' => $intakeBlood,
                'enteral_ml' => $intakeEnteral,
                'other_ml' => $intakeOther,
                'total_ml' => $intakeTotal24h,
            ],
            'output_24h' => [
                'urine_ml' => $outputUrine,
                'drain_ml' => $outputDrain,
                'emesis_ml' => $outputEmesis,
                'ng_ml' => $outputNg,
                'chest_tube_ml' => $outputChestTube,
                'stool_other_ml' => $outputStoolOther,
                'total_ml' => $outputTotal24h,
            ],
            'net_balance_24h_ml' => $net24h,
            'cumulative_stay_net_ml' => $cumulativeStayNet,
            'alert_level' => $alertLevel,
            'alert_meta' => $alertMeta,
        ];
    }

    public function get(int $id): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare("SELECT * FROM inpatient_fluid_balance WHERE id = :id AND deleted_at IS NULL LIMIT 1");
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

        $intakeOral = max(0, (int) ($data['intake_oral_ml'] ?? 0));
        $intakeIv = max(0, (int) ($data['intake_iv_ml'] ?? 0));
        $intakeBlood = max(0, (int) ($data['intake_blood_ml'] ?? 0));
        $intakeEnteral = max(0, (int) ($data['intake_enteral_ml'] ?? 0));
        $intakeOther = max(0, (int) ($data['intake_other_ml'] ?? 0));
        $intakeTotal = $intakeOral + $intakeIv + $intakeBlood + $intakeEnteral + $intakeOther;

        $outputUrine = max(0, (int) ($data['output_urine_ml'] ?? 0));
        $outputDrain = max(0, (int) ($data['output_drain_ml'] ?? 0));
        $outputEmesis = max(0, (int) ($data['output_emesis_ml'] ?? 0));
        $outputNg = max(0, (int) ($data['output_ng_ml'] ?? 0));
        $outputChestTube = max(0, (int) ($data['output_chest_tube_ml'] ?? 0));
        $outputStoolOther = max(0, (int) ($data['output_stool_other_ml'] ?? 0));
        $outputTotal = $outputUrine + $outputDrain + $outputEmesis + $outputNg + $outputChestTube + $outputStoolOther;

        if ($intakeTotal === 0 && $outputTotal === 0) {
            throw new Exception('Please enter at least one fluid intake or output volume (mL) greater than 0.');
        }

        $entryNet = $intakeTotal - $outputTotal;

        $recordedAt = !empty($data['recorded_at'])
            ? date('Y-m-d H:i:s', strtotime($data['recorded_at']))
            : date('Y-m-d H:i:s');

        $shift = trim((string) ($data['shift'] ?? 'Day Shift (07:00-15:00)'));
        if (!in_array($shift, self::SHIFTS, true)) {
            $shift = 'Day Shift (07:00-15:00)';
        }

        $recordedByName = trim((string) ($data['recorded_by_name'] ?? ''));
        if ($recordedByName === '') {
            if (!empty($actor['first_name']) || !empty($actor['last_name'])) {
                $recordedByName = trim(($actor['first_name'] ?? '') . ' ' . ($actor['last_name'] ?? ''));
            } else {
                $recordedByName = $admission['primary_nurse'] ?: 'Shift RN';
            }
        }

        $db = Database::connection();
        $entryNumber = $this->generateEntryNumber($db);

        // Compute prior 24h net up to this timestamp
        $prior24hStmt = $db->prepare("
            SELECT COALESCE(SUM(intake_total_ml), 0) AS sum_in,
                   COALESCE(SUM(output_total_ml), 0) AS sum_out,
                   COALESCE(SUM(output_urine_ml), 0) AS sum_urine,
                   COUNT(*) AS cnt
            FROM inpatient_fluid_balance
            WHERE admission_id = :adm_id
              AND deleted_at IS NULL
              AND recorded_at >= DATE_SUB(:rec_at, INTERVAL 24 HOUR)
              AND recorded_at <= :rec_at2
        ");
        $prior24hStmt->execute([
            'adm_id' => $admissionId,
            'rec_at' => $recordedAt,
            'rec_at2' => $recordedAt,
        ]);
        $priorRow = $prior24hStmt->fetch(PDO::FETCH_ASSOC) ?: ['sum_in' => 0, 'sum_out' => 0, 'sum_urine' => 0, 'cnt' => 0];

        $running24hNet = ((int) $priorRow['sum_in'] + $intakeTotal) - ((int) $priorRow['sum_out'] + $outputTotal);
        $totalUrine24h = (int) $priorRow['sum_urine'] + $outputUrine;
        $totalCnt24h = (int) $priorRow['cnt'] + 1;
        $alertLevel = self::determineAlertLevel($running24hNet, $totalUrine24h, $totalCnt24h);

        $sql = "INSERT INTO inpatient_fluid_balance (
            entry_number, admission_id, patient_id, recorded_at, shift,
            intake_oral_ml, intake_iv_ml, intake_blood_ml, intake_enteral_ml, intake_other_ml, intake_total_ml, intake_details,
            output_urine_ml, output_drain_ml, output_emesis_ml, output_ng_ml, output_chest_tube_ml, output_stool_other_ml, output_total_ml, output_details,
            entry_net_ml, running_24h_net_ml, balance_alert_level, clinical_notes,
            recorded_by, recorded_by_name, created_by, created_at
        ) VALUES (
            :entry_number, :admission_id, :patient_id, :recorded_at, :shift,
            :in_oral, :in_iv, :in_blood, :in_enteral, :in_other, :in_total, :in_details,
            :out_urine, :out_drain, :out_emesis, :out_ng, :out_chest, :out_stool, :out_total, :out_details,
            :entry_net, :running_24h_net, :alert_level, :clinical_notes,
            :recorded_by, :recorded_by_name, :created_by, NOW()
        )";

        $stmt = $db->prepare($sql);
        $stmt->execute([
            'entry_number' => $entryNumber,
            'admission_id' => $admissionId,
            'patient_id' => $patientId,
            'recorded_at' => $recordedAt,
            'shift' => $shift,
            'in_oral' => $intakeOral,
            'in_iv' => $intakeIv,
            'in_blood' => $intakeBlood,
            'in_enteral' => $intakeEnteral,
            'in_other' => $intakeOther,
            'in_total' => $intakeTotal,
            'in_details' => !empty($data['intake_details']) ? trim((string) $data['intake_details']) : null,
            'out_urine' => $outputUrine,
            'out_drain' => $outputDrain,
            'out_emesis' => $outputEmesis,
            'out_ng' => $outputNg,
            'out_chest' => $outputChestTube,
            'out_stool' => $outputStoolOther,
            'out_total' => $outputTotal,
            'out_details' => !empty($data['output_details']) ? trim((string) $data['output_details']) : null,
            'entry_net' => $entryNet,
            'running_24h_net' => $running24hNet,
            'alert_level' => $alertLevel,
            'clinical_notes' => !empty($data['clinical_notes']) ? trim((string) $data['clinical_notes']) : null,
            'recorded_by' => $userId,
            'recorded_by_name' => $recordedByName,
            'created_by' => $userId,
        ]);

        $entryId = (int) $db->lastInsertId();

        return [
            'id' => $entryId,
            'entry_number' => $entryNumber,
            'admission_id' => $admissionId,
            'intake_total_ml' => $intakeTotal,
            'output_total_ml' => $outputTotal,
            'entry_net_ml' => $entryNet,
            'running_24h_net_ml' => $running24hNet,
            'balance_alert_level' => $alertLevel,
        ];
    }

    public function update(int $id, array $data, ?int $userId): bool
    {
        $existing = $this->get($id);
        if (!$existing) {
            throw new Exception('Fluid balance entry not found.');
        }

        $intakeOral = max(0, (int) ($data['intake_oral_ml'] ?? $existing['intake_oral_ml']));
        $intakeIv = max(0, (int) ($data['intake_iv_ml'] ?? $existing['intake_iv_ml']));
        $intakeBlood = max(0, (int) ($data['intake_blood_ml'] ?? $existing['intake_blood_ml']));
        $intakeEnteral = max(0, (int) ($data['intake_enteral_ml'] ?? $existing['intake_enteral_ml']));
        $intakeOther = max(0, (int) ($data['intake_other_ml'] ?? $existing['intake_other_ml']));
        $intakeTotal = $intakeOral + $intakeIv + $intakeBlood + $intakeEnteral + $intakeOther;

        $outputUrine = max(0, (int) ($data['output_urine_ml'] ?? $existing['output_urine_ml']));
        $outputDrain = max(0, (int) ($data['output_drain_ml'] ?? $existing['output_drain_ml']));
        $outputEmesis = max(0, (int) ($data['output_emesis_ml'] ?? $existing['output_emesis_ml']));
        $outputNg = max(0, (int) ($data['output_ng_ml'] ?? $existing['output_ng_ml']));
        $outputChestTube = max(0, (int) ($data['output_chest_tube_ml'] ?? $existing['output_chest_tube_ml']));
        $outputStoolOther = max(0, (int) ($data['output_stool_other_ml'] ?? $existing['output_stool_other_ml']));
        $outputTotal = $outputUrine + $outputDrain + $outputEmesis + $outputNg + $outputChestTube + $outputStoolOther;

        if ($intakeTotal === 0 && $outputTotal === 0) {
            throw new Exception('Please enter at least one fluid intake or output volume (mL) greater than 0.');
        }

        $entryNet = $intakeTotal - $outputTotal;
        $recordedAt = !empty($data['recorded_at'])
            ? date('Y-m-d H:i:s', strtotime($data['recorded_at']))
            : $existing['recorded_at'];

        $shift = $data['shift'] ?? $existing['shift'];
        if (!in_array($shift, self::SHIFTS, true)) {
            $shift = $existing['shift'];
        }

        $db = Database::connection();

        $prior24hStmt = $db->prepare("
            SELECT COALESCE(SUM(intake_total_ml), 0) AS sum_in,
                   COALESCE(SUM(output_total_ml), 0) AS sum_out,
                   COALESCE(SUM(output_urine_ml), 0) AS sum_urine,
                   COUNT(*) AS cnt
            FROM inpatient_fluid_balance
            WHERE admission_id = :adm_id
              AND id != :self_id
              AND deleted_at IS NULL
              AND recorded_at >= DATE_SUB(:rec_at, INTERVAL 24 HOUR)
              AND recorded_at <= :rec_at2
        ");
        $prior24hStmt->execute([
            'adm_id' => $existing['admission_id'],
            'self_id' => $id,
            'rec_at' => $recordedAt,
            'rec_at2' => $recordedAt,
        ]);
        $priorRow = $prior24hStmt->fetch(PDO::FETCH_ASSOC) ?: ['sum_in' => 0, 'sum_out' => 0, 'sum_urine' => 0, 'cnt' => 0];

        $running24hNet = ((int) $priorRow['sum_in'] + $intakeTotal) - ((int) $priorRow['sum_out'] + $outputTotal);
        $totalUrine24h = (int) $priorRow['sum_urine'] + $outputUrine;
        $totalCnt24h = (int) $priorRow['cnt'] + 1;
        $alertLevel = self::determineAlertLevel($running24hNet, $totalUrine24h, $totalCnt24h);

        $sql = "UPDATE inpatient_fluid_balance SET
            recorded_at = :recorded_at,
            shift = :shift,
            recorded_by_name = :recorded_by_name,
            intake_oral_ml = :in_oral,
            intake_iv_ml = :in_iv,
            intake_blood_ml = :in_blood,
            intake_enteral_ml = :in_enteral,
            intake_other_ml = :in_other,
            intake_total_ml = :in_total,
            intake_details = :in_details,
            output_urine_ml = :out_urine,
            output_drain_ml = :out_drain,
            output_emesis_ml = :out_emesis,
            output_ng_ml = :out_ng,
            output_chest_tube_ml = :out_chest,
            output_stool_other_ml = :out_stool,
            output_total_ml = :out_total,
            output_details = :out_details,
            entry_net_ml = :entry_net,
            running_24h_net_ml = :running_24h_net,
            balance_alert_level = :alert_level,
            clinical_notes = :clinical_notes,
            updated_by = :updated_by,
            updated_at = NOW()
            WHERE id = :id";

        $stmt = $db->prepare($sql);
        return $stmt->execute([
            'recorded_at' => $recordedAt,
            'shift' => $shift,
            'recorded_by_name' => !empty($data['recorded_by_name']) ? trim((string) $data['recorded_by_name']) : $existing['recorded_by_name'],
            'in_oral' => $intakeOral,
            'in_iv' => $intakeIv,
            'in_blood' => $intakeBlood,
            'in_enteral' => $intakeEnteral,
            'in_other' => $intakeOther,
            'in_total' => $intakeTotal,
            'in_details' => isset($data['intake_details']) ? trim((string) $data['intake_details']) : $existing['intake_details'],
            'out_urine' => $outputUrine,
            'out_drain' => $outputDrain,
            'out_emesis' => $outputEmesis,
            'out_ng' => $outputNg,
            'out_chest' => $outputChestTube,
            'out_stool' => $outputStoolOther,
            'out_total' => $outputTotal,
            'out_details' => isset($data['output_details']) ? trim((string) $data['output_details']) : $existing['output_details'],
            'entry_net' => $entryNet,
            'running_24h_net' => $running24hNet,
            'alert_level' => $alertLevel,
            'clinical_notes' => isset($data['clinical_notes']) ? trim((string) $data['clinical_notes']) : $existing['clinical_notes'],
            'updated_by' => $userId,
            'id' => $id,
        ]);
    }

    public function delete(int $id, ?int $userId): bool
    {
        $existing = $this->get($id);
        if (!$existing) {
            throw new Exception('Fluid balance entry not found.');
        }

        $db = Database::connection();
        $stmt = $db->prepare("UPDATE inpatient_fluid_balance SET deleted_at = NOW(), updated_by = :u WHERE id = :id");
        return $stmt->execute(['u' => $userId, 'id' => $id]);
    }

    private function generateEntryNumber(PDO $db): string
    {
        $prefix = 'FBC-' . date('ymd') . '-';
        $stmt = $db->prepare("SELECT COUNT(*) FROM inpatient_fluid_balance WHERE entry_number LIKE :p");
        $stmt->execute(['p' => $prefix . '%']);
        $seq = (int) $stmt->fetchColumn() + 1;
        return sprintf('%s%03d', $prefix, $seq);
    }
}
