<?php

namespace App\Modules\PharmacyDashboard\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Modules\PharmacyDashboard\Services\PharmacyDashboardService;

class PharmacyDashboardController extends Controller
{
    /** Query: warehouse_id? */
    public function overview(): void
    {
        $request = new Request();

        $this->success((new PharmacyDashboardService())->overview([
            'warehouse_id' => $request->input('warehouse_id')
        ]), 'Dashboard retrieved successfully.');
    }
}
