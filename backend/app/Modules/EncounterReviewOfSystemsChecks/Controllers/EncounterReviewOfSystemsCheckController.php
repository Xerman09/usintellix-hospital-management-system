<?php

namespace App\Modules\EncounterReviewOfSystemsChecks\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\EncounterReviewOfSystemsChecks\Services\EncounterReviewOfSystemsCheckService;
use App\Modules\Encounters\Models\Encounter;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class EncounterReviewOfSystemsCheckController extends Controller
{
    private EncounterReviewOfSystemsCheckService $encounterReviewOfSystemsCheckService;
    private ProviderService $providerService;

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

    public function __construct()
    {
        $this->encounterReviewOfSystemsCheckService = new EncounterReviewOfSystemsCheckService();
        $this->providerService = new ProviderService();
    }

    public function show(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $encounterId = (int) $request->input('encounter_id');

        if (!$this->ownsEncounter($user, $encounterId)) {
            $this->error('Encounter not found.', 404);
            return;
        }

        $this->success($this->encounterReviewOfSystemsCheckService->find($encounterId), 'Review of Systems Checks retrieved successfully.');
    }

    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $encounterId = (int) $request->input('encounter_id');

        if (!$this->ownsEncounter($user, $encounterId)) {
            $this->error('Encounter not found.', 404);
            return;
        }

        $result = $this->encounterReviewOfSystemsCheckService->save(
            $encounterId,
            $request->only(self::DETAIL_FIELDS),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    private function ownsEncounter(array $user, int $encounterId): bool
    {
        if (!$encounterId) {
            return false;
        }

        $encounter = (new Encounter())->where('id', $encounterId)->first();

        if (!$encounter || $encounter['deleted_at'] !== null) {
            return false;
        }

        $patient = (new Patient())->where('id', (int) $encounter['patient_id'])->first();

        if (!$patient || $patient['deleted_at'] !== null) {
            return false;
        }

        if (($user['role'] ?? '') !== 'doctor') {
            return true;
        }

        $provider = $this->providerService->findByUserId((int) $user['id']);
        $providerId = $provider ? (int) $provider['id'] : 0;

        return (int) $patient['provider_id'] === $providerId;
    }
}
