<?php

namespace App\Modules\Procurement\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Procurement\Services\ApprovalLimitService;
use App\Modules\Procurement\Services\ProcurementReportService;

class ProcurementController extends Controller
{
    private ProcurementReportService $reports;

    public function __construct()
    {
        $this->reports = new ProcurementReportService();
    }

    public function options(): void
    {
        $this->success($this->reports->options(), 'Options retrieved successfully.');
    }

    /** Query: supplier_id?, warehouse_id?, late_only?, date_from?, date_to? */
    public function openOrders(): void
    {
        $this->success($this->reports->openOrders($this->filters(['late_only'])), 'Report retrieved successfully.');
    }

    public function supplierPerformance(): void
    {
        $this->success($this->reports->supplierPerformance($this->filters()), 'Report retrieved successfully.');
    }

    /** Query: group_by, department_id?, ... */
    public function spend(): void
    {
        $this->success($this->reports->spend($this->filters(['group_by', 'department_id'])), 'Report retrieved successfully.');
    }

    /** Query: drug_id, ... */
    public function priceHistory(): void
    {
        $report = $this->reports->priceHistory($this->filters(['drug_id']));

        if ($report === null) {
            $this->error('Choose an item.', 422);
            return;
        }

        $this->success($report, 'Report retrieved successfully.');
    }

    /** Query: direction? (higher|lower), ... */
    public function priceDifferences(): void
    {
        $this->success($this->reports->priceDifferences($this->filters(['direction'])), 'Report retrieved successfully.');
    }

    public function limits(): void
    {
        $this->success((new ApprovalLimitService())->all(), 'Approval limits retrieved successfully.');
    }

    /** Body: limits: [{document_type, is_enabled, limit_amount}] */
    public function updateLimits(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $result = (new ApprovalLimitService())->update(['limits' => $request->input('limits', [])], (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    private function filters(array $extra = []): array
    {
        $request = new Request();
        $filters = [];

        foreach (array_merge(['date_from', 'date_to', 'supplier_id', 'warehouse_id'], $extra) as $key) {
            $filters[$key] = $request->input($key);
        }

        return $filters;
    }
}
