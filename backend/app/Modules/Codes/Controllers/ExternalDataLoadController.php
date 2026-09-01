<?php

namespace App\Modules\Codes\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Codes\Services\ExternalDataLoadService;

class ExternalDataLoadController extends Controller
{
    private ExternalDataLoadService $service;

    public function __construct()
    {
        $this->service = new ExternalDataLoadService();
    }

    /**
     * Installed-release + staged-files status for every section
     * (admin-only).
     */
    public function overview(): void
    {
        $this->success($this->service->overview(), 'External data load status retrieved successfully.');
    }

    /**
     * Stage an uploaded file for a section (admin-only).
     */
    public function stage(): void
    {
        $request = new Request();

        $sectionKey = trim((string) $request->input('section_key', ''));
        $files = $request->files();
        $file = $files['file'] ?? null;

        $result = $this->service->stage($sectionKey, $file ?? []);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * Install a staged file for a section, replacing its entire
     * existing code set (admin-only).
     */
    public function upgrade(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $sectionKey = trim((string) $request->input('section_key', ''));
        $filename = trim((string) $request->input('filename', ''));

        $result = $this->service->upgrade($sectionKey, $filename, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
    }
}
