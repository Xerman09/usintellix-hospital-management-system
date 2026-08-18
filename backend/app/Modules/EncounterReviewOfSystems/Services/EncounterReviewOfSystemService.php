<?php

namespace App\Modules\EncounterReviewOfSystems\Services;

use App\Modules\EncounterReviewOfSystems\Models\EncounterReviewOfSystem;
use App\Modules\EncounterSections\Services\EncounterSectionService;

class EncounterReviewOfSystemService
{
    private const DETAIL_FIELDS = [
        'constitutional_weight_change', 'constitutional_anorexia', 'constitutional_night_sweats', 'constitutional_heat_or_cold', 'constitutional_weakness', 'constitutional_fever',
        'constitutional_insomnia', 'constitutional_intolerance', 'constitutional_fatigue', 'constitutional_chills', 'constitutional_irritability', 'eyes_change_in_vision',
        'eyes_irritation', 'eyes_double_vision', 'eyes_family_history_glaucoma', 'eyes_redness', 'eyes_blind_spots', 'eyes_eye_pain',
        'eyes_excessive_tearing', 'eyes_photophobia', 'ent_hearing_loss', 'ent_vertigo', 'ent_sore_throat', 'ent_nosebleed',
        'ent_discharge', 'ent_tinnitus', 'ent_sinus_problems', 'ent_snoring', 'ent_pain', 'ent_frequent_colds',
        'ent_post_nasal_drip', 'ent_apnea', 'breast_mass', 'breast_abnormal_mammogram', 'breast_discharge', 'breast_biopsy',
        'resp_cough', 'resp_wheezing', 'resp_copd', 'resp_sputum', 'resp_hemoptysis', 'resp_shortness_of_breath',
        'resp_asthma', 'cv_chest_pain', 'cv_pnd', 'cv_peripheral', 'cv_history_heart_murmur', 'cv_palpitation',
        'cv_doe', 'cv_edema', 'cv_arrythmia', 'cv_syncope', 'cv_orthopnea', 'cv_leg_pain_cramping',
        'cv_heart_problem', 'gi_dysphagia', 'gi_belching', 'gi_vomiting', 'gi_food_intolerance', 'gi_hematochezia',
        'gi_constipation', 'gi_heartburn', 'gi_flatulence', 'gi_hematemesis', 'gi_ho_hepatitis', 'gi_changed_bowel',
        'gi_bloating', 'gi_nausea', 'gi_pain', 'gu_general_polyuria', 'gu_general_hematuria', 'gu_general_incontinence',
        'gu_general_polydypsia', 'gu_general_frequency', 'gu_general_renal_stones', 'gu_general_dysuria', 'gu_general_urgency', 'gu_general_utis',
        'gu_male_hesitancy', 'gu_male_nocturia', 'gu_male_dribbling', 'gu_male_erections', 'gu_male_stream', 'gu_male_ejaculations',
        'gu_female_g', 'gu_female_lc', 'gu_female_lmp', 'gu_female_symptoms', 'gu_female_p', 'gu_female_menarche',
        'gu_female_frequency', 'gu_female_abnormal_hair_growth', 'gu_female_ap', 'gu_female_menopause', 'gu_female_flow', 'gu_female_fh_hirsutism_striae',
        'msk_chronic_joint_pain', 'msk_warm', 'msk_aches', 'msk_swelling', 'msk_stiffness', 'msk_fms',
        'msk_redness', 'msk_muscle', 'msk_arthritis', 'neuro_loc', 'neuro_tia', 'neuro_paralysis',
        'neuro_dementia', 'neuro_seizures', 'neuro_numbness', 'neuro_intellectual_decline', 'neuro_headache', 'neuro_stroke',
        'neuro_weakness', 'neuro_memory_problems', 'skin_cancer', 'skin_other', 'skin_psoriasis', 'skin_disease',
        'skin_acne', 'psych_psychiatric_diagnosis', 'psych_anxiety', 'psych_psychiatric_medication', 'psych_social_difficulties', 'psych_depression',
        'endo_thyroid_problems', 'endo_diabetes', 'endo_abnormal_blood_test', 'hai_anemia', 'hai_allergies', 'hai_hai_status',
        'hai_fh_blood_problems', 'hai_frequent_illness', 'hai_bleeding_problems', 'hai_hiv'
    ];

    private EncounterSectionService $encounterSectionService;

    public function __construct()
    {
        $this->encounterSectionService = new EncounterSectionService();
    }

    public function find(int $encounterId): ?array
    {
        return (new EncounterReviewOfSystem())->where('encounter_id', $encounterId)->first();
    }

    /**
     * Upsert an encounter's Review of Systems checklist. Every field is a
     * 3-way na/yes/no answer with a DB default of 'na', so unlike other
     * encounter forms there is nothing to validate -- any subset of
     * fields (or none at all) is a legitimate save.
     * Rejected once the 'review_of_systems' section is locked.
     */
    public function save(int $encounterId, array $data, int $userId): array
    {
        if ($this->encounterSectionService->isLocked($encounterId, 'review_of_systems')) {
            return [
                'success' => false,
                'message' => 'Review Of Systems is locked. Sign the section again to record further changes.'
            ];
        }

        $values = [];

        foreach (self::DETAIL_FIELDS as $field) {
            $raw = $data[$field] ?? null;
            $values[$field] = in_array($raw, ['yes', 'no'], true) ? $raw : 'na';
        }

        $existing = $this->find($encounterId);

        if ($existing) {
            $values['updated_at'] = date('Y-m-d H:i:s');
            $values['updated_by'] = $userId;

            (new EncounterReviewOfSystem())->update($values, (int) $existing['id']);
        } else {
            $values['encounter_id'] = $encounterId;
            $values['created_at'] = date('Y-m-d H:i:s');
            $values['created_by'] = $userId;

            (new EncounterReviewOfSystem())->create($values);
        }

        return [
            'success' => true,
            'message' => 'Review Of Systems saved successfully.',
            'data' => $this->find($encounterId)
        ];
    }
}
