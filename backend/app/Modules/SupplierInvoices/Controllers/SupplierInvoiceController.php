<?php

namespace App\Modules\SupplierInvoices\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\SupplierInvoices\Services\SupplierInvoiceService;

class SupplierInvoiceController extends Controller
{
    private SupplierInvoiceService $service;

    public function __construct()
    {
        $this->service = new SupplierInvoiceService();
    }

    /** Query: status?, supplier_id?, purchase_order_id? */
    public function index(): void
    {
        $request = new Request();

        $this->success($this->service->list([
            'status' => $request->input('status'),
            'supplier_id' => $request->input('supplier_id'),
            'purchase_order_id' => $request->input('purchase_order_id')
        ], Session::get('user')), 'Supplier invoices retrieved successfully.');
    }

    public function show(): void
    {
        $request = new Request();

        $invoice = $this->service->get((int) $request->input('id'), Session::get('user'));

        if (!$invoice) {
            $this->error('Supplier invoice not found.', 404);
            return;
        }

        $this->success($invoice, 'Supplier invoice retrieved successfully.');
    }

    /** Purchase orders with deliveries not billed yet. */
    public function billableOrders(): void
    {
        $this->success($this->service->billableOrders(), 'Orders to bill retrieved successfully.');
    }

    /** Query: id (purchase order), invoice_id? (when editing, its own deliveries stay available). */
    public function order(): void
    {
        $request = new Request();
        $invoiceId = (int) $request->input('invoice_id');

        $order = $this->service->orderForBilling((int) $request->input('id'), $invoiceId ?: null);

        if (!$order) {
            $this->error('Purchase order not found.', 404);
            return;
        }

        $this->success($order, 'Purchase order retrieved successfully.');
    }

    /** Body: the form (as for store) plus id? -- returns the match without saving. */
    public function match(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        $this->respond($this->service->preview($request->only(SupplierInvoiceService::INPUT_FIELDS), $id ?: null));
    }

    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $this->respond($this->service->create($request->only(SupplierInvoiceService::INPUT_FIELDS), (int) $user['id']), 201);
    }

    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $this->respond($this->service->update(
            (int) $request->input('id'),
            $request->only(SupplierInvoiceService::INPUT_FIELDS),
            (int) $user['id']
        ));
    }

    /** Body: id, notes? (required when the invoice doesn't match) */
    public function approve(): void
    {
        $request = new Request();

        $this->respond($this->service->approve(
            (int) $request->input('id'),
            (string) $request->input('notes', ''),
            Session::get('user')
        ));
    }

    /** Body: id, reason */
    public function reject(): void
    {
        $request = new Request();

        $this->respond($this->service->reject(
            (int) $request->input('id'),
            (string) $request->input('reason', ''),
            Session::get('user')
        ));
    }

    /** Body: id, reason */
    public function cancel(): void
    {
        $request = new Request();

        $this->respond($this->service->cancel(
            (int) $request->input('id'),
            (string) $request->input('reason', ''),
            Session::get('user')
        ));
    }

    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $this->respond($this->service->remove((int) $request->input('id'), (int) $user['id']));
    }

    private function respond(array $result, int $successStatus = 200): void
    {
        if (!$result['success']) {
            $status = !empty($result['not_found']) ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'] ?? null, $result['message'], $successStatus);
    }
}
