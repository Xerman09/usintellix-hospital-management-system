<?php

namespace App\Modules\InpatientBilling\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Modules\InpatientBilling\Services\InpatientFolioService;
use PDO;
use Throwable;

class InpatientFolioController
{
    private InpatientFolioService $service;

    public function __construct()
    {
        $this->service = new InpatientFolioService();
    }

    /**
     * List Inpatient Folios with Filters & Pagination
     */
    public function index(Request $request): Response
    {
        try {
            $filters = [
                'status' => $request->query('status'),
                'billing_cleared' => $request->query('billing_cleared'),
                'patient_id' => $request->query('patient_id'),
                'search' => $request->query('q') ?? $request->query('search')
            ];
            $page = max(1, (int)($request->query('page') ?? 1));
            $perPage = min(100, max(1, (int)($request->query('per_page') ?? 20)));

            $data = $this->service->listFolios($filters, $page, $perPage);
            return Response::json(['success' => true, 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Get Master Folio Statement of Account (SOA) Detail
     */
    public function detail(Request $request): Response
    {
        try {
            $id = (int)($request->query('id') ?? $request->query('folio_id') ?? 0);
            if ($id <= 0) {
                return Response::json(['success' => false, 'message' => 'Folio ID is required.'], 400);
            }

            $detail = $this->service->getFolioDetail($id);
            if (!$detail) {
                return Response::json(['success' => false, 'message' => 'Inpatient folio not found.'], 404);
            }

            return Response::json(['success' => true, 'data' => $detail]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Get or Auto-Create Master Folio for an Admission
     */
    public function forAdmission(Request $request): Response
    {
        try {
            $admissionId = (int)($request->query('admission_id') ?? 0);
            if ($admissionId <= 0) {
                return Response::json(['success' => false, 'message' => 'Admission ID is required.'], 400);
            }

            $user = $request->user();
            $folio = $this->service->getOrCreateFolioForAdmission($admissionId, $user['id'] ?? null);

            return Response::json(['success' => true, 'data' => $folio]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Re-Sync and Consolidate all Inpatient Charges
     */
    public function sync(Request $request): Response
    {
        try {
            $data = $request->json();
            $folioId = (int)($data['folio_id'] ?? $data['id'] ?? 0);
            if ($folioId <= 0) {
                return Response::json(['success' => false, 'message' => 'Folio ID is required.'], 400);
            }

            $folio = $this->service->syncAndConsolidateFolio($folioId);
            return Response::json([
                'success' => true,
                'message' => 'All inpatient charges successfully consolidated and real-time balance refreshed.',
                'data' => $folio
            ]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Add Manual Line Item to Folio
     */
    public function addLineItem(Request $request): Response
    {
        try {
            $data = $request->json();
            $folioId = (int)($data['folio_id'] ?? 0);
            if ($folioId <= 0) {
                return Response::json(['success' => false, 'message' => 'Folio ID is required.'], 400);
            }

            $user = $request->user();
            $folio = $this->service->addManualLineItem($folioId, $data, $user['id'] ?? null);

            return Response::json([
                'success' => true,
                'message' => 'Line item added successfully and master balance updated.',
                'data' => $folio
            ], 201);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Void a Line Item on the Folio
     */
    public function voidLineItem(Request $request): Response
    {
        try {
            $data = $request->json();
            $itemId = (int)($data['line_item_id'] ?? $data['id'] ?? 0);
            $reason = trim($data['reason'] ?? 'Voided by billing staff');

            if ($itemId <= 0) {
                return Response::json(['success' => false, 'message' => 'Line item ID is required.'], 400);
            }

            $folio = $this->service->voidLineItem($itemId, $reason);
            return Response::json([
                'success' => true,
                'message' => 'Line item voided and master balance updated.',
                'data' => $folio
            ]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Apply Discount & Insurance Coverage
     */
    public function applyDiscount(Request $request): Response
    {
        try {
            $data = $request->json();
            $folioId = (int)($data['folio_id'] ?? $data['id'] ?? 0);
            if ($folioId <= 0) {
                return Response::json(['success' => false, 'message' => 'Folio ID is required.'], 400);
            }

            $folio = $this->service->applyDiscountAndInsurance($folioId, $data);
            return Response::json([
                'success' => true,
                'message' => 'Discounts and insurance coverage updated successfully.',
                'data' => $folio
            ]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Record Cashier Payment / Deposit on Folio
     */
    public function recordPayment(Request $request): Response
    {
        try {
            $data = $request->json();
            $folioId = (int)($data['folio_id'] ?? $data['id'] ?? 0);
            if ($folioId <= 0) {
                return Response::json(['success' => false, 'message' => 'Folio ID is required.'], 400);
            }

            $user = $request->user();
            $cashierName = $user ? trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')) : 'Main Cashier';
            if (empty(trim($cashierName))) {
                $cashierName = 'Main Cashier';
            }

            $folio = $this->service->recordFolioPayment($folioId, $data, $user['id'] ?? null, $cashierName);
            return Response::json([
                'success' => true,
                'message' => 'Official payment recorded successfully. Real-time balance updated.',
                'data' => $folio
            ], 201);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Issue Billing Clearance for Inpatient Discharge
     */
    public function issueClearance(Request $request): Response
    {
        try {
            $data = $request->json();
            $folioId = (int)($data['folio_id'] ?? $data['id'] ?? 0);
            $notes = !empty($data['notes']) ? trim($data['notes']) : null;

            if ($folioId <= 0) {
                return Response::json(['success' => false, 'message' => 'Folio ID is required.'], 400);
            }

            $user = $request->user();
            $officerName = $user ? trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')) : 'Billing Officer';
            if (empty(trim($officerName))) {
                $officerName = 'Billing Officer';
            }

            $folio = $this->service->issueBillingClearance($folioId, $officerName, $notes);
            return Response::json([
                'success' => true,
                'message' => 'Billing clearance successfully issued. Patient is cleared for discharge.',
                'data' => $folio
            ]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Seed Clinical Charges across OR, Lab, Rad, and Pharmacy for an Admission
     */
    public function seedClinicalCharges(Request $request): Response
    {
        try {
            $data = $request->json();
            $admissionId = (int)($data['admission_id'] ?? 0);
            if ($admissionId <= 0) {
                return Response::json(['success' => false, 'message' => 'Admission ID is required.'], 400);
            }

            $user = $request->user();
            $folio = $this->service->seedSampleClinicalCharges($admissionId, $user['id'] ?? null);

            return Response::json([
                'success' => true,
                'message' => 'Clinical charges seeded across OR, Lab, Radiology, and Pharmacy. Master folio updated.',
                'data' => $folio
            ]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * List Active Admissions with their Folio Status
     */
    public function listAdmissions(Request $request): Response
    {
        try {
            $pdo = Database::connection();
            $stmt = $pdo->query("
                SELECT ia.id,
                       ia.admission_number,
                       ia.patient_id,
                       ia.patient_name,
                       ia.patient_mrn,
                       ia.admission_date,
                       ia.discharge_date,
                       ia.status AS admission_status,
                       ia.attending_physician,
                       hb.bed_number,
                       hb.room_number,
                       hb.bed_type,
                       hb.daily_rate,
                       hw.ward_name,
                       hw.ward_code,
                       f.id AS folio_id,
                       f.folio_number,
                       f.status AS folio_status,
                       f.gross_amount,
                       f.paid_amount,
                       f.balance_due,
                       f.billing_cleared
                FROM inpatient_admissions ia
                LEFT JOIN hospital_beds hb ON ia.bed_id = hb.id
                LEFT JOIN hospital_wards hw ON ia.ward_id = hw.id
                LEFT JOIN billing_inpatient_folios f ON f.admission_id = ia.id
                WHERE ia.patient_id IS NOT NULL
                ORDER BY ia.id DESC
                LIMIT 50
            ");
            $admissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $currency = InpatientFolioService::currencySymbol();
            foreach ($admissions as &$a) {
                $a['currency'] = $currency;
                $a['room_bed_label'] = ($a['ward_name'] ?: 'Ward') . ' · Room ' . ($a['room_number'] ?: 'N/A') . ' · Bed ' . ($a['bed_number'] ?: 'N/A');
            }

            return Response::json(['success' => true, 'data' => $admissions]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
