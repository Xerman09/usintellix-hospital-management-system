<?php

namespace App\Modules\EncounterReviewOfSystemsChecks\Services;

use App\Modules\EncounterReviewOfSystemsChecks\Models\EncounterReviewOfSystemsCheck;
use App\Modules\EncounterSections\Services\EncounterSectionService;

class EncounterReviewOfSystemsCheckService
{
    private const DETAIL_FIELDS = [
        'general_fever', 'general_chills', 'general_night_sweats', 'general_weight_loss', 'general_poor_appetite', 'general_insomnia',
        'general_fatigued', 'general_depressed', 'general_hyperactive', 'general_exposure_foreign_countries', 'skin_rashes', 'skin_infections',
        'skin_ulcerations', 'skin_pemphigus', 'skin_herpes', 'heent_cataracts', 'heent_cataract_surgery', 'heent_glaucoma',
        'heent_double_vision', 'heent_blurred_vision', 'heent_poor_hearing', 'heent_headaches', 'heent_ringing_in_ears', 'heent_bloody_nose',
        'heent_sinusitis', 'heent_sinus_surgery', 'heent_dry_mouth', 'heent_strep_throat', 'heent_tonsillectomy', 'heent_swollen_lymph_nodes',
        'heent_throat_cancer', 'heent_throat_cancer_surgery', 'pulm_emphysema', 'pulm_chronic_bronchitis', 'pulm_interstitial_lung_disease', 'pulm_shortness_of_breath',
        'pulm_lung_cancer', 'pulm_lung_cancer_surgery', 'pulm_pheumothorax', 'cv_heart_attack', 'cv_irregular_heart_beat', 'cv_chest_pains',
        'cv_shortness_of_breath', 'cv_high_blood_pressure', 'cv_heart_failure', 'cv_poor_circulation', 'cv_vascular_surgery', 'cv_cardiac_catheterization',
        'cv_coronary_artery_bypass', 'cv_heart_transplant', 'cv_stress_test', 'gi_stomach_pains', 'gi_peptic_ulcer_disease', 'gi_gastritis',
        'gi_endoscopy', 'gi_polyps', 'gi_colonoscopy', 'gi_colon_cancer', 'gi_colon_cancer_surgery', 'gi_ulcerative_colitis',
        'gi_crohns_disease', 'gi_appendectomy', 'gi_diverticulitis', 'gi_diverticulitis_surgery', 'gi_gall_stones', 'gi_cholecystectomy',
        'gi_hepatitis', 'gi_cirrhosis_liver', 'gi_splenectomy', 'gu_kidney_failure', 'gu_kidney_stones', 'gu_kidney_cancer',
        'gu_kidney_infections', 'gu_bladder_infections', 'gu_bladder_cancer', 'gu_prostate_problems', 'gu_prostate_cancer', 'gu_kidney_transplant',
        'gu_sexually_transmitted_disease', 'gu_burning_with_urination', 'gu_discharge_from_urethra', 'msk_osetoarthritis', 'msk_rheumotoid_arthritis', 'msk_lupus',
        'msk_ankylosing_spondlilitis', 'msk_swollen_joints', 'msk_stiff_joints', 'msk_broken_bones', 'msk_neck_problems', 'msk_back_problems',
        'msk_back_surgery', 'msk_scoliosis', 'msk_herniated_disc', 'msk_shoulder_problems', 'msk_elbow_problems', 'msk_wrist_problems',
        'msk_hand_problems', 'msk_hip_problems', 'msk_knee_problems', 'msk_ankle_problems', 'msk_foot_problems', 'endo_insulin_dependent_diabetes',
        'endo_non_insulin_dependent_diabetes', 'endo_hypothyroidism', 'endo_hyperthyroidism', 'endo_cushing_syndrome', 'endo_addison_syndrome', 'additional_notes'
    ];

    private EncounterSectionService $encounterSectionService;

    public function __construct()
    {
        $this->encounterSectionService = new EncounterSectionService();
    }

    public function find(int $encounterId): ?array
    {
        return (new EncounterReviewOfSystemsCheck())->where('encounter_id', $encounterId)->first();
    }

    /**
     * Upsert an encounter's Review of Systems Checks checklist. Every
     * field but additional_notes is a checkbox defaulting to unchecked,
     * so (like Review Of Systems) there is nothing to validate.
     * Rejected once the 'review_of_systems_checks' section is locked.
     */
    public function save(int $encounterId, array $data, int $userId): array
    {
        if ($this->encounterSectionService->isLocked($encounterId, 'review_of_systems_checks')) {
            return [
                'success' => false,
                'message' => 'Review of Systems Checks is locked. Sign the section again to record further changes.'
            ];
        }

        $values = [];

        foreach (self::DETAIL_FIELDS as $field) {
            if ($field === 'additional_notes') {
                $notes = $data[$field] ?? null;
                $values[$field] = ($notes === null || trim((string) $notes) === '') ? null : $notes;
                continue;
            }

            $values[$field] = !empty($data[$field]) ? 1 : 0;
        }

        $existing = $this->find($encounterId);

        if ($existing) {
            $values['updated_at'] = date('Y-m-d H:i:s');
            $values['updated_by'] = $userId;

            (new EncounterReviewOfSystemsCheck())->update($values, (int) $existing['id']);
        } else {
            $values['encounter_id'] = $encounterId;
            $values['created_at'] = date('Y-m-d H:i:s');
            $values['created_by'] = $userId;

            (new EncounterReviewOfSystemsCheck())->create($values);
        }

        return [
            'success' => true,
            'message' => 'Review of Systems Checks saved successfully.',
            'data' => $this->find($encounterId)
        ];
    }
}
