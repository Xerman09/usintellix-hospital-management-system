<?php

namespace App\Modules\TemplateMaintenance\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\TemplateMaintenance\Services\TemplateCategoryService;
use App\Modules\TemplateMaintenance\Services\TemplateGroupService;
use App\Modules\TemplateMaintenance\Services\TemplateProfileService;
use App\Modules\TemplateMaintenance\Services\PatientTemplateAssignmentService;
use App\Modules\TemplateMaintenance\Models\PatientTemplateAssignment;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class TemplateMaintenanceController extends Controller
{
    private TemplateCategoryService $categoryService;
    private TemplateGroupService $groupService;
    private TemplateProfileService $profileService;
    private PatientTemplateAssignmentService $assignmentService;
    private ProviderService $providerService;

    public function __construct()
    {
        $this->categoryService = new TemplateCategoryService();
        $this->groupService = new TemplateGroupService();
        $this->profileService = new TemplateProfileService();
        $this->assignmentService = new PatientTemplateAssignmentService();
        $this->providerService = new ProviderService();
    }

    // ---- Categories ----

    public function categoriesIndex(): void
    {
        $this->success($this->categoryService->list(), 'Categories retrieved successfully.');
    }

    public function categoriesStore(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->categoryService->create($request->only(['name', 'description']), (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    public function categoriesUpdate(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->categoryService->update(
            (int) $request->input('id'),
            $request->only(['name', 'description']),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    public function categoriesDestroy(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->categoryService->remove((int) $request->input('id'), (int) $user['id']);

        $this->success(null, $result['message']);
    }

    // ---- Groups ----

    public function groupsIndex(): void
    {
        $this->success($this->groupService->list(), 'Groups retrieved successfully.');
    }

    public function groupsStore(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $data = $request->only(['name', 'description']);
        $data['templates'] = (array) $request->input('templates', []);

        $result = $this->groupService->create($data, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    public function groupsUpdate(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $data = $request->only(['name', 'description']);
        $data['templates'] = (array) $request->input('templates', []);

        $result = $this->groupService->update((int) $request->input('id'), $data, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    public function groupsDestroy(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->groupService->remove((int) $request->input('id'), (int) $user['id']);

        $this->success(null, $result['message']);
    }

    // ---- Profiles ----

    public function profilesIndex(): void
    {
        $this->success($this->profileService->list(), 'Profiles retrieved successfully.');
    }

    public function profilesStore(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->profileService->create(
            $request->only(['name', 'description', 'category_id', 'template_group_id']),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    public function profilesUpdate(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->profileService->update(
            (int) $request->input('id'),
            $request->only(['name', 'description', 'category_id', 'template_group_id']),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    public function profilesSetActive(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->profileService->setActive(
            (int) $request->input('id'),
            (bool) $request->input('active'),
            (int) $user['id']
        );

        $this->success(null, $result['message']);
    }

    public function profilesDestroy(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->profileService->remove((int) $request->input('id'), (int) $user['id']);

        $this->success(null, $result['message']);
    }

    // ---- Patient template assignments ----

    /**
     * ?patient_id present -> that patient's "Patient Assigned Templates";
     * omitted -> "Default Patient Templates" (practice-wide).
     */
    public function assignmentsIndex(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $patientId = $request->input('patient_id');

        if ($patientId === null || $patientId === '') {
            $this->success($this->assignmentService->listDefaults(), 'Default templates retrieved successfully.');
            return;
        }

        if (!$this->ownsPatient($user, (int) $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $this->success($this->assignmentService->listForPatient((int) $patientId), 'Assigned templates retrieved successfully.');
    }

    public function assignmentsStore(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $patientIdInput = $request->input('patient_id');
        $patientId = ($patientIdInput === null || $patientIdInput === '') ? null : (int) $patientIdInput;

        if ($patientId === null) {
            // Practice-wide defaults are an administrative decision, not
            // a single doctor's call over their own patient panel.
            if (!in_array($user['role'] ?? '', ['admin', 'receptionist'], true)) {
                $this->error('Only admin or receptionist can set default templates.', 403);
                return;
            }
        } elseif (!$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $categoryIdInput = $request->input('category_id');
        $categoryId = ($categoryIdInput === null || $categoryIdInput === '') ? null : (int) $categoryIdInput;

        $result = $this->assignmentService->assign(
            $patientId,
            (array) $request->input('templates', []),
            $categoryId,
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    public function assignmentsDestroy(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $assignment = (new PatientTemplateAssignment())->where('id', $id)->first();

        if (!$assignment || $assignment['deleted_at'] !== null) {
            $this->error('Assignment not found.', 404);
            return;
        }

        if ($assignment['patient_id'] === null) {
            if (!in_array($user['role'] ?? '', ['admin', 'receptionist'], true)) {
                $this->error('Only admin or receptionist can remove default templates.', 403);
                return;
            }
        } elseif (!$this->ownsPatient($user, (int) $assignment['patient_id'])) {
            $this->error('Assignment not found.', 404);
            return;
        }

        $result = $this->assignmentService->unassign($id, (int) $user['id']);

        $this->success(null, $result['message']);
    }

    private function ownsPatient(array $user, int $patientId): bool
    {
        if (!$patientId) {
            return false;
        }

        $patient = (new Patient())->where('id', $patientId)->first();

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
