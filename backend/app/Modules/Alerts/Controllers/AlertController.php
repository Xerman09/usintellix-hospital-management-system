<?php

namespace App\Modules\Alerts\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\RoleAccess;
use App\Core\Session;
use App\Modules\Alerts\Services\AlertEscalationService;
use App\Modules\Alerts\Services\AlertReportService;
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
        $data['can_send'] = RoleAccess::inList((string) ($this->user()['role'] ?? ''), self::SENDERS);
        $data['can_send_everyone'] = ($this->user()['role'] ?? '') === 'admin';
        $data['can_manage'] = ($this->user()['role'] ?? '') === 'admin';
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
        if (!RoleAccess::inList((string) ($user['role'] ?? ''), self::SENDERS)) {
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

    /** Admin: escalation chains per alert type. */
    public function escalationSettings(): void
    {
        $this->success((new AlertEscalationService())->settings(), 'Escalation settings retrieved.');
    }

    /** Admin. Body: alert_type, applies_to, is_active, steps[] */
    public function saveEscalation(): void
    {
        $request = new Request();
        $this->respond((new AlertEscalationService())->save($request->all(), (int) ($this->user()['id'] ?? 0)));
    }

    /** Admin. Body: alert_type */
    public function removeEscalation(): void
    {
        $request = new Request();
        $this->respond((new AlertEscalationService())->remove((string) $request->input('alert_type')));
    }

    /** Admin. Query: from?, to?, type?, urgency? */
    public function report(): void
    {
        $request = new Request();
        $filters = array_intersect_key($request->all(), array_flip(['from', 'to', 'type', 'urgency']));
        $this->success((new AlertReportService())->report($filters), 'Alert report retrieved.');
    }

    private function user(): array
    {
        return Session::get('user') ?? [];
    }

    private function respond(array $result, int $successStatus = 200): void
    {
        if (!$result['success']) {
            $this->json(['success' => false, 'message' => $result['message'], 'errors' => $result['errors'] ?? null,
                'needs_readback' => !empty($result['needs_readback'])], !empty($result['not_found']) ? 404 : 422);
            return;
        }
        $this->success($result['data'] ?? null, $result['message'], $successStatus);
    }
}
