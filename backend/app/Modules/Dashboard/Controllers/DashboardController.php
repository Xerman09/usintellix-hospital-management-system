<?php

namespace App\Modules\Dashboard\Controllers;

use App\Core\Controller;
use App\Core\Session;
use App\Modules\Dashboard\Services\DashboardService;

class DashboardController extends Controller
{
    private DashboardService $dashboardService;

    public function __construct()
    {
        $this->dashboardService = new DashboardService();
    }

    public function index(): void
    {
        $user = Session::get('user');

        if (!$user) {
            $this->error('Unauthorized.', 401);
            return;
        }

        $this->success([
            'user' => $user
        ], 'Welcome to dashboard.');
    }

    /**
     * Role-scoped dashboard stats, built from real data.
     */
    public function stats(): void
    {
        $user = Session::get('user');

        if (!$user) {
            $this->error('Unauthorized.', 401);
            return;
        }

        $stats = $this->dashboardService->getStats($user);

        $this->success($stats, 'Dashboard stats retrieved successfully.');
    }
}