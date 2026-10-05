<?php

namespace App\Modules\OrManagement\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\OrManagement\Services\OrIntraopService;
use App\Modules\OrManagement\Services\OrLiveService;

class OrLiveController extends Controller
{
    private OrLiveService $live;
    private OrIntraopService $intraop;

    public function __construct()
    {
        $this->live = new OrLiveService();
        $this->intraop = new OrIntraopService();
    }

    /** Query: date? */
    public function board(): void
    {
        $request = new Request();
        $this->success($this->live->board($request->input('date')), 'OR board retrieved successfully.');
    }

    /** Query: id -- the case record: stages, checklist, intra-op record. */
    public function show(): void
    {
        $request = new Request();
        $record = $this->intraop->record((int) $request->input('id'));
        if (!$record) {
            $this->error('Surgical case not found.', 404);
            return;
        }
        $this->success($record, 'Case retrieved successfully.');
    }

    /** Body: id, stage (the next one), at?, pacu_bed_no?, estimated_blood_loss_ml?, pacu_aldrete_score?, postop_disposition?, cancellation_reason? */
    public function stage(): void
    {
        $request = new Request();
        $this->respond($this->live->move((int) $request->input('id'), $request->all(), $this->userId()));
    }

    /** Body: id, reason */
    public function undo(): void
    {
        $request = new Request();
        $this->respond($this->live->undo((int) $request->input('id'), (string) $request->input('reason'), $this->userId()));
    }

    /** Body: id, reason (empty clears) */
    public function delay(): void
    {
        $request = new Request();
        $this->respond($this->live->setDelay((int) $request->input('id'), (string) $request->input('reason'), $this->userId()));
    }

    /** Body: id, phase, answers, notes? */
    public function checklist(): void
    {
        $request = new Request();
        $this->respond($this->intraop->saveCheck((int) $request->input('id'), $request->all(), $this->userId()), 201);
    }

    /** Body: id, revision, anesthesia_start_time?, anesthesia_end_time?, estimated_blood_loss_ml?, urine_output_ml? */
    public function times(): void
    {
        $request = new Request();
        $data = array_intersect_key($request->all(), array_flip(['revision', 'anesthesia_start_time', 'anesthesia_end_time', 'estimated_blood_loss_ml', 'urine_output_ml']));
        $this->respond($this->intraop->saveTimes((int) $request->input('id'), $data, $this->userId()));
    }

    public function addVitals(): void
    {
        $request = new Request();
        $this->respond($this->intraop->addVitals($request->all(), $this->userId()), 201);
    }

    /** Body: id (reading) */
    public function removeVitals(): void
    {
        $request = new Request();
        $this->respond($this->intraop->removeVitals((int) $request->input('id'), $this->userId()));
    }

    /** Query: warehouse_id, q? */
    public function stock(): void
    {
        $request = new Request();
        $this->success($this->intraop->stock((int) $request->input('warehouse_id'), (string) $request->input('q')), 'Stock retrieved successfully.');
    }

    public function addItem(): void
    {
        $request = new Request();
        $this->respond($this->intraop->addItem($request->all(), $this->userId()), 201);
    }

    /** Body: id (item), reason */
    public function voidItem(): void
    {
        $request = new Request();
        $this->respond($this->intraop->voidItem((int) $request->input('id'), (string) $request->input('reason'), $this->userId()));
    }

    public function addSpecimen(): void
    {
        $request = new Request();
        $this->respond($this->intraop->addSpecimen($request->all(), $this->userId()), 201);
    }

    /** Body: id (specimen) */
    public function removeSpecimen(): void
    {
        $request = new Request();
        $this->respond($this->intraop->removeSpecimen((int) $request->input('id'), $this->userId()));
    }

    private function userId(): int
    {
        return (int) (Session::get('user')['id'] ?? 0);
    }

    private function respond(array $result, int $successStatus = 200): void
    {
        if (!$result['success']) {
            $this->json([
                'success' => false, 'message' => $result['message'], 'errors' => $result['errors'] ?? null,
                'needs_check' => $result['needs_check'] ?? null, 'current_stage' => $result['current_stage'] ?? null
            ], !empty($result['not_found']) ? 404 : 422);
            return;
        }

        $this->success($result['data'] ?? null, $result['message'], $successStatus);
    }
}
