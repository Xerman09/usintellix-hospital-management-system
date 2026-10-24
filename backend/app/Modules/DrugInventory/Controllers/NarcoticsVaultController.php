<?php

declare(strict_types=1);

namespace App\Modules\DrugInventory\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\DrugInventory\Services\NarcoticsVaultService;

class NarcoticsVaultController extends Controller
{
    private NarcoticsVaultService $service;

    public function __construct()
    {
        $this->service = new NarcoticsVaultService();
    }

    /**
     * List all items stored in the Central Narcotics Safe.
     * GET /drug-inventory/narcotics-vault/items
     */
    public function items(): void
    {
        $request = new Request();
        $filters = [
            'schedule' => $request->input('schedule'),
            'search' => $request->input('search')
        ];

        $items = $this->service->getItems($filters);
        $this->success($items, 'Narcotics vault items retrieved successfully.');
    }

    /**
     * List perpetual ledger transaction movements.
     * GET /drug-inventory/narcotics-vault/movements
     */
    public function movements(): void
    {
        $request = new Request();
        $filters = [
            'vault_item_id' => $request->input('vault_item_id'),
            'movement_type' => $request->input('movement_type'),
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
            'search' => $request->input('search'),
            'limit' => $request->input('limit')
        ];

        $movements = $this->service->getMovements($filters);
        $this->success($movements, 'Narcotics vault movements retrieved successfully.');
    }

    /**
     * Authenticate a dual-custody witness credential (PIN or Password).
     * POST /drug-inventory/narcotics-vault/verify-witness
     */
    public function verifyWitness(): void
    {
        $request = new Request();
        $usernameOrId = $request->input('username_or_id') ?? $request->input('user_id');
        $secret = (string) ($request->input('pin') ?? $request->input('password') ?? '');

        $result = $this->service->verifyWitnessCredentials($usernameOrId, $secret);
        if (!$result['success']) {
            $this->error($result['message'], 401);
            return;
        }

        $this->success($result, 'Witness credentials authenticated.');
    }

    /**
     * Configure or change personal quick Security PIN.
     * POST /drug-inventory/narcotics-vault/set-pin
     */
    public function setPin(): void
    {
        $request = new Request();
        $userId = (int) (Session::get('user_id') ?? Session::get('user')['id'] ?? 0);
        $pin = (string) ($request->input('pin') ?? '');
        $currentPassword = (string) ($request->input('current_password') ?? '');

        if ($userId <= 0) {
            $this->error('Authentication required.', 401);
            return;
        }

        $result = $this->service->setSecurityPin($userId, $pin, $currentPassword);
        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result, $result['message']);
    }

    /**
     * Execute a dual-witness perpetual safe movement.
     * POST /drug-inventory/narcotics-vault/movements
     */
    public function recordMovement(): void
    {
        $request = new Request();
        $actingUserId = (int) (Session::get('user_id') ?? Session::get('user')['id'] ?? 1);
        $payload = $request->all();

        try {
            $result = $this->service->recordMovement($payload, $actingUserId);
            if (!$result['success']) {
                $this->error($result['message'], 422);
                return;
            }

            $this->success($result, $result['message']);
        } catch (\Throwable $e) {
            $this->error('Failed to log vault movement: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Retrieve Shift Safe Count Audits.
     * GET /drug-inventory/narcotics-vault/shift-audits
     */
    public function shiftAudits(): void
    {
        $request = new Request();
        $filters = [
            'date' => $request->input('date'),
            'status' => $request->input('status')
        ];

        $audits = $this->service->getShiftAudits($filters);
        $this->success($audits, 'Shift safe audits retrieved successfully.');
    }

    /**
     * Submit an End-of-Shift Safe Count Verification Audit.
     * POST /drug-inventory/narcotics-vault/shift-audits
     */
    public function recordShiftAudit(): void
    {
        $request = new Request();
        $actingUserId = (int) (Session::get('user_id') ?? Session::get('user')['id'] ?? 1);
        $payload = $request->all();

        try {
            $result = $this->service->recordShiftAudit($payload, $actingUserId);
            if (!$result['success']) {
                $this->error($result['message'], 422);
                return;
            }

            $this->success($result, $result['message']);
        } catch (\Throwable $e) {
            $this->error('Failed to record shift audit: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get Central Narcotics Vault Dashboard KPIs.
     * GET /drug-inventory/narcotics-vault/stats
     */
    public function stats(): void
    {
        $stats = $this->service->getVaultStats();
        $this->success($stats, 'Narcotics vault statistics retrieved.');
    }
}
