<?php

namespace App\Modules\PatientFlow\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PatientFlow\Services\QueueTokenService;

class QueueTokenController extends Controller
{
    private QueueTokenService $queueTokenService;

    public function __construct()
    {
        $this->queueTokenService = new QueueTokenService();
    }

    /**
     * List queue tokens for today / filtered
     */
    public function index(): void
    {
        $request = new Request();
        $filters = [
            'date'            => $request->input('date') ?: date('Y-m-d'),
            'department_code' => $request->input('department_code'),
            'status'          => $request->input('status'),
            'priority'        => $request->input('priority')
        ];

        $tokens = $this->queueTokenService->listTokens($filters);

        $this->success($tokens, 'Queue tokens retrieved successfully.');
    }

    /**
     * Generate sequential queue token for an appointment check-in
     */
    public function generate(): void
    {
        $user = Session::get('user') ?? ['id' => 1, 'role' => 'receptionist'];
        $request = new Request();

        $appointmentId = (int)$request->input('appointment_id');
        if (!$appointmentId) {
            $this->error('Appointment ID is required to generate a queue token.', 422);
            return;
        }

        $data = [
            'department_id'   => $request->input('department_id'),
            'department_code' => $request->input('department_code'),
            'priority'        => $request->input('priority', 'routine'),
            'notes'           => $request->input('notes')
        ];

        $result = $this->queueTokenService->generateTokenForCheckIn($appointmentId, $data, $user);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result, $result['message'], 201);
    }

    /**
     * Call token on display / audio announcement
     */
    public function call(): void
    {
        $user = Session::get('user') ?? ['id' => 1, 'role' => 'receptionist'];
        $request = new Request();

        $tokenId = (int)$request->input('token_id');
        $roomId = $request->input('room_id') ? (int)$request->input('room_id') : null;

        if (!$tokenId) {
            $this->error('Token ID is required.', 422);
            return;
        }

        $result = $this->queueTokenService->callToken($tokenId, $user, $roomId);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result, $result['message']);
    }

    /**
     * Transition token to in-consultation
     */
    public function serve(): void
    {
        $user = Session::get('user') ?? ['id' => 1, 'role' => 'doctor'];
        $request = new Request();

        $tokenId = (int)$request->input('token_id');
        $roomId = $request->input('room_id') ? (int)$request->input('room_id') : null;

        if (!$tokenId) {
            $this->error('Token ID is required.', 422);
            return;
        }

        $result = $this->queueTokenService->serveToken($tokenId, $user, $roomId);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result, $result['message']);
    }

    /**
     * Complete token consultation
     */
    public function complete(): void
    {
        $user = Session::get('user') ?? ['id' => 1, 'role' => 'doctor'];
        $request = new Request();

        $tokenId = (int)$request->input('token_id');

        if (!$tokenId) {
            $this->error('Token ID is required.', 422);
            return;
        }

        $result = $this->queueTokenService->completeToken($tokenId, $user);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result, $result['message']);
    }

    /**
     * Real-time Queue Display Board feed (Waiting Room TVs)
     */
    public function displayBoard(): void
    {
        $request = new Request();
        $facilityId = $request->input('facility_id') ? (int)$request->input('facility_id') : null;
        $departmentCode = $request->input('department_code');

        $board = $this->queueTokenService->getQueueDisplayBoard($facilityId, $departmentCode);

        $this->success($board, 'Queue display board data retrieved.');
    }

    /**
     * Print-ready token slip HTML
     */
    public function slip(): void
    {
        $request = new Request();
        $tokenId = (int)$request->input('token_id');

        if (!$tokenId) {
            http_response_code(400);
            echo "Token ID required.";
            return;
        }

        header('Content-Type: text/html; charset=utf-8');
        echo $this->queueTokenService->generateTokenSlipHtml($tokenId);
        exit;
    }
}
