<?php

namespace App\Modules\InpatientAdmissions\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\InpatientAdmissions\Services\ProgressNoteService;
use Exception;

class ProgressNoteController extends Controller
{
    private ProgressNoteService $service;

    public function __construct()
    {
        $this->service = new ProgressNoteService();
    }

    /**
     * GET /inpatient-admissions/progress-notes
     * List multidisciplinary progress notes for an inpatient admission.
     */
    public function index(): void
    {
        $request = new Request();
        $admissionId = (int) $request->input('admission_id');
        $discipline = $request->input('discipline');

        if ($admissionId <= 0) {
            $this->error('Valid Admission ID is required.', 422);
            return;
        }

        try {
            $notes = $this->service->listByAdmission($admissionId, $discipline);
            $options = $this->service->options();
            $this->success([
                'notes' => $notes,
                'options' => $options,
            ], 'Multidisciplinary progress notes retrieved successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /inpatient-admissions/progress-notes/show
     * Get single note details.
     */
    public function show(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if ($id <= 0) {
            $this->error('Valid Note ID is required.', 422);
            return;
        }

        try {
            $note = $this->service->get($id);
            if (!$note) {
                $this->error('Progress note not found.', 404);
                return;
            }
            $this->success($note, 'Progress note retrieved successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /inpatient-admissions/progress-notes/options
     * Return disciplines and note types metadata.
     */
    public function options(): void
    {
        try {
            $options = $this->service->options();
            $this->success($options, 'Progress note options retrieved successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    /**
     * POST /inpatient-admissions/progress-notes
     * Save / Document a new multidisciplinary progress note or treatment log.
     */
    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? [];
        $userId = !empty($user['id']) ? (int) $user['id'] : null;
        $data = $request->all();

        try {
            $result = $this->service->store($data, $userId, $user);
            $this->success($result, 'Multidisciplinary note documented successfully.', 201);
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /inpatient-admissions/progress-notes/update
     * Update an existing progress note.
     */
    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? [];
        $userId = !empty($user['id']) ? (int) $user['id'] : null;
        $data = $request->all();

        $id = (int) ($data['id'] ?? $request->input('id'));
        if ($id <= 0) {
            $this->error('Valid Note ID is required.', 422);
            return;
        }

        try {
            $this->service->update($id, $data, $userId);
            $this->success(['id' => $id], 'Progress note updated successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /inpatient-admissions/progress-notes/cosign
     * Cosign a multidisciplinary progress note (Attending Physician or Clinical Supervisor).
     */
    public function cosign(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? [];
        $userId = !empty($user['id']) ? (int) $user['id'] : 0;
        $id = (int) $request->input('id');

        if ($id <= 0 || $userId <= 0) {
            $this->error('Valid Note ID and authorized session are required.', 422);
            return;
        }

        $userName = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
        if ($userName === '') {
            $userName = $user['username'] ?? 'Clinical Supervisor';
        }

        try {
            $this->service->cosign($id, $userId, $userName);
            $this->success(['id' => $id], 'Progress note cosigned successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /inpatient-admissions/progress-notes/delete
     * Soft delete a progress note.
     */
    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? [];
        $userId = !empty($user['id']) ? (int) $user['id'] : null;
        $id = (int) $request->input('id');

        if ($id <= 0) {
            $this->error('Valid Note ID is required.', 422);
            return;
        }

        try {
            $this->service->delete($id, $userId);
            $this->success(['id' => $id], 'Progress note removed successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }
}
