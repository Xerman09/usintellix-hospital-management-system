<?php

namespace App\Modules\OrManagement\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\OrManagement\Services\OrSchedulingService;

class OrScheduleController extends Controller
{
    private const PROPOSAL = [
        'or_suite_id', 'scheduled_date', 'scheduled_start_time', 'estimated_duration_minutes', 'specialization_id', 'patient_id',
        'lead_surgeon_user_id', 'assistant_surgeon_user_id', 'anesthesiologist_user_id', 'scrub_nurse_user_id', 'circulating_nurse_user_id'
    ];

    private OrSchedulingService $service;

    public function __construct()
    {
        $this->service = new OrSchedulingService();
    }

    /** Query: start?, days? (1 | 7), suite_id?, specialization_id?, surgeon_user_id? */
    public function calendar(): void
    {
        $request = new Request();
        $this->success($this->service->calendar($request->only(['start', 'days', 'suite_id', 'specialization_id', 'surgeon_user_id'])), 'OR schedule retrieved successfully.');
    }

    /** Body: a proposed booking + exclude_case_id? -- conflicts and block-time warnings, before booking. */
    public function check(): void
    {
        $request = new Request();
        $exclude = (int) $request->input('exclude_case_id') ?: null;
        $this->success($this->service->check($request->only(self::PROPOSAL), $exclude), 'Checked.');
    }

    /** Query: id (case) -- with its booking history. */
    public function show(): void
    {
        $request = new Request();
        $detail = $this->service->caseDetail((int) $request->input('id'));
        if (!$detail) {
            $this->error('Surgical case not found.', 404);
            return;
        }
        $this->success($detail, 'Case retrieved successfully.');
    }

    /** Body: request_id, or_suite_id, scheduled_date, scheduled_start_time, estimated_duration_minutes?, team ids, anesthesia_type?, team_override_reason?, acknowledge_warnings? */
    public function book(): void
    {
        $request = new Request();
        $data = $request->only(array_merge(self::PROPOSAL, ['anesthesia_type', 'team_override_reason', 'acknowledge_warnings']));
        $this->respond($this->service->book((int) $request->input('request_id'), $data, Session::get('user')), 201);
    }

    /** Body: id, or_suite_id, scheduled_date, scheduled_start_time, estimated_duration_minutes, team ids, reason?, team_override_reason?, acknowledge_warnings? */
    public function reschedule(): void
    {
        $request = new Request();
        $data = $request->only(array_merge(self::PROPOSAL, ['reason', 'team_override_reason', 'acknowledge_warnings']));
        $this->respond($this->service->reschedule((int) $request->input('id'), $data, Session::get('user')));
    }

    /** Body: id, reason, return_request? (default true) */
    public function cancel(): void
    {
        $request = new Request();
        $return = !in_array((string) $request->input('return_request'), ['0', 'false'], true);
        $this->respond($this->service->cancel((int) $request->input('id'), (string) $request->input('reason'), $return, Session::get('user')));
    }

    public function blocks(): void
    {
        $this->success($this->service->blocks(), 'Block times retrieved successfully.');
    }

    /** Body: id?, or_suite_id, specialization_id, day_of_week, start_time, end_time, effective_from?, effective_to?, notes? */
    public function saveBlock(): void
    {
        $request = new Request();
        $id = (int) $request->input('id') ?: null;
        $data = $request->only(['or_suite_id', 'specialization_id', 'day_of_week', 'start_time', 'end_time', 'effective_from', 'effective_to', 'notes']);
        $this->respond($this->service->saveBlock($id, $data, (int) Session::get('user')['id']), $id ? 200 : 201);
    }

    /** Body: id */
    public function removeBlock(): void
    {
        $request = new Request();
        $this->respond($this->service->removeBlock((int) $request->input('id'), (int) Session::get('user')['id']));
    }

    /** Body: id (suite), turnover_minutes */
    public function turnover(): void
    {
        $request = new Request();
        $this->respond($this->service->setTurnover((int) $request->input('id'), (int) $request->input('turnover_minutes')));
    }

    private function respond(array $result, int $successStatus = 200): void
    {
        if (!$result['success']) {
            $this->json([
                'success' => false, 'message' => $result['message'], 'errors' => $result['errors'] ?? null,
                'needs_ack' => !empty($result['needs_ack']), 'warnings' => $result['warnings'] ?? [], 'conflicts' => $result['conflicts'] ?? []
            ], !empty($result['not_found']) ? 404 : 422);
            return;
        }

        $this->success($result['data'] ?? null, $result['message'], $successStatus);
    }
}
