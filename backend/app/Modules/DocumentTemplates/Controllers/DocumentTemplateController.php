<?php

namespace App\Modules\DocumentTemplates\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Modules\DocumentTemplates\Services\DocumentTemplateService;

class DocumentTemplateController extends Controller
{
    private DocumentTemplateService $service;

    public function __construct()
    {
        $this->service = new DocumentTemplateService();
    }

    /**
     * List every stored document template (admin-only).
     */
    public function index(): void
    {
        $this->success($this->service->list(), 'Document templates retrieved successfully.');
    }

    /**
     * Upload a template file to a chosen destination filename
     * (admin-only). Overwrites an existing template of the same name.
     */
    public function store(): void
    {
        $request = new Request();
        $files = $request->files();

        $result = $this->service->upload(
            $files['file'] ?? [],
            (string) $request->input('destination_filename', '')
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Delete a stored template by filename (admin-only).
     */
    public function destroy(): void
    {
        $request = new Request();

        $result = $this->service->delete((string) $request->input('filename', ''));

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
