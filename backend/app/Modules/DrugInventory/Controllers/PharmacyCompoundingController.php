<?php

declare(strict_types=1);

namespace App\Modules\DrugInventory\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\DrugInventory\Services\PharmacyCompoundingService;

class PharmacyCompoundingController extends Controller
{
    private PharmacyCompoundingService $service;

    public function __construct()
    {
        $this->service = new PharmacyCompoundingService();
    }

    /**
     * List all compounding records.
     * GET /drug-inventory/compounding
     */
    public function index(): void
    {
        $request = new Request();
        $filters = [
            'status' => $request->input('status'),
            'formulation_type' => $request->input('formulation_type'),
            'patient_id' => $request->input('patient_id'),
            'search' => $request->input('search')
        ];

        $records = $this->service->listRecords($filters);
        $this->success($records, 'Compounding records retrieved successfully.');
    }

    /**
     * Get details of a compounding record including ingredients and dual signatures.
     * GET /drug-inventory/compounding/detail?id={id}
     */
    public function detail(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if ($id <= 0) {
            $this->error('Record ID is required.', 422);
            return;
        }

        $details = $this->service->getRecordDetails($id);
        if (!$details) {
            $this->error('Compounding record not found.', 404);
            return;
        }

        $this->success($details, 'Compounding record details retrieved.');
    }

    /**
     * List active master formulas.
     * GET /drug-inventory/compounding/formulas
     */
    public function formulas(): void
    {
        $request = new Request();
        $type = $request->input('type');

        $formulas = $this->service->listFormulas($type ? (string) $type : null);
        $this->success($formulas, 'Master compounding formulas retrieved.');
    }

    /**
     * Create a new extemporaneous compounding record.
     * POST /drug-inventory/compounding
     */
    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);

        $data = [
            'formulation_name' => $request->input('formulation_name'),
            'formulation_type' => $request->input('formulation_type', 'iv_admixture'),
            'formula_id' => $request->input('formula_id'),
            'patient_id' => $request->input('patient_id'),
            'prescription_id' => $request->input('prescription_id'),
            'yield_quantity' => $request->input('yield_quantity', 1.0),
            'yield_unit' => $request->input('yield_unit', 'mL'),
            'cleanroom_hood_number' => $request->input('cleanroom_hood_number'),
            'cleanroom_suite' => $request->input('cleanroom_suite', 'Central Pharmacy Cleanroom Suite'),
            'prepared_at' => $request->input('prepared_at'),
            'bud_hours' => $request->input('bud_hours', 24),
            'beyond_use_date' => $request->input('beyond_use_date'),
            'storage_condition' => $request->input('storage_condition', 'Refrigerate (2-8°C)'),
            'special_instructions' => $request->input('special_instructions'),
            'preparation_notes' => $request->input('preparation_notes'),
            'ingredients' => $request->input('ingredients', [])
        ];

        $result = $this->service->createRecord($data, $userId);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result, $result['message'], 201);
    }

    /**
     * Second Pharmacist Dual Inspection Sign-Off.
     * POST /drug-inventory/compounding/inspect
     */
    public function inspect(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $verifierUserId = (int) ($user['id'] ?? 1);

        $recordId = (int) $request->input('compounding_id');
        if ($recordId <= 0) {
            $this->error('Compounding ID is required.', 422);
            return;
        }

        $data = [
            'decision' => $request->input('decision', 'approved'),
            'particulate_free' => $request->input('particulate_free', false),
            'container_intact' => $request->input('container_intact', false),
            'labeling_correct' => $request->input('labeling_correct', false),
            'volume_verified' => $request->input('volume_verified', false),
            'bud_verified' => $request->input('bud_verified', false),
            'inspection_notes' => $request->input('inspection_notes', ''),
            'emergency_self_sign_override' => $request->input('emergency_self_sign_override', false)
        ];

        $result = $this->service->inspectRecord($recordId, $data, $verifierUserId);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result, $result['message']);
    }

    /**
     * Get formulation label data for printing.
     * GET /drug-inventory/compounding/label?id={id}
     */
    public function label(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if ($id <= 0) {
            $this->error('Record ID is required.', 422);
            return;
        }

        $label = $this->service->getLabelData($id);
        if (!$label) {
            $this->error('Record not found.', 404);
            return;
        }

        $this->success($label, 'Label data retrieved.');
    }
}
