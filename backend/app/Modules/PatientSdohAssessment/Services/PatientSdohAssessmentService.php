<?php

namespace App\Modules\PatientSdohAssessment\Services;

use App\Core\Database;
use App\Modules\PatientSdohAssessment\Models\PatientSdohAssessment;
use PDO;

class PatientSdohAssessmentService
{
    /**
     * Client-writable columns. Deliberately excludes score, hunger_score,
     * generated_goals, generated_interventions, and the final resolved
     * food_insecurity_status -- those are always server-recomputed in
     * buildRecord(), never trusted from the client.
     */
    private const DETAIL_FIELDS = [
        'assessment_date', 'screening_tool_id', 'assessor_provider_id',
        'food_insecurity_status', 'food_insecurity_notes', 'hvs_worried_food', 'hvs_food_didnt_last',
        'disability_overall_status', 'disability_notes',
        'disability_walking', 'disability_seeing', 'disability_hearing',
        'disability_concentrating', 'disability_dressing_bathing', 'disability_errands',
        'housing_status', 'housing_notes',
        'transportation_status', 'transportation_notes',
        'utilities_status', 'utilities_notes',
        'interpersonal_safety_status', 'interpersonal_safety_notes',
        'financial_strain_status', 'financial_strain_notes',
        'social_isolation_status', 'social_isolation_notes',
        'childcare_status', 'childcare_notes',
        'digital_access_status', 'digital_access_notes',
        'employment_status', 'education_level', 'caregiver_status', 'veteran_status',
        'pregnancy_status', 'estimated_due_date', 'postpartum_status', 'postpartum_end_date', 'pregnancy_intention',
        'additional_interventions'
    ];

    private const LIST_SQL =
        "SELECT sa.*,
                st.name AS screening_tool_name,
                NULLIF(TRIM(CONCAT(ape.first_name, ' ', ape.last_name)), '') AS assessor_provider_name
         FROM patient_sdoh_assessments sa
         LEFT JOIN screening_tools st ON st.id = sa.screening_tool_id
         LEFT JOIN providers ap ON ap.id = sa.assessor_provider_id
         LEFT JOIN employees ape ON ape.id = ap.employee_id";

    /**
     * The 9 domains that contribute to the "Total Positives" score, in
     * display/generation order. Disability is deliberately excluded -- it
     * gets its own status badge, never a numeric contribution.
     */
    private const DOMAIN_ORDER = [
        'food_insecurity', 'housing', 'transportation', 'utilities',
        'interpersonal_safety', 'financial_strain', 'social_isolation',
        'childcare', 'digital_access'
    ];

    private const DOMAIN_CARE_PLAN = [
        'food_insecurity' => [
            'tag' => 'Food Insecurity',
            'goal' => 'Food security (finding) — target: No risk; measure: Food insecurity risk [HVS]',
            'intervention' => 'Assistance with application for food pantry program — reason: Food insecurity risk',
        ],
        'housing' => [
            'tag' => 'Housing Instability',
            'goal' => 'Housing adequate (finding) — target: No; measure: Are you worried about losing your housing [PRAPARE]',
            'intervention' => 'Referral to local housing assistance resources — reason: Housing instability risk',
        ],
        'transportation' => [
            'tag' => 'Transportation Insecurity',
            'goal' => 'Reliable transportation to care — target: No; measure: Transportation barriers to medical care [PRAPARE]',
            'intervention' => 'Referral to transportation assistance program (medical or non-medical trip services) — reason: Transportation insecurity risk',
        ],
        'utilities' => [
            'tag' => 'Utility Insecurity',
            'goal' => 'No threat of utility shutoff — target: No; measure: Utilities threatened to be shut off in last 12Mo',
            'intervention' => 'Referral to utility bill assistance program — reason: Utility shutoff risk',
        ],
        'interpersonal_safety' => [
            'tag' => 'Intimate Partner Violence',
            'goal' => 'Safe interpersonal environment — target: No; measure: IPV screen',
            'intervention' => 'Provide IPV resources and safety planning; social work referral — reason: IPV risk present',
        ],
        'financial_strain' => [
            'tag' => 'Financial Strain',
            'goal' => 'Financial stability (finding) — target: Not very hard; measure: Difficulty covering costs of living [PRAPARE]',
            'intervention' => 'Referral to financial counseling and benefits assistance program — reason: Financial strain risk',
        ],
        'social_isolation' => [
            'tag' => 'Social Isolation',
            'goal' => 'Adequate social support — target: Never/Rarely; measure: Frequency of social/emotional support needed but not received [PRAPARE]',
            'intervention' => 'Referral to community/social support program or senior center — reason: Social isolation risk',
        ],
        'childcare' => [
            'tag' => 'Material Hardship',
            'goal' => 'Childcare needs addressed — target: No; measure: Childcare needs present',
            'intervention' => 'Provide childcare resources and referral — reason: Childcare needs present',
        ],
        'digital_access' => [
            'tag' => 'Digital Access',
            'goal' => 'Adequate digital access — target: No; measure: Difficulty accessing digital technology/internet services',
            'intervention' => 'Provide digital literacy resources and low-cost internet/device program referral — reason: Digital access risk',
        ],
    ];

    /**
     * Get a patient's full assessment history, most recent first.
     */
    public function list(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            self::LIST_SQL .
            " WHERE sa.patient_id = :patient_id AND sa.deleted_at IS NULL
              ORDER BY sa.assessment_date DESC, sa.id DESC"
        );
        $stmt->execute(['patient_id' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function find(int $id): ?array
    {
        return (new PatientSdohAssessment())->where('id', $id)->first();
    }

    public function store(int $patientId, int $createdBy, array $details): array
    {
        $errors = $this->validate($details);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $data = $this->buildRecord($details, $patientId);
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['created_by'] = $createdBy;

        $id = (new PatientSdohAssessment())->create($data);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to save SDOH Assessment.'];
        }

        return [
            'success' => true,
            'message' => 'SDOH Assessment saved successfully.',
            'data' => array_merge(['id' => $id], $data)
        ];
    }

    public function update(int $id, array $details, int $updatedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'SDOH Assessment not found.'];
        }

        $errors = $this->validate($details);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $data = $this->buildRecord($details, (int) $record['patient_id']);
        $data['updated_at'] = date('Y-m-d H:i:s');
        $data['updated_by'] = $updatedBy;

        (new PatientSdohAssessment())->update($data, $id);

        return [
            'success' => true,
            'message' => 'SDOH Assessment updated successfully.',
            'data' => array_merge(['id' => $id], $data)
        ];
    }

    public function remove(int $id, int $deletedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'SDOH Assessment not found.'];
        }

        (new PatientSdohAssessment())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return ['success' => true, 'message' => 'SDOH Assessment removed successfully.'];
    }

    private function validate(array $details): array
    {
        $errors = [];

        if (empty($details['assessment_date'])) {
            $errors['assessment_date'] = 'Assessment date is required.';
        }

        return $errors;
    }

    /**
     * Whitelist + null-blank the client-writable fields, then recompute
     * every server-owned derived field (hunger score, resolved food
     * insecurity status, total positives score, generated goals/
     * interventions) from scratch. Never trust these from the client.
     */
    private function buildRecord(array $details, int $patientId): array
    {
        $data = $this->filterDetails($details);
        $data['patient_id'] = $patientId;

        $hungerScore = $this->calculateHungerScore($data);
        $data['hunger_score'] = $hungerScore;
        $data['food_insecurity_status'] = $this->resolveFoodInsecurityStatus($data, $hungerScore);

        $positives = $this->calculatePositiveDomains($data);
        $data['score'] = count($positives);

        $data['generated_goals'] = $this->buildCarePlanText($positives, $data, 'goal');
        $data['generated_interventions'] = $this->buildCarePlanText($positives, $data, 'intervention');

        return $data;
    }

    private function filterDetails(array $details): array
    {
        $result = [];

        foreach (self::DETAIL_FIELDS as $field) {
            if (array_key_exists($field, $details)) {
                $value = $details[$field];
                $result[$field] = ($value === '' || $value === null) ? null : $value;
            }
        }

        return $result;
    }

    /**
     * Hunger Vital Sign scoring: "often true" or "sometimes true" = 1
     * point each, "never true" = 0. 0-2 total.
     */
    private function calculateHungerScore(array $data): int
    {
        $points = 0;

        foreach (['hvs_worried_food', 'hvs_food_didnt_last'] as $field) {
            if (in_array($data[$field] ?? null, ['often_true', 'sometimes_true'], true)) {
                $points++;
            }
        }

        return $points;
    }

    /**
     * "Auto-determined" is a UI-only sentinel -- never persisted. A raw
     * value of null/''/'auto_determined' means "let the hunger score
     * decide"; an explicit 'at_risk'/'no_risk'/'declined' from the client
     * is an override and is kept as-is.
     */
    private function resolveFoodInsecurityStatus(array $data, int $hungerScore): string
    {
        $raw = $data['food_insecurity_status'] ?? null;

        if (in_array($raw, ['at_risk', 'no_risk', 'declined'], true)) {
            return $raw;
        }

        return $hungerScore >= 1 ? 'at_risk' : 'no_risk';
    }

    /**
     * The 9 domains that count toward the "Total Positives" score.
     */
    private function calculatePositiveDomains(array $data): array
    {
        $positive = [];

        if (($data['food_insecurity_status'] ?? null) === 'at_risk') {
            $positive[] = 'food_insecurity';
        }
        if (($data['housing_status'] ?? null) === 'yes') {
            $positive[] = 'housing';
        }
        if (in_array($data['transportation_status'] ?? null, ['yes_medical', 'yes_non_medical'], true)) {
            $positive[] = 'transportation';
        }
        if (in_array($data['utilities_status'] ?? null, ['yes', 'already_shut_off'], true)) {
            $positive[] = 'utilities';
        }
        if (($data['interpersonal_safety_status'] ?? null) === 'yes') {
            $positive[] = 'interpersonal_safety';
        }
        if (in_array($data['financial_strain_status'] ?? null, ['very_hard', 'hard'], true)) {
            $positive[] = 'financial_strain';
        }
        if (in_array($data['social_isolation_status'] ?? null, ['often', 'always'], true)) {
            $positive[] = 'social_isolation';
        }
        if (($data['childcare_status'] ?? null) === 'yes') {
            $positive[] = 'childcare';
        }
        if (($data['digital_access_status'] ?? null) === 'yes') {
            $positive[] = 'digital_access';
        }

        return $positive;
    }

    private function hasDisabilityFinding(array $data): bool
    {
        foreach (['disability_walking', 'disability_seeing', 'disability_hearing',
                  'disability_concentrating', 'disability_dressing_bathing', 'disability_errands'] as $field) {
            if (($data[$field] ?? null) === 'yes') {
                return true;
            }
        }

        return false;
    }

    private function buildCarePlanText(array $positiveDomains, array $data, string $key): ?string
    {
        $lines = [];
        $date = $data['assessment_date'] ?? '';
        $suffix = $key === 'goal' ? "start: {$date}" : "ordered: {$date}";

        foreach (self::DOMAIN_ORDER as $domain) {
            if (!in_array($domain, $positiveDomains, true)) {
                continue;
            }

            $plan = self::DOMAIN_CARE_PLAN[$domain];
            $lines[] = "[{$plan['tag']}] {$plan[$key]}; {$suffix}";
        }

        if ($this->hasDisabilityFinding($data)) {
            $lines[] = $key === 'goal'
                ? "[Disability] Functional independence supported — target: No unmet needs; measure: Disability screening [ACS-6]; {$suffix}"
                : "[Disability] Referral to disability support services and adaptive equipment/home modification assessment — reason: Functional limitation(s) identified; {$suffix}";
        }

        return $lines ? implode("\n", $lines) : null;
    }
}
