<?php

namespace App\Modules\Census\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\BusinessSettings\Services\BusinessSettingService;
use App\Modules\Census\Services\CensusService;

class CensusController extends Controller
{
    private CensusService $service;

    public function __construct()
    {
        $this->service = new CensusService();
    }

    /** Query: date? (YYYY-MM-DD, default today). Saved days come from the store; today is live. */
    public function index(): void
    {
        // Yesterday not saved yet (no nightly job ran): save it now.
        try {
            $this->service->ensureSaved();
        } catch (\Throwable $e) {
            error_log('census save failed: ' . $e->getMessage());
        }
        $data = $this->service->read((string) ((new Request())->input('date') ?? ''));
        try {
            $biz = (new BusinessSettingService())->get();
        } catch (\Throwable $e) {
            $biz = [];
        }
        $this->success($data + ['hospital' => ['name' => $biz['name'] ?? 'Hospital'], 'can_save' => in_array(Session::get('user')['role'] ?? '', CensusService::SAVE_ROLES, true)], 'Retrieved.');
    }

    /** Body: date, note? -- recalculate and save a finished day (admin). */
    public function save(): void
    {
        $request = new Request();
        $r = $this->service->save((string) $request->input('date'), 'manual', (int) (Session::get('user')['id'] ?? 0) ?: null, $request->input('note'));
        if (!$r['success']) {
            $this->json(['success' => false, 'message' => $r['message'], 'errors' => $r['errors'] ?? null], 422);
            return;
        }
        $this->success($r['data'], $r['message']);
    }
}
