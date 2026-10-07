<?php

namespace App\Modules\ResultsInbox\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\ResultsInbox\Services\ResultReviewService;
use App\Modules\ResultsInbox\Services\ResultsInboxService;

class ResultsInboxController extends Controller
{
    private ResultsInboxService $service;

    public function __construct()
    {
        $this->service = new ResultsInboxService();
    }

    /** Query: view? (new | recent | review | overdue [admin]) -- the signed-in person's results inbox */
    public function index(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? [];
        $view = in_array($request->input('view'), ['recent', 'review', 'overdue'], true) ? $request->input('view') : 'new';
        if ($view === 'overdue' && ($user['role'] ?? '') !== 'admin') {
            $this->json(['success' => false, 'message' => 'Only an administrator can see every overdue result.'], 403);
            return;
        }
        $this->success($this->service->list((int) ($user['id'] ?? 0), $view), 'Retrieved.');
    }

    /** For the "!" in the top bar: new results and how many are critical. */
    public function count(): void
    {
        $this->success($this->service->count((int) (Session::get('user')['id'] ?? 0)), 'Retrieved.');
    }

    /** Body: id (inbox) | order_id -- open a result (no longer new); returns it with its sign-off */
    public function open(): void
    {
        $request = new Request();
        $this->respond($this->service->open(['id' => (int) $request->input('id'), 'order_id' => (int) $request->input('order_id')], Session::get('user') ?? []));
    }

    /** Body: order_id, action? (none | repeat_test | call_patient | follow_up | change_treatment | refer | other), comment? -- sign the results off */
    public function review(): void
    {
        $request = new Request();
        $this->respond((new ResultReviewService())->review((int) $request->input('order_id'), $request->all(), Session::get('user') ?? []));
    }

    /** After how many days unreviewed results are flagged, and the actions a sign-off can carry. */
    public function settings(): void
    {
        $this->success(['review_days' => ResultReviewService::days(), 'actions' => ResultReviewService::ACTIONS, 'max_days' => ResultReviewService::MAX_DAYS], 'Retrieved.');
    }

    /** Body: review_days (admin) */
    public function saveSettings(): void
    {
        $request = new Request();
        $this->respond((new ResultReviewService())->saveDays($request->input('review_days'), Session::get('user') ?? []));
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
