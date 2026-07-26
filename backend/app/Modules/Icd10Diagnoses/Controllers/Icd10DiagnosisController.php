<?php

namespace App\Modules\Icd10Diagnoses\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Icd10Diagnoses\Services\Icd10DiagnosisService;

class Icd10DiagnosisController extends Controller
{
    private Icd10DiagnosisService $icd10DiagnosisService;

    public function __construct()
    {
        $this->icd10DiagnosisService = new Icd10DiagnosisService();
    }

    /**
     * List ICD10 diagnosis codes, paginated.
     */
    public function index(): void
    {
        $request = new Request();

        $page = (int) $request->input('page', 1);
        $perPage = (int) $request->input('per_page', 50);
        $search = trim((string) $request->input('search', ''));

        $result = $this->icd10DiagnosisService->list($page, $perPage, $search);

        $this->success($result, 'ICD10 diagnosis codes retrieved successfully.');
    }

    /**
     * Register a new ICD10 diagnosis code (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(['code', 'description']);

        $result = $this->icd10DiagnosisService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing ICD10 diagnosis code (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['code', 'description']);

        $result = $this->icd10DiagnosisService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'ICD10 diagnosis code not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete an ICD10 diagnosis code (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->icd10DiagnosisService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
