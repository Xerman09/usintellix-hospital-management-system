<?php

namespace App\Modules\Alerts\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Alerts\Services\AlertService;

class AlertController extends Controller
{
    /** Roles that may send an alert by hand. Only admins may send to everyone. */
    private const SENDERS = ['admin', 'doctor', 'nurse'];

    private AlertService $service;

    public function __construct()
    {
        $this->service = new AlertService();
    }

    /** The bell: unread count, alerts waiting for an acknowledgement, the latest few. */
    public function poll(): void
    {
        $this->success($this->service->poll($this->user()), 'Alerts retrieved.');
    }

    /** Query: status?, urgency?, type?, q?, page? */
    public function index(): void
    {
        $request = new Request();
        $filters = array_intersect_key($request->all(), array_flip(['status', 'urgency', 'type', 'q', 'page']));
        $data = $this->service->list($this->user(), $filters);
        $data['can_send'] = in_array($this->user()['role'] ?? '', self::SENDERS, true);
        $data['can_send_everyone'] = ($this->user()['role'] ?? '') === 'admin';
        $this->success($data, 'Alerts retrieved.');
    }

    /** Query: id -- with who it was for and who saw / opened / acknowledged it. */
    public function show(): void
    {
        $request = new Request();
        $alert = $this->service->detail((int) $request->input('id'), $this->user());
        if (!$alert) {
            $this->error('Alert not found.', 404);
            return;
        }
        $this->success($alert, 'Alert retrieved.');
    }

    /** Body: ids[] -- the list / pop-up was shown. */
    public function seen(): void
    {
        $request = new Request();
        $ids = $request->input('ids');
        $count = $this->service->markSeen(is_array($ids) ? $ids : [], $this->user());
        $this->success(['count' => $count], 'Marked as seen.');
    }

    /** Body: id */
    public function read(): void
    {
        $request = new Request();
        $this->respond($this->service->markRead((int) $request->input('id'), $this->user()));
    }

    public function readAll(): void
    {
        $this->respond($this->service->markAllRead($this->user()));
    }

    /** Body: id, note? */
    public function acknowledge(): void
    {
        $request = new Request();
        $this->respond($this->service->acknowledge((int) $request->input('id'), $this->user(), (string) $request->input('note', '')));
    }

    public function options(): void
    {
        $this->success($this->service->options(), 'Options retrieved.');
    }

    /** Body: urgency, title, body?, patient_id?, targets[] ({type, id|role}), requires_ack? */
    public function send(): void
    {
        $user = $this->user();
        if (!in_array($user['role'] ?? '', self::SENDERS, true)) {
            $this->error('You are not allowed to send alerts.', 403);
            return;
        }
        $request = new Request();
        $targets = $request->input('targets');
        $targets = is_array($targets) ? $targets : [];
        foreach ($targets as $t) {
            if (is_array($t) && (($t['type'] ?? null) === 'everyone' || array_key_exists('everyone', $t)) && ($user['role'] ?? '') !== 'admin') {
                $this->error('Only an admin can send an alert to everyone.', 403);
                return;
            }
        }
        $data = [
            'type' => 'manual',
            'urgency' => $request->input('urgency', 'info'),
            'title' => $request->input('title'),
            'body' => $request->input('body'),
            'patient_id' => $request->input('patient_id'),
            'targets' => $targets,
            'requires_ack' => (bool) $request->input('requires_ack', false),
        ];
        $this->respond(AlertService::raise($data, (int) $user['id']), 201);
    }

    private function user(): array
    {
        return Session::get('user') ?? [];
    }

    private function respond(array $result, int $successStatus = 200): void
    {
        if (!$result['success']) {
            $this->json(['success' => false, 'message' => $result['message'], 'errors' => $result['errors'] ?? null],
                !empty($result['not_found']) ? 404 : 422);
            return;
        }
        $this->success($result['data'] ?? null, $result['message'], $successStatus);
    }
}
