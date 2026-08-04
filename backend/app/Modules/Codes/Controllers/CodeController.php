<?php

namespace App\Modules\Codes\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Codes\Services\CodeService;

class CodeController extends Controller
{
    private CodeService $codeService;

    public function __construct()
    {
        $this->codeService = new CodeService();
    }

    /**
     * List codes, paginated, optionally filtered by type/search.
     */
    public function index(): void
    {
        $request = new Request();

        $type = trim((string) $request->input('type', ''));
        $search = trim((string) $request->input('search', ''));
        $page = (int) $request->input('page', 1);
        $perPage = (int) $request->input('per_page', 50);

        $result = $this->codeService->list($type, $search, $page, $perPage);

        $this->success($result, 'Codes retrieved successfully.');
    }

    /**
     * Register a new code (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only([
            'code_type', 'code', 'modifier', 'description', 'short_description',
            'category', 'diagnosis_reporting', 'service_reporting', 'related_code',
            'fee_standard', 'active'
        ]);

        $result = $this->codeService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing code (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only([
            'code_type', 'code', 'modifier', 'description', 'short_description',
            'category', 'diagnosis_reporting', 'service_reporting', 'related_code',
            'fee_standard', 'active'
        ]);

        $result = $this->codeService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Code not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete a code (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->codeService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Bulk-import codes of a single type from an uploaded CSV file
     * (admin-only). Expected header:
     * code,modifier,description,short_description,category,
     * diagnosis_reporting,service_reporting,related_code,fee_standard,active
     */
    public function import(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $codeType = trim((string) $request->input('code_type', ''));
        $files = $request->files();
        $file = $files['file'] ?? null;

        if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $this->error('A CSV file is required.', 422);
            return;
        }

        $handle = fopen($file['tmp_name'], 'r');

        if (!$handle) {
            $this->error('Unable to read the uploaded file.', 422);
            return;
        }

        $header = fgetcsv($handle);

        if (!$header) {
            fclose($handle);
            $this->error('The CSV file is empty.', 422);
            return;
        }

        $header = array_map(fn($column) => strtolower(trim((string) $column)), $header);

        $rows = [];

        while (($line = fgetcsv($handle)) !== false) {
            $rows[] = array_combine(
                $header,
                array_pad(array_slice($line, 0, count($header)), count($header), null)
            );
        }

        fclose($handle);

        $result = $this->codeService->import($codeType, $rows, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
    }
}
