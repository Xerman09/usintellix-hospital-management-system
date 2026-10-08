<?php

namespace App\Modules\InpatientVitals\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\InpatientVitals\Services\FallRiskService;

class FallRiskController extends Controller
{
    /** Query: admission_id -- current fall risk, last assessments, the Morse questions */
    public function show(): void
    {
        $r = (new FallRiskService())->current((int) (new Request())->input('admission_id'));
        if (!$r) {
            $this->json(['success' => false, 'message' => 'Admission not found.'], 404);
            return;
        }
        $this->success($r, 'Retrieved.');
    }

    /** Body: admission_id, items {history, secondary_dx, ambulatory_aid, iv, gait, mental}, note? */
    public function assess(): void
    {
        $request = new Request();
        $r = (new FallRiskService())->assess((int) $request->input('admission_id'), $request->all(), Session::get('user') ?? []);
        if (!$r['success']) {
            $this->json(['success' => false, 'message' => $r['message'], 'errors' => $r['errors'] ?? null], !empty($r['not_found']) ? 404 : 422);
            return;
        }
        $this->success($r['data'], $r['message']);
    }
}
