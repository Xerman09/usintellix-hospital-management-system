<?php

namespace App\Modules\CodeBlue\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\CodeBlue\Services\CodeBlueRecordService;
use App\Modules\CodeBlue\Services\CodeBlueService;

class CodeBlueController extends Controller
{
    private CodeBlueService $service;

    public function __construct()
    {
        $this->service = new CodeBlueService();
    }

    /** Codes on now, the last codes, and the call form's choices. */
    public function index(): void
    {
        $db = \App\Core\Database::connection();
        $user = Session::get('user') ?? [];
        $records = new CodeBlueRecordService();
        $active = array_map(fn($e) => $e + ['can_record' => $records->canRecord($e['id'], $user)], $this->service->active(true));
        $this->success([
            'active' => $active,
            'record_options' => CodeBlueRecordService::options(),
            'history' => $this->service->history(20),
            'wards' => $db->query("SELECT id, ward_name AS name FROM hospital_wards WHERE is_active = 1 ORDER BY ward_name")->fetchAll(\PDO::FETCH_ASSOC),
            'patients' => $db->query(
                "SELECT a.id AS admission_id, a.patient_id, a.patient_name, w.ward_name, b.room_number, b.bed_number FROM inpatient_admissions a
                 JOIN hospital_wards w ON w.id = a.ward_id JOIN hospital_beds b ON b.id = a.bed_id
                 WHERE a.status IN ('Admitted', 'Pending Discharge') ORDER BY w.ward_name, b.room_number, b.bed_number"
            )->fetchAll(\PDO::FETCH_ASSOC),
            'on_team' => (bool) $db->query("SELECT 1 FROM code_blue_team WHERE user_id = " . (int) (Session::get('user')['id'] ?? 0))->fetchColumn(),
        ], 'Retrieved.');
    }

    /** Query: id. The code with its record (and whether this person may add to it). */
    public function show(): void
    {
        $e = $this->service->show((int) (new Request())->input('id'), true);
        if (!$e) {
            $this->json(['success' => false, 'message' => 'Code Blue not found.'], 404);
            return;
        }
        $user = Session::get('user') ?? [];
        $db = \App\Core\Database::connection();
        $e['can_record'] = (new CodeBlueRecordService())->canRecord($e['id'], $user);
        $e['can_outcome'] = $e['status'] === 'ended' && $e['can_record']
            && CodeBlueService::mayEnd($db, ['called_by' => $e['called_by']], $user);
        $e['record_options'] = CodeBlueRecordService::options();
        $this->success($e, 'Retrieved.');
    }

    /** Body: id, kind, value?, dose?, unit?, route?, energy?, note?, time? */
    public function record(): void
    {
        $this->respond((new CodeBlueRecordService())->add((new Request())->all(), Session::get('user') ?? []));
    }

    /** Body: entry_id, time? | remove (1) + reason? */
    public function fixRecord(): void
    {
        $this->respond((new CodeBlueRecordService())->fix((new Request())->all(), Session::get('user') ?? []));
    }

    /** Body: id, outcome, outcome_time */
    public function outcome(): void
    {
        $this->respond((new CodeBlueRecordService())->outcome((new Request())->all(), Session::get('user') ?? []));
    }

    /** Body: admission_id? | patient_id?, ward_id?, location?, detail?, from? */
    public function call(): void
    {
        $request = new Request();
        $this->respond($this->service->call($request->all(), Session::get('user') ?? []));
    }

    /** Body: id, responding (1 | 0) */
    public function answer(): void
    {
        $request = new Request();
        $this->respond($this->service->respond((int) $request->input('id'), (string) $request->input('responding') !== '0', Session::get('user') ?? []));
    }

    /** Body: id, reason (ended | false_alarm), note?, outcome (rosc | icu | died), outcome_time? */
    public function end(): void
    {
        $request = new Request();
        $this->respond($this->service->end((int) $request->input('id'), $request->all(), Session::get('user') ?? []));
    }

    public function team(): void
    {
        $this->success($this->service->team(), 'Retrieved.');
    }

    /** Body: user_id, team_role? */
    public function addMember(): void
    {
        $request = new Request();
        $this->respond($this->service->addMember((int) $request->input('user_id'), (string) ($request->input('team_role') ?? ''), Session::get('user') ?? []));
    }

    /** Body: user_id */
    public function removeMember(): void
    {
        $this->respond($this->service->removeMember((int) (new Request())->input('user_id')));
    }

    private function respond(array $result): void
    {
        if (!$result['success']) {
            $code = !empty($result['not_found']) ? 404 : (!empty($result['forbidden']) ? 403 : 422);
            $this->json(['success' => false, 'message' => $result['message'], 'errors' => $result['errors'] ?? null], $code);
            return;
        }
        $this->success($result['data'] ?? null, $result['message']);
    }
}
