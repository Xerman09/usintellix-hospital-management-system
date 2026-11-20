<?php

namespace App\Modules\BusinessModules\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\BusinessModules\Services\BusinessModuleService;

class BusinessModuleController extends Controller
{
    private BusinessModuleService $service;

    public function __construct()
    {
        $this->service = new BusinessModuleService();
    }

    /**
     * List all business modules and their enabled status.
     */
    public function index(): void
    {
        $this->success([
            'modules' => $this->service->listAll(),
            'presets' => array_map(static function (string $key, array $preset): array {
                return [
                    'key'   => $key,
                    'label' => $preset['label'],
                ];
            }, array_keys(BusinessModuleService::PRESETS), BusinessModuleService::PRESETS),
        ], 'Business modules retrieved successfully.');
    }

    /**
     * Batch update enabled/disabled modules (admin-only).
     */
    public function update(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $payload = $request->all();
        $modules = $payload['modules'] ?? [];

        if (!is_array($modules)) {
            $this->error('Invalid modules payload.', 422);
            return;
        }

        $result = $this->service->updateModules($modules, (int) ($user['id'] ?? 0));

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(['modules' => $result['data']], $result['message']);
    }

    /**
     * Apply a predefined healthcare business profile preset (admin-only).
     */
    public function applyPreset(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $preset = trim((string) ($request->input('preset') ?? ''));

        if ($preset === '') {
            $this->error('Preset key is required.', 422);
            return;
        }

        $result = $this->service->applyPreset($preset, (int) ($user['id'] ?? 0));

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(['modules' => $result['data']], $result['message']);
    }
}
