<?php

namespace App\Modules\DocumentTemplates\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
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
     * Tag (or clear) a template's category -- the Template Maintenance
     * screen's "Submit" action, staff-level (not admin-only, unlike
     * upload/delete, since assigning a category doesn't touch the file).
     */
    public function updateCategory(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $filename = (string) $request->input('filename', '');
        $categoryId = $request->input('category_id');

        $result = $this->service->setCategory(
            $filename,
            $categoryId !== null && $categoryId !== '' ? (int) $categoryId : null,
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
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
