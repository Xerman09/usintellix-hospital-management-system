<?php

namespace App\Modules\DischargeDispositions\Controllers;

use App\Core\Controller;
use App\Modules\DischargeDispositions\Services\DischargeDispositionService;

class DischargeDispositionController extends Controller
{
    private DischargeDispositionService $dischargeDispositionService;

    public function __construct()
    {
        $this->dischargeDispositionService = new DischargeDispositionService();
    }

    /**
     * List discharge dispositions.
     */
    public function index(): void
    {
        $dispositions = $this->dischargeDispositionService->list();

        $this->success($dispositions, 'Discharge dispositions retrieved successfully.');
    }
}
