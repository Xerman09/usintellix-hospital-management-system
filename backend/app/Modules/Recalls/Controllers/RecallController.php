<?php

namespace App\Modules\Recalls\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Recalls\Services\RecallService;

class RecallController extends Controller
{
    private RecallService $recallService;

    public function __construct()
    {
        $this->recallService = new RecallService();
    }

    /**
     * List the recalls the logged-in user is allowed to see.
     */
    public function mine(): void
    {
        $user = Session::get('user');

        $recalls = $this->recallService->listMine($user);

        $this->success($recalls, 'Recalls retrieved successfully.');
    }

    /**
     * Schedule a new recall (admin, receptionist, or doctor).
     */
    public function store(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $data = $request->only([
            'patient_id', 'provider_id', 'facility_id', 'recall_date', 'reason', 'status', 'notes'
        ]);

        $result = $this->recallService->store($data, $user);

        if (!$result['success']) {
            $status = isset($result['errors']) ? 422 : 404;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing recall (admin, receptionist, or the assigned doctor).
     */
    public function update(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $data = $request->only([
            'provider_id', 'facility_id', 'recall_date', 'reason', 'status', 'notes'
        ]);

        $result = $this->recallService->update($id, $data, $user);

        if (!$result['success']) {
            $status = isset($result['errors']) ? 422 : 404;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Remove a recall (admin, receptionist, or the assigned doctor).
     */
    public function destroy(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->recallService->remove($id, $user);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
