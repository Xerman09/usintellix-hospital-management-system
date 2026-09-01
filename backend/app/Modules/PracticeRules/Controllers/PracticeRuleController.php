<?php

namespace App\Modules\PracticeRules\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PracticeRules\Services\PracticeRuleService;

class PracticeRuleController extends Controller
{
    private PracticeRuleService $ruleService;

    private const FIELDS = [
        'title', 'type', 'bibliographic_citation', 'developer', 'funding_source',
        'date_last_reviewed', 'release_info', 'web_reference', 'referential_cds',
        'reminder_intervals', 'demographics_criteria', 'clinical_targets', 'actions_list',
        'use_patient_race', 'use_patient_ethnicity', 'use_patient_language',
        'use_patient_sexual_orientation', 'use_patient_gender_identity', 'use_patient_sex',
        'use_patient_dob', 'use_patient_sdoh', 'use_patient_health_status_assessments'
    ];

    public function __construct()
    {
        $this->ruleService = new PracticeRuleService();
    }

    /**
     * GET /practice-rules -> list all rules.
     * GET /practice-rules?id=X -> single rule, with JSON fields decoded.
     */
    public function index(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if ($id > 0) {
            $result = $this->ruleService->getRule($id);

            if (!$result['success']) {
                $this->error($result['message'], 404);
                return;
            }

            $this->success($result['data']);
            return;
        }

        $result = $this->ruleService->getRules();
        $this->success($result['data']);
    }

    public function store(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $data = $request->only(self::FIELDS);

        $result = $this->ruleService->createRule($data, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], 'Rule added successfully.', 201);
    }

    public function update(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $id = (int) $request->input('id');
        $data = $request->only(self::FIELDS);

        $result = $this->ruleService->updateRule($id, $data, (int) $user['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Rule not found' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], 'Rule updated successfully.');
    }

    /**
     * PUT /practice-rules/alert-manager
     * Bulk-saves every row's alert-channel flags + access control.
     */
    public function bulkUpdateAlertFlags(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $rows = (array) $request->input('rows', []);

        $result = $this->ruleService->bulkUpdateAlertFlags($rows, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 500);
            return;
        }

        $this->success(null, $result['message']);
    }

    public function destroy(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $id = (int) $request->input('id');

        $result = $this->ruleService->softDeleteRule($id, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
