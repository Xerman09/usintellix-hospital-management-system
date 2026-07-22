<?php

namespace App\Modules\PracticeRules\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PracticeRules\Services\PracticeRuleService;

class PracticeRuleController extends Controller
{
    private PracticeRuleService $ruleService;

    public function __construct()
    {
        $this->ruleService = new PracticeRuleService();
    }

    /**
     * GET /practice-rules
     * List all rules for current tenant.
     */
    public function index(): void
    {
        $user = Session::get('user');
        if (!$user) {
            $this->error('Unauthorized', 401);
            return;
        }

        $result = $this->ruleService->getRules((int) $user['tenant_id']);
        $this->success($result['data']);
    }

    /**
     * GET /practice-rules/{id}
     * Get single rule summary.
     */
    public function show(array $params = []): void
    {
        $user = Session::get('user');
        if (!$user) {
            $this->error('Unauthorized', 401);
            return;
        }

        $id = (int) ($params['id'] ?? 0);
        $result = $this->ruleService->getRule($id, (int) $user['tenant_id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success($result['data']);
    }

    /**
     * POST /practice-rules
     * Create a new rule.
     */
    public function store(): void
    {
        $user = Session::get('user');
        if (!$user) {
            $this->error('Unauthorized', 401);
            return;
        }

        $request = new Request();
        $data = $request->getBody();

        $result = $this->ruleService->createRule(
            $data,
            (int) $user['tenant_id'],
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * PUT /practice-rules/{id}
     * Update an existing rule.
     */
    public function update(array $params = []): void
    {
        $user = Session::get('user');
        if (!$user) {
            $this->error('Unauthorized', 401);
            return;
        }

        $id = (int) ($params['id'] ?? 0);
        $request = new Request();
        $data = $request->getBody();

        $result = $this->ruleService->updateRule(
            $id,
            $data,
            (int) $user['tenant_id'],
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * DELETE /practice-rules/{id}
     * Soft delete a rule.
     */
    public function destroy(array $params = []): void
    {
        $user = Session::get('user');
        if (!$user) {
            $this->error('Unauthorized', 401);
            return;
        }

        $id = (int) ($params['id'] ?? 0);

        $result = $this->ruleService->softDeleteRule(
            $id,
            (int) $user['tenant_id'],
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 400);
            return;
        }

        $this->success(null, $result['message']);
    }
}
