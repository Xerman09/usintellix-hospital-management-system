<?php

declare(strict_types=1);

namespace App\Modules\Lab\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Lab\Services\LisSpecimenCollectionService;

class LisSpecimenCollectionController extends Controller
{
    private LisSpecimenCollectionService $service;

    public function __construct()
    {
        $this->service = new LisSpecimenCollectionService();
    }

    /**
     * List all LIS specimen collections with filters.
     * GET /lab/specimen-collections
     */
    public function index(): void
    {
        $request = new Request();
        $filters = [
            'draw_status' => $request->input('draw_status'),
            'tube_color' => $request->input('tube_color'),
            'patient_id' => $request->input('patient_id'),
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
            'search' => $request->input('search'),
            'limit' => $request->input('limit')
        ];

        $records = $this->service->list($filters);
        $this->success($records, 'Specimen collections retrieved successfully.');
    }

    /**
     * Get detail of a specimen collection.
     * GET /lab/specimen-collections/detail?id={id}
     */
    public function detail(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if ($id <= 0) {
            $this->error('Valid specimen collection ID is required.', 422);
            return;
        }

        $record = $this->service->get($id);
        if (!$record) {
            $this->error('Specimen collection not found.', 404);
            return;
        }

        $this->success($record, 'Specimen collection details retrieved.');
    }

    /**
     * Create a new specimen draw order.
     * POST /lab/specimen-collections
     */
    public function store(): void
    {
        $request = new Request();
        $actorId = (int) (Session::get('user_id') ?? Session::get('user')['id'] ?? 1);
        $payload = $request->all();

        $result = $this->service->create($payload, $actorId);
        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result, $result['message']);
    }

    /**
     * Nurse / phlebotomist marks specimen as collected at the bedside.
     * POST /lab/specimen-collections/mark-collected
     */
    public function markCollected(): void
    {
        $request = new Request();
        $actorId = (int) (Session::get('user_id') ?? Session::get('user')['id'] ?? 1);
        $id = (int) $request->input('id');

        if ($id <= 0) {
            $this->error('Collection record ID is required.', 422);
            return;
        }

        $result = $this->service->markCollected($id, $request->all(), $actorId);
        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result, $result['message']);
    }

    /**
     * Mark specimen as In Transit via courier or pneumatic tube.
     * POST /lab/specimen-collections/mark-in-transit
     */
    public function markInTransit(): void
    {
        $request = new Request();
        $actorId = (int) (Session::get('user_id') ?? Session::get('user')['id'] ?? 1);
        $id = (int) $request->input('id');

        if ($id <= 0) {
            $this->error('Collection record ID is required.', 422);
            return;
        }

        $result = $this->service->markInTransit($id, $request->all(), $actorId);
        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result, $result['message']);
    }

    /**
     * Medical Technologist accepts and marks specimen as Received in Lab.
     * POST /lab/specimen-collections/mark-received
     */
    public function markReceived(): void
    {
        $request = new Request();
        $actorId = (int) (Session::get('user_id') ?? Session::get('user')['id'] ?? 1);
        $id = (int) $request->input('id');

        if ($id <= 0) {
            $this->error('Collection record ID is required.', 422);
            return;
        }

        $result = $this->service->markReceivedInLab($id, $request->all(), $actorId);
        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result, $result['message']);
    }

    /**
     * Reject compromised specimen (Hemolyzed, Clotted, QNS, Wrong Tube) with optional immediate recollect order.
     * POST /lab/specimen-collections/reject
     */
    public function reject(): void
    {
        $request = new Request();
        $actorId = (int) (Session::get('user_id') ?? Session::get('user')['id'] ?? 1);
        $id = (int) $request->input('id');

        if ($id <= 0) {
            $this->error('Collection record ID is required.', 422);
            return;
        }

        $result = $this->service->rejectSpecimen($id, $request->all(), $actorId);
        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result, $result['message']);
    }

    /**
     * Get label data for printing thermal barcode stickers.
     * GET /lab/specimen-collections/label?id={id}
     */
    public function label(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if ($id <= 0) {
            $this->error('Collection record ID is required.', 422);
            return;
        }

        $label = $this->service->getLabelData($id);
        if (!$label) {
            $this->error('Specimen collection not found.', 404);
            return;
        }

        $this->success($label, 'Thermal barcode label data generated.');
    }

    /**
     * Phlebotomy collection KPI counters.
     * GET /lab/specimen-collections/stats
     */
    public function stats(): void
    {
        $stats = $this->service->getStats();
        $this->success($stats, 'Phlebotomy statistics retrieved.');
    }

    /**
     * Standard tube configurations and rejection reason options.
     * GET /lab/specimen-collections/tube-types
     */
    public function tubeTypes(): void
    {
        $this->success([
            'tubes' => LisSpecimenCollectionService::TUBE_COLORS,
            'statuses' => LisSpecimenCollectionService::DRAW_STATUSES,
            'rejection_reasons' => LisSpecimenCollectionService::REJECTION_REASONS
        ], 'Tube configurations and options retrieved.');
    }
}
