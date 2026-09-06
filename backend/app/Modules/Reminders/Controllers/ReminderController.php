<?php

namespace App\Modules\Reminders\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Reminders\Services\ReminderService;

class ReminderController extends Controller
{
    private ReminderService $reminderService;

    public function __construct()
    {
        $this->reminderService = new ReminderService();
    }

    /**
     * Every reminder the logged-in user sent or was sent.
     */
    public function mine(): void
    {
        $user = Session::get('user');

        $reminders = $this->reminderService->listMine((int) $user['id']);

        $this->success($reminders, 'Reminders retrieved successfully.');
    }

    /**
     * Send a new dated reminder.
     * Body: { recipient_ids: [...], patient_id?, due_date?, priority?, body, require_each_complete? }
     */
    public function store(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $data = $request->only([
            'patient_id', 'due_date', 'priority', 'body', 'require_each_complete', 'recipient_ids'
        ]);

        $result = $this->reminderService->store($data, (int) $user['id']);

        if (!$result['success']) {
            $status = isset($result['errors']) ? 422 : 404;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Mark the logged-in user's own copy of a reminder as completed.
     * Body: { reminder_id }
     */
    public function complete(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $reminderId = (int) $request->input('reminder_id');
        $result = $this->reminderService->complete($reminderId, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Remove a reminder (sender only). Body: { id }
     */
    public function destroy(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $result = $this->reminderService->remove($id, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
