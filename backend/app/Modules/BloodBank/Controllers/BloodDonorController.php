<?php

namespace App\Modules\BloodBank\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Modules\BloodBank\Services\BloodDonorService;
use Throwable;

class BloodDonorController
{
    private BloodDonorService $service;

    public function __construct()
    {
        $this->service = new BloodDonorService();
    }

    public function index(Request $request): Response
    {
        try {
            $filters = [
                'abo_group' => $request->query('abo_group'),
                'rh_factor' => $request->query('rh_factor'),
                'eligibility_status' => $request->query('eligibility_status'),
                'q' => $request->query('q')
            ];

            $donors = $this->service->listDonors($filters);
            return Response::json(['success' => true, 'data' => $donors]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function detail(Request $request): Response
    {
        try {
            $id = (int) $request->query('id');
            if ($id <= 0) {
                return Response::json(['success' => false, 'message' => 'Valid donor ID is required.'], 400);
            }

            $donor = $this->service->getDonor($id);
            if (!$donor) {
                return Response::json(['success' => false, 'message' => 'Blood donor not found.'], 404);
            }

            return Response::json(['success' => true, 'data' => $donor]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function save(Request $request): Response
    {
        try {
            $actor = $request->user();
            $data = $request->json();

            $res = $this->service->registerDonor($data, $actor);
            return Response::json($res, ($res['success'] ?? false) ? 200 : 422);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function stats(Request $request): Response
    {
        try {
            $stats = $this->service->getStats();
            return Response::json(['success' => true, 'data' => $stats]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
