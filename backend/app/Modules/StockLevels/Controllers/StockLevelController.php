<?php

namespace App\Modules\StockLevels\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\StockLevels\Services\StockLevelService;

class StockLevelController extends Controller
{
    private StockLevelService $service;

    public function __construct()
    {
        $this->service = new StockLevelService();
    }

    public function options(): void
    {
        $this->success($this->service->options(), 'Options retrieved successfully.');
    }

    /** Query: warehouse_id */
    public function levels(): void
    {
        $request = new Request();
        $levels = $this->service->levels((int) $request->input('warehouse_id'));

        if (!$levels) {
            $this->error('Storage location not found.', 404);
            return;
        }

        $this->success($levels, 'Stock levels retrieved successfully.');
    }

    /** Body: warehouse_id, levels: [{drug_id, min_level, max_level}] */
    public function save(): void
    {
        $request = new Request();
        $levels = $request->input('levels');

        $this->respond($this->service->save(
            (int) $request->input('warehouse_id'),
            is_array($levels) ? array_values(array_filter($levels, 'is_array')) : [],
            (int) (Session::get('user')['id'] ?? 0)
        ));
    }

    /** Body: from_warehouse_id, to_warehouse_id, overwrite? */
    public function copy(): void
    {
        $request = new Request();

        $this->respond($this->service->copy(
            (int) $request->input('from_warehouse_id'),
            (int) $request->input('to_warehouse_id'),
            in_array((string) $request->input('overwrite'), ['1', 'true'], true) || $request->input('overwrite') === true,
            (int) (Session::get('user')['id'] ?? 0)
        ));
    }

    /** Query: warehouse_id? -- for the pharmacy dashboard. */
    public function lowStock(): void
    {
        $request = new Request();

        $this->success($this->service->lowStock(['warehouse_id' => $request->input('warehouse_id')]), 'Low stock retrieved successfully.');
    }

    private function respond(array $result): void
    {
        if (!$result['success']) {
            $this->error($result['message'], !empty($result['not_found']) ? 404 : 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'] ?? null, $result['message']);
    }
}
