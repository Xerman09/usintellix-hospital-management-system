<?php

namespace App\Modules\Messaging\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Messaging\Services\MessageCatalogService;
use App\Modules\Messaging\Services\MessagingService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class MessagingController extends Controller
{
    private MessagingService $messagingService;
    private MessageCatalogService $typeService;
    private MessageCatalogService $statusService;
    private ProviderService $providerService;

    public function __construct()
    {
        $this->messagingService = new MessagingService();
        $this->typeService = new MessageCatalogService('message_types', 'Message type');
        $this->statusService = new MessageCatalogService('message_statuses', 'Message status');
        $this->providerService = new ProviderService();
    }

    /**
     * List the logged-in user's conversations.
     */
    public function index(): void
    {
        $user = Session::get('user');

        $conversations = $this->messagingService->listConversations((int) $user['id']);

        $this->success($conversations, 'Conversations retrieved successfully.');
    }

    /**
     * Create a new conversation. Body: { participant_ids: [...], subject? }
     */
    public function store(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $participantIds = $request->input('participant_ids', []);

        if (!is_array($participantIds)) {
            $this->error('participant_ids must be an array.', 422);
            return;
        }

        $result = $this->messagingService->createConversation(
            (int) $user['id'],
            $participantIds,
            $request->input('subject')
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * "My Messages" flat inbox. Query: ?scope=all|active|inactive
     */
    public function mine(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $scope = (string) $request->input('scope', 'active');

        $messages = $this->messagingService->listMine((int) $user['id'], $scope);

        $this->success($messages, 'Messages retrieved successfully.');
    }

    /**
     * Users available to start a new conversation with.
     */
    public function recipients(): void
    {
        $user = Session::get('user');

        $recipients = $this->messagingService->listRecipients((int) $user['id']);

        $this->success($recipients, 'Recipients retrieved successfully.');
    }

    /**
     * List a patient's recorded messages (patient dashboard widget).
     * Query: ?patient_id=
     */
    public function patientMessages(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $patientId = (int) $request->input('patient_id');

        if (!$patientId) {
            $this->error('Patient is required.', 422);
            return;
        }

        if (!$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $messages = $this->messagingService->listPatientMessages($patientId);

        $this->success($messages, 'Patient messages retrieved successfully.');
    }

    /**
     * Soft-delete a single message. Body: { message_id }
     */
    public function destroyMessage(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $messageId = (int) $request->input('message_id');

        $result = $this->messagingService->destroyMessage($messageId, (int) $user['id'], (string) $user['role']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Message type catalog.
     */
    public function typesIndex(): void
    {
        $this->success($this->typeService->list(), 'Message types retrieved successfully.');
    }

    public function typesStore(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $result = $this->typeService->register($request->only(['name']), (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    public function typesUpdate(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $result = $this->typeService->update($id, $request->only(['name']), (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Message type not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    public function typesDestroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $result = $this->typeService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Message status catalog.
     */
    public function statusesIndex(): void
    {
        $this->success($this->statusService->list(), 'Message statuses retrieved successfully.');
    }

    public function statusesStore(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $result = $this->statusService->register($request->only(['name']), (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    public function statusesUpdate(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $result = $this->statusService->update($id, $request->only(['name']), (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Message status not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    public function statusesDestroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $result = $this->statusService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Get a single conversation + its participants. Query: ?conversation_id=
     */
    public function show(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $conversationId = (int) $request->input('conversation_id');
        $conversation = $this->messagingService->showConversation($conversationId, (int) $user['id']);

        if (!$conversation) {
            $this->error('Conversation not found.', 404);
            return;
        }

        $this->success($conversation, 'Conversation retrieved successfully.');
    }

    /**
     * Get messages inside a conversation. Query: ?conversation_id=&limit=&offset=
     */
    public function messages(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $conversationId = (int) $request->input('conversation_id');
        $limit = (int) $request->input('limit', 50);
        $offset = (int) $request->input('offset', 0);

        $messages = $this->messagingService->listConversationMessages(
            $conversationId,
            (int) $user['id'],
            $limit ?: 50,
            $offset
        );

        if ($messages === null) {
            $this->error('Conversation not found.', 404);
            return;
        }

        $this->success($messages, 'Messages retrieved successfully.');
    }

    /**
     * Send a message. Body: { conversation_id, body, type_id?, status_id?, patient_id? }
     */
    public function send(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $conversationId = (int) $request->input('conversation_id');
        $body = (string) $request->input('body', '');

        $result = $this->messagingService->sendMessage(
            $conversationId,
            (int) $user['id'],
            $body,
            $request->only(['type_id', 'status_id', 'patient_id'])
        );

        if (!$result['success']) {
            $status = $result['message'] === 'Conversation not found.' ? 404 : 422;
            $this->error($result['message'], $status);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Mark a conversation as read. Body: { conversation_id }
     */
    public function markRead(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $conversationId = (int) $request->input('conversation_id');
        $result = $this->messagingService->markRead($conversationId, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Confirm the given patient exists and, for doctors, is assigned to them.
     * Admins and receptionists may view any active patient's messages.
     */
    private function ownsPatient(array $user, int $patientId): bool
    {
        $patient = (new Patient())->where('id', $patientId)->first();

        if (!$patient || $patient['deleted_at'] !== null) {
            return false;
        }

        if (($user['role'] ?? '') !== 'doctor') {
            return true;
        }

        $provider = $this->providerService->findByUserId((int) $user['id']);
        $providerId = $provider ? (int) $provider['id'] : 0;

        return (int) $patient['provider_id'] === $providerId;
    }
}
