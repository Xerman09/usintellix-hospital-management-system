<?php

namespace App\Modules\OrManagement\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Modules\OrManagement\Services\OrReportService;

class OrReportController extends Controller
{
    private const FILTERS = ['date_from', 'date_to', 'specialization_id', 'suite_id', 'hours_per_day', 'operating_days'];

    private OrReportService $service;

    public function __construct()
    {
        $this->service = new OrReportService();
    }

    public function options(): void
    {
        $this->success($this->service->options(), 'Options retrieved successfully.');
    }

    /** Query: date_from, date_to, specialization_id?, suite_id?, hours_per_day?, operating_days? */
    public function utilization(): void
    {
        $this->success($this->service->utilization($this->filters()), 'Report retrieved successfully.');
    }

    public function timeliness(): void
    {
        $this->success($this->service->timeliness($this->filters()), 'Report retrieved successfully.');
    }

    public function cancellations(): void
    {
        $this->success($this->service->cancellations($this->filters()), 'Report retrieved successfully.');
    }

    public function volume(): void
    {
        $this->success($this->service->volume($this->filters()), 'Report retrieved successfully.');
    }

    public function compliance(): void
    {
        $this->success($this->service->compliance($this->filters()), 'Report retrieved successfully.');
    }

    public function ssi(): void
    {
        $this->success($this->service->ssi($this->filters()), 'Report retrieved successfully.');
    }

    private function filters(): array
    {
        return (new Request())->only(self::FILTERS);
    }
}
