<?php

namespace App\Modules\ResultsInbox\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\ResultsInbox\Services\ResultsInboxService;

class ResultsInboxController extends Controller
{
    private ResultsInboxService $service;

    public function __construct()
    {
        $this->service = new ResultsInboxService();
    }

    /** Query: view? (new | recent) -- the signed-in person's results inbox */
    public function index(): void
    {
        $request = new Request();
        $view = $request->input('view') === 'recent' ? 'recent' : 'new';
        $this->success($this->service->list((int) (Session::get('user')['id'] ?? 0), $view), 'Retrieved.');
    }

    /** For the "!" in the top bar: new results and how many are critical. */
    public function count(): void
    {
        $this->success($this->service->count((int) (Session::get('user')['id'] ?? 0)), 'Retrieved.');
    }

    /** Body: id -- open a result (no longer new); returns it */
    public function open(): void
    {
        $request = new Request();
        $result = $this->service->open((int) $request->input('id'), Session::get('user') ?? []);
        if (!$result['success']) {
            $this->json(['success' => false, 'message' => $result['message']], !empty($result['not_found']) ? 404 : 422);
            return;
        }
        $this->success($result['data'], $result['message']);
    }
}
