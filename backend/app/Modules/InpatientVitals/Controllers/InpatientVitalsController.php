<?php

namespace App\Modules\InpatientVitals\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\InpatientVitals\Services\InpatientVitalsService;

class InpatientVitalsController extends Controller
{
    private InpatientVitalsService $service;

    public function __construct()
    {
        $this->service = new InpatientVitalsService();
    }

    /** Query: ward_id? -- the ward's patients, latest vitals, what is due. */
    public function board(): void
    {
        $request = new Request();
        $this->success($this->service->board(['ward_id' => $request->input('ward_id')], $this->user()), 'Retrieved.');
    }

    /** Query: patient_id -- the chart widget (null when not admitted). */
    public function patient(): void
    {
        $request = new Request();
        $data = $this->service->forPatient((int) $request->input('patient_id'));
        $this->success($data, $data ? 'Retrieved.' : 'Not admitted.');
    }

    /** Query: admission_id, hours? (24 / 72 / 168 / 0 = whole stay) */
    public function history(): void
    {
        $request = new Request();
        $hours = (int) $request->input('hours', 72);
        $this->success($this->service->history((int) $request->input('admission_id'), max(0, min($hours, 24 * 90))), 'Retrieved.');
    }

    public function record(): void
    {
        $request = new Request();
        $this->respond($this->service->record($request->all(), $this->user()), 201);
    }

    /** Body: id, reason */
    public function void(): void
    {
        $request = new Request();
        $this->respond($this->service->void((int) $request->input('id'), (string) $request->input('reason', ''), $this->user()));
    }

    /** Body: admission_id, every_hours, reason? */
    public function schedule(): void
    {
        $request = new Request();
        $this->respond($this->service->setSchedule($request->all(), $this->user()));
    }

    /** Body: admission_id, spo2_scale (1|2), reason? -- doctors / admins (checked in the service). */
    public function scale(): void
    {
        $request = new Request();
        $this->respond($this->service->setScale($request->all(), $this->user()));
    }

    private function user(): array
    {
        return Session::get('user') ?? [];
    }

    private function respond(array $result, int $status = 200): void
    {
        if (!$result['success']) {
            $code = !empty($result['not_found']) ? 404 : (!empty($result['forbidden']) ? 403 : 422);
            $this->json(['success' => false, 'message' => $result['message'], 'errors' => $result['errors'] ?? null], $code);
            return;
        }
        $this->success($result['data'] ?? null, $result['message'], $status);
    }
}
