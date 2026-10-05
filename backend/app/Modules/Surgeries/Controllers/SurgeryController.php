<?php

namespace App\Modules\Surgeries\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Surgeries\Services\SurgeryService;

class SurgeryController extends Controller
{
    private const FIELDS = [
        'name', 'description', 'specialization_id', 'code', 'category', 'default_duration_minutes', 'default_anesthesia_type',
        'wound_class', 'requires_laterality', 'usually_needs_blood', 'usually_needs_implants', 'default_or_fee', 'is_active', 'preference_items'
    ];

    private SurgeryService $surgeryService;

    public function __construct()
    {
        $this->surgeryService = new SurgeryService();
    }

    /** Query: specialization_id?, include_inactive?, q? -- a plain list (also the chart's past-surgery picker). */
    public function index(): void
    {
        $request = new Request();
        $surgeries = $this->surgeryService->list([
            'specialization_id' => $request->input('specialization_id'),
            'include_inactive' => in_array((string) $request->input('include_inactive'), ['1', 'true'], true),
            'q' => $request->input('q')
        ]);
        $this->success($surgeries, 'Surgeries retrieved successfully.');
    }

    /** Query: id -- with its preference card. */
    public function show(): void
    {
        $request = new Request();
        $surgery = $this->surgeryService->get((int) $request->input('id'));

        if (!$surgery) {
            $this->error('Surgery not found.', 404);
            return;
        }

        $this->success($surgery, 'Surgery retrieved successfully.');
    }

    public function options(): void
    {
        $this->success($this->surgeryService->options(), 'Options retrieved successfully.');
    }

    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();
        $this->respond($this->surgeryService->register($request->only(self::FIELDS), (int) $admin['id']), 201);
    }

    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();
        $this->respond($this->surgeryService->update((int) $request->input('id'), $request->only(self::FIELDS), (int) $admin['id']));
    }

    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $result = $this->surgeryService->remove((int) $request->input('id'), (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
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
