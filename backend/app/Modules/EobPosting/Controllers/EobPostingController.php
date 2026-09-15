<?php

namespace App\Modules\EobPosting\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\EobPosting\Services\EobPostingService;
use App\Modules\Providers\Services\ProviderService;

class EobPostingController extends Controller
{
    private EobPostingService $service;
    private ProviderService $providerService;

    public function __construct()
    {
        $this->service = new EobPostingService();
        $this->providerService = new ProviderService();
    }

    /**
     * Invoice Search (admin, receptionist, or doctor -- doctors only see
     * their own assigned patients' invoices, same scoping rule used
     * everywhere else in this billing feature set).
     */
    public function search(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $providerId = null;

        if (($user['role'] ?? '') === 'doctor') {
            $provider = $this->providerService->findByUserId((int) $user['id']);
            $providerId = $provider ? (int) $provider['id'] : 0;
        }

        $rows = $this->service->searchInvoices([
            'name' => $request->input('name'),
            'chart_id' => $request->input('chart_id'),
            'encounter' => $request->input('encounter'),
            'service_date_from' => $request->input('service_date_from'),
            'service_date_to' => $request->input('service_date_to'),
            'type' => $request->input('type', 'open')
        ], $providerId);

        $this->success($rows, 'Invoices retrieved successfully.');
    }

    /**
     * Posts the "Post Item" payment against one selected invoice.
     */
    public function post(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $result = $this->service->postPayment(
            $request->only(['encounter_id', 'payer', 'source', 'pay_date', 'deposit_date', 'amount', 'pt_debt']),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
    }
}
