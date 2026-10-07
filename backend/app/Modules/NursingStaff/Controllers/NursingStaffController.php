<?php

namespace App\Modules\NursingStaff\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\NursingStaff\Services\NursingStaffService;

class NursingStaffController extends Controller
{
    private NursingStaffService $service;

    public function __construct()
    {
        $this->service = new NursingStaffService();
    }

    /** Query: ward_id? ('none' = no ward yet), role?, q? */
    public function index(): void
    {
        $request = new Request();
        $filters = array_intersect_key($request->all(), array_flip(['ward_id', 'role', 'q']));
        $this->success($this->service->list($filters, Session::get('user') ?? []), 'Nursing staff retrieved.');
    }

    /** The signed-in person's role and wards. */
    public function mine(): void
    {
        $this->success($this->service->mine(Session::get('user') ?? []), 'Retrieved.');
    }

    /** Body: user_id, ward_ids[], primary_ward_id? */
    public function setWards(): void
    {
        $request = new Request();
        $result = $this->service->setWards($request->all(), Session::get('user') ?? []);
        if (!$result['success']) {
            $this->json(['success' => false, 'message' => $result['message'], 'errors' => $result['errors'] ?? null], !empty($result['not_found']) ? 404 : 422);
            return;
        }
        $this->success($result['data'], $result['message']);
    }

    /** Query: user_id */
    public function history(): void
    {
        $request = new Request();
        $this->success($this->service->history((int) $request->input('user_id')), 'Retrieved.');
    }
}
