<?php

namespace App\Modules\Dispensing\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Dispensing\Services\DispensingService;

class DispensingController extends Controller
{
    private DispensingService $service;

    public function __construct()
    {
        $this->service = new DispensingService();
    }

    /** Query: view?, q? */
    public function index(): void
    {
        $request = new Request();

        $this->success($this->service->queue([
            'view' => $request->input('view'),
            'q' => $request->input('q')
        ]), 'Prescriptions retrieved successfully.');
    }

    /** Query: id (prescription) */
    public function show(): void
    {
        $request = new Request();
        $detail = $this->service->detail((int) $request->input('id'));

        if (!$detail) {
            $this->error('Prescription not found.', 404);
            return;
        }

        $this->success($detail, 'Prescription retrieved successfully.');
    }

    public function options(): void
    {
        $this->success($this->service->options(), 'Options retrieved successfully.');
    }

    /** Body: prescription_id, warehouse_id, items[], notes? */
    public function store(): void
    {
        $request = new Request();
        $this->respond($this->service->dispense($request->only(['prescription_id', 'warehouse_id', 'items', 'notes']), Session::get('user')), 201);
    }

    /** Body: id (dispensing), reason */
    public function void(): void
    {
        $request = new Request();
        $this->respond($this->service->void((int) $request->input('id'), (string) $request->input('reason'), Session::get('user')));
    }

    /** Body: id (prescription), reason */
    public function close(): void
    {
        $request = new Request();
        $this->respond($this->service->close((int) $request->input('id'), (string) $request->input('reason'), Session::get('user')));
    }

    /** Query: id (dispensing) */
    public function labels(): void
    {
        $request = new Request();
        $labels = $this->service->labels((int) $request->input('id'));

        if (!$labels) {
            $this->error('Dispensing not found.', 404);
            return;
        }

        $this->success($labels, 'Labels retrieved successfully.');
    }

    private function respond(array $result, int $successStatus = 200): void
    {
        if (!$result['success']) {
            $this->error($result['message'], !empty($result['not_found']) ? 404 : 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'] ?? null, $result['message'], $successStatus);
    }
}
