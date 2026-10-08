<?php

namespace App\Modules\Displays\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Displays\Services\DisplayService;

class DisplayController extends Controller
{
    private DisplayService $service;

    public function __construct()
    {
        $this->service = new DisplayService();
    }

    /**
     * The TV's feed. No user login: the device's display key comes in the X-Display-Key header
     * (never in the URL, so it stays out of server logs).
     */
    public function feed(): void
    {
        $key = (string) ($_SERVER['HTTP_X_DISPLAY_KEY'] ?? '');
        $data = $this->service->feed($key, (new Request())->ip(), (string) ($_SERVER['HTTP_USER_AGENT'] ?? ''));
        if ($data === null) {
            $this->json(['success' => false, 'message' => 'This display is not registered (or its key was changed).', 'code' => 'unknown_display'], 401);
            return;
        }
        $this->success($data, 'OK');
    }

    public function index(): void
    {
        $this->success($this->service->list(), 'Retrieved.');
    }

    public function options(): void
    {
        $this->success($this->service->options(), 'Retrieved.');
    }

    /** Query: id */
    public function show(): void
    {
        $d = $this->service->show((int) (new Request())->input('id'));
        if (!$d) {
            $this->json(['success' => false, 'message' => 'Display not found.'], 404);
            return;
        }
        $this->success($d, 'Retrieved.');
    }

    /** Body: id?, name, kind, ward_id?, bed_id?, or_suite_id?, location_note?, refresh_seconds?, notes? */
    public function save(): void
    {
        $request = new Request();
        $this->respond($this->service->save($request->all(), Session::get('user') ?? []));
    }

    /** Body: id */
    public function newKey(): void
    {
        $this->respond($this->service->newKey((int) (new Request())->input('id'), Session::get('user') ?? []));
    }

    /** Body: id, on (1 | 0), reason? */
    public function power(): void
    {
        $request = new Request();
        $this->respond($this->service->setEnabled((int) $request->input('id'), (bool) (int) $request->input('on'), (string) ($request->input('reason') ?? ''),
            Session::get('user') ?? []));
    }

    /** Body: id */
    public function reload(): void
    {
        $this->respond($this->service->reload((int) (new Request())->input('id'), Session::get('user') ?? []));
    }

    /** Body: id */
    public function destroy(): void
    {
        $this->respond($this->service->delete((int) (new Request())->input('id'), Session::get('user') ?? []));
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
